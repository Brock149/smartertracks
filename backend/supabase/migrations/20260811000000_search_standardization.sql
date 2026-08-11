-- =============================================================================
-- Search Standardization (End-State)
-- REVIEW BEFORE PASTING into Supabase SQL Editor.
-- Additive: new columns/tables/indexes + replace search_tools body.
-- Does NOT drop tools data. Safe to re-run most blocks (IF NOT EXISTS / OR REPLACE).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Helpers: normalize search text (strip spaces/punctuation, lowercase)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalize_search_text(p_input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(regexp_replace(coalesce(p_input, ''), '[^a-zA-Z0-9]+', '', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.tools_set_search_norm()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_norm := public.normalize_search_text(
    coalesce(NEW.name, '') || ' ' || coalesce(NEW.description, '')
  );
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2) tools: search_norm + include_in_global_search
-- ---------------------------------------------------------------------------
ALTER TABLE public.tools
  ADD COLUMN IF NOT EXISTS search_norm text,
  ADD COLUMN IF NOT EXISTS include_in_global_search boolean NOT NULL DEFAULT true;

UPDATE public.tools
SET search_norm = public.normalize_search_text(coalesce(name, '') || ' ' || coalesce(description, ''))
WHERE search_norm IS NULL OR search_norm = '';

DROP TRIGGER IF EXISTS trg_tools_set_search_norm ON public.tools;
CREATE TRIGGER trg_tools_set_search_norm
  BEFORE INSERT OR UPDATE OF name, description ON public.tools
  FOR EACH ROW
  EXECUTE FUNCTION public.tools_set_search_norm();

CREATE INDEX IF NOT EXISTS idx_tools_search_norm_trgm
  ON public.tools USING gin (search_norm public.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_tools_company_global_search
  ON public.tools (company_id)
  WHERE is_deleted IS NOT TRUE AND include_in_global_search = true;

-- ---------------------------------------------------------------------------
-- 3) tool_groups: default for NEW tools created into the group
-- ---------------------------------------------------------------------------
ALTER TABLE public.tool_groups
  ADD COLUMN IF NOT EXISTS default_include_in_global_search boolean NOT NULL DEFAULT true;

-- ---------------------------------------------------------------------------
-- 4) tool_search_aliases
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tool_search_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id uuid NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  alias text NOT NULL,
  source text NOT NULL DEFAULT 'manual'
    CHECK (source = ANY (ARRAY['ai'::text, 'manual'::text, 'system'::text])),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.users(id),
  CONSTRAINT ck_tool_search_aliases_company_active
    CHECK (public.is_company_active(company_id))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tool_search_aliases_unique
  ON public.tool_search_aliases (tool_id, lower(alias));

CREATE INDEX IF NOT EXISTS idx_tool_search_aliases_company
  ON public.tool_search_aliases (company_id);

CREATE INDEX IF NOT EXISTS idx_tool_search_aliases_alias_trgm
  ON public.tool_search_aliases USING gin (lower(alias) public.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_tool_search_aliases_tool
  ON public.tool_search_aliases (tool_id);

ALTER TABLE public.tool_search_aliases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view tool search aliases in their company" ON public.tool_search_aliases;
CREATE POLICY "Users can view tool search aliases in their company"
  ON public.tool_search_aliases FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage tool search aliases" ON public.tool_search_aliases;
CREATE POLICY "Admins can manage tool search aliases"
  ON public.tool_search_aliases TO authenticated
  USING (
    public.is_admin(auth.uid())
    AND company_id = public.get_user_company_id(auth.uid())
    AND public.is_company_active(company_id)
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    AND company_id = public.get_user_company_id(auth.uid())
    AND public.is_company_active(company_id)
  );

DROP POLICY IF EXISTS "Service role tool_search_aliases" ON public.tool_search_aliases;
CREATE POLICY "Service role tool_search_aliases"
  ON public.tool_search_aliases TO service_role
  USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_tool_search_aliases_active ON public.tool_search_aliases;
CREATE TRIGGER trg_tool_search_aliases_active
  BEFORE INSERT OR UPDATE ON public.tool_search_aliases
  FOR EACH ROW EXECUTE FUNCTION public.enforce_company_active();

GRANT ALL ON TABLE public.tool_search_aliases TO anon;
GRANT ALL ON TABLE public.tool_search_aliases TO authenticated;
GRANT ALL ON TABLE public.tool_search_aliases TO service_role;

-- ---------------------------------------------------------------------------
-- 5) Alias helper RPCs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_tool_search_aliases(p_tool_id uuid)
RETURNS TABLE (
  id uuid,
  alias text,
  source text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_company_id uuid := public.get_user_company_id(auth.uid());
BEGIN
  IF v_company_id IS NULL AND NOT public.is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM tools t
    WHERE t.id = p_tool_id
      AND (t.company_id = v_company_id OR public.is_superadmin(auth.uid()))
  ) THEN
    RAISE EXCEPTION 'Tool not found';
  END IF;

  RETURN QUERY
  SELECT a.id, a.alias, a.source, a.created_at
  FROM tool_search_aliases a
  WHERE a.tool_id = p_tool_id
  ORDER BY a.source, lower(a.alias);
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_tool_search_alias(
  p_tool_id uuid,
  p_alias text,
  p_source text DEFAULT 'manual'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_company_id uuid;
  v_alias_id uuid;
  v_source text := coalesce(nullif(trim(p_source), ''), 'manual');
BEGIN
  IF NOT public.is_admin(auth.uid()) AND NOT public.is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can manage tool search aliases';
  END IF;

  SELECT company_id INTO v_company_id FROM tools WHERE id = p_tool_id;
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Tool not found';
  END IF;

  IF NOT public.is_superadmin(auth.uid())
     AND v_company_id IS DISTINCT FROM public.get_user_company_id(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF trim(coalesce(p_alias, '')) = '' THEN
    RAISE EXCEPTION 'Alias cannot be empty';
  END IF;

  IF v_source NOT IN ('ai', 'manual', 'system') THEN
    RAISE EXCEPTION 'Invalid alias source';
  END IF;

  INSERT INTO tool_search_aliases (tool_id, company_id, alias, source, created_by)
  VALUES (p_tool_id, v_company_id, trim(p_alias), v_source, auth.uid())
  ON CONFLICT (tool_id, (lower(alias)))
  DO UPDATE SET
    alias = EXCLUDED.alias,
    -- Never downgrade manual to ai on conflict
    source = CASE
      WHEN tool_search_aliases.source = 'manual' THEN tool_search_aliases.source
      ELSE EXCLUDED.source
    END
  RETURNING id INTO v_alias_id;

  RETURN json_build_object('success', true, 'id', v_alias_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_tool_search_alias(p_alias_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) AND NOT public.is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can manage tool search aliases';
  END IF;

  SELECT company_id INTO v_company_id
  FROM tool_search_aliases WHERE id = p_alias_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Alias not found';
  END IF;

  IF NOT public.is_superadmin(auth.uid())
     AND v_company_id IS DISTINCT FROM public.get_user_company_id(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  DELETE FROM tool_search_aliases WHERE id = p_alias_id;
  RETURN json_build_object('success', true, 'message', 'Alias deleted');
END;
$$;

CREATE OR REPLACE FUNCTION public.set_tool_include_in_global_search(
  p_tool_id uuid,
  p_include boolean
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) AND NOT public.is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can update this setting';
  END IF;

  SELECT company_id INTO v_company_id FROM tools WHERE id = p_tool_id;
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Tool not found';
  END IF;

  IF NOT public.is_superadmin(auth.uid())
     AND v_company_id IS DISTINCT FROM public.get_user_company_id(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE tools
  SET include_in_global_search = coalesce(p_include, true)
  WHERE id = p_tool_id;

  RETURN json_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.replace_tool_ai_aliases(
  p_tool_id uuid,
  p_aliases text[]
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_company_id uuid;
  v_alias text;
  v_count int := 0;
BEGIN
  -- Intended for service_role / edge functions (SECURITY DEFINER).
  SELECT company_id INTO v_company_id FROM tools WHERE id = p_tool_id;
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Tool not found';
  END IF;

  DELETE FROM tool_search_aliases
  WHERE tool_id = p_tool_id AND source = 'ai';

  IF p_aliases IS NOT NULL THEN
    FOREACH v_alias IN ARRAY p_aliases LOOP
      IF trim(coalesce(v_alias, '')) = '' THEN
        CONTINUE;
      END IF;
      INSERT INTO tool_search_aliases (tool_id, company_id, alias, source)
      VALUES (p_tool_id, v_company_id, trim(v_alias), 'ai')
      ON CONFLICT (tool_id, (lower(alias))) DO NOTHING;
      v_count := v_count + 1;
    END LOOP;
  END IF;

  RETURN json_build_object('success', true, 'count', v_count);
END;
$$;

-- ---------------------------------------------------------------------------
-- 6) Extend create_group_tool_with_checklist to honor include_in_global_search
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.create_group_tool_with_checklist(
  uuid, text, text, text, text, uuid, jsonb, uuid, text
);

CREATE OR REPLACE FUNCTION public.create_group_tool_with_checklist(
  p_group_id uuid,
  p_number text,
  p_name text,
  p_description text,
  p_photo_url text,
  p_company_id uuid,
  p_checklist jsonb,
  p_owner_id uuid,
  p_location text,
  p_include_in_global_search boolean DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tool_id uuid;
  v_include boolean;
BEGIN
  IF p_include_in_global_search IS NOT NULL THEN
    v_include := p_include_in_global_search;
  ELSE
    SELECT coalesce(default_include_in_global_search, true)
      INTO v_include
    FROM tool_groups
    WHERE id = p_group_id;
    v_include := coalesce(v_include, true);
  END IF;

  INSERT INTO tools (
    number, name, description, photo_url, company_id, current_owner, include_in_global_search
  )
  VALUES (
    p_number, p_name, p_description, p_photo_url, p_company_id, p_owner_id, v_include
  )
  RETURNING id INTO v_tool_id;

  IF p_checklist IS NOT NULL AND jsonb_array_length(p_checklist) > 0 THEN
    INSERT INTO tool_checklists (tool_id, item_name, required, company_id)
    SELECT
      v_tool_id,
      (item->>'item_name')::text,
      (item->>'required')::boolean,
      p_company_id
    FROM jsonb_array_elements(p_checklist) AS item;
  END IF;

  INSERT INTO tool_transactions (
    tool_id, from_user_id, to_user_id, location, stored_at, notes, company_id
  ) VALUES (
    v_tool_id,
    NULL,
    p_owner_id,
    normalize_location(p_company_id, coalesce(p_location, 'Not specified')),
    'N/A',
    'Initial assignment from system (created in group)' ||
      CASE WHEN p_owner_id IS NOT NULL THEN ' to owner' ELSE '' END,
    p_company_id
  );

  INSERT INTO tool_group_members (group_id, tool_id)
  VALUES (p_group_id, v_tool_id);

  RETURN v_tool_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7) Replace search_tools (drop old overloads, one canonical function)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.search_tools(uuid, text, integer);
DROP FUNCTION IF EXISTS public.search_tools(uuid, text, integer, integer);

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
  matched AS (
    SELECT
      s.id AS tool_id,
      GREATEST(
        CASE WHEN lower(s.number) = v_term_lower THEN 100 ELSE 0 END,
        CASE WHEN lower(s.number) LIKE v_term_lower || '%' THEN 90 ELSE 0 END,
        CASE WHEN lower(s.name) = v_term_lower THEN 85 ELSE 0 END,
        CASE WHEN lower(s.name) LIKE v_term_lower || '%' THEN 80 ELSE 0 END,
        CASE WHEN lower(s.name) LIKE '%' || v_term_lower || '%' THEN 70 ELSE 0 END,
        CASE WHEN v_norm <> '' AND coalesce(s.search_norm, '') LIKE '%' || v_norm || '%' THEN 65 ELSE 0 END,
        CASE WHEN lower(coalesce(s.description, '')) LIKE '%' || v_term_lower || '%' THEN 55 ELSE 0 END,
        CASE WHEN length(v_term_lower) >= 3 AND similarity(lower(s.name), v_term_lower) >= v_sim_threshold
          THEN (50 + round(similarity(lower(s.name), v_term_lower) * 20))::int ELSE 0 END,
        CASE WHEN v_norm <> '' AND length(v_norm) >= 3
              AND similarity(coalesce(s.search_norm, ''), v_norm) >= v_sim_threshold
          THEN (45 + round(similarity(coalesce(s.search_norm, ''), v_norm) * 20))::int ELSE 0 END,
        CASE WHEN EXISTS (
          SELECT 1 FROM tool_search_aliases a
          WHERE a.tool_id = s.id AND (
            lower(a.alias) = v_term_lower
            OR lower(a.alias) LIKE '%' || v_term_lower || '%'
            OR (v_norm <> '' AND public.normalize_search_text(a.alias) LIKE '%' || v_norm || '%')
            OR (length(v_term_lower) >= 3 AND similarity(lower(a.alias), v_term_lower) >= v_sim_threshold)
          )
        ) THEN 40 ELSE 0 END,
        CASE WHEN lower(s.number) LIKE '%' || v_term_lower || '%' THEN 35 ELSE 0 END,
        CASE WHEN EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = s.current_owner AND lower(u.name) LIKE '%' || v_term_lower || '%'
        ) THEN 30 ELSE 0 END,
        CASE WHEN s.deleted_owner_name IS NOT NULL
              AND lower(s.deleted_owner_name) LIKE '%' || v_term_lower || '%' THEN 30 ELSE 0 END,
        CASE WHEN EXISTS (
          SELECT 1
          FROM tool_transactions tx
          WHERE tx.tool_id = s.id
            AND tx.company_id = p_company_id
            AND lower(tx.location) LIKE '%' || v_term_lower || '%'
          LIMIT 1
        ) THEN 25 ELSE 0 END
      ) AS rank_score
    FROM scoped s
    WHERE
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
  ORDER BY p.rank_score DESC, t.number_numeric, t.number;
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION public.normalize_search_text(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_tool_search_aliases(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upsert_tool_search_alias(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_tool_search_alias(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_tool_include_in_global_search(uuid, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.replace_tool_ai_aliases(uuid, text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_tools(uuid, text, integer, integer, text, uuid, uuid)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_group_tool_with_checklist(
  uuid, text, text, text, text, uuid, jsonb, uuid, text, boolean
) TO authenticated, service_role;

COMMENT ON COLUMN public.tools.search_norm IS 'Normalized name+description for punctuation/spacing-tolerant search';
COMMENT ON COLUMN public.tools.include_in_global_search IS 'When false, tool is hidden from global All Tools / Transfer search scopes';
COMMENT ON COLUMN public.tool_groups.default_include_in_global_search IS 'Default include_in_global_search for tools created into this group';
COMMENT ON TABLE public.tool_search_aliases IS 'Alternate search terms (AI/manual) for tools';
