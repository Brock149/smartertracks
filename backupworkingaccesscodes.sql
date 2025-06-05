

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."create_tool_with_checklist"("p_number" "text", "p_name" "text", "p_description" "text", "p_photo_url" "text", "p_company_id" "uuid", "p_checklist" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_tool_id uuid;
BEGIN
    -- Insert the tool
    INSERT INTO tools (number, name, description, photo_url, company_id)
    VALUES (p_number, p_name, p_description, p_photo_url, p_company_id)
    RETURNING id INTO v_tool_id;

    -- If there are checklist items, insert them
    IF p_checklist IS NOT NULL AND jsonb_array_length(p_checklist) > 0 THEN
        INSERT INTO tool_checklists (tool_id, item_name, required, company_id)
        SELECT 
            v_tool_id,
            (item->>'item_name')::text,
            (item->>'required')::boolean,
            p_company_id
        FROM jsonb_array_elements(p_checklist) AS item;
    END IF;

    RETURN v_tool_id;
END;
$$;


ALTER FUNCTION "public"."create_tool_with_checklist"("p_number" "text", "p_name" "text", "p_description" "text", "p_photo_url" "text", "p_company_id" "uuid", "p_checklist" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_tool"("p_tool_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    tool_number TEXT;
    tool_name TEXT;
BEGIN
    -- First check if tool exists and get its details
    SELECT number, name INTO tool_number, tool_name
    FROM tools
    WHERE id = p_tool_id;

    IF tool_number IS NULL THEN
        RAISE EXCEPTION 'Tool not found';
    END IF;

    -- Start a transaction
    BEGIN
        -- First, update any transactions involving this tool
        -- Store the tool's details and set tool_id to NULL
        UPDATE tool_transactions
        SET 
            tool_id = NULL,
            deleted_tool_number = tool_number,
            deleted_tool_name = tool_name
        WHERE tool_id = p_tool_id;

        -- Delete all checklist items for this tool
        DELETE FROM tool_checklists
        WHERE tool_id = p_tool_id;

        -- Actually delete the tool
        DELETE FROM tools
        WHERE id = p_tool_id;
    EXCEPTION
        WHEN OTHERS THEN
            -- If anything fails, roll back the transaction
            RAISE EXCEPTION 'Failed to delete tool: %', SQLERRM;
    END;
END;
$$;


ALTER FUNCTION "public"."delete_tool"("p_tool_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_user"("user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    is_last_admin BOOLEAN;
BEGIN
    -- Check if this is the last admin
    SELECT COUNT(*) = 1 INTO is_last_admin
    FROM users
    WHERE role = 'admin';

    IF is_last_admin AND EXISTS (
        SELECT 1 FROM users 
        WHERE id = user_id AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Cannot delete the last admin user';
    END IF;

    -- Store user's name in transactions before deleting
    UPDATE tool_transactions
    SET 
        deleted_from_user_name = (SELECT name FROM users WHERE id = user_id),
        from_user_id = NULL
    WHERE from_user_id = user_id;

    UPDATE tool_transactions
    SET 
        deleted_to_user_name = (SELECT name FROM users WHERE id = user_id),
        to_user_id = NULL
    WHERE to_user_id = user_id;

    -- Delete from both users table and auth.users
    DELETE FROM users WHERE id = user_id;
    DELETE FROM auth.users WHERE id = user_id;
END;
$$;


ALTER FUNCTION "public"."delete_user"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_company_id"("user_id" "uuid") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT company_id FROM users WHERE id = user_id;
$$;


ALTER FUNCTION "public"."get_user_company_id"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
   begin
     update auth.users
     set raw_user_meta_data = jsonb_set(
       coalesce(raw_user_meta_data, '{}'),
       '{role}',
       to_jsonb((select role from public.users where id = new.id))
     )
     where id = new.id;
     return new;
   end;
   $$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"("uid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = uid
    AND role = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_admin"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_checklist_items"("items" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Ensure the items are properly formatted as a JSON array
    IF jsonb_typeof(items) != 'array' THEN
        RAISE EXCEPTION 'Items must be a JSON array';
    END IF;

    -- Set the session variable with the JSON array
    PERFORM set_config('app.checklist_items', items::text, false);
END;
$$;


ALTER FUNCTION "public"."set_checklist_items"("items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."store_deleted_user_name"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- First update transactions where this user was the from_user
    UPDATE tool_transactions
    SET deleted_from_user_name = OLD.name
    WHERE from_user_id = OLD.id;
    
    -- Then update transactions where this user was the to_user
    UPDATE tool_transactions
    SET deleted_to_user_name = OLD.name
    WHERE to_user_id = OLD.id;
    
    -- Finally, update any tools where this user is the current owner
    UPDATE tools
    SET current_owner = NULL
    WHERE current_owner = OLD.id;
    
    RETURN OLD;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error (you can check the logs in Supabase)
        RAISE NOTICE 'Error in store_deleted_user_name: %', SQLERRM;
        -- Still allow the deletion to proceed
        RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."store_deleted_user_name"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."checklist_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transaction_id" "uuid" NOT NULL,
    "checklist_item_id" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    "comments" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "deleted_user_name" "text",
    "company_id" "uuid" NOT NULL,
    CONSTRAINT "checklist_reports_status_check" CHECK (("status" = ANY (ARRAY['Damaged/Needs Repair'::"text", 'Needs Replacement/Resupply'::"text"])))
);


ALTER TABLE "public"."checklist_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."companies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_access_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid",
    "code" "text" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    CONSTRAINT "company_access_codes_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'tech'::"text"])))
);


ALTER TABLE "public"."company_access_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tool_checklists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tool_id" "uuid" NOT NULL,
    "item_name" "text" NOT NULL,
    "required" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "company_id" "uuid" NOT NULL
);


ALTER TABLE "public"."tool_checklists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tool_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tool_id" "uuid",
    "image_url" "text" NOT NULL,
    "uploaded_at" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid" NOT NULL
);


ALTER TABLE "public"."tool_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tool_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tool_id" "uuid",
    "from_user_id" "uuid",
    "to_user_id" "uuid",
    "location" "text" NOT NULL,
    "stored_at" "text" NOT NULL,
    "notes" "text",
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "deleted_from_user_name" "text",
    "deleted_to_user_name" "text",
    "deleted_tool_number" "text",
    "deleted_tool_name" "text",
    "company_id" "uuid" NOT NULL
);


ALTER TABLE "public"."tool_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tools" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "number" "text" NOT NULL,
    "name" "text" NOT NULL,
    "current_owner" "uuid",
    "description" "text",
    "photo_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "deleted_owner_name" "text",
    "is_deleted" boolean DEFAULT false,
    "company_id" "uuid" NOT NULL
);


ALTER TABLE "public"."tools" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid",
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'tech'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."checklist_reports"
    ADD CONSTRAINT "checklist_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_access_codes"
    ADD CONSTRAINT "company_access_codes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."company_access_codes"
    ADD CONSTRAINT "company_access_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tool_checklists"
    ADD CONSTRAINT "tool_checklists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tool_images"
    ADD CONSTRAINT "tool_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tool_transactions"
    ADD CONSTRAINT "tool_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tools"
    ADD CONSTRAINT "tools_number_key" UNIQUE ("number");



ALTER TABLE ONLY "public"."tools"
    ADD CONSTRAINT "tools_number_unique" UNIQUE ("number");



ALTER TABLE ONLY "public"."tools"
    ADD CONSTRAINT "tools_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_checklist_reports_checklist_item_id" ON "public"."checklist_reports" USING "btree" ("checklist_item_id");



CREATE INDEX "idx_checklist_reports_transaction_id" ON "public"."checklist_reports" USING "btree" ("transaction_id");



CREATE INDEX "idx_tool_checklists_tool_id" ON "public"."tool_checklists" USING "btree" ("tool_id");



CREATE INDEX "idx_tool_transactions_from_user_id" ON "public"."tool_transactions" USING "btree" ("from_user_id");



CREATE INDEX "idx_tool_transactions_timestamp" ON "public"."tool_transactions" USING "btree" ("timestamp");



CREATE INDEX "idx_tool_transactions_to_user_id" ON "public"."tool_transactions" USING "btree" ("to_user_id");



CREATE INDEX "idx_tool_transactions_tool_id" ON "public"."tool_transactions" USING "btree" ("tool_id");



CREATE INDEX "idx_users_company_id" ON "public"."users" USING "btree" ("company_id");



CREATE OR REPLACE TRIGGER "before_user_delete" BEFORE DELETE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."store_deleted_user_name"();



CREATE OR REPLACE TRIGGER "on_user_created" AFTER INSERT ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();



CREATE OR REPLACE TRIGGER "on_user_updated" AFTER UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();



ALTER TABLE ONLY "public"."checklist_reports"
    ADD CONSTRAINT "checklist_reports_checklist_item_id_fkey" FOREIGN KEY ("checklist_item_id") REFERENCES "public"."tool_checklists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_reports"
    ADD CONSTRAINT "checklist_reports_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."checklist_reports"
    ADD CONSTRAINT "checklist_reports_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."tool_transactions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_access_codes"
    ADD CONSTRAINT "company_access_codes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."tool_checklists"
    ADD CONSTRAINT "tool_checklists_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."tool_checklists"
    ADD CONSTRAINT "tool_checklists_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tool_images"
    ADD CONSTRAINT "tool_images_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tool_transactions"
    ADD CONSTRAINT "tool_transactions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."tool_transactions"
    ADD CONSTRAINT "tool_transactions_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tool_transactions"
    ADD CONSTRAINT "tool_transactions_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tool_transactions"
    ADD CONSTRAINT "tool_transactions_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tools"
    ADD CONSTRAINT "tools_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."tools"
    ADD CONSTRAINT "tools_current_owner_fkey" FOREIGN KEY ("current_owner") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can manage access codes in their company" ON "public"."company_access_codes" TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"()))));



CREATE POLICY "Admins can manage checklist reports in their company" ON "public"."checklist_reports" TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"()))));



CREATE POLICY "Admins can manage checklists in their company" ON "public"."tool_checklists" TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"()))));



CREATE POLICY "Admins can manage images in their company" ON "public"."tool_images" TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"()))));



CREATE POLICY "Admins can manage their company's access codes" ON "public"."company_access_codes" TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"()))));



CREATE POLICY "Admins can manage their own company" ON "public"."companies" TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND ("id" = "public"."get_user_company_id"("auth"."uid"()))));



CREATE POLICY "Admins can manage tools in their company" ON "public"."tools" TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"()))));



CREATE POLICY "Admins can manage transactions in their company" ON "public"."tool_transactions" TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"()))));



CREATE POLICY "Admins can manage users in their company" ON "public"."users" TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"()))));



CREATE POLICY "Service role can do everything on access codes" ON "public"."company_access_codes" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can do everything on checklists" ON "public"."tool_checklists" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can do everything on companies" ON "public"."companies" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can do everything on reports" ON "public"."checklist_reports" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can do everything on tool_images" ON "public"."tool_images" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can do everything on tools" ON "public"."tools" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can do everything on transactions" ON "public"."tool_transactions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can do everything on users" ON "public"."users" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Techs can view tech access codes in their company" ON "public"."company_access_codes" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'tech'::"text") AND ("users"."company_id" = "company_access_codes"."company_id")))) AND ("role" = 'tech'::"text")));



CREATE POLICY "Users can create checklist reports in their company" ON "public"."checklist_reports" FOR INSERT TO "authenticated" WITH CHECK (("company_id" = "public"."get_user_company_id"("auth"."uid"())));



CREATE POLICY "Users can create transactions in their company" ON "public"."tool_transactions" FOR INSERT TO "authenticated" WITH CHECK ((("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND (("from_user_id" = "auth"."uid"()) OR ("from_user_id" IS NULL)) AND (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "tool_transactions"."to_user_id") AND ("users"."company_id" = "public"."get_user_company_id"("auth"."uid"())))))));



CREATE POLICY "Users can delete images in their company" ON "public"."tool_images" FOR DELETE TO "authenticated" USING ((("company_id" = "public"."get_user_company_id"("auth"."uid"())) OR (EXISTS ( SELECT 1
   FROM "public"."tools"
  WHERE (("tools"."id" = "tool_images"."tool_id") AND ("tools"."current_owner" = "auth"."uid"()))))));



CREATE POLICY "Users can insert images in their company" ON "public"."tool_images" FOR INSERT TO "authenticated" WITH CHECK ((("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND (EXISTS ( SELECT 1
   FROM "public"."tools"
  WHERE (("tools"."id" = "tool_images"."tool_id") AND ("tools"."company_id" = "public"."get_user_company_id"("auth"."uid"())))))));



CREATE POLICY "Users can view checklist reports in their company" ON "public"."checklist_reports" FOR SELECT TO "authenticated" USING ((("company_id" = "public"."get_user_company_id"("auth"."uid"())) OR (EXISTS ( SELECT 1
   FROM "public"."tool_transactions"
  WHERE (("tool_transactions"."id" = "checklist_reports"."transaction_id") AND (("tool_transactions"."from_user_id" = "auth"."uid"()) OR ("tool_transactions"."to_user_id" = "auth"."uid"())))))));



CREATE POLICY "Users can view checklists in their company" ON "public"."tool_checklists" FOR SELECT TO "authenticated" USING (("company_id" = "public"."get_user_company_id"("auth"."uid"())));



CREATE POLICY "Users can view images in their company" ON "public"."tool_images" FOR SELECT TO "authenticated" USING ((("company_id" = "public"."get_user_company_id"("auth"."uid"())) OR (EXISTS ( SELECT 1
   FROM "public"."tools"
  WHERE (("tools"."id" = "tool_images"."tool_id") AND ("tools"."current_owner" = "auth"."uid"()))))));



CREATE POLICY "Users can view their own company" ON "public"."companies" FOR SELECT TO "authenticated" USING (("id" = "public"."get_user_company_id"("auth"."uid"())));



CREATE POLICY "Users can view their own record" ON "public"."users" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view tools in their company" ON "public"."tools" FOR SELECT TO "authenticated" USING (("company_id" = "public"."get_user_company_id"("auth"."uid"())));



CREATE POLICY "Users can view transactions in their company" ON "public"."tool_transactions" FOR SELECT TO "authenticated" USING ((("company_id" = "public"."get_user_company_id"("auth"."uid"())) OR ("from_user_id" = "auth"."uid"()) OR ("to_user_id" = "auth"."uid"())));



ALTER TABLE "public"."checklist_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_access_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tool_checklists" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tool_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tool_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tools" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."create_tool_with_checklist"("p_number" "text", "p_name" "text", "p_description" "text", "p_photo_url" "text", "p_company_id" "uuid", "p_checklist" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_tool_with_checklist"("p_number" "text", "p_name" "text", "p_description" "text", "p_photo_url" "text", "p_company_id" "uuid", "p_checklist" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_tool_with_checklist"("p_number" "text", "p_name" "text", "p_description" "text", "p_photo_url" "text", "p_company_id" "uuid", "p_checklist" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_tool"("p_tool_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_tool"("p_tool_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_tool"("p_tool_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_user"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_company_id"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_company_id"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_company_id"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_checklist_items"("items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."set_checklist_items"("items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_checklist_items"("items" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."store_deleted_user_name"() TO "anon";
GRANT ALL ON FUNCTION "public"."store_deleted_user_name"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."store_deleted_user_name"() TO "service_role";


















GRANT ALL ON TABLE "public"."checklist_reports" TO "anon";
GRANT ALL ON TABLE "public"."checklist_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."checklist_reports" TO "service_role";



GRANT ALL ON TABLE "public"."companies" TO "anon";
GRANT ALL ON TABLE "public"."companies" TO "authenticated";
GRANT ALL ON TABLE "public"."companies" TO "service_role";



GRANT ALL ON TABLE "public"."company_access_codes" TO "anon";
GRANT ALL ON TABLE "public"."company_access_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."company_access_codes" TO "service_role";



GRANT ALL ON TABLE "public"."tool_checklists" TO "anon";
GRANT ALL ON TABLE "public"."tool_checklists" TO "authenticated";
GRANT ALL ON TABLE "public"."tool_checklists" TO "service_role";



GRANT ALL ON TABLE "public"."tool_images" TO "anon";
GRANT ALL ON TABLE "public"."tool_images" TO "authenticated";
GRANT ALL ON TABLE "public"."tool_images" TO "service_role";



GRANT ALL ON TABLE "public"."tool_transactions" TO "anon";
GRANT ALL ON TABLE "public"."tool_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."tool_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."tools" TO "anon";
GRANT ALL ON TABLE "public"."tools" TO "authenticated";
GRANT ALL ON TABLE "public"."tools" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
