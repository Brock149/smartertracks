-- Improve search_tools relevance ranking WITHOUT shrinking result set:
-- 1) Keep the same inclusive match rules as before (weak keyword hits still appear)
-- 2) Order by relevance: name/number first, then keyword quality + count
-- 3) Weak fuzzy keyword hits get a low score (last pages), not exclusion

CREATE OR REPLACE FUNCTION public.search_tools(
  p_company_id uuid,
  p_term text,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_scope text DEFAULT 'global',
  p_group_id uuid DEFAULT NULL,
  p_owner_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  number text,
  name text,
  description text,
  photo_url text,
  owner_name text,
  location text,
  primary_thumb_url text,
  primary_image_url text,
  match_rank integer,
  include_in_global_search boolean,
  current_owner uuid
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_term text := trim(coalesce(p_term, ''));
  v_term_lower text := lower(trim(coalesce(p_term, '')));
  v_norm text := public.normalize_search_text(p_term);
  v_limit int := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_scope text := lower(coalesce(nullif(trim(p_scope), ''), 'global'));
  v_sim_threshold real := 0.25;
BEGIN
  IF v_term = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH scoped AS (
    SELECT t.*
    FROM tools t
    WHERE t.company_id = p_company_id
      AND t.is_deleted IS NOT TRUE
      AND (
        CASE v_scope
          WHEN 'global' THEN t.include_in_global_search = true
          WHEN 'company' THEN true
          WHEN 'group' THEN EXISTS (
            SELECT 1 FROM tool_group_members m
            WHERE m.tool_id = t.id AND m.group_id = p_group_id
          )
          WHEN 'mine' THEN t.current_owner = p_owner_id
          ELSE t.include_in_global_search = true
        END
      )
  ),
  -- Inclusive keyword stats (same loose rules as original search inclusion)
  alias_stats AS (
    SELECT
      a.tool_id,
      COUNT(*) FILTER (
        WHERE
          lower(a.alias) = v_term_lower
          OR lower(a.alias) LIKE '%' || v_term_lower || '%'
          OR (v_norm <> '' AND public.normalize_search_text(a.alias) LIKE '%' || v_norm || '%')
          OR (
            length(v_term_lower) >= 3
            AND (
              similarity(lower(a.alias), v_term_lower) >= v_sim_threshold
              OR lower(a.alias) % v_term_lower
            )
          )
      )::int AS match_count,
      MAX(
        GREATEST(
          CASE WHEN lower(a.alias) = v_term_lower THEN 100 ELSE 0 END,
          CASE WHEN lower(a.alias) LIKE v_term_lower || '%' THEN 90 ELSE 0 END,
          CASE WHEN lower(a.alias) LIKE '%' || v_term_lower || '%' THEN 80 ELSE 0 END,
          CASE
            WHEN v_norm <> ''
              AND public.normalize_search_text(a.alias) LIKE '%' || v_norm || '%'
            THEN 75 ELSE 0
          END,
          CASE
            WHEN length(v_term_lower) >= 3
              AND similarity(lower(a.alias), v_term_lower) >= 0.40
            THEN (55 + round(similarity(lower(a.alias), v_term_lower) * 30))::int
            ELSE 0
          END,
          -- Weak fuzzy still counts for inclusion/ranking, just scored lower
          CASE
            WHEN length(v_term_lower) >= 3
              AND similarity(lower(a.alias), v_term_lower) >= v_sim_threshold
            THEN (25 + round(similarity(lower(a.alias), v_term_lower) * 25))::int
            ELSE 0
          END
        )
      )::int AS best_quality
    FROM tool_search_aliases a
    INNER JOIN scoped s ON s.id = a.tool_id
    GROUP BY a.tool_id
  ),
  matched AS (
    SELECT
      s.id AS tool_id,
      GREATEST(
        -- Number
        CASE WHEN lower(s.number) = v_term_lower THEN 1000 ELSE 0 END,
        CASE WHEN lower(s.number) LIKE v_term_lower || '%' THEN 920 ELSE 0 END,

        -- Name always outranks keyword-only (keywords cap ~450)
        CASE WHEN lower(s.name) = v_term_lower THEN 980 ELSE 0 END,
        CASE WHEN lower(s.name) LIKE v_term_lower || '%' THEN 940 ELSE 0 END,
        CASE WHEN lower(s.name) LIKE '%' || v_term_lower || '%' THEN 880 ELSE 0 END,
        CASE
          WHEN v_norm <> ''
            AND public.normalize_search_text(coalesce(s.name, '')) LIKE '%' || v_norm || '%'
          THEN 860 ELSE 0
        END,
        CASE
          WHEN length(v_term_lower) >= 3
            AND similarity(lower(s.name), v_term_lower) >= v_sim_threshold
          THEN (700 + round(similarity(lower(s.name), v_term_lower) * 150))::int
          ELSE 0
        END,

        -- search_norm (name+description)
        CASE
          WHEN v_norm <> '' AND coalesce(s.search_norm, '') LIKE '%' || v_norm || '%'
          THEN 650 ELSE 0
        END,
        CASE
          WHEN v_norm <> ''
            AND length(v_norm) >= 3
            AND similarity(coalesce(s.search_norm, ''), v_norm) >= v_sim_threshold
          THEN (520 + round(similarity(coalesce(s.search_norm, ''), v_norm) * 100))::int
          ELSE 0
        END,

        -- Keywords: quality + count bonus (weak fuzzy lands near the bottom)
        CASE
          WHEN coalesce(als.match_count, 0) > 0 THEN
            LEAST(
              450,
              (
                CASE
                  WHEN als.best_quality >= 100 THEN 320
                  WHEN als.best_quality >= 80 THEN 260
                  WHEN als.best_quality >= 75 THEN 230
                  WHEN als.best_quality >= 55 THEN 180
                  ELSE 90
                END
                + LEAST(120, als.match_count * 25)
              )
            )
          ELSE 0
        END,

        -- Weaker non-name signals
        CASE WHEN lower(s.number) LIKE '%' || v_term_lower || '%' THEN 400 ELSE 0 END,
        CASE WHEN lower(coalesce(s.description, '')) LIKE '%' || v_term_lower || '%' THEN 120 ELSE 0 END,
        CASE WHEN EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = s.current_owner AND lower(u.name) LIKE '%' || v_term_lower || '%'
        ) THEN 80 ELSE 0 END,
        CASE WHEN s.deleted_owner_name IS NOT NULL
              AND lower(s.deleted_owner_name) LIKE '%' || v_term_lower || '%' THEN 80 ELSE 0 END,
        CASE WHEN EXISTS (
          SELECT 1
          FROM tool_transactions tx
          WHERE tx.tool_id = s.id
            AND tx.company_id = p_company_id
            AND lower(tx.location) LIKE '%' || v_term_lower || '%'
          LIMIT 1
        ) THEN 60 ELSE 0 END
      ) AS rank_score
    FROM scoped s
    LEFT JOIN alias_stats als ON als.tool_id = s.id
    WHERE
      -- Same inclusion surface as original search_standardization (do not shrink)
      lower(s.number) LIKE '%' || v_term_lower || '%'
      OR lower(s.name) LIKE '%' || v_term_lower || '%'
      OR lower(coalesce(s.description, '')) LIKE '%' || v_term_lower || '%'
      OR (v_norm <> '' AND coalesce(s.search_norm, '') LIKE '%' || v_norm || '%')
      OR (length(v_term_lower) >= 3 AND (
           similarity(lower(s.name), v_term_lower) >= v_sim_threshold
           OR lower(s.name) % v_term_lower
           OR lower(s.number) % v_term_lower
         ))
      OR (v_norm <> '' AND length(v_norm) >= 3 AND similarity(coalesce(s.search_norm, ''), v_norm) >= v_sim_threshold)
      OR EXISTS (
        SELECT 1 FROM tool_search_aliases a
        WHERE a.tool_id = s.id AND (
          lower(a.alias) LIKE '%' || v_term_lower || '%'
          OR (v_norm <> '' AND public.normalize_search_text(a.alias) LIKE '%' || v_norm || '%')
          OR (length(v_term_lower) >= 3 AND (
            similarity(lower(a.alias), v_term_lower) >= v_sim_threshold
            OR lower(a.alias) % v_term_lower
          ))
        )
      )
      OR EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = s.current_owner AND lower(u.name) LIKE '%' || v_term_lower || '%'
      )
      OR (
        s.deleted_owner_name IS NOT NULL
        AND lower(s.deleted_owner_name) LIKE '%' || v_term_lower || '%'
      )
      OR EXISTS (
        SELECT 1
        FROM tool_transactions tx
        WHERE tx.tool_id = s.id
          AND tx.company_id = p_company_id
          AND lower(tx.location) LIKE '%' || v_term_lower || '%'
        LIMIT 1
      )
  ),
  page AS (
    SELECT m.tool_id, m.rank_score
    FROM matched m
    WHERE m.rank_score > 0
    ORDER BY m.rank_score DESC, m.tool_id
    LIMIT v_limit
    OFFSET v_offset
  ),
  latest_tx AS (
    SELECT DISTINCT ON (tx.tool_id) tx.tool_id, tx.location
    FROM tool_transactions tx
    INNER JOIN page p ON p.tool_id = tx.tool_id
    WHERE tx.company_id = p_company_id
    ORDER BY tx.tool_id, tx.timestamp DESC
  ),
  primary_img AS (
    SELECT ti.tool_id, ti.thumb_url, ti.image_url
    FROM tool_images ti
    INNER JOIN page p ON p.tool_id = ti.tool_id
    WHERE ti.is_primary = true
  )
  SELECT
    t.id,
    t.number,
    t.name,
    t.description,
    t.photo_url,
    coalesce(
      u.name,
      CASE WHEN t.deleted_owner_name IS NOT NULL THEN t.deleted_owner_name || ' (removed)' END
    ) AS owner_name,
    coalesce(l.location, '') AS location,
    pi.thumb_url AS primary_thumb_url,
    pi.image_url AS primary_image_url,
    p.rank_score AS match_rank,
    t.include_in_global_search,
    t.current_owner
  FROM page p
  JOIN tools t ON t.id = p.tool_id
  LEFT JOIN users u ON u.id = t.current_owner
  LEFT JOIN latest_tx l ON l.tool_id = t.id
  LEFT JOIN primary_img pi ON pi.tool_id = t.id
  ORDER BY p.rank_score DESC, t.number_numeric NULLS LAST, t.number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_tools(uuid, text, integer, integer, text, uuid, uuid)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.search_tools(uuid, text, integer, integer, text, uuid, uuid) IS
  'Scoped tool search: inclusive matches, ordered by relevance (name first, then keywords)';
