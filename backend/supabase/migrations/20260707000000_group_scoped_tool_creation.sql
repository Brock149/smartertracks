-- Support creating tools directly inside a group ("Create New Tool in Group"),
-- with per-group default owner resolution and an RPC that auto-links the new
-- tool into the group and always sets its initial location to the group name.

-- 1) Per-group owner-default configuration. Three modes:
--    - 'specific'        -> use tool_groups.default_owner_id
--    - 'unassigned'      -> explicitly leave the new tool's owner blank
--    - 'company_default' -> fall back to company_settings default owner (existing behavior)
alter table "public"."tool_groups"
  add column if not exists "default_owner_id" "uuid" references "public"."users"("id"),
  add column if not exists "default_owner_mode" "text" not null default 'company_default';

alter table "public"."tool_groups"
  add constraint "ck_tool_groups_default_owner_mode"
  check ("default_owner_mode" in ('specific', 'company_default', 'unassigned'));

-- 2) RPC used by the create-group-tool edge function. Modeled on
--    create_tool_with_checklist, but the owner is resolved by the caller
--    (edge function already applied the group's default_owner_mode) and the
--    location is always the group's name rather than the optional company
--    default location.
create or replace function "public"."create_group_tool_with_checklist"(
  "p_group_id" "uuid",
  "p_number" "text",
  "p_name" "text",
  "p_description" "text",
  "p_photo_url" "text",
  "p_company_id" "uuid",
  "p_checklist" "jsonb",
  "p_owner_id" "uuid",
  "p_location" "text"
) returns "uuid"
    language "plpgsql" security definer
    as $$
declare
    v_tool_id uuid;
begin
    insert into tools (number, name, description, photo_url, company_id, current_owner)
    values (p_number, p_name, p_description, p_photo_url, p_company_id, p_owner_id)
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
        p_owner_id,
        normalize_location(p_company_id, coalesce(p_location, 'Not specified')),
        'N/A',
        'Initial assignment from system (created in group)' ||
        case
            when p_owner_id is not null then ' to owner'
            else ''
        end,
        p_company_id
    );

    insert into tool_group_members (group_id, tool_id)
    values (p_group_id, v_tool_id);

    return v_tool_id;
end;
$$;

alter function "public"."create_group_tool_with_checklist"(
  "uuid", "text", "text", "text", "text", "uuid", "jsonb", "uuid", "text"
) owner to "postgres";

grant execute on function "public"."create_group_tool_with_checklist"(
  "uuid", "text", "text", "text", "text", "uuid", "jsonb", "uuid", "text"
) to "authenticated";

grant execute on function "public"."create_group_tool_with_checklist"(
  "uuid", "text", "text", "text", "text", "uuid", "jsonb", "uuid", "text"
) to "service_role";
