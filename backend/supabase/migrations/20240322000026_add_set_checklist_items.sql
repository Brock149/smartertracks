-- Create a function to set checklist items in a session variable
CREATE OR REPLACE FUNCTION set_checklist_items(items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION set_checklist_items(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION set_checklist_items(jsonb) TO service_role; 