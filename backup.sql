

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


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";








ALTER SCHEMA "public" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."assign_personal_tool_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.number IS NULL OR NEW.number = '' THEN
    SELECT (COALESCE(MAX(number_numeric), 0) + 1)::text
    INTO NEW.number
    FROM public.personal_tools
    WHERE owner_id = NEW.owner_id AND number_numeric < 999999;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."assign_personal_tool_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_tracker_to_company"("p_serial" "text", "p_company_id" "uuid", "p_notes" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not public.is_superadmin(auth.uid()) then
    raise exception 'Only a superadmin can assign trackers to companies';
  end if;

  insert into public.trackers (serial) values (p_serial)
  on conflict (serial) do nothing;

  if exists (
    select 1 from public.tracker_company_assignments
    where serial = p_serial and released_at is null
  ) then
    raise exception 'Tracker % is already assigned to a company', p_serial;
  end if;

  insert into public.tracker_company_assignments (serial, company_id, assigned_by, notes)
  values (p_serial, p_company_id, auth.uid(), p_notes);
end;
$$;


ALTER FUNCTION "public"."assign_tracker_to_company"("p_serial" "text", "p_company_id" "uuid", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."attach_tracker_to_tool"("p_serial" "text", "p_tool_id" "uuid", "p_mount_type" "text" DEFAULT 'temporary'::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_company_id uuid := public.get_user_company_id(auth.uid());
  v_actor_name text;
  v_tool_number text;
  v_tool_name text;
  v_tracker_label text;
begin
  if v_company_id is null then
    raise exception 'No company for current user';
  end if;

  if p_mount_type is null or p_mount_type not in ('temporary', 'permanent') then
    raise exception 'mount_type must be temporary or permanent';
  end if;

  if not exists (
    select 1 from public.tracker_company_assignments
    where serial = p_serial and company_id = v_company_id and released_at is null
  ) then
    raise exception 'Tracker % is not assigned to your company', p_serial;
  end if;

  if not exists (
    select 1 from public.tools where id = p_tool_id and company_id = v_company_id
  ) then
    raise exception 'Tool does not belong to your company';
  end if;

  if exists (
    select 1 from public.tracker_tool_assignments
    where serial = p_serial and detached_at is null
  ) then
    raise exception 'Tracker % is already attached to a tool', p_serial;
  end if;

  insert into public.tracker_tool_assignments
    (serial, tool_id, company_id, mount_type, attached_by)
  values (p_serial, p_tool_id, v_company_id, p_mount_type, auth.uid());

  -- Show a position right away if any in-window fix already exists.
  perform public.refresh_tool_current_location(p_tool_id);

  -- History line item.
  select coalesce(u.name, 'Someone') into v_actor_name
    from public.users u where u.id = auth.uid();
  select t.number, t.name into v_tool_number, v_tool_name
    from public.tools t where t.id = p_tool_id;
  select coalesce(tr.label, p_serial) into v_tracker_label
    from public.trackers tr where tr.serial = p_serial;
  if v_tracker_label is null then
    v_tracker_label := p_serial;
  end if;

  insert into public.company_events
    (company_id, event_type, actor_id, actor_name, target_type, target_id, target_label, details)
  values (
    v_company_id,
    'tracker_attached',
    auth.uid(),
    coalesce(v_actor_name, 'Someone'),
    'tool',
    p_tool_id,
    '#' || coalesce(v_tool_number, '?') || ' - ' || coalesce(v_tool_name, 'Tool'),
    'Tracker ' || v_tracker_label || ' attached (' || p_mount_type || ')'
  );
end;
$$;


ALTER FUNCTION "public"."attach_tracker_to_tool"("p_serial" "text", "p_tool_id" "uuid", "p_mount_type" "text") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."company_tracked_tools_map"() RETURNS TABLE("tool_id" "uuid", "number" "text", "name" "text", "latitude" double precision, "longitude" double precision, "recorded_at" timestamp with time zone, "serial" "text", "mount_type" "text", "battery" double precision, "thumb_url" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select t.id,
         t.number,
         t.name,
         t.last_latitude,
         t.last_longitude,
         t.last_location_recorded_at,
         t.last_location_serial,
         tta.mount_type,
         t.last_battery,
         coalesce(
           (select ti.thumb_url
              from public.tool_images ti
             where ti.tool_id = t.id
             order by ti.is_primary desc, ti.uploaded_at asc
             limit 1),
           (select ti.image_url
              from public.tool_images ti
             where ti.tool_id = t.id
             order by ti.is_primary desc, ti.uploaded_at asc
             limit 1),
           t.photo_url
         ) as thumb_url
  from public.tools t
  left join public.tracker_tool_assignments tta
    on tta.tool_id = t.id and tta.detached_at is null
  where t.company_id = public.get_user_company_id(auth.uid())
    and t.is_deleted = false
    and t.last_latitude is not null
    and t.last_longitude is not null;
$$;


ALTER FUNCTION "public"."company_tracked_tools_map"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."company_tracker_pool"() RETURNS TABLE("serial" "text", "label" "text", "assigned_at" timestamp with time zone, "last_seen_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select tca.serial, tr.label, tca.assigned_at, tr.last_seen_at
  from public.tracker_company_assignments tca
  left join public.trackers tr on tr.serial = tca.serial
  where tca.company_id = public.get_user_company_id(auth.uid())
    and tca.released_at is null
    and not exists (
      select 1 from public.tracker_tool_assignments tta
      where tta.serial = tca.serial and tta.detached_at is null
    )
  order by tca.assigned_at desc;
$$;


ALTER FUNCTION "public"."company_tracker_pool"() OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."detach_tracker_from_tool"("p_tool_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_company_id uuid := public.get_user_company_id(auth.uid());
  v_serial text;
  v_actor_name text;
  v_tool_number text;
  v_tool_name text;
  v_tracker_label text;
begin
  -- Remember which tracker was on the tool so we can describe the event.
  select tta.serial into v_serial
    from public.tracker_tool_assignments tta
   where tta.tool_id = p_tool_id
     and tta.company_id = v_company_id
     and tta.detached_at is null
   limit 1;

  update public.tracker_tool_assignments
     set detached_at = now(), detached_by = auth.uid()
   where tool_id = p_tool_id
     and company_id = v_company_id
     and detached_at is null;

  update public.tools
     set last_latitude = null,
         last_longitude = null,
         last_location_recorded_at = null,
         last_location_updated_at = now(),
         last_location_serial = null
   where id = p_tool_id
     and company_id = v_company_id;

  -- Only log if something was actually detached.
  if v_serial is null then
    return;
  end if;

  select coalesce(u.name, 'Someone') into v_actor_name
    from public.users u where u.id = auth.uid();
  select t.number, t.name into v_tool_number, v_tool_name
    from public.tools t where t.id = p_tool_id;
  select coalesce(tr.label, v_serial) into v_tracker_label
    from public.trackers tr where tr.serial = v_serial;
  if v_tracker_label is null then
    v_tracker_label := v_serial;
  end if;

  insert into public.company_events
    (company_id, event_type, actor_id, actor_name, target_type, target_id, target_label, details)
  values (
    v_company_id,
    'tracker_detached',
    auth.uid(),
    coalesce(v_actor_name, 'Someone'),
    'tool',
    p_tool_id,
    '#' || coalesce(v_tool_number, '?') || ' - ' || coalesce(v_tool_name, 'Tool'),
    'Tracker ' || v_tracker_label || ' detached'
  );
end;
$$;


ALTER FUNCTION "public"."detach_tracker_from_tool"("p_tool_id" "uuid") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."extract_tool_number"("text_number" "text") RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    AS $$
  SELECT COALESCE(
    (regexp_match(text_number, '^\d+'))[1]::integer,
    999999  -- Tools without numbers go to the end
  );
$$;


ALTER FUNCTION "public"."extract_tool_number"("text_number" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_companies_overview"() RETURNS TABLE("id" "uuid", "name" "text", "is_active" boolean, "created_at" timestamp with time zone, "suspended_at" timestamp with time zone, "notes" "text", "user_count" bigint, "tool_count" bigint, "last_activity" timestamp with time zone, "user_limit" integer, "tool_limit" integer, "enforcement_mode" "text", "tier_name" "text", "billing_cycle" "text", "plan_id" "text", "trial_expires_at" timestamp with time zone, "personal_tools_enabled" boolean, "trackers_enabled" boolean, "tool_costing_enabled" boolean)
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
      c.trial_expires_at,
      c.personal_tools_enabled,
      c.trackers_enabled,
      c.tool_costing_enabled
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
  SELECT company_id INTO v_company_id FROM users WHERE id = auth.uid();
  IF v_company_id IS NULL THEN
    RETURN json_build_object('error', 'User not found or not associated with a company');
  END IF;

  SELECT json_build_object(
    'id', cs.id,
    'company_id', cs.company_id,
    'default_location', cs.default_location,
    'default_owner_id', cs.default_owner_id,
    'default_owner_name', u.name,
    'use_default_location', cs.use_default_location,
    'use_default_owner', cs.use_default_owner,
    'auto_export_enabled', cs.auto_export_enabled,
    'auto_export_frequency', cs.auto_export_frequency,
    'auto_export_recipients', cs.auto_export_recipients,
    'auto_export_last_sent_at', cs.auto_export_last_sent_at,
    'company_export_enabled', cs.company_export_enabled,
    'company_export_frequency', cs.company_export_frequency,
    'company_export_recipients', cs.company_export_recipients,
    'company_export_last_sent_at', cs.company_export_last_sent_at,
    'created_at', cs.created_at,
    'updated_at', cs.updated_at
  ) INTO v_result
  FROM company_settings cs
  LEFT JOIN users u ON cs.default_owner_id = u.id
  WHERE cs.company_id = v_company_id;

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


CREATE OR REPLACE FUNCTION "public"."log_group_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_id uuid;
  v_actor_name text;
  v_action text;
  v_group_id uuid;
  v_group_name text;
  v_company_id uuid;
begin
  v_actor_id := auth.uid();

  if (tg_op = 'INSERT') then
    v_action := 'created';
    v_group_id := new.id;
    v_group_name := new.name;
    v_company_id := new.company_id;
    if v_actor_id is null then
      v_actor_id := new.created_by;
    end if;
  elsif (tg_op = 'DELETE') then
    v_action := 'deleted';
    v_group_id := old.id;
    v_group_name := old.name;
    v_company_id := old.company_id;
    if v_actor_id is null then
      v_actor_id := old.created_by;
    end if;
  else
    return coalesce(new, old);
  end if;

  select name into v_actor_name from public.users where id = v_actor_id;

  insert into public.group_activity_log (
    company_id,
    group_id,
    group_name,
    action,
    actor_user_id,
    actor_name
  ) values (
    v_company_id,
    v_group_id,
    v_group_name,
    v_action,
    v_actor_id,
    v_actor_name
  );

  return coalesce(new, old);
end;
$$;


ALTER FUNCTION "public"."log_group_activity"() OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."reclaim_tracker_to_global"("p_serial" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not public.is_superadmin(auth.uid()) then
    raise exception 'Only a superadmin can reclaim trackers';
  end if;

  update public.tracker_tool_assignments
     set detached_at = now(), detached_by = auth.uid()
   where serial = p_serial and detached_at is null;

  update public.tracker_company_assignments
     set released_at = now(), released_by = auth.uid()
   where serial = p_serial and released_at is null;
end;
$$;


ALTER FUNCTION "public"."reclaim_tracker_to_global"("p_serial" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recompute_company_active_on_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_user_limit integer;
  v_tool_limit integer;
  v_user_count integer;
  v_tool_count integer;
  v_over boolean := false;
begin
  if old.company_id is null then
    return old;
  end if;

  select user_limit, tool_limit
    into v_user_limit, v_tool_limit
  from public.companies
  where id = old.company_id;

  select count(*)::int into v_user_count
  from public.users
  where company_id = old.company_id;

  select count(*)::int into v_tool_count
  from public.tools
  where company_id = old.company_id;

  if v_user_limit is not null and v_user_count > v_user_limit then
    v_over := true;
  end if;
  if v_tool_limit is not null and v_tool_count > v_tool_limit then
    v_over := true;
  end if;

  if not v_over then
    update public.companies
    set is_active = true,
        suspended_at = null
    where id = old.company_id
      and is_active = false;
  end if;

  return old;
end;
$$;


ALTER FUNCTION "public"."recompute_company_active_on_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_tool_current_location"("p_tool_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_serial text;
  v_fix    record;
begin
  select serial into v_serial
  from public.tracker_tool_assignments
  where tool_id = p_tool_id and detached_at is null
  limit 1;

  if v_serial is null then
    return;
  end if;

  select * into v_fix from public.tracker_latest_fix(v_serial);

  if v_fix.latitude is null then
    return;
  end if;

  update public.tools t
     set last_latitude = v_fix.latitude,
         last_longitude = v_fix.longitude,
         last_location_recorded_at = v_fix.recorded_at,
         last_location_updated_at = now(),
         last_location_serial = v_serial,
         last_battery = coalesce(v_fix.battery, t.last_battery)
   where t.id = p_tool_id;
end;
$$;


ALTER FUNCTION "public"."refresh_tool_current_location"("p_tool_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_user_from_company"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_company_id uuid;
  v_role       text;
  v_name       text;
  v_admins     int;
BEGIN
  SELECT company_id, role, name INTO v_company_id, v_role, v_name
    FROM users WHERE id = p_user_id;

  IF v_company_id IS NULL THEN
    RETURN;  -- already detached / no-op
  END IF;

  -- Never strand a company without an admin.
  IF v_role = 'admin' THEN
    SELECT COUNT(*) INTO v_admins FROM users
     WHERE company_id = v_company_id AND role = 'admin';
    IF v_admins <= 1 THEN
      RAISE EXCEPTION 'Cannot remove the last admin from the company';
    END IF;
  END IF;

  -- Preserve their name on this company's transaction history.
  UPDATE tool_transactions
     SET deleted_from_user_name = v_name, from_user_id = NULL
   WHERE from_user_id = p_user_id;
  UPDATE tool_transactions
     SET deleted_to_user_name = v_name, to_user_id = NULL
   WHERE to_user_id = p_user_id;

  -- Keep the tools under their name ("Name (removed)") instead of unassigning.
  UPDATE tools
     SET current_owner = NULL, deleted_owner_name = v_name
   WHERE current_owner = p_user_id;

  -- Clear them as the company default owner, if set.
  UPDATE company_settings SET default_owner_id = NULL WHERE default_owner_id = p_user_id;

  -- Detach the account. Account + personal tools survive.
  UPDATE users SET company_id = NULL, role = 'tech' WHERE id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."remove_user_from_company"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_tools"("p_company_id" "uuid", "p_term" "text", "p_limit" integer DEFAULT 50) RETURNS TABLE("id" "uuid", "number" "text", "name" "text", "description" "text", "photo_url" "text", "owner_name" "text", "location" "text")
    LANGUAGE "sql"
    AS $$
  with latest_tx as (
    select distinct on (tool_id) tool_id, location
    from tool_transactions where company_id = p_company_id
    order by tool_id, timestamp desc
  )
  select t.id, t.number, t.name, t.description, t.photo_url,
    coalesce(u.name, case when t.deleted_owner_name is not null then t.deleted_owner_name || ' (removed)' end) as owner_name,
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
      or lower(coalesce(u.name, t.deleted_owner_name, '')) like '%' || lower(p_term) || '%'
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
    from tool_transactions where company_id = p_company_id
    order by tool_id, timestamp desc
  ),
  primary_img as (
    select ti.tool_id, ti.thumb_url, ti.image_url
    from tool_images ti where ti.is_primary = true
  )
  select t.id, t.number, t.name, t.description, t.photo_url,
    coalesce(u.name, case when t.deleted_owner_name is not null then t.deleted_owner_name || ' (removed)' end) as owner_name,
    coalesce(l.location, '') as location,
    pi.thumb_url as primary_thumb_url, pi.image_url as primary_image_url
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
      or lower(coalesce(u.name, t.deleted_owner_name, '')) like '%' || lower(p_term) || '%'
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
    UPDATE tool_transactions SET deleted_from_user_name = OLD.name WHERE from_user_id = OLD.id;
    UPDATE tool_transactions SET deleted_to_user_name   = OLD.name WHERE to_user_id   = OLD.id;
    UPDATE tools SET current_owner = NULL, deleted_owner_name = OLD.name WHERE current_owner = OLD.id;
    RETURN OLD;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in store_deleted_user_name: %', SQLERRM;
        RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."store_deleted_user_name"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."superadmin_company_tracker_history"("p_company_id" "uuid") RETURNS TABLE("serial" "text", "label" "text", "assigned_at" timestamp with time zone, "released_at" timestamp with time zone, "is_active" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select tca.serial,
         tr.label,
         tca.assigned_at,
         tca.released_at,
         (tca.released_at is null) as is_active
  from public.tracker_company_assignments tca
  left join public.trackers tr on tr.serial = tca.serial
  where public.is_superadmin(auth.uid())
    and tca.company_id = p_company_id
  order by tca.assigned_at desc;
$$;


ALTER FUNCTION "public"."superadmin_company_tracker_history"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."superadmin_company_trackers"() RETURNS TABLE("serial" "text", "label" "text", "company_id" "uuid", "company_name" "text", "assigned_at" timestamp with time zone, "last_seen_at" timestamp with time zone, "tool_id" "uuid", "tool_name" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select tca.serial,
         tr.label,
         tca.company_id,
         c.name,
         tca.assigned_at,
         tr.last_seen_at,
         tta.tool_id,
         t.name
  from public.tracker_company_assignments tca
  join public.companies c on c.id = tca.company_id
  left join public.trackers tr on tr.serial = tca.serial
  left join public.tracker_tool_assignments tta
    on tta.serial = tca.serial and tta.detached_at is null
  left join public.tools t on t.id = tta.tool_id
  where public.is_superadmin(auth.uid())
    and tca.released_at is null
  order by c.name, tca.serial;
$$;


ALTER FUNCTION "public"."superadmin_company_trackers"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."superadmin_global_tracker_pool"() RETURNS TABLE("serial" "text", "label" "text", "last_seen_at" timestamp with time zone, "first_seen_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select tr.serial, tr.label, tr.last_seen_at, tr.first_seen_at
  from public.trackers tr
  where public.is_superadmin(auth.uid())
    and tr.is_synthetic = false
    and not exists (
      select 1 from public.tracker_company_assignments tca
      where tca.serial = tr.serial and tca.released_at is null
    )
  order by tr.last_seen_at desc nulls last, tr.serial;
$$;


ALTER FUNCTION "public"."superadmin_global_tracker_pool"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tool_breadcrumb"("p_tool_id" "uuid", "p_since" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS TABLE("serial" "text", "latitude" double precision, "longitude" double precision, "recorded_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select tl.serial, tl.latitude, tl.longitude,
         coalesce(tl.recorded_at, tl.received_at) as recorded_at
  from public.tracker_tool_assignments tta
  join public.tracker_locations tl
    on tl.serial = tta.serial
   and tl.latitude is not null
   and tl.longitude is not null
   and coalesce(tl.recorded_at, tl.received_at) >= tta.attached_at
   and (tta.detached_at is null
        or coalesce(tl.recorded_at, tl.received_at) <= tta.detached_at)
  where tta.tool_id = p_tool_id
    and (
      tta.company_id = public.get_user_company_id(auth.uid())
      or public.is_superadmin(auth.uid())
    )
    and (p_since is null or coalesce(tl.recorded_at, tl.received_at) >= p_since)
  order by recorded_at asc;
$$;


ALTER FUNCTION "public"."tool_breadcrumb"("p_tool_id" "uuid", "p_since" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tool_current_location"("p_tool_id" "uuid") RETURNS TABLE("serial" "text", "latitude" double precision, "longitude" double precision, "recorded_at" timestamp with time zone, "battery" double precision)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select tl.serial, tl.latitude, tl.longitude, tl.recorded_at, tl.battery
  from public.tracker_tool_assignments tta
  join public.tracker_locations tl
    on tl.serial = tta.serial
   and tl.latitude is not null
   and tl.longitude is not null
   and coalesce(tl.recorded_at, tl.received_at) >= tta.attached_at
   and (tta.detached_at is null
        or coalesce(tl.recorded_at, tl.received_at) <= tta.detached_at)
  where tta.tool_id = p_tool_id
    and tta.detached_at is null
  order by coalesce(tl.recorded_at, tl.received_at) desc
  limit 1;
$$;


ALTER FUNCTION "public"."tool_current_location"("p_tool_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tool_tracker_history"("p_tool_id" "uuid") RETURNS TABLE("serial" "text", "mount_type" "text", "attached_at" timestamp with time zone, "detached_at" timestamp with time zone, "is_active" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select tta.serial,
         tta.mount_type,
         tta.attached_at,
         tta.detached_at,
         (tta.detached_at is null) as is_active
  from public.tracker_tool_assignments tta
  where tta.tool_id = p_tool_id
    and (
      tta.company_id = public.get_user_company_id(auth.uid())
      or public.is_superadmin(auth.uid())
    )
  order by tta.attached_at desc;
$$;


ALTER FUNCTION "public"."tool_tracker_history"("p_tool_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tracker_latest_fix"("p_serial" "text") RETURNS TABLE("latitude" double precision, "longitude" double precision, "recorded_at" timestamp with time zone, "battery" double precision)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select tl.latitude, tl.longitude,
         coalesce(tl.recorded_at, tl.received_at) as recorded_at,
         tl.battery
  from public.tracker_locations tl
  where tl.serial = p_serial
    and tl.latitude is not null
    and tl.longitude is not null
  order by coalesce(tl.recorded_at, tl.received_at) desc
  limit 1;
$$;


ALTER FUNCTION "public"."tracker_latest_fix"("p_serial" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tracker_locations_sync_current"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_tool_id    uuid;
  v_fix_at     timestamptz;
begin
  if new.serial is null then
    return new;
  end if;

  insert into public.trackers (serial, first_seen_at, last_seen_at)
  values (new.serial, new.received_at, new.received_at)
  on conflict (serial) do update
    set last_seen_at = greatest(public.trackers.last_seen_at, excluded.last_seen_at);

  if new.latitude is null or new.longitude is null then
    return new;
  end if;

  v_fix_at := coalesce(new.recorded_at, new.received_at);

  select tta.tool_id into v_tool_id
  from public.tracker_tool_assignments tta
  where tta.serial = new.serial
    and tta.detached_at is null
  limit 1;

  if v_tool_id is null then
    return new;
  end if;

  update public.tools t
     set last_latitude = new.latitude,
         last_longitude = new.longitude,
         last_location_recorded_at = v_fix_at,
         last_location_updated_at = now(),
         last_location_serial = new.serial,
         last_battery = coalesce(new.battery, t.last_battery)
   where t.id = v_tool_id
     and (t.last_location_recorded_at is null
          or v_fix_at >= t.last_location_recorded_at);

  return new;
end;
$$;


ALTER FUNCTION "public"."tracker_locations_sync_current"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_app_version_control_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_app_version_control_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_company_export_settings"("p_company_id" "uuid", "p_enabled" boolean, "p_recipients" "text"[], "p_frequency" "text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_settings_id uuid;
  v_result json;
BEGIN
  IF NOT is_admin(auth.uid()) OR get_user_company_id(auth.uid()) != p_company_id THEN
    RAISE EXCEPTION 'Access denied. Only company admins can update settings.';
  END IF;

  IF p_frequency NOT IN ('weekly','monthly') THEN
    RAISE EXCEPTION 'Frequency must be weekly or monthly';
  END IF;

  -- If no settings row exists yet, create one WITHOUT turning on the
  -- location/owner defaults (so this can't accidentally affect new tools).
  INSERT INTO company_settings (
    company_id, default_location, use_default_location, use_default_owner,
    auto_export_enabled, auto_export_recipients, auto_export_frequency
  )
  VALUES (
    p_company_id, '', false, false,
    p_enabled, COALESCE(p_recipients, '{}'::text[]), p_frequency
  )
  ON CONFLICT (company_id) DO UPDATE SET
    auto_export_enabled    = EXCLUDED.auto_export_enabled,
    auto_export_recipients = EXCLUDED.auto_export_recipients,
    auto_export_frequency  = EXCLUDED.auto_export_frequency,
    updated_at = now()
  RETURNING id INTO v_settings_id;

  SELECT json_build_object(
    'id', cs.id,
    'company_id', cs.company_id,
    'default_location', cs.default_location,
    'default_owner_id', cs.default_owner_id,
    'default_owner_name', u.name,
    'use_default_location', cs.use_default_location,
    'use_default_owner', cs.use_default_owner,
    'auto_export_enabled', cs.auto_export_enabled,
    'auto_export_frequency', cs.auto_export_frequency,
    'auto_export_recipients', cs.auto_export_recipients,
    'auto_export_last_sent_at', cs.auto_export_last_sent_at,
    'success', true,
    'message', 'Export settings updated successfully'
  ) INTO v_result
  FROM company_settings cs
  LEFT JOIN users u ON cs.default_owner_id = u.id
  WHERE cs.id = v_settings_id;

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."upsert_company_export_settings"("p_company_id" "uuid", "p_enabled" boolean, "p_recipients" "text"[], "p_frequency" "text") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."upsert_company_tools_export_settings"("p_company_id" "uuid", "p_enabled" boolean, "p_recipients" "text"[], "p_frequency" "text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_settings_id uuid;
  v_result json;
BEGIN
  IF NOT is_admin(auth.uid()) OR get_user_company_id(auth.uid()) != p_company_id THEN
    RAISE EXCEPTION 'Access denied. Only company admins can update settings.';
  END IF;

  IF p_frequency NOT IN ('weekly','monthly') THEN
    RAISE EXCEPTION 'Frequency must be weekly or monthly';
  END IF;

  INSERT INTO company_settings (
    company_id, default_location, use_default_location, use_default_owner,
    company_export_enabled, company_export_recipients, company_export_frequency
  )
  VALUES (
    p_company_id, '', false, false,
    p_enabled, COALESCE(p_recipients, '{}'::text[]), p_frequency
  )
  ON CONFLICT (company_id) DO UPDATE SET
    company_export_enabled    = EXCLUDED.company_export_enabled,
    company_export_recipients = EXCLUDED.company_export_recipients,
    company_export_frequency  = EXCLUDED.company_export_frequency,
    updated_at = now()
  RETURNING id INTO v_settings_id;

  SELECT json_build_object(
    'id', cs.id,
    'company_id', cs.company_id,
    'default_location', cs.default_location,
    'default_owner_id', cs.default_owner_id,
    'default_owner_name', u.name,
    'use_default_location', cs.use_default_location,
    'use_default_owner', cs.use_default_owner,
    'auto_export_enabled', cs.auto_export_enabled,
    'auto_export_frequency', cs.auto_export_frequency,
    'auto_export_recipients', cs.auto_export_recipients,
    'auto_export_last_sent_at', cs.auto_export_last_sent_at,
    'company_export_enabled', cs.company_export_enabled,
    'company_export_frequency', cs.company_export_frequency,
    'company_export_recipients', cs.company_export_recipients,
    'company_export_last_sent_at', cs.company_export_last_sent_at,
    'success', true,
    'message', 'Company export settings updated successfully'
  ) INTO v_result
  FROM company_settings cs
  LEFT JOIN users u ON cs.default_owner_id = u.id
  WHERE cs.id = v_settings_id;

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."upsert_company_tools_export_settings"("p_company_id" "uuid", "p_enabled" boolean, "p_recipients" "text"[], "p_frequency" "text") OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."app_version_control" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "platform" "text" NOT NULL,
    "minimum_version" "text" NOT NULL,
    "current_version" "text" NOT NULL,
    "force_update_enabled" boolean DEFAULT false,
    "update_message" "text",
    "store_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "app_version_control_platform_check" CHECK (("platform" = ANY (ARRAY['ios'::"text", 'android'::"text"])))
);


ALTER TABLE "public"."app_version_control" OWNER TO "postgres";


COMMENT ON TABLE "public"."app_version_control" IS 'Controls minimum app version requirements for force updates';



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
    "personal_tools_enabled" boolean DEFAULT true NOT NULL,
    "trackers_enabled" boolean DEFAULT true NOT NULL,
    "tool_costing_enabled" boolean DEFAULT true NOT NULL,
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


CREATE TABLE IF NOT EXISTS "public"."company_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "actor_id" "uuid",
    "actor_name" "text",
    "target_type" "text",
    "target_id" "uuid",
    "target_label" "text",
    "details" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."company_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "default_location" "text" NOT NULL,
    "default_owner_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "use_default_location" boolean DEFAULT true,
    "use_default_owner" boolean DEFAULT true,
    "auto_export_enabled" boolean DEFAULT false NOT NULL,
    "auto_export_frequency" "text" DEFAULT 'weekly'::"text" NOT NULL,
    "auto_export_recipients" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "auto_export_last_sent_at" timestamp with time zone,
    "company_export_enabled" boolean DEFAULT false NOT NULL,
    "company_export_frequency" "text" DEFAULT 'weekly'::"text" NOT NULL,
    "company_export_recipients" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "company_export_last_sent_at" timestamp with time zone,
    CONSTRAINT "ck_settings_company_active" CHECK ("public"."is_company_active"("company_id")),
    CONSTRAINT "company_settings_auto_export_frequency_check" CHECK (("auto_export_frequency" = ANY (ARRAY['weekly'::"text", 'monthly'::"text"]))),
    CONSTRAINT "company_settings_company_export_frequency_check" CHECK (("company_export_frequency" = ANY (ARRAY['weekly'::"text", 'monthly'::"text"])))
);


ALTER TABLE "public"."company_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_activity_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "group_id" "uuid",
    "group_name" "text",
    "action" "text" NOT NULL,
    "actor_user_id" "uuid",
    "actor_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "group_activity_log_action_check" CHECK (("action" = ANY (ARRAY['created'::"text", 'deleted'::"text"])))
);


ALTER TABLE "public"."group_activity_log" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."personal_inventory_exports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "exported_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "recipient" "text"
);


ALTER TABLE "public"."personal_inventory_exports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."personal_tool_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "personal_tool_id" "uuid" NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "image_url" "text" NOT NULL,
    "thumb_url" "text",
    "is_primary" boolean DEFAULT false NOT NULL,
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."personal_tool_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."personal_tool_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "personal_tool_id" "uuid" NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "to_name" "text",
    "to_user_id" "uuid",
    "location" "text",
    "notes" "text",
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "to_email" "text",
    CONSTRAINT "personal_tool_tx_action_check" CHECK (("action" = ANY (ARRAY['created'::"text", 'lent'::"text", 'returned'::"text"])))
);


ALTER TABLE "public"."personal_tool_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."personal_tools" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "number" "text",
    "number_numeric" integer GENERATED ALWAYS AS (COALESCE((("regexp_match"("number", '^\d+'::"text"))[1])::integer, 999999)) STORED,
    "name" "text" NOT NULL,
    "photo_url" "text",
    "holder_type" "text" DEFAULT 'self'::"text" NOT NULL,
    "lent_to_name" "text",
    "lent_to_user_id" "uuid",
    "lent_location" "text",
    "lent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "lent_to_email" "text",
    CONSTRAINT "personal_tools_holder_type_check" CHECK (("holder_type" = ANY (ARRAY['self'::"text", 'lent'::"text"])))
);


ALTER TABLE "public"."personal_tools" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scheduled_export_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "export_type" "text" NOT NULL,
    "run_at" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "result" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processed_at" timestamp with time zone,
    CONSTRAINT "scheduled_export_runs_export_type_check" CHECK (("export_type" = ANY (ARRAY['personal'::"text", 'company'::"text"])))
);


ALTER TABLE "public"."scheduled_export_runs" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."tool_group_members" (
    "group_id" "uuid" NOT NULL,
    "tool_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tool_group_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tool_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    CONSTRAINT "ck_tool_groups_company_active" CHECK ("public"."is_company_active"("company_id"))
);


ALTER TABLE "public"."tool_groups" OWNER TO "postgres";


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
    "batch_id" "uuid",
    "attribution" "text",
    CONSTRAINT "ck_tx_company_active" CHECK ("public"."is_company_active"("company_id"))
);


ALTER TABLE "public"."tool_transactions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."tool_transactions"."attribution" IS 'System-generated, non-editable record of how a transaction happened (tech self-claim with responsibility acknowledgment, admin override, or tech-to-tech transfer). Kept separate from the user-editable notes field.';



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
    "number_numeric" integer GENERATED ALWAYS AS (COALESCE((("regexp_match"("number", '^\d+'::"text"))[1])::integer, 999999)) STORED,
    "estimated_cost" integer,
    "tracker_required" boolean DEFAULT false NOT NULL,
    "last_latitude" double precision,
    "last_longitude" double precision,
    "last_location_recorded_at" timestamp with time zone,
    "last_location_updated_at" timestamp with time zone,
    "last_location_serial" "text",
    "last_battery" double precision,
    CONSTRAINT "ck_tools_company_active" CHECK ("public"."is_company_active"("company_id"))
);


ALTER TABLE "public"."tools" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tracker_company_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "serial" "text" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "assigned_by" "uuid",
    "released_at" timestamp with time zone,
    "released_by" "uuid",
    "notes" "text"
);


ALTER TABLE "public"."tracker_company_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tracker_locations" (
    "id" bigint NOT NULL,
    "serial" "text",
    "latitude" double precision,
    "longitude" double precision,
    "altitude" double precision,
    "speed" double precision,
    "heading" double precision,
    "accuracy" double precision,
    "battery" double precision,
    "fix_type" "text",
    "recorded_at" timestamp with time zone,
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "raw" "jsonb" NOT NULL
);


ALTER TABLE "public"."tracker_locations" OWNER TO "postgres";


ALTER TABLE "public"."tracker_locations" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."tracker_locations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."tracker_tool_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "serial" "text" NOT NULL,
    "tool_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "mount_type" "text" DEFAULT 'temporary'::"text" NOT NULL,
    "attached_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "attached_by" "uuid",
    "detached_at" timestamp with time zone,
    "detached_by" "uuid",
    "notes" "text",
    CONSTRAINT "tracker_tool_mount_type_chk" CHECK (("mount_type" = ANY (ARRAY['temporary'::"text", 'permanent'::"text"])))
);


ALTER TABLE "public"."tracker_tool_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trackers" (
    "serial" "text" NOT NULL,
    "label" "text",
    "is_synthetic" boolean DEFAULT false NOT NULL,
    "notes" "text",
    "first_seen_at" timestamp with time zone,
    "last_seen_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."trackers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transaction_batches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text",
    "location" "text",
    "stored_at" "text",
    "from_user_id" "uuid",
    "to_user_id" "uuid",
    CONSTRAINT "ck_batches_company_active" CHECK ("public"."is_company_active"("company_id"))
);


ALTER TABLE "public"."transaction_batches" OWNER TO "postgres";


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


ALTER TABLE ONLY "public"."app_version_control"
    ADD CONSTRAINT "app_version_control_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_version_control"
    ADD CONSTRAINT "app_version_control_platform_key" UNIQUE ("platform");



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



ALTER TABLE ONLY "public"."company_events"
    ADD CONSTRAINT "company_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_settings"
    ADD CONSTRAINT "company_settings_company_id_key" UNIQUE ("company_id");



ALTER TABLE ONLY "public"."company_settings"
    ADD CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_activity_log"
    ADD CONSTRAINT "group_activity_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."location_aliases"
    ADD CONSTRAINT "location_aliases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."personal_inventory_exports"
    ADD CONSTRAINT "personal_inventory_exports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."personal_tool_images"
    ADD CONSTRAINT "personal_tool_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."personal_tool_transactions"
    ADD CONSTRAINT "personal_tool_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."personal_tools"
    ADD CONSTRAINT "personal_tools_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scheduled_export_runs"
    ADD CONSTRAINT "scheduled_export_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tool_checklists"
    ADD CONSTRAINT "tool_checklists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tool_group_members"
    ADD CONSTRAINT "tool_group_members_pkey" PRIMARY KEY ("group_id", "tool_id");



ALTER TABLE ONLY "public"."tool_groups"
    ADD CONSTRAINT "tool_groups_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."tracker_company_assignments"
    ADD CONSTRAINT "tracker_company_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tracker_locations"
    ADD CONSTRAINT "tracker_locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tracker_tool_assignments"
    ADD CONSTRAINT "tracker_tool_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trackers"
    ADD CONSTRAINT "trackers_pkey" PRIMARY KEY ("serial");



ALTER TABLE ONLY "public"."transaction_batches"
    ADD CONSTRAINT "transaction_batches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "company_events_company_created_idx" ON "public"."company_events" USING "btree" ("company_id", "created_at" DESC);



CREATE INDEX "idx_checklist_reports_checklist_item_id" ON "public"."checklist_reports" USING "btree" ("checklist_item_id");



CREATE INDEX "idx_checklist_reports_transaction_id" ON "public"."checklist_reports" USING "btree" ("transaction_id");



CREATE INDEX "idx_companies_is_active" ON "public"."companies" USING "btree" ("is_active");



CREATE INDEX "idx_location_aliases_company_id" ON "public"."location_aliases" USING "btree" ("company_id");



CREATE UNIQUE INDEX "idx_location_aliases_unique_alias" ON "public"."location_aliases" USING "btree" ("company_id", "lower"("alias"));



CREATE INDEX "idx_personal_exports_owner" ON "public"."personal_inventory_exports" USING "btree" ("owner_id", "exported_at" DESC);



CREATE INDEX "idx_personal_tool_images_owner" ON "public"."personal_tool_images" USING "btree" ("owner_id");



CREATE INDEX "idx_personal_tool_images_tool" ON "public"."personal_tool_images" USING "btree" ("personal_tool_id");



CREATE INDEX "idx_personal_tool_tx_owner" ON "public"."personal_tool_transactions" USING "btree" ("owner_id");



CREATE INDEX "idx_personal_tool_tx_tool" ON "public"."personal_tool_transactions" USING "btree" ("personal_tool_id", "timestamp" DESC);



CREATE INDEX "idx_personal_tools_lent_trgm" ON "public"."personal_tools" USING "gin" ("lower"(COALESCE("lent_to_name", ''::"text")) "public"."gin_trgm_ops");



CREATE INDEX "idx_personal_tools_name_trgm" ON "public"."personal_tools" USING "gin" ("lower"("name") "public"."gin_trgm_ops");



CREATE INDEX "idx_personal_tools_owner" ON "public"."personal_tools" USING "btree" ("owner_id");



CREATE INDEX "idx_personal_tools_owner_num" ON "public"."personal_tools" USING "btree" ("owner_id", "number_numeric");



CREATE INDEX "idx_tool_checklists_tool_id" ON "public"."tool_checklists" USING "btree" ("tool_id");



CREATE INDEX "idx_tool_group_members_tool_id" ON "public"."tool_group_members" USING "btree" ("tool_id");



CREATE UNIQUE INDEX "idx_tool_groups_company_name" ON "public"."tool_groups" USING "btree" ("company_id", "lower"("name"));



CREATE INDEX "idx_tool_transactions_batch_id" ON "public"."tool_transactions" USING "btree" ("batch_id");



CREATE INDEX "idx_tool_transactions_from_user_id" ON "public"."tool_transactions" USING "btree" ("from_user_id");



CREATE INDEX "idx_tool_transactions_timestamp" ON "public"."tool_transactions" USING "btree" ("timestamp");



CREATE INDEX "idx_tool_transactions_to_user_id" ON "public"."tool_transactions" USING "btree" ("to_user_id");



CREATE INDEX "idx_tool_transactions_tool_id" ON "public"."tool_transactions" USING "btree" ("tool_id");



CREATE INDEX "idx_tool_tx_location_trgm" ON "public"."tool_transactions" USING "gin" ("lower"("location") "public"."gin_trgm_ops");



CREATE INDEX "idx_tool_tx_tool_time" ON "public"."tool_transactions" USING "btree" ("tool_id", "timestamp" DESC);



CREATE INDEX "idx_tools_company_id" ON "public"."tools" USING "btree" ("company_id");



CREATE INDEX "idx_tools_description_trgm" ON "public"."tools" USING "gin" ("lower"("description") "public"."gin_trgm_ops");



CREATE INDEX "idx_tools_name_trgm" ON "public"."tools" USING "gin" ("lower"("name") "public"."gin_trgm_ops");



CREATE INDEX "idx_tools_number_numeric" ON "public"."tools" USING "btree" ("public"."extract_tool_number"("number"));



CREATE INDEX "idx_tools_number_trgm" ON "public"."tools" USING "gin" ("lower"("number") "public"."gin_trgm_ops");



CREATE INDEX "idx_transaction_batches_company_id" ON "public"."transaction_batches" USING "btree" ("company_id");



CREATE INDEX "idx_transaction_batches_created_at" ON "public"."transaction_batches" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_users_company_id" ON "public"."users" USING "btree" ("company_id");



CREATE INDEX "idx_users_name_trgm" ON "public"."users" USING "gin" ("lower"("name") "public"."gin_trgm_ops");



CREATE INDEX "scheduled_export_runs_due_idx" ON "public"."scheduled_export_runs" USING "btree" ("status", "run_at");



CREATE UNIQUE INDEX "tool_images_one_primary_per_tool" ON "public"."tool_images" USING "btree" ("tool_id") WHERE ("is_primary" = true);



CREATE INDEX "tracker_company_company_idx" ON "public"."tracker_company_assignments" USING "btree" ("company_id");



CREATE UNIQUE INDEX "tracker_company_one_active_idx" ON "public"."tracker_company_assignments" USING "btree" ("serial") WHERE ("released_at" IS NULL);



CREATE INDEX "tracker_company_serial_idx" ON "public"."tracker_company_assignments" USING "btree" ("serial");



CREATE INDEX "tracker_locations_received_at_idx" ON "public"."tracker_locations" USING "btree" ("received_at" DESC);



CREATE INDEX "tracker_locations_serial_idx" ON "public"."tracker_locations" USING "btree" ("serial");



CREATE INDEX "tracker_tool_company_idx" ON "public"."tracker_tool_assignments" USING "btree" ("company_id");



CREATE UNIQUE INDEX "tracker_tool_one_active_per_serial_idx" ON "public"."tracker_tool_assignments" USING "btree" ("serial") WHERE ("detached_at" IS NULL);



CREATE UNIQUE INDEX "tracker_tool_one_active_per_tool_idx" ON "public"."tracker_tool_assignments" USING "btree" ("tool_id") WHERE ("detached_at" IS NULL);



CREATE INDEX "tracker_tool_serial_idx" ON "public"."tracker_tool_assignments" USING "btree" ("serial");



CREATE UNIQUE INDEX "uq_personal_tool_primary_image" ON "public"."personal_tool_images" USING "btree" ("personal_tool_id") WHERE "is_primary";



CREATE OR REPLACE TRIGGER "before_user_delete" BEFORE DELETE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."store_deleted_user_name"();



CREATE OR REPLACE TRIGGER "on_user_created" AFTER INSERT ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();



CREATE OR REPLACE TRIGGER "on_user_updated" AFTER UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();



CREATE OR REPLACE TRIGGER "trg_alias_active" BEFORE INSERT OR UPDATE ON "public"."location_aliases" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_company_active"();



CREATE OR REPLACE TRIGGER "trg_assign_personal_tool_number" BEFORE INSERT ON "public"."personal_tools" FOR EACH ROW EXECUTE FUNCTION "public"."assign_personal_tool_number"();



CREATE OR REPLACE TRIGGER "trg_batches_active" BEFORE INSERT OR UPDATE ON "public"."transaction_batches" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_company_active"();



CREATE OR REPLACE TRIGGER "trg_checklists_active" BEFORE INSERT OR UPDATE ON "public"."tool_checklists" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_company_active"();



CREATE OR REPLACE TRIGGER "trg_codes_active" BEFORE INSERT OR UPDATE ON "public"."company_access_codes" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_company_active"();



CREATE OR REPLACE TRIGGER "trg_enforce_tool_limit" BEFORE INSERT ON "public"."tools" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_tool_limit"();



CREATE OR REPLACE TRIGGER "trg_enforce_user_limit" BEFORE INSERT ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_user_limit"();



CREATE OR REPLACE TRIGGER "trg_images_active" BEFORE INSERT OR UPDATE ON "public"."tool_images" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_company_active"();



CREATE OR REPLACE TRIGGER "trg_recompute_company_active_on_tool_delete" AFTER DELETE ON "public"."tools" FOR EACH ROW EXECUTE FUNCTION "public"."recompute_company_active_on_delete"();



CREATE OR REPLACE TRIGGER "trg_recompute_company_active_on_user_delete" AFTER DELETE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."recompute_company_active_on_delete"();



CREATE OR REPLACE TRIGGER "trg_reports_active" BEFORE INSERT OR UPDATE ON "public"."checklist_reports" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_company_active"();



CREATE OR REPLACE TRIGGER "trg_settings_active" BEFORE INSERT OR UPDATE ON "public"."company_settings" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_company_active"();



CREATE OR REPLACE TRIGGER "trg_single_primary" BEFORE INSERT OR UPDATE ON "public"."tool_images" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_single_primary"();



CREATE OR REPLACE TRIGGER "trg_tool_groups_active" BEFORE INSERT OR UPDATE ON "public"."tool_groups" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_company_active"();



CREATE OR REPLACE TRIGGER "trg_tool_groups_log_create" AFTER INSERT ON "public"."tool_groups" FOR EACH ROW EXECUTE FUNCTION "public"."log_group_activity"();



CREATE OR REPLACE TRIGGER "trg_tool_groups_log_delete" AFTER DELETE ON "public"."tool_groups" FOR EACH ROW EXECUTE FUNCTION "public"."log_group_activity"();



CREATE OR REPLACE TRIGGER "trg_tools_active" BEFORE INSERT OR UPDATE ON "public"."tools" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_company_active"();



CREATE OR REPLACE TRIGGER "trg_tracker_locations_sync_current" AFTER INSERT ON "public"."tracker_locations" FOR EACH ROW EXECUTE FUNCTION "public"."tracker_locations_sync_current"();



CREATE OR REPLACE TRIGGER "trg_tx_active" BEFORE INSERT OR UPDATE ON "public"."tool_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_company_active"();



CREATE OR REPLACE TRIGGER "update_app_version_control_timestamp" BEFORE UPDATE ON "public"."app_version_control" FOR EACH ROW EXECUTE FUNCTION "public"."update_app_version_control_updated_at"();



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



ALTER TABLE ONLY "public"."company_events"
    ADD CONSTRAINT "company_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."company_events"
    ADD CONSTRAINT "company_events_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_settings"
    ADD CONSTRAINT "company_settings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_settings"
    ADD CONSTRAINT "company_settings_default_owner_id_fkey" FOREIGN KEY ("default_owner_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."group_activity_log"
    ADD CONSTRAINT "group_activity_log_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."group_activity_log"
    ADD CONSTRAINT "group_activity_log_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."location_aliases"
    ADD CONSTRAINT "location_aliases_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."location_aliases"
    ADD CONSTRAINT "location_aliases_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."personal_inventory_exports"
    ADD CONSTRAINT "personal_inventory_exports_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."personal_tool_images"
    ADD CONSTRAINT "personal_tool_images_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."personal_tool_images"
    ADD CONSTRAINT "personal_tool_images_personal_tool_id_fkey" FOREIGN KEY ("personal_tool_id") REFERENCES "public"."personal_tools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."personal_tool_transactions"
    ADD CONSTRAINT "personal_tool_transactions_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."personal_tool_transactions"
    ADD CONSTRAINT "personal_tool_transactions_personal_tool_id_fkey" FOREIGN KEY ("personal_tool_id") REFERENCES "public"."personal_tools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."personal_tool_transactions"
    ADD CONSTRAINT "personal_tool_transactions_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."personal_tools"
    ADD CONSTRAINT "personal_tools_lent_to_user_id_fkey" FOREIGN KEY ("lent_to_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."personal_tools"
    ADD CONSTRAINT "personal_tools_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scheduled_export_runs"
    ADD CONSTRAINT "scheduled_export_runs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scheduled_export_runs"
    ADD CONSTRAINT "scheduled_export_runs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tool_checklists"
    ADD CONSTRAINT "tool_checklists_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tool_checklists"
    ADD CONSTRAINT "tool_checklists_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tool_group_members"
    ADD CONSTRAINT "tool_group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."tool_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tool_group_members"
    ADD CONSTRAINT "tool_group_members_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tool_groups"
    ADD CONSTRAINT "tool_groups_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tool_groups"
    ADD CONSTRAINT "tool_groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tool_images"
    ADD CONSTRAINT "tool_images_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tool_transactions"
    ADD CONSTRAINT "tool_transactions_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."transaction_batches"("id") ON DELETE SET NULL;



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



ALTER TABLE ONLY "public"."tracker_company_assignments"
    ADD CONSTRAINT "tracker_company_assignments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tracker_company_assignments"
    ADD CONSTRAINT "tracker_company_assignments_serial_fkey" FOREIGN KEY ("serial") REFERENCES "public"."trackers"("serial") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tracker_tool_assignments"
    ADD CONSTRAINT "tracker_tool_assignments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tracker_tool_assignments"
    ADD CONSTRAINT "tracker_tool_assignments_serial_fkey" FOREIGN KEY ("serial") REFERENCES "public"."trackers"("serial") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tracker_tool_assignments"
    ADD CONSTRAINT "tracker_tool_assignments_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transaction_batches"
    ADD CONSTRAINT "transaction_batches_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transaction_batches"
    ADD CONSTRAINT "transaction_batches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."transaction_batches"
    ADD CONSTRAINT "transaction_batches_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."transaction_batches"
    ADD CONSTRAINT "transaction_batches_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can delete checklist reports even if suspended" ON "public"."checklist_reports" FOR DELETE TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"()))));



CREATE POLICY "Admins can delete tool checklists even if suspended" ON "public"."tool_checklists" FOR DELETE TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"()))));



CREATE POLICY "Admins can delete tools even if suspended" ON "public"."tools" FOR DELETE TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"()))));



CREATE POLICY "Admins can delete transaction batches in their company" ON "public"."transaction_batches" FOR DELETE TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"()))));



CREATE POLICY "Admins can delete users even if suspended" ON "public"."users" FOR DELETE TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"()))));



CREATE POLICY "Admins can manage access codes in their company" ON "public"."company_access_codes" TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id"))) WITH CHECK (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id")));



CREATE POLICY "Admins can manage checklist reports in their company" ON "public"."checklist_reports" TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id"))) WITH CHECK (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id")));



CREATE POLICY "Admins can manage checklists in their company" ON "public"."tool_checklists" TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id"))) WITH CHECK (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id")));



CREATE POLICY "Admins can manage company settings" ON "public"."company_settings" TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id"))) WITH CHECK (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id")));



CREATE POLICY "Admins can manage images in their company" ON "public"."tool_images" TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id"))) WITH CHECK (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id")));



CREATE POLICY "Admins can manage location aliases" ON "public"."location_aliases" TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id"))) WITH CHECK (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id")));



CREATE POLICY "Admins can manage their company's access codes" ON "public"."company_access_codes" TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id"))) WITH CHECK (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id")));



CREATE POLICY "Admins can manage their own company" ON "public"."companies" TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND ("id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("id"))) WITH CHECK (("public"."is_admin"("auth"."uid"()) AND ("id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("id")));



CREATE POLICY "Admins can manage tool group members in their company" ON "public"."tool_group_members" TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."tool_groups" "g"
  WHERE (("g"."id" = "tool_group_members"."group_id") AND ("g"."company_id" = "public"."get_user_company_id"("auth"."uid"()))))))) WITH CHECK (("public"."is_admin"("auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."tool_groups" "g"
  WHERE (("g"."id" = "tool_group_members"."group_id") AND ("g"."company_id" = "public"."get_user_company_id"("auth"."uid"())))))));



CREATE POLICY "Admins can manage tool groups in their company" ON "public"."tool_groups" TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id"))) WITH CHECK (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id")));



CREATE POLICY "Admins can manage tools in their company" ON "public"."tools" TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id"))) WITH CHECK (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id")));



CREATE POLICY "Admins can manage transactions in their company" ON "public"."tool_transactions" TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id"))) WITH CHECK (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id")));



CREATE POLICY "Admins can manage users in their company" ON "public"."users" TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id"))) WITH CHECK (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id")));



CREATE POLICY "Admins can update transaction batches in their company" ON "public"."transaction_batches" FOR UPDATE TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"())))) WITH CHECK (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"()))));



CREATE POLICY "Admins can view group activity in their company" ON "public"."group_activity_log" FOR SELECT TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND ("company_id" = "public"."get_user_company_id"("auth"."uid"()))));



CREATE POLICY "Admins view company personal images" ON "public"."personal_tool_images" FOR SELECT TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "personal_tool_images"."owner_id") AND ("u"."company_id" = "public"."get_user_company_id"("auth"."uid"())))))));



CREATE POLICY "Admins view company personal tools" ON "public"."personal_tools" FOR SELECT TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "personal_tools"."owner_id") AND ("u"."company_id" = "public"."get_user_company_id"("auth"."uid"())))))));



CREATE POLICY "Admins view company personal tx" ON "public"."personal_tool_transactions" FOR SELECT TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "personal_tool_transactions"."owner_id") AND ("u"."company_id" = "public"."get_user_company_id"("auth"."uid"())))))));



CREATE POLICY "Allow authenticated users to update version control" ON "public"."app_version_control" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow public read access to version control" ON "public"."app_version_control" FOR SELECT USING (true);



CREATE POLICY "Company users manage their tool assignments" ON "public"."tracker_tool_assignments" TO "authenticated" USING ((("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id"))) WITH CHECK ((("company_id" = "public"."get_user_company_id"("auth"."uid"())) AND "public"."is_company_active"("company_id")));



CREATE POLICY "Company users view their tool assignments" ON "public"."tracker_tool_assignments" FOR SELECT TO "authenticated" USING (("company_id" = "public"."get_user_company_id"("auth"."uid"())));



CREATE POLICY "Company users view their tracker company assignments" ON "public"."tracker_company_assignments" FOR SELECT TO "authenticated" USING (("company_id" = "public"."get_user_company_id"("auth"."uid"())));



CREATE POLICY "Owners can delete their personal tool images" ON "public"."personal_tool_images" FOR DELETE TO "authenticated" USING (("owner_id" = "auth"."uid"()));



CREATE POLICY "Owners can delete their personal tool transactions" ON "public"."personal_tool_transactions" FOR DELETE TO "authenticated" USING (("owner_id" = "auth"."uid"()));



CREATE POLICY "Owners can delete their personal tools" ON "public"."personal_tools" FOR DELETE TO "authenticated" USING (("owner_id" = "auth"."uid"()));



CREATE POLICY "Owners manage personal exports" ON "public"."personal_inventory_exports" TO "authenticated" USING (("owner_id" = "auth"."uid"())) WITH CHECK (("owner_id" = "auth"."uid"()));



CREATE POLICY "Owners manage personal tool images" ON "public"."personal_tool_images" TO "authenticated" USING (("owner_id" = "auth"."uid"())) WITH CHECK (("owner_id" = "auth"."uid"()));



CREATE POLICY "Owners manage personal tool tx" ON "public"."personal_tool_transactions" TO "authenticated" USING (("owner_id" = "auth"."uid"())) WITH CHECK (("owner_id" = "auth"."uid"()));



CREATE POLICY "Owners manage personal tools" ON "public"."personal_tools" TO "authenticated" USING (("owner_id" = "auth"."uid"())) WITH CHECK (("owner_id" = "auth"."uid"()));



CREATE POLICY "Service role can do everything on access codes" ON "public"."company_access_codes" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can do everything on checklists" ON "public"."tool_checklists" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can do everything on companies" ON "public"."companies" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can do everything on company_settings" ON "public"."company_settings" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can do everything on group activity" ON "public"."group_activity_log" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can do everything on location_aliases" ON "public"."location_aliases" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can do everything on reports" ON "public"."checklist_reports" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can do everything on tool_images" ON "public"."tool_images" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can do everything on tools" ON "public"."tools" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can do everything on transactions" ON "public"."tool_transactions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can do everything on users" ON "public"."users" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role manages tracker company assignments" ON "public"."tracker_company_assignments" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role manages tracker tool assignments" ON "public"."tracker_tool_assignments" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role manages trackers" ON "public"."trackers" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role personal exports" ON "public"."personal_inventory_exports" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role personal images" ON "public"."personal_tool_images" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role personal tools" ON "public"."personal_tools" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role personal tx" ON "public"."personal_tool_transactions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Superadmins can create access codes" ON "public"."company_access_codes" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_superadmin"("auth"."uid"()));



CREATE POLICY "Superadmins can delete access codes" ON "public"."company_access_codes" FOR DELETE TO "authenticated" USING ("public"."is_superadmin"("auth"."uid"()));



CREATE POLICY "Superadmins can manage all companies" ON "public"."companies" TO "authenticated" USING ("public"."is_superadmin"("auth"."uid"())) WITH CHECK ("public"."is_superadmin"("auth"."uid"()));



CREATE POLICY "Superadmins can view all access codes" ON "public"."company_access_codes" FOR SELECT TO "authenticated" USING ("public"."is_superadmin"("auth"."uid"()));



CREATE POLICY "Superadmins can view all tools" ON "public"."tools" FOR SELECT TO "authenticated" USING ("public"."is_superadmin"("auth"."uid"()));



CREATE POLICY "Superadmins can view all transactions" ON "public"."tool_transactions" FOR SELECT TO "authenticated" USING ("public"."is_superadmin"("auth"."uid"()));



CREATE POLICY "Superadmins can view all users" ON "public"."users" FOR SELECT TO "authenticated" USING ("public"."is_superadmin"("auth"."uid"()));



CREATE POLICY "Superadmins manage company assignments" ON "public"."tracker_company_assignments" TO "authenticated" USING ("public"."is_superadmin"("auth"."uid"())) WITH CHECK ("public"."is_superadmin"("auth"."uid"()));



CREATE POLICY "Superadmins manage trackers" ON "public"."trackers" TO "authenticated" USING ("public"."is_superadmin"("auth"."uid"())) WITH CHECK ("public"."is_superadmin"("auth"."uid"()));



CREATE POLICY "Superadmins view all tool assignments" ON "public"."tracker_tool_assignments" FOR SELECT TO "authenticated" USING ("public"."is_superadmin"("auth"."uid"()));



CREATE POLICY "Techs can view tech access codes in their company" ON "public"."company_access_codes" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'tech'::"text") AND ("users"."company_id" = "company_access_codes"."company_id")))) AND ("role" = 'tech'::"text")));



CREATE POLICY "Users can create checklist reports in their company" ON "public"."checklist_reports" FOR INSERT TO "authenticated" WITH CHECK (("company_id" = "public"."get_user_company_id"("auth"."uid"())));



CREATE POLICY "Users can create transaction batches in their company" ON "public"."transaction_batches" FOR INSERT TO "authenticated" WITH CHECK (("company_id" = "public"."get_user_company_id"("auth"."uid"())));



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



CREATE POLICY "Users can view tool group members in their company" ON "public"."tool_group_members" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."tool_groups" "g"
  WHERE (("g"."id" = "tool_group_members"."group_id") AND ("g"."company_id" = "public"."get_user_company_id"("auth"."uid"()))))));



CREATE POLICY "Users can view tool groups in their company" ON "public"."tool_groups" FOR SELECT TO "authenticated" USING (("company_id" = "public"."get_user_company_id"("auth"."uid"())));



CREATE POLICY "Users can view tools in their company" ON "public"."tools" FOR SELECT TO "authenticated" USING (("company_id" = "public"."get_user_company_id"("auth"."uid"())));



CREATE POLICY "Users can view transaction batches in their company" ON "public"."transaction_batches" FOR SELECT TO "authenticated" USING (("company_id" = "public"."get_user_company_id"("auth"."uid"())));



CREATE POLICY "Users can view transactions in their company" ON "public"."tool_transactions" FOR SELECT TO "authenticated" USING ((("company_id" = "public"."get_user_company_id"("auth"."uid"())) OR ("from_user_id" = "auth"."uid"()) OR ("to_user_id" = "auth"."uid"())));



ALTER TABLE "public"."app_version_control" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."checklist_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_access_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "company_events_insert" ON "public"."company_events" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "users"."company_id"
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "company_events_select" ON "public"."company_events" FOR SELECT USING (("company_id" IN ( SELECT "users"."company_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



ALTER TABLE "public"."company_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."group_activity_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."location_aliases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."personal_inventory_exports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."personal_tool_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."personal_tool_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."personal_tools" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scheduled_export_runs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tool_checklists" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tool_group_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tool_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tool_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tool_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tools" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tracker_company_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tracker_locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tracker_tool_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trackers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transaction_batches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";









REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";














































































































































































GRANT ALL ON FUNCTION "public"."assign_personal_tool_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."assign_personal_tool_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_personal_tool_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."assign_tracker_to_company"("p_serial" "text", "p_company_id" "uuid", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."assign_tracker_to_company"("p_serial" "text", "p_company_id" "uuid", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_tracker_to_company"("p_serial" "text", "p_company_id" "uuid", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."attach_tracker_to_tool"("p_serial" "text", "p_tool_id" "uuid", "p_mount_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."attach_tracker_to_tool"("p_serial" "text", "p_tool_id" "uuid", "p_mount_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."attach_tracker_to_tool"("p_serial" "text", "p_tool_id" "uuid", "p_mount_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_company_limits"("p_company_id" "uuid", "p_kind" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_company_limits"("p_company_id" "uuid", "p_kind" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_company_limits"("p_company_id" "uuid", "p_kind" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."company_tracked_tools_map"() TO "anon";
GRANT ALL ON FUNCTION "public"."company_tracked_tools_map"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."company_tracked_tools_map"() TO "service_role";



GRANT ALL ON FUNCTION "public"."company_tracker_pool"() TO "anon";
GRANT ALL ON FUNCTION "public"."company_tracker_pool"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."company_tracker_pool"() TO "service_role";



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



GRANT ALL ON FUNCTION "public"."detach_tracker_from_tool"("p_tool_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."detach_tracker_from_tool"("p_tool_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."detach_tracker_from_tool"("p_tool_id" "uuid") TO "service_role";



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



GRANT ALL ON FUNCTION "public"."extract_tool_number"("text_number" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."extract_tool_number"("text_number" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."extract_tool_number"("text_number" "text") TO "service_role";



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



GRANT ALL ON FUNCTION "public"."log_group_activity"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_group_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_group_activity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."normalize_location"("p_company_id" "uuid", "p_input_location" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."normalize_location"("p_company_id" "uuid", "p_input_location" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalize_location"("p_company_id" "uuid", "p_input_location" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."reclaim_tracker_to_global"("p_serial" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."reclaim_tracker_to_global"("p_serial" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reclaim_tracker_to_global"("p_serial" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."recompute_company_active_on_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."recompute_company_active_on_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recompute_company_active_on_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_tool_current_location"("p_tool_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_tool_current_location"("p_tool_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_tool_current_location"("p_tool_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."remove_user_from_company"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."remove_user_from_company"("p_user_id" "uuid") TO "service_role";



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



GRANT ALL ON FUNCTION "public"."superadmin_company_tracker_history"("p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."superadmin_company_tracker_history"("p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."superadmin_company_tracker_history"("p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."superadmin_company_trackers"() TO "anon";
GRANT ALL ON FUNCTION "public"."superadmin_company_trackers"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."superadmin_company_trackers"() TO "service_role";



GRANT ALL ON FUNCTION "public"."superadmin_global_tracker_pool"() TO "anon";
GRANT ALL ON FUNCTION "public"."superadmin_global_tracker_pool"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."superadmin_global_tracker_pool"() TO "service_role";



GRANT ALL ON FUNCTION "public"."tool_breadcrumb"("p_tool_id" "uuid", "p_since" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."tool_breadcrumb"("p_tool_id" "uuid", "p_since" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."tool_breadcrumb"("p_tool_id" "uuid", "p_since" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."tool_current_location"("p_tool_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."tool_current_location"("p_tool_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."tool_current_location"("p_tool_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."tool_tracker_history"("p_tool_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."tool_tracker_history"("p_tool_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."tool_tracker_history"("p_tool_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."tracker_latest_fix"("p_serial" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."tracker_latest_fix"("p_serial" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."tracker_latest_fix"("p_serial" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."tracker_locations_sync_current"() TO "anon";
GRANT ALL ON FUNCTION "public"."tracker_locations_sync_current"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tracker_locations_sync_current"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_app_version_control_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_app_version_control_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_app_version_control_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_company_export_settings"("p_company_id" "uuid", "p_enabled" boolean, "p_recipients" "text"[], "p_frequency" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_company_export_settings"("p_company_id" "uuid", "p_enabled" boolean, "p_recipients" "text"[], "p_frequency" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_company_export_settings"("p_company_id" "uuid", "p_enabled" boolean, "p_recipients" "text"[], "p_frequency" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_company_settings"("p_company_id" "uuid", "p_default_location" "text", "p_default_owner_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_company_settings"("p_company_id" "uuid", "p_default_location" "text", "p_default_owner_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_company_settings"("p_company_id" "uuid", "p_default_location" "text", "p_default_owner_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_company_settings"("p_company_id" "uuid", "p_default_location" "text", "p_default_owner_id" "uuid", "p_use_default_location" boolean, "p_use_default_owner" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_company_settings"("p_company_id" "uuid", "p_default_location" "text", "p_default_owner_id" "uuid", "p_use_default_location" boolean, "p_use_default_owner" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_company_settings"("p_company_id" "uuid", "p_default_location" "text", "p_default_owner_id" "uuid", "p_use_default_location" boolean, "p_use_default_owner" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_company_tools_export_settings"("p_company_id" "uuid", "p_enabled" boolean, "p_recipients" "text"[], "p_frequency" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_company_tools_export_settings"("p_company_id" "uuid", "p_enabled" boolean, "p_recipients" "text"[], "p_frequency" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_company_tools_export_settings"("p_company_id" "uuid", "p_enabled" boolean, "p_recipients" "text"[], "p_frequency" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_location_alias"("p_company_id" "uuid", "p_alias" "text", "p_normalized_location" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_location_alias"("p_company_id" "uuid", "p_alias" "text", "p_normalized_location" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_location_alias"("p_company_id" "uuid", "p_alias" "text", "p_normalized_location" "text") TO "service_role";
























GRANT ALL ON TABLE "public"."app_version_control" TO "anon";
GRANT ALL ON TABLE "public"."app_version_control" TO "authenticated";
GRANT ALL ON TABLE "public"."app_version_control" TO "service_role";



GRANT ALL ON TABLE "public"."checklist_reports" TO "anon";
GRANT ALL ON TABLE "public"."checklist_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."checklist_reports" TO "service_role";



GRANT ALL ON TABLE "public"."companies" TO "anon";
GRANT ALL ON TABLE "public"."companies" TO "authenticated";
GRANT ALL ON TABLE "public"."companies" TO "service_role";



GRANT ALL ON TABLE "public"."company_access_codes" TO "anon";
GRANT ALL ON TABLE "public"."company_access_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."company_access_codes" TO "service_role";



GRANT ALL ON TABLE "public"."company_events" TO "anon";
GRANT ALL ON TABLE "public"."company_events" TO "authenticated";
GRANT ALL ON TABLE "public"."company_events" TO "service_role";



GRANT ALL ON TABLE "public"."company_settings" TO "anon";
GRANT ALL ON TABLE "public"."company_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."company_settings" TO "service_role";



GRANT ALL ON TABLE "public"."group_activity_log" TO "anon";
GRANT ALL ON TABLE "public"."group_activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."group_activity_log" TO "service_role";



GRANT ALL ON TABLE "public"."location_aliases" TO "anon";
GRANT ALL ON TABLE "public"."location_aliases" TO "authenticated";
GRANT ALL ON TABLE "public"."location_aliases" TO "service_role";



GRANT ALL ON TABLE "public"."personal_inventory_exports" TO "anon";
GRANT ALL ON TABLE "public"."personal_inventory_exports" TO "authenticated";
GRANT ALL ON TABLE "public"."personal_inventory_exports" TO "service_role";



GRANT ALL ON TABLE "public"."personal_tool_images" TO "anon";
GRANT ALL ON TABLE "public"."personal_tool_images" TO "authenticated";
GRANT ALL ON TABLE "public"."personal_tool_images" TO "service_role";



GRANT ALL ON TABLE "public"."personal_tool_transactions" TO "anon";
GRANT ALL ON TABLE "public"."personal_tool_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."personal_tool_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."personal_tools" TO "anon";
GRANT ALL ON TABLE "public"."personal_tools" TO "authenticated";
GRANT ALL ON TABLE "public"."personal_tools" TO "service_role";



GRANT ALL ON TABLE "public"."scheduled_export_runs" TO "anon";
GRANT ALL ON TABLE "public"."scheduled_export_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."scheduled_export_runs" TO "service_role";



GRANT ALL ON TABLE "public"."tool_checklists" TO "anon";
GRANT ALL ON TABLE "public"."tool_checklists" TO "authenticated";
GRANT ALL ON TABLE "public"."tool_checklists" TO "service_role";



GRANT ALL ON TABLE "public"."tool_group_members" TO "anon";
GRANT ALL ON TABLE "public"."tool_group_members" TO "authenticated";
GRANT ALL ON TABLE "public"."tool_group_members" TO "service_role";



GRANT ALL ON TABLE "public"."tool_groups" TO "anon";
GRANT ALL ON TABLE "public"."tool_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."tool_groups" TO "service_role";



GRANT ALL ON TABLE "public"."tool_images" TO "anon";
GRANT ALL ON TABLE "public"."tool_images" TO "authenticated";
GRANT ALL ON TABLE "public"."tool_images" TO "service_role";



GRANT ALL ON TABLE "public"."tool_transactions" TO "anon";
GRANT ALL ON TABLE "public"."tool_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."tool_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."tools" TO "anon";
GRANT ALL ON TABLE "public"."tools" TO "authenticated";
GRANT ALL ON TABLE "public"."tools" TO "service_role";



GRANT ALL ON TABLE "public"."tracker_company_assignments" TO "anon";
GRANT ALL ON TABLE "public"."tracker_company_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."tracker_company_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."tracker_locations" TO "anon";
GRANT ALL ON TABLE "public"."tracker_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."tracker_locations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."tracker_locations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."tracker_locations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."tracker_locations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."tracker_tool_assignments" TO "anon";
GRANT ALL ON TABLE "public"."tracker_tool_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."tracker_tool_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."trackers" TO "anon";
GRANT ALL ON TABLE "public"."trackers" TO "authenticated";
GRANT ALL ON TABLE "public"."trackers" TO "service_role";



GRANT ALL ON TABLE "public"."transaction_batches" TO "anon";
GRANT ALL ON TABLE "public"."transaction_batches" TO "authenticated";
GRANT ALL ON TABLE "public"."transaction_batches" TO "service_role";



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



























