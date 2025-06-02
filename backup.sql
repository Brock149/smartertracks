

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
    WHERE role = 'admin' AND id = user_id;

    IF is_last_admin THEN
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
    LANGUAGE "sql" STABLE
    AS $$
  SELECT role = 'admin' FROM users WHERE id = uid
$$;


ALTER FUNCTION "public"."is_admin"("uid" "uuid") OWNER TO "postgres";


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
    CONSTRAINT "checklist_reports_status_check" CHECK (("status" = ANY (ARRAY['Damaged/Needs Repair'::"text", 'Needs Replacement/Resupply'::"text"])))
);


ALTER TABLE "public"."checklist_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tool_checklists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tool_id" "uuid" NOT NULL,
    "item_name" "text" NOT NULL,
    "required" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."tool_checklists" OWNER TO "postgres";


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
    "deleted_tool_name" "text"
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
    "is_deleted" boolean DEFAULT false
);


ALTER TABLE "public"."tools" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'tech'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."checklist_reports"
    ADD CONSTRAINT "checklist_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tool_checklists"
    ADD CONSTRAINT "tool_checklists_pkey" PRIMARY KEY ("id");



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



CREATE OR REPLACE TRIGGER "before_user_delete" BEFORE DELETE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."store_deleted_user_name"();



CREATE OR REPLACE TRIGGER "on_user_created" AFTER INSERT ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();



CREATE OR REPLACE TRIGGER "on_user_updated" AFTER UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();



ALTER TABLE ONLY "public"."checklist_reports"
    ADD CONSTRAINT "checklist_reports_checklist_item_id_fkey" FOREIGN KEY ("checklist_item_id") REFERENCES "public"."tool_checklists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_reports"
    ADD CONSTRAINT "checklist_reports_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."tool_transactions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tool_checklists"
    ADD CONSTRAINT "tool_checklists_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tool_transactions"
    ADD CONSTRAINT "tool_transactions_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tool_transactions"
    ADD CONSTRAINT "tool_transactions_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tool_transactions"
    ADD CONSTRAINT "tool_transactions_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tools"
    ADD CONSTRAINT "tools_current_owner_fkey" FOREIGN KEY ("current_owner") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can delete tool_checklists" ON "public"."tool_checklists" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can delete tools" ON "public"."tools" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can delete users" ON "public"."users" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "users_1"
  WHERE (("users_1"."id" = "auth"."uid"()) AND ("users_1"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can do everything" ON "public"."tool_checklists" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can do everything with tools" ON "public"."tools" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update tool_checklists" ON "public"."tool_checklists" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all users" ON "public"."users" FOR SELECT TO "authenticated" USING (((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "All users can view checklist" ON "public"."tool_checklists" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow insert for service role" ON "public"."users" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Allow service role to delete users" ON "public"."users" FOR DELETE USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can delete checklist reports" ON "public"."checklist_reports" FOR DELETE TO "service_role" USING (true);



CREATE POLICY "Service role can delete tools" ON "public"."tools" FOR DELETE TO "service_role" USING (true);



CREATE POLICY "Service role can do everything" ON "public"."tool_checklists" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can update tools" ON "public"."tools" FOR UPDATE TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Users can create checklist reports" ON "public"."checklist_reports" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Users can create transactions" ON "public"."tool_transactions" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Users can view their checklist reports" ON "public"."checklist_reports" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."tool_transactions"
  WHERE (("tool_transactions"."id" = "checklist_reports"."transaction_id") AND (("tool_transactions"."from_user_id" = "auth"."uid"()) OR ("tool_transactions"."to_user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."users"
          WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))))))));



CREATE POLICY "Users can view their transactions" ON "public"."tool_transactions" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "from_user_id") OR ("auth"."uid"() = "to_user_id") OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text"))))));



CREATE POLICY "Users can view tools" ON "public"."tools" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."checklist_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tool_checklists" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tool_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tools" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."delete_tool"("p_tool_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_tool"("p_tool_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_tool"("p_tool_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_user"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."store_deleted_user_name"() TO "anon";
GRANT ALL ON FUNCTION "public"."store_deleted_user_name"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."store_deleted_user_name"() TO "service_role";


















GRANT ALL ON TABLE "public"."checklist_reports" TO "anon";
GRANT ALL ON TABLE "public"."checklist_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."checklist_reports" TO "service_role";



GRANT ALL ON TABLE "public"."tool_checklists" TO "anon";
GRANT ALL ON TABLE "public"."tool_checklists" TO "authenticated";
GRANT ALL ON TABLE "public"."tool_checklists" TO "service_role";



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
