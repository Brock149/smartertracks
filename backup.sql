

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




ALTER SCHEMA "public" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."check_company_limits"("p_company_id" "uuid", "p_kind" "text") RETURNS TABLE("ok" boolean, "message" "text")
    LANGUAGE "plpgsql"
    AS $$
declare
  v_mode text;
  v_limit int;
  v_count int;
begin
  select enforcement_mode into v_mode
  from companies where id = p_company_id;

  if v_mode is null then
    return query select true, 'No company found';
    return;
  end if;

  if p_kind = 'user' then
    select user_limit into v_limit from companies where id = p_company_id;
    select count(*)::int into v_count from users where company_id = p_company_id;
  elsif p_kind = 'tool' then
    select tool_limit into v_limit from companies where id = p_company_id;
    select count(*)::int into v_count from tools where company_id = p_company_id;
  else
    return query select true, 'Unknown kind';
    return;
  end if;

  if v_limit is null then
    return query select true, 'Unlimited';
    return;
  end if;

  if v_count < v_limit then
    return query select true, format('%s count %s/%s', p_kind, v_count, v_limit);
  else
    return query select false, format('%s limit reached %s/%s. Please contact billing.', p_kind, v_count, v_limit);
  end if;
end;
$$;


ALTER FUNCTION "public"."check_company_limits"("p_company_id" "uuid", "p_kind" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_tool_with_checklist"("p_number" "text", "p_name" "text", "p_description" "text", "p_photo_url" "text", "p_company_id" "uuid", "p_checklist" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_tool_id uuid;
    v_default_owner_id uuid;
    v_default_location text;
    v_use_default_location boolean;
    v_use_default_owner boolean;
    v_final_owner_id uuid;
    v_final_location text;
BEGIN
    -- Get company default settings and toggle states
    SELECT 
        default_owner_id, 
        default_location,
        use_default_location,
        use_default_owner
    INTO 
        v_default_owner_id, 
        v_default_location,
        v_use_default_location,
        v_use_default_owner
    FROM company_settings 
    WHERE company_id = p_company_id;

    -- Determine final values based on toggle states
    v_final_owner_id := CASE 
        WHEN v_use_default_owner AND v_default_owner_id IS NOT NULL 
        THEN v_default_owner_id 
        ELSE NULL 
    END;
    
    v_final_location := CASE 
        WHEN v_use_default_location AND v_default_location IS NOT NULL 
        THEN v_default_location 
        ELSE NULL 
    END;

    -- Insert the tool with determined owner
    INSERT INTO tools (number, name, description, photo_url, company_id, current_owner)
    VALUES (p_number, p_name, p_description, p_photo_url, p_company_id, v_final_owner_id)
    RETURNING id INTO v_tool_id;

    -- Insert checklist items if provided
    IF p_checklist IS NOT NULL AND jsonb_array_length(p_checklist) > 0 THEN
        INSERT INTO tool_checklists (tool_id, item_name, required, company_id)
        SELECT 
            v_tool_id,
            (item->>'item_name')::text,
            (item->>'required')::boolean,
            p_company_id
        FROM jsonb_array_elements(p_checklist) AS item;
    END IF;

    -- Create initial transaction only if we have at least a default owner or location
    IF v_final_owner_id IS NOT NULL OR v_final_location IS NOT NULL THEN
        INSERT INTO tool_transactions (
            tool_id,
            from_user_id,
            to_user_id,
            location,
            stored_at,
            notes,
            company_id
        ) VALUES (
            v_tool_id,
            NULL, -- System transfer (no from_user)
            v_final_owner_id,
            normalize_location(p_company_id, COALESCE(v_final_location, 'Not specified')), -- MODIFIED: Apply location normalization
            'N/A',
            'Initial assignment from system' || 
            CASE 
                WHEN v_final_owner_id IS NOT NULL THEN ' to default owner'
                ELSE ''
            END,
            p_company_id
        );
    END IF;

    RETURN v_tool_id;
END;
$$;


ALTER FUNCTION "public"."create_tool_with_checklist"("p_number" "text", "p_name" "text", "p_description" "text", "p_photo_url" "text", "p_company_id" "uuid", "p_checklist" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_location_alias"("p_alias_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_company_id uuid;
BEGIN
    -- Get the company_id of the alias
    SELECT company_id INTO v_company_id 
    FROM location_aliases 
    WHERE id = p_alias_id;

    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Location alias not found';
    END IF;

    -- Check if user is admin of this company
    IF NOT is_admin(auth.uid()) OR get_user_company_id(auth.uid()) != v_company_id THEN
        RAISE EXCEPTION 'Access denied. Only company admins can manage location aliases.';
    END IF;

    -- Delete the alias
    DELETE FROM location_aliases WHERE id = p_alias_id;

    RETURN json_build_object(
        'success', true,
        'message', 'Location alias deleted successfully'
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;


ALTER FUNCTION "public"."delete_location_alias"("p_alias_id" "uuid") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."enforce_company_active"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  if not public.is_company_active(NEW.company_id) then
    raise exception
      using message = 'Account suspended. Please contact billing to reactivate.';
  end if;
  return NEW;
end;
$$;


ALTER FUNCTION "public"."enforce_company_active"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_tool_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_ok boolean;
  v_msg text;
  v_mode text;
begin
  select enforcement_mode into v_mode from companies where id = NEW.company_id;
  if v_mode is null or v_mode = 'off' then
    return NEW;
  end if;

  select ok, message into v_ok, v_msg from check_company_limits(NEW.company_id, 'tool');

  if v_mode = 'observe' then
    if not v_ok then
      raise notice 'Tool limit notice: %', v_msg;
    end if;
    return NEW;
  end if;

  if v_mode = 'enforce' and not v_ok then
    raise exception using message = v_msg;
  end if;

  return NEW;
end;
$$;


ALTER FUNCTION "public"."enforce_tool_limit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_user_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_ok boolean;
  v_msg text;
  v_mode text;
begin
  select enforcement_mode into v_mode from companies where id = NEW.company_id;
  if v_mode is null or v_mode = 'off' then
    return NEW;
  end if;

  select ok, message into v_ok, v_msg from check_company_limits(NEW.company_id, 'user');

  if v_mode = 'observe' then
    if not v_ok then
      raise notice 'User limit notice: %', v_msg;
    end if;
    return NEW;
  end if;

  if v_mode = 'enforce' and not v_ok then
    raise exception using message = v_msg;
  end if;

  return NEW;
end;
$$;


ALTER FUNCTION "public"."enforce_user_limit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_single_primary"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Case A: this row is being marked primary  demote the rest
  IF NEW.is_primary THEN
    UPDATE public.tool_images
    SET    is_primary = false
    WHERE  tool_id = NEW.tool_id
      AND  id <> NEW.id;
  -- Case B: not primary, but none exist yet  promote this one
  ELSE
    IF NOT EXISTS (
         SELECT 1
         FROM   public.tool_images
         WHERE  tool_id = NEW.tool_id
           AND  is_primary
           AND  id <> NEW.id
       ) THEN
      NEW.is_primary := true;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."ensure_single_primary"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_companies_overview"() RETURNS TABLE("id" "uuid", "name" "text", "is_active" boolean, "created_at" timestamp with time zone, "suspended_at" timestamp with time zone, "notes" "text", "user_count" bigint, "tool_count" bigint, "last_activity" timestamp with time zone, "user_limit" integer, "tool_limit" integer, "enforcement_mode" "text", "tier_name" "text", "billing_cycle" "text", "plan_id" "text", "trial_expires_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  -- return nothing if not superadmin
  select * from (
    select
      c.id,
      c.name,
      c.is_active,
      c.created_at,
      c.suspended_at,
      c.notes,
      coalesce(u.user_count, 0) as user_count,
      coalesce(t.tool_count, 0) as tool_count,
      la.last_activity,
      c.user_limit,
      c.tool_limit,
      c.enforcement_mode,
      c.tier_name,
      c.billing_cycle,
      c.plan_id,
      c.trial_expires_at
    from companies c
    left join (
      select company_id, count(*)::bigint as user_count
      from users
      group by company_id
    ) u on u.company_id = c.id
    left join (
      select company_id, count(*)::bigint as tool_count
      from tools
      group by company_id
    ) t on t.company_id = c.id
    left join (
      select company_id, max(created_at) as last_activity
      from tool_transactions
      group by company_id
    ) la on la.company_id = c.id
    order by c.created_at desc
  ) sub
  where is_superadmin(auth.uid());
$$;


ALTER FUNCTION "public"."get_companies_overview"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_company_aliases"("p_company_id" "uuid") RETURNS TABLE("id" "uuid", "alias" "text", "normalized_location" "text", "created_at" timestamp with time zone, "created_by_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        la.id,
        la.alias,
        la.normalized_location,
        la.created_at,
        u.name as created_by_name
    FROM location_aliases la
    LEFT JOIN users u ON la.created_by = u.id
    WHERE la.company_id = p_company_id
    ORDER BY la.normalized_location, la.alias;
END;
$$;


ALTER FUNCTION "public"."get_company_aliases"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_company_settings"("p_company_id" "uuid") RETURNS TABLE("id" "uuid", "company_id" "uuid", "default_location" "text", "default_owner_id" "uuid", "default_owner_name" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.id,
        cs.company_id,
        cs.default_location,
        cs.default_owner_id,
        COALESCE(u.name, 'User not found') as default_owner_name,
        cs.created_at,
        cs.updated_at
    FROM company_settings cs
    LEFT JOIN users u ON cs.default_owner_id = u.id
    WHERE cs.company_id = p_company_id;
END;
$$;


ALTER FUNCTION "public"."get_company_settings"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_company_settings"() RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_company_id uuid;
    v_result json;
BEGIN
    -- Get the user's company ID
    SELECT company_id INTO v_company_id 
    FROM users 
    WHERE id = auth.uid();

    IF v_company_id IS NULL THEN
        RETURN json_build_object('error', 'User not found or not associated with a company');
    END IF;

    -- Get the settings
    SELECT json_build_object(
        'id', cs.id,
        'company_id', cs.company_id,
        'default_location', cs.default_location,
        'default_owner_id', cs.default_owner_id,
        'default_owner_name', u.name,
        'use_default_location', cs.use_default_location,
        'use_default_owner', cs.use_default_owner,
        'created_at', cs.created_at,
        'updated_at', cs.updated_at
    ) INTO v_result
    FROM company_settings cs
    LEFT JOIN users u ON cs.default_owner_id = u.id
    WHERE cs.company_id = v_company_id;

    -- Return null if no settings found (not an error)
    RETURN COALESCE(v_result, json_build_object('settings', null));
END;
$$;


ALTER FUNCTION "public"."get_my_company_settings"() OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."is_company_active"("cid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  select coalesce( (select is_active
                      from public.companies
                     where id = cid), false );
$$;


ALTER FUNCTION "public"."is_company_active"("cid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_superadmin"("uid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = uid AND role = 'superadmin'
  );
$$;


ALTER FUNCTION "public"."is_superadmin"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalize_location"("p_company_id" "uuid", "p_input_location" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_normalized_location text;
BEGIN
    -- Look for exact alias match (case-insensitive)
    SELECT normalized_location INTO v_normalized_location
    FROM location_aliases
    WHERE company_id = p_company_id 
    AND LOWER(TRIM(alias)) = LOWER(TRIM(p_input_location))
    LIMIT 1;
    
    -- Return normalized location if found, otherwise return original
    RETURN COALESCE(v_normalized_location, TRIM(p_input_location));
END;
$$;


ALTER FUNCTION "public"."normalize_location"("p_company_id" "uuid", "p_input_location" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_tools"("p_company_id" "uuid", "p_term" "text", "p_limit" integer DEFAULT 50) RETURNS TABLE("id" "uuid", "number" "text", "name" "text", "description" "text", "photo_url" "text", "owner_name" "text", "location" "text")
    LANGUAGE "sql"
    AS $$
  with latest_tx as (
    select distinct on (tool_id) tool_id, location
    from tool_transactions
    where company_id = p_company_id
    order by tool_id, timestamp desc
  )
  select
    t.id,
    t.number,
    t.name,
    t.description,
    t.photo_url,
    u.name as owner_name,
    coalesce(l.location, '') as location
  from tools t
  left join users u on u.id = t.current_owner
  left join latest_tx l on l.tool_id = t.id
  where t.company_id = p_company_id
    and (
      lower(t.number) like '%' || lower(p_term) || '%'
      or lower(t.name) like '%' || lower(p_term) || '%'
      or lower(coalesce(t.description, '')) like '%' || lower(p_term) || '%'
      or lower(coalesce(l.location, '')) like '%' || lower(p_term) || '%'
      or lower(coalesce(u.name, '')) like '%' || lower(p_term) || '%'
    )
  order by t.number
  limit least(p_limit, 100);
$$;


ALTER FUNCTION "public"."search_tools"("p_company_id" "uuid", "p_term" "text", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_tools"("p_company_id" "uuid", "p_term" "text", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "number" "text", "name" "text", "description" "text", "photo_url" "text", "owner_name" "text", "location" "text", "primary_thumb_url" "text", "primary_image_url" "text")
    LANGUAGE "sql"
    AS $$
  with latest_tx as (
    select distinct on (tool_id) tool_id, location
    from tool_transactions
    where company_id = p_company_id
    order by tool_id, timestamp desc
  ),
  primary_img as (
    select ti.tool_id, ti.thumb_url, ti.image_url
    from tool_images ti
    where ti.is_primary = true
  )
  select
    t.id,
    t.number,
    t.name,
    t.description,
    t.photo_url,
    u.name as owner_name,
    coalesce(l.location, '') as location,
    pi.thumb_url as primary_thumb_url,
    pi.image_url as primary_image_url
  from tools t
  left join users u on u.id = t.current_owner
  left join latest_tx l on l.tool_id = t.id
  left join primary_img pi on pi.tool_id = t.id
  where t.company_id = p_company_id
    and (
      lower(t.number) like '%' || lower(p_term) || '%'
      or lower(t.name) like '%' || lower(p_term) || '%'
      or lower(coalesce(t.description, '')) like '%' || lower(p_term) || '%'
      or lower(coalesce(l.location, '')) like '%' || lower(p_term) || '%'
      or lower(coalesce(u.name, '')) like '%' || lower(p_term) || '%'
    )
  order by t.number
  limit least(p_limit, 100)
  offset greatest(p_offset, 0);
$$;


ALTER FUNCTION "public"."search_tools"("p_company_id" "uuid", "p_term" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."upsert_company_settings"("p_company_id" "uuid", "p_default_location" "text", "p_default_owner_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_settings_id uuid;
    v_result json;
BEGIN
    -- Check if user is admin of this company
    IF NOT is_admin(auth.uid()) OR get_user_company_id(auth.uid()) != p_company_id THEN
        RAISE EXCEPTION 'Access denied. Only company admins can update settings.';
    END IF;

    -- Validate that the default owner belongs to the same company
    IF p_default_owner_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM users 
            WHERE id = p_default_owner_id AND company_id = p_company_id
        ) THEN
            RAISE EXCEPTION 'Default owner must belong to the same company';
        END IF;
    END IF;

    -- Upsert the settings
    INSERT INTO company_settings (company_id, default_location, default_owner_id)
    VALUES (p_company_id, p_default_location, p_default_owner_id)
    ON CONFLICT (company_id) 
    DO UPDATE SET 
        default_location = EXCLUDED.default_location,
        default_owner_id = EXCLUDED.default_owner_id,
        updated_at = now()
    RETURNING id INTO v_settings_id;

    -- Return the updated settings
    SELECT json_build_object(
        'id', cs.id,
        'company_id', cs.company_id,
        'default_location', cs.default_location,
        'default_owner_id', cs.default_owner_id,
        'default_owner_name', u.name,
        'created_at', cs.created_at,
        'updated_at', cs.updated_at,
        'success', true,
        'message', 'Settings updated successfully'
    ) INTO v_result
    FROM company_settings cs
    LEFT JOIN users u ON cs.default_owner_id = u.id
    WHERE cs.id = v_settings_id;

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;


ALTER FUNCTION "public"."upsert_company_settings"("p_company_id" "uuid", "p_default_location" "text", "p_default_owner_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_company_settings"("p_company_id" "uuid", "p_default_location" "text", "p_default_owner_id" "uuid", "p_use_default_location" boolean DEFAULT true, "p_use_default_owner" boolean DEFAULT true) RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_settings_id uuid;
    v_result json;
BEGIN
    -- Check if user is admin of this company
    IF NOT is_admin(auth.uid()) OR get_user_company_id(auth.uid()) != p_company_id THEN
        RAISE EXCEPTION 'Access denied. Only company admins can update settings.';
    END IF;

    -- Validate that the default owner belongs to the same company (only if use_default_owner is true)
    IF p_use_default_owner AND p_default_owner_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM users 
            WHERE id = p_default_owner_id AND company_id = p_company_id
        ) THEN
            RAISE EXCEPTION 'Default owner must belong to the same company';
        END IF;
    END IF;

    -- Upsert the settings
    INSERT INTO company_settings (
        company_id, 
        default_location, 
        default_owner_id, 
        use_default_location, 
        use_default_owner
    )
    VALUES (
        p_company_id, 
        p_default_location, 
        p_default_owner_id, 
        p_use_default_location, 
        p_use_default_owner
    )
    ON CONFLICT (company_id) 
    DO UPDATE SET 
        default_location = EXCLUDED.default_location,
        default_owner_id = EXCLUDED.default_owner_id,
        use_default_location = EXCLUDED.use_default_location,
        use_default_owner = EXCLUDED.use_default_owner,
        updated_at = now()
    RETURNING id INTO v_settings_id;

    -- Return the updated settings
    SELECT json_build_object(
        'id', cs.id,
        'company_id', cs.company_id,
        'default_location', cs.default_location,
        'default_owner_id', cs.default_owner_id,
        'default_owner_name', u.name,
        'use_default_location', cs.use_default_location,
        'use_default_owner', cs.use_default_owner,
        'created_at', cs.created_at,
        'updated_at', cs.updated_at,
        'success', true,
        'message', 'Settings updated successfully'
    ) INTO v_result
    FROM company_settings cs
    LEFT JOIN users u ON cs.default_owner_id = u.id
    WHERE cs.id = v_settings_id;

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;


ALTER FUNCTION "public"."upsert_company_settings"("p_company_id" "uuid", "p_default_location" "text", "p_default_owner_id" "uuid", "p_use_default_location" boolean, "p_use_default_owner" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_location_alias"("p_company_id" "uuid", "p_alias" "text", "p_normalized_location" "text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_alias_id uuid;
    v_result json;
BEGIN
    -- Check if user is admin of this company
    IF NOT is_admin(auth.uid()) OR get_user_company_id(auth.uid()) != p_company_id THEN
        RAISE EXCEPTION 'Access denied. Only company admins can manage location aliases.';
    END IF;

    -- Validate inputs
    IF TRIM(p_alias) = '' OR TRIM(p_normalized_location) = '' THEN
        RAISE EXCEPTION 'Alias and normalized location cannot be empty';
    END IF;

    -- Insert or update the alias
    INSERT INTO location_aliases (company_id, alias, normalized_location, created_by)
    VALUES (p_company_id, TRIM(p_alias), TRIM(p_normalized_location), auth.uid())
    ON CONFLICT (company_id, LOWER(alias))
    DO UPDATE SET 
        normalized_location = EXCLUDED.normalized_location
    RETURNING id INTO v_alias_id;

    -- Return success result
    SELECT json_build_object(
        'success', true,
        'message', 'Location alias saved successfully',
        'id', v_alias_id
    ) INTO v_result;

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;


ALTER FUNCTION "public"."upsert_location_alias"("p_company_id" "uuid", "p_alias" "text", "p_normalized_location" "text") OWNER TO "postgres";

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
    CONSTRAINT "checklist_reports_status_check" CHECK (("status" = ANY (ARRAY['Damaged/Needs Repair'::"text", 'Needs Replacement/Resupply'::"text"]))),
    CONSTRAINT "ck_reports_company_active" CHECK ("public"."is_company_active"("company_id"))
);


ALTER TABLE "public"."checklist_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "suspended_at" timestamp with time zone,
    "notes" "text",
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "stripe_price_id" "text",
    "stripe_status" "text",
    "current_period_end" timestamp with time zone,
    "enforcement_mode" "text" DEFAULT 'off'::"text" NOT NULL,
    "user_limit" integer,
    "tool_limit" integer,
    "tier_name" "text",
    "billing_cycle" "text",
    "plan_id" "text",
    "trial_expires_at" timestamp with time zone,
    CONSTRAINT "companies_billing_cycle_chk" CHECK (("billing_cycle" = ANY (ARRAY['monthly'::"text", 'annual'::"text"]))),
    CONSTRAINT "companies_enforcement_mode_chk" CHECK (("enforcement_mode" = ANY (ARRAY['off'::"text", 'observe'::"text", 'enforce'::"text"])))
);


ALTER TABLE "public"."companies" OWNER TO "postgres";


COMMENT ON COLUMN "public"."companies"."stripe_customer_id" IS 'Stripe customer ID for billing';



COMMENT ON COLUMN "public"."companies"."stripe_subscription_id" IS 'Stripe subscription ID';



COMMENT ON COLUMN "public"."companies"."stripe_price_id" IS 'Stripe price ID for current plan';



COMMENT ON COLUMN "public"."companies"."stripe_status" IS 'Subscription status: active, past_due, canceled, etc.';



COMMENT ON COLUMN "public"."companies"."current_period_end" IS 'When current billing period ends';



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


CREATE TABLE IF NOT EXISTS "public"."company_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "default_location" "text" NOT NULL,
    "default_owner_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "use_default_location" boolean DEFAULT true,
    "use_default_owner" boolean DEFAULT true,
    CONSTRAINT "ck_settings_company_active" CHECK ("public"."is_company_active"("company_id"))
);


ALTER TABLE "public"."company_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."location_aliases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "alias" "text" NOT NULL,
    "normalized_location" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "ck_alias_company_active" CHECK ("public"."is_company_active"("company_id"))
);


ALTER TABLE "public"."location_aliases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tool_checklists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tool_id" "uuid" NOT NULL,
    "item_name" "text" NOT NULL,
    "required" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "company_id" "uuid" NOT NULL,
    CONSTRAINT "ck_checklists_company_active" CHECK ("public"."is_company_active"("company_id"))
);


ALTER TABLE "public"."tool_checklists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tool_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tool_id" "uuid",
    "image_url" "text" NOT NULL,
    "uploaded_at" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid" NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL,
    "thumb_url" "text",
    CONSTRAINT "ck_img_company_active" CHECK ("public"."is_company_active"("company_id"))
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
    "company_id" "uuid" NOT NULL,
    CONSTRAINT "ck_tx_company_active" CHECK ("public"."is_company_active"("company_id"))
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
    "company_id" "uuid" NOT NULL,
    CONSTRAINT "ck_tools_company_active" CHECK ("public"."is_company_active"("company_id"))
);


ALTER TABLE "public"."tools" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid",
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'tech'::"text", 'superadmin'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."checklist_reports"
    ADD CONSTRAINT "checklist_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_stripe_customer_id_key" UNIQUE ("stripe_customer_id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



ALTER TABLE ONLY "public"."company_access_codes"
    ADD CONSTRAINT "company_access_codes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."company_access_codes"
    ADD CONSTRAINT "company_access_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_settings"
    ADD CONSTRAINT "company_settings_company_id_key" UNIQUE ("company_id");



ALTER TABLE ONLY "public"."company_settings"
    ADD CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."location_aliases"
    ADD CONSTRAINT "location_aliases_pkey" PRIMARY KEY ("id");



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



CREATE INDEX "idx_companies_is_active" ON "public"."companies" USING "btree" ("is_active");



CREATE INDEX "idx_location_aliases_company_id" ON "public"."location_aliases" USING "btree" ("company_id");



CREATE UNIQUE INDEX "idx_location_aliases_unique_alias" ON "public"."location_aliases" USING "btree" ("company_id", "lower"("alias"));



CREATE INDEX "idx_tool_checklists_tool_id" ON "public"."tool_checklists" USING "btree" ("tool_id");



CREATE INDEX "idx_tool_transactions_from_user_id" ON "public"."tool_transactions" USING "btree" ("from_user_id");



CREATE INDEX "idx_tool_transactions_timestamp" ON "public"."tool_transactions" USING "btree" ("timestamp");



CREATE INDEX "idx_tool_transactions_to_user_id" ON "public"."tool_transactions" USING "btree" ("to_user_id");



CREATE INDEX "idx_tool_transactions_tool_id" ON "public"."tool_transactions" USING "btree" ("tool_id");



CREATE INDEX "idx_tool_tx_location_trgm" ON "public"."tool_transactions" USING "gin" ("lower"("location") "public"."gin_trgm_ops");



CREATE INDEX "idx_tool_tx_tool_time" ON "public"."tool_transactions" USING "btree" ("tool_id", "timestamp" DESC);



CREATE INDEX "idx_tools_company_id" ON "public"."tools" USING "btree" ("company_id");



CREATE INDEX "idx_tools_description_trgm" ON "public"."tools" USING "gin" ("lower"("description") "public"."gin_trgm_ops");



CREATE INDEX "idx_tools_name_trgm" ON "public"."tools" USING "gin" ("lower"("name") "public"."gin_trgm_ops");



CREATE INDEX "idx_tools_number_trgm" ON "public"."tools" USING "gin" ("lower"("number") "public"."gin_trgm_ops");



CREATE INDEX "idx_users_company_id" ON "public"."users" USING "btree" ("company_id");



CREATE INDEX "idx_users_name_trgm" ON "public"."users" USING "gin" ("lower"("name") "public"."gin_trgm_ops");



CREATE UNIQUE INDEX "tool_images_one_primary_per_tool" ON "public"."tool_images" USING "btree" ("tool_id") WHERE ("is_primary" = true);



CREATE OR REPLACE TRIGGER "before_user_delete" BEFORE DELETE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."store_deleted_user_name"();



CREATE OR REPLACE TRIGGER "on_user_created" AFTER INSERT ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();



CREATE OR REPLACE TRIGGER "on_user_updated" AFTER UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();



CREATE OR REPLACE TRIGGER "trg_alias_active" BEFORE INSERT OR UPDATE ON "public"."location_aliases" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_company_active"();



CREATE OR REPLACE TRIGGER "trg_checklists_active" BEFORE INSERT OR UPDATE ON "public"."tool_checklists" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_company_active"();



CREATE OR REPLACE TRIGGER "trg_codes_active" BEFORE INSERT OR UPDATE ON "public"."company_access_codes" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_company_active"();



CREATE OR REPLACE TRIGGER "trg_enforce_tool_limit" BEFORE INSERT ON "public"."tools" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_tool_limit"();



CREATE OR REPLACE TRIGGER "trg_enforce_user_limit" BEFORE INSERT ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_user_limit"();



CREATE OR REPLACE TRIGGER "trg_images_active" BEFORE INSERT OR UPDATE ON "public"."tool_images" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_company_active"();



CREATE OR REPLACE TRIGGER "trg_reports_active" BEFORE INSERT OR UPDATE ON "public"."checklist_reports" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_company_active"();



CREATE OR REPLACE TRIGGER "trg_settings_active" BEFORE INSERT OR UPDATE ON "public"."company_settings" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_company_active"();



CREATE OR REPLACE TRIGGER "trg_single_primary" BEFORE INSERT OR UPDATE ON "public"."tool_images" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_single_primary"();



CREATE OR REPLACE TRIGGER "trg_tools_active" BEFORE INSERT OR UPDATE ON "public"."tools" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_company_active"();



CREATE OR REPLACE TRIGGER "trg_tx_active" BEFORE INSERT OR UPDATE ON "public"."tool_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_company_active"();



ALTER TABLE ONLY "public"."checklist_reports"
    ADD CONSTRAINT "checklist_reports_checklist_item_id_fkey" FOREIGN KEY ("checklist_item_id") REFERENCES "public"."tool_checklists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_reports"
    ADD CONSTRAINT "checklist_reports_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_reports"
    ADD CONSTRAINT "checklist_reports_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."tool_transactions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."company_access_codes"
    ADD CONSTRAINT "company_access_codes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_settings"
    ADD CONSTRAINT "company_settings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_settings"
    ADD CONSTRAINT "company_settings_default_owner_id_fkey" FOREIGN KEY ("default_owner_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."location_aliases"
    ADD CONSTRAINT "location_aliases_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."location_aliases"
    ADD CONSTRAINT "location_aliases_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."tool_checklists"
    ADD CONSTRAINT "tool_checklists_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tool_checklists"
    ADD CONSTRAINT "tool_checklists_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tool_images"
    ADD CONSTRAINT "tool_images_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tool_transactions"
    ADD CONSTRAINT "tool_transactions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tool_transactions"
    ADD CONSTRAINT "tool_transactions_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tool_transactions"
    ADD CONSTRAINT "tool_transactions_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tool_transactions"
    ADD CONSTRAINT "tool_transactions_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tools"
    ADD CONSTRAINT "tools_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tools"
    ADD CONSTRAINT "tools_current_owner_fkey" FOREIGN KEY ("current_owner") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can manage access codes in their company" ON "public"."company_access_codes" TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id"))) WITH CHECK (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id")));



CREATE POLICY "Admins can manage checklist reports in their company" ON "public"."checklist_reports" TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id"))) WITH CHECK (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id")));



CREATE POLICY "Admins can manage checklists in their company" ON "public"."tool_checklists" TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id"))) WITH CHECK (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id")));



CREATE POLICY "Admins can manage company settings" ON "public"."company_settings" TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id"))) WITH CHECK (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id")));



CREATE POLICY "Admins can manage images in their company" ON "public"."tool_images" TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id"))) WITH CHECK (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id")));



CREATE POLICY "Admins can manage location aliases" ON "public"."location_aliases" TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id"))) WITH CHECK (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id")));



CREATE POLICY "Admins can manage their company's access codes" ON "public"."company_access_codes" TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id"))) WITH CHECK (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id")));



CREATE POLICY "Admins can manage their own company" ON "public"."companies" TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND ("id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("id"))) WITH CHECK (("public"."is_admin"("auth"."uid"()) AND ("id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("id")));



CREATE POLICY "Admins can manage tools in their company" ON "public"."tools" TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id"))) WITH CHECK (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id")));



CREATE POLICY "Admins can manage transactions in their company" ON "public"."tool_transactions" TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id"))) WITH CHECK (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id")));



CREATE POLICY "Admins can manage users in their company" ON "public"."users" TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id"))) WITH CHECK (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id")));



CREATE POLICY "Service role can do everything on access codes" ON "public"."company_access_codes" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can do everything on checklists" ON "public"."tool_checklists" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can do everything on companies" ON "public"."companies" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can do everything on company_settings" ON "public"."company_settings" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can do everything on location_aliases" ON "public"."location_aliases" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can do everything on reports" ON "public"."checklist_reports" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can do everything on tool_images" ON "public"."tool_images" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can do everything on tools" ON "public"."tools" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can do everything on transactions" ON "public"."tool_transactions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can do everything on users" ON "public"."users" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Superadmins can create access codes" ON "public"."company_access_codes" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_superadmin"("auth"."uid"()));



CREATE POLICY "Superadmins can delete access codes" ON "public"."company_access_codes" FOR DELETE TO "authenticated" USING ("public"."is_superadmin"("auth"."uid"()));



CREATE POLICY "Superadmins can manage all companies" ON "public"."companies" TO "authenticated" USING ("public"."is_superadmin"("auth"."uid"())) WITH CHECK ("public"."is_superadmin"("auth"."uid"()));



CREATE POLICY "Superadmins can view all access codes" ON "public"."company_access_codes" FOR SELECT TO "authenticated" USING ("public"."is_superadmin"("auth"."uid"()));



CREATE POLICY "Superadmins can view all tools" ON "public"."tools" FOR SELECT TO "authenticated" USING ("public"."is_superadmin"("auth"."uid"()));



CREATE POLICY "Superadmins can view all transactions" ON "public"."tool_transactions" FOR SELECT TO "authenticated" USING ("public"."is_superadmin"("auth"."uid"()));



CREATE POLICY "Superadmins can view all users" ON "public"."users" FOR SELECT TO "authenticated" USING ("public"."is_superadmin"("auth"."uid"()));



CREATE POLICY "Techs can view tech access codes in their company" ON "public"."company_access_codes" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'tech'::"text") AND ("users"."company_id" = "company_access_codes"."company_id")))) AND ("role" = 'tech'::"text")));



CREATE POLICY "Users can create checklist reports in their company" ON "public"."checklist_reports" FOR INSERT TO "authenticated" WITH CHECK (("company_id" = "public"."get_user_company_id"("auth"."uid"())));



CREATE POLICY "Users can create transactions in their company" ON "public"."tool_transactions" FOR INSERT TO "authenticated" WITH CHECK ((("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND (("from_user_id" = "auth"."uid"()) OR ("to_user_id" = "auth"."uid"()) OR ("from_user_id" IS NULL)) AND (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "tool_transactions"."to_user_id") AND ("users"."company_id" = "public"."get_user_company_id"("auth"."uid"())))))));



CREATE POLICY "Users can delete images in their company" ON "public"."tool_images" FOR DELETE TO "authenticated" USING ((("company_id" = "public"."get_user_company_id"("auth"."uid"())) OR (EXISTS ( SELECT 1
   FROM "public"."tools"
  WHERE (("tools"."id" = "tool_images"."tool_id") AND ("tools"."current_owner" = "auth"."uid"()))))));



CREATE POLICY "Users can insert images in their company" ON "public"."tool_images" FOR INSERT TO "authenticated" WITH CHECK ((("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND (EXISTS ( SELECT 1
   FROM "public"."tools"
  WHERE (("tools"."id" = "tool_images"."tool_id") AND ("tools"."company_id" = "public"."get_user_company_id"("auth"."uid"())))))));



CREATE POLICY "Users can update tool ownership for transfers" ON "public"."tools" FOR UPDATE TO "authenticated" USING (("company_id" = "public"."get_user_company_id"("auth"."uid"()))) WITH CHECK (("company_id" = "public"."get_user_company_id"("auth"."uid"())));



CREATE POLICY "Users can view checklist reports in their company" ON "public"."checklist_reports" FOR SELECT TO "authenticated" USING ((("company_id" = "public"."get_user_company_id"("auth"."uid"())) OR (EXISTS ( SELECT 1
   FROM "public"."tool_transactions"
  WHERE (("tool_transactions"."id" = "checklist_reports"."transaction_id") AND (("tool_transactions"."from_user_id" = "auth"."uid"()) OR ("tool_transactions"."to_user_id" = "auth"."uid"())))))));



CREATE POLICY "Users can view checklists in their company" ON "public"."tool_checklists" FOR SELECT TO "authenticated" USING (("company_id" = "public"."get_user_company_id"("auth"."uid"())));



CREATE POLICY "Users can view images in their company" ON "public"."tool_images" FOR SELECT TO "authenticated" USING ((("company_id" = "public"."get_user_company_id"("auth"."uid"())) OR (EXISTS ( SELECT 1
   FROM "public"."tools"
  WHERE (("tools"."id" = "tool_images"."tool_id") AND ("tools"."current_owner" = "auth"."uid"()))))));



CREATE POLICY "Users can view other users in their company" ON "public"."users" FOR SELECT TO "authenticated" USING (("company_id" = "public"."get_user_company_id"("auth"."uid"())));



CREATE POLICY "Users can view their company aliases" ON "public"."location_aliases" FOR SELECT TO "authenticated" USING (("company_id" = "public"."get_user_company_id"("auth"."uid"())));



CREATE POLICY "Users can view their company settings" ON "public"."company_settings" FOR SELECT TO "authenticated" USING (("company_id" = "public"."get_user_company_id"("auth"."uid"())));



CREATE POLICY "Users can view their own company" ON "public"."companies" FOR SELECT TO "authenticated" USING (("id" = "public"."get_user_company_id"("auth"."uid"())));



CREATE POLICY "Users can view their own record" ON "public"."users" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view tools in their company" ON "public"."tools" FOR SELECT TO "authenticated" USING (("company_id" = "public"."get_user_company_id"("auth"."uid"())));



CREATE POLICY "Users can view transactions in their company" ON "public"."tool_transactions" FOR SELECT TO "authenticated" USING ((("company_id" = "public"."get_user_company_id"("auth"."uid"())) OR ("from_user_id" = "auth"."uid"()) OR ("to_user_id" = "auth"."uid"())));



ALTER TABLE "public"."checklist_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_access_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."location_aliases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tool_checklists" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tool_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tool_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tools" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."check_company_limits"("p_company_id" "uuid", "p_kind" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_company_limits"("p_company_id" "uuid", "p_kind" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_company_limits"("p_company_id" "uuid", "p_kind" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_tool_with_checklist"("p_number" "text", "p_name" "text", "p_description" "text", "p_photo_url" "text", "p_company_id" "uuid", "p_checklist" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_tool_with_checklist"("p_number" "text", "p_name" "text", "p_description" "text", "p_photo_url" "text", "p_company_id" "uuid", "p_checklist" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_tool_with_checklist"("p_number" "text", "p_name" "text", "p_description" "text", "p_photo_url" "text", "p_company_id" "uuid", "p_checklist" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_location_alias"("p_alias_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_location_alias"("p_alias_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_location_alias"("p_alias_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_tool"("p_tool_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_tool"("p_tool_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_tool"("p_tool_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_user"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_company_active"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_company_active"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_company_active"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_tool_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_tool_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_tool_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_user_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_user_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_user_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_single_primary"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_single_primary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_single_primary"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_companies_overview"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_companies_overview"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_companies_overview"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_company_aliases"("p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_company_aliases"("p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_company_aliases"("p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_company_settings"("p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_company_settings"("p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_company_settings"("p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_company_settings"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_company_settings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_company_settings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_company_id"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_company_id"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_company_id"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_company_active"("cid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_company_active"("cid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_company_active"("cid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_superadmin"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_superadmin"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_superadmin"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."normalize_location"("p_company_id" "uuid", "p_input_location" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."normalize_location"("p_company_id" "uuid", "p_input_location" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalize_location"("p_company_id" "uuid", "p_input_location" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_tools"("p_company_id" "uuid", "p_term" "text", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_tools"("p_company_id" "uuid", "p_term" "text", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_tools"("p_company_id" "uuid", "p_term" "text", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_tools"("p_company_id" "uuid", "p_term" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_tools"("p_company_id" "uuid", "p_term" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_tools"("p_company_id" "uuid", "p_term" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_checklist_items"("items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."set_checklist_items"("items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_checklist_items"("items" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."store_deleted_user_name"() TO "anon";
GRANT ALL ON FUNCTION "public"."store_deleted_user_name"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."store_deleted_user_name"() TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_company_settings"("p_company_id" "uuid", "p_default_location" "text", "p_default_owner_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_company_settings"("p_company_id" "uuid", "p_default_location" "text", "p_default_owner_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_company_settings"("p_company_id" "uuid", "p_default_location" "text", "p_default_owner_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_company_settings"("p_company_id" "uuid", "p_default_location" "text", "p_default_owner_id" "uuid", "p_use_default_location" boolean, "p_use_default_owner" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_company_settings"("p_company_id" "uuid", "p_default_location" "text", "p_default_owner_id" "uuid", "p_use_default_location" boolean, "p_use_default_owner" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_company_settings"("p_company_id" "uuid", "p_default_location" "text", "p_default_owner_id" "uuid", "p_use_default_location" boolean, "p_use_default_owner" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_location_alias"("p_company_id" "uuid", "p_alias" "text", "p_normalized_location" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_location_alias"("p_company_id" "uuid", "p_alias" "text", "p_normalized_location" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_location_alias"("p_company_id" "uuid", "p_alias" "text", "p_normalized_location" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."checklist_reports" TO "anon";
GRANT ALL ON TABLE "public"."checklist_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."checklist_reports" TO "service_role";



GRANT ALL ON TABLE "public"."companies" TO "anon";
GRANT ALL ON TABLE "public"."companies" TO "authenticated";
GRANT ALL ON TABLE "public"."companies" TO "service_role";



GRANT ALL ON TABLE "public"."company_access_codes" TO "anon";
GRANT ALL ON TABLE "public"."company_access_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."company_access_codes" TO "service_role";



GRANT ALL ON TABLE "public"."company_settings" TO "anon";
GRANT ALL ON TABLE "public"."company_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."company_settings" TO "service_role";



GRANT ALL ON TABLE "public"."location_aliases" TO "anon";
GRANT ALL ON TABLE "public"."location_aliases" TO "authenticated";
GRANT ALL ON TABLE "public"."location_aliases" TO "service_role";



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



























