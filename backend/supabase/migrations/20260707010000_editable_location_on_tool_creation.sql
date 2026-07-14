-- Make tool location a one-step, editable field at creation time instead of
-- something only applied afterward via company default settings. The admin
-- portal now always sends an explicit (pre-filled, but editable) location for
-- both normal tool creation and group-scoped tool creation.

-- 1) create_tool_with_checklist: add an optional p_location override. When
--    provided (non-null), it takes precedence over the company's
--    use_default_location/default_location settings. Owner resolution is
--    unchanged. Existing callers that don't pass p_location keep the old
--    toggle-based behavior (backward compatible default of NULL).
create or replace function "public"."create_tool_with_checklist"(
  "p_number" "text",
  "p_name" "text",
  "p_description" "text",
  "p_photo_url" "text",
  "p_company_id" "uuid",
  "p_checklist" "jsonb",
  "p_location" "text" default null
) returns "uuid"
    language "plpgsql" security definer
    as $$
declare
    v_tool_id uuid;
    v_default_owner_id uuid;
    v_default_location text;
    v_use_default_location boolean;
    v_use_default_owner boolean;
    v_final_owner_id uuid;
    v_final_location text;
begin
    select
        default_owner_id,
        default_location,
        use_default_location,
        use_default_owner
    into
        v_default_owner_id,
        v_default_location,
        v_use_default_location,
        v_use_default_owner
    from company_settings
    where company_id = p_company_id;

    v_final_owner_id := case
        when v_use_default_owner and v_default_owner_id is not null
        then v_default_owner_id
        else null
    end;

    -- An explicitly provided location (from the create-tool UI) always wins
    -- over the company's toggle-based default.
    v_final_location := case
        when p_location is not null and btrim(p_location) <> '' then btrim(p_location)
        when v_use_default_location and v_default_location is not null then v_default_location
        else null
    end;

    insert into tools (number, name, description, photo_url, company_id, current_owner)
    values (p_number, p_name, p_description, p_photo_url, p_company_id, v_final_owner_id)
    returning id into v_tool_id;

    if p_checklist is not null and jsonb_array_length(p_checklist) > 0 then
        insert into tool_checklists (tool_id, item_name, required, company_id)
        select
            v_tool_id,
            (item->>'item_name')::text,
            (item->>'required')::boolean,
            p_company_id
        from jsonb_array_elements(p_checklist) as item;
    end if;

    if v_final_owner_id is not null or v_final_location is not null then
        insert into tool_transactions (
            tool_id,
            from_user_id,
            to_user_id,
            location,
            stored_at,
            notes,
            company_id
        ) values (
            v_tool_id,
            null,
            v_final_owner_id,
            normalize_location(p_company_id, coalesce(v_final_location, 'Not specified')),
            'N/A',
            'Initial assignment from system' ||
            case
                when v_final_owner_id is not null then ' to default owner'
                else ''
            end,
            p_company_id
        );
    end if;

    return v_tool_id;
end;
$$;

alter function "public"."create_tool_with_checklist"(
  "text", "text", "text", "text", "uuid", "jsonb", "text"
) owner to "postgres";

grant execute on function "public"."create_tool_with_checklist"(
  "text", "text", "text", "text", "uuid", "jsonb", "text"
) to "anon";

grant execute on function "public"."create_tool_with_checklist"(
  "text", "text", "text", "text", "uuid", "jsonb", "text"
) to "authenticated";

grant execute on function "public"."create_tool_with_checklist"(
  "text", "text", "text", "text", "uuid", "jsonb", "text"
) to "service_role";

-- 2) create_group_tool_with_checklist: p_location was already required, but
--    make its intent explicit — the caller (edge function) now passes either
--    the admin's edited value or the group's name as a fallback, rather than
--    always the group's name.
comment on function "public"."create_group_tool_with_checklist"(
  "uuid", "text", "text", "text", "text", "uuid", "jsonb", "uuid", "text"
) is 'p_location is caller-resolved: the admin-edited location if provided, otherwise the group name.';
