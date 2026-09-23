-- Admin transaction search was downloading the newest 1000 rows (PostgREST
-- max_rows) and filtering them in the browser. Older rows, including a tool's
-- initial assignment, stayed in the database but never showed up in search.
--
-- Additive only: new function, new indexes. No columns, policies, or rows change.
-- Paste this whole file into the Supabase SQL editor.

CREATE INDEX IF NOT EXISTS idx_tool_transactions_company_timestamp
  ON public.tool_transactions (company_id, "timestamp" DESC);

-- One trigram index for every transaction field the search box matches that
-- is stored on the row itself (tool name and person name use the indexes that
-- already exist on tools and users). Keep this expression identical to the
-- WHERE clause in list_admin_activity_feed.
CREATE INDEX IF NOT EXISTS idx_tool_tx_search_blob_trgm
  ON public.tool_transactions
  USING gin (
    (
      lower(
        coalesce(location, '') || ' ' ||
        coalesce(stored_at, '') || ' ' ||
        coalesce(notes, '') || ' ' ||
        coalesce(attribution, '') || ' ' ||
        coalesce(deleted_from_user_name, '') || ' ' ||
        coalesce(deleted_to_user_name, '') || ' ' ||
        coalesce(deleted_tool_number, '') || ' ' ||
        coalesce(deleted_tool_name, '')
      )
    ) public.gin_trgm_ops
  );

CREATE INDEX IF NOT EXISTS idx_company_events_search_blob_trgm
  ON public.company_events
  USING gin (
    (
      lower(
        coalesce(actor_name, '') || ' ' ||
        coalesce(target_label, '') || ' ' ||
        coalesce(details, '') || ' ' ||
        coalesce(
          CASE event_type
            WHEN 'tool_created' THEN 'tool created'
            WHEN 'tool_deleted' THEN 'tool deleted'
            WHEN 'user_added' THEN 'user added'
            WHEN 'user_joined' THEN 'user joined'
            WHEN 'user_removed' THEN 'user removed'
            WHEN 'user_left' THEN 'user left'
            WHEN 'tracker_attached' THEN 'tracker attached'
            WHEN 'tracker_detached' THEN 'tracker removed'
            ELSE replace(event_type, '_', ' ')
          END,
          ''
        )
      )
    ) public.gin_trgm_ops
  );

CREATE OR REPLACE FUNCTION public.list_admin_activity_feed(
  p_query text DEFAULT '',
  p_limit integer DEFAULT 10,
  p_offset integer DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_q text := left(btrim(coalesce(p_query, '')), 100);
  v_like text;
  v_limit integer := least(greatest(coalesce(p_limit, 10), 1), 100);
  v_offset integer := least(greatest(coalesce(p_offset, 0), 0), 100000);
  v_need integer;
  v_total bigint;
  v_rows jsonb;
BEGIN
  -- A generic plan cannot see the search text, so it will not use the trigram
  -- indexes. Force a custom plan for this call only.
  PERFORM set_config('plan_cache_mode', 'force_custom_plan', true);

  -- ESCAPE '\' so a search for "_" or "%" is literal, not a wildcard.
  v_like := '%' || replace(replace(replace(lower(v_q), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  v_need := v_offset + v_limit;

  IF v_q = '' THEN
    SELECT
      (SELECT count(*) FROM tool_transactions) +
      (SELECT count(*) FROM company_events)
    INTO v_total;

    WITH windowed AS (
      (
        SELECT
          'tx'::text AS kind,
          tx.id AS item_id,
          coalesce(tx."timestamp", tx.created_at) AS ts,
          tx.tool_id,
          t.number AS tool_number,
          t.name AS tool_name,
          fu.name AS from_user_name,
          tu.name AS to_user_name,
          tx.location,
          tx.stored_at,
          tx.notes,
          tx.attribution,
          tx.deleted_from_user_name,
          tx.deleted_to_user_name,
          tx.deleted_tool_number,
          tx.deleted_tool_name,
          NULL::text AS event_type,
          NULL::text AS actor_name,
          NULL::text AS target_label,
          NULL::text AS details
        FROM (
          SELECT *
          FROM tool_transactions
          ORDER BY "timestamp" DESC NULLS LAST, id DESC
          LIMIT v_need
        ) tx
        LEFT JOIN tools t ON t.id = tx.tool_id
        LEFT JOIN users fu ON fu.id = tx.from_user_id
        LEFT JOIN users tu ON tu.id = tx.to_user_id
      )
      UNION ALL
      (
        SELECT
          'event'::text,
          e.id,
          e.created_at,
          NULL::uuid,
          NULL::text,
          NULL::text,
          NULL::text,
          NULL::text,
          NULL::text,
          NULL::text,
          NULL::text,
          NULL::text,
          NULL::text,
          NULL::text,
          NULL::text,
          NULL::text,
          e.event_type,
          e.actor_name,
          e.target_label,
          e.details
        FROM (
          SELECT *
          FROM company_events
          ORDER BY created_at DESC, id DESC
          LIMIT v_need
        ) e
      )
    ),
    paged AS (
      SELECT *
      FROM windowed
      ORDER BY ts DESC, item_id DESC
      LIMIT v_limit
      OFFSET v_offset
    )
    SELECT coalesce(
      jsonb_agg(to_jsonb(feed_row) ORDER BY feed_row.ts DESC, feed_row.item_id DESC),
      '[]'::jsonb
    )
    INTO v_rows
    FROM paged feed_row;

    RETURN jsonb_build_object('total', coalesce(v_total, 0), 'rows', coalesce(v_rows, '[]'::jsonb));
  END IF;

  WITH tx_ids AS (
    SELECT tx.id
    FROM tool_transactions tx
    JOIN tools t ON t.id = tx.tool_id
    WHERE lower(t.name) LIKE v_like ESCAPE '\'
    UNION
    SELECT tx.id
    FROM tool_transactions tx
    JOIN tools t ON t.id = tx.tool_id
    WHERE lower(t.number) LIKE v_like ESCAPE '\'
    UNION
    SELECT tx.id
    FROM tool_transactions tx
    JOIN users u ON u.id = tx.from_user_id
    WHERE lower(u.name) LIKE v_like ESCAPE '\'
    UNION
    SELECT tx.id
    FROM tool_transactions tx
    JOIN users u ON u.id = tx.to_user_id
    WHERE lower(u.name) LIKE v_like ESCAPE '\'
    UNION
    SELECT tx.id
    FROM tool_transactions tx
    WHERE lower(
      coalesce(tx.location, '') || ' ' ||
      coalesce(tx.stored_at, '') || ' ' ||
      coalesce(tx.notes, '') || ' ' ||
      coalesce(tx.attribution, '') || ' ' ||
      coalesce(tx.deleted_from_user_name, '') || ' ' ||
      coalesce(tx.deleted_to_user_name, '') || ' ' ||
      coalesce(tx.deleted_tool_number, '') || ' ' ||
      coalesce(tx.deleted_tool_name, '')
    ) LIKE v_like ESCAPE '\'
  ),
  ev_ids AS (
    SELECT e.id
    FROM company_events e
    WHERE lower(
      coalesce(e.actor_name, '') || ' ' ||
      coalesce(e.target_label, '') || ' ' ||
      coalesce(e.details, '') || ' ' ||
      coalesce(
        CASE e.event_type
          WHEN 'tool_created' THEN 'tool created'
          WHEN 'tool_deleted' THEN 'tool deleted'
          WHEN 'user_added' THEN 'user added'
          WHEN 'user_joined' THEN 'user joined'
          WHEN 'user_removed' THEN 'user removed'
          WHEN 'user_left' THEN 'user left'
          WHEN 'tracker_attached' THEN 'tracker attached'
          WHEN 'tracker_detached' THEN 'tracker removed'
          ELSE replace(e.event_type, '_', ' ')
        END,
        ''
      )
    ) LIKE v_like ESCAPE '\'
  ),
  combined AS MATERIALIZED (
    SELECT
      'tx'::text AS kind,
      tx.id AS item_id,
      coalesce(tx."timestamp", tx.created_at) AS ts,
      tx.tool_id,
      t.number AS tool_number,
      t.name AS tool_name,
      fu.name AS from_user_name,
      tu.name AS to_user_name,
      tx.location,
      tx.stored_at,
      tx.notes,
      tx.attribution,
      tx.deleted_from_user_name,
      tx.deleted_to_user_name,
      tx.deleted_tool_number,
      tx.deleted_tool_name,
      NULL::text AS event_type,
      NULL::text AS actor_name,
      NULL::text AS target_label,
      NULL::text AS details
    FROM tx_ids ids
    JOIN tool_transactions tx ON tx.id = ids.id
    LEFT JOIN tools t ON t.id = tx.tool_id
    LEFT JOIN users fu ON fu.id = tx.from_user_id
    LEFT JOIN users tu ON tu.id = tx.to_user_id
    UNION ALL
    SELECT
      'event'::text,
      e.id,
      e.created_at,
      NULL::uuid,
      NULL::text,
      NULL::text,
      NULL::text,
      NULL::text,
      NULL::text,
      NULL::text,
      NULL::text,
      NULL::text,
      NULL::text,
      NULL::text,
      NULL::text,
      NULL::text,
      e.event_type,
      e.actor_name,
      e.target_label,
      e.details
    FROM ev_ids ids
    JOIN company_events e ON e.id = ids.id
  ),
  stats AS (
    SELECT count(*)::bigint AS total_count FROM combined
  ),
  paged AS (
    SELECT *
    FROM combined
    ORDER BY ts DESC, item_id DESC
    LIMIT v_limit
    OFFSET v_offset
  )
  SELECT
    (SELECT total_count FROM stats),
    coalesce((
      SELECT jsonb_agg(to_jsonb(feed_row) ORDER BY feed_row.ts DESC, feed_row.item_id DESC)
      FROM paged feed_row
    ), '[]'::jsonb)
  INTO v_total, v_rows;

  RETURN jsonb_build_object('total', coalesce(v_total, 0), 'rows', coalesce(v_rows, '[]'::jsonb));
END;
$$;

COMMENT ON FUNCTION public.list_admin_activity_feed(text, integer, integer) IS
  'Paged admin activity feed (tool transactions + company events). Searches the full history instead of the newest 1000 rows.';

REVOKE ALL ON FUNCTION public.list_admin_activity_feed(text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_admin_activity_feed(text, integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.list_admin_activity_feed(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_admin_activity_feed(text, integer, integer) TO service_role;

NOTIFY pgrst, 'reload schema';
