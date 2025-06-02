-- Add company_id to tool_checklists if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'tool_checklists' 
        AND column_name = 'company_id'
    ) THEN
        ALTER TABLE tool_checklists ADD COLUMN company_id UUID REFERENCES companies(id);
    END IF;
END $$;

-- Update existing tool_checklists to have the same company_id as their tool
UPDATE tool_checklists tc
SET company_id = t.company_id
FROM tools t
WHERE tc.tool_id = t.id
AND tc.company_id IS NULL;

-- Make company_id NOT NULL after updating existing records
ALTER TABLE tool_checklists ALTER COLUMN company_id SET NOT NULL;

-- Update the create-tool function to include company_id in checklist items
CREATE OR REPLACE FUNCTION create_tool_with_checklist()
RETURNS TRIGGER AS $$
DECLARE
    checklist_json jsonb;
BEGIN
    -- Get the checklist items from the session variable
    checklist_json := current_setting('app.checklist_items', true)::jsonb;
    
    -- If there are checklist items in the request, insert them with the tool's company_id
    IF TG_OP = 'INSERT' AND NEW.company_id IS NOT NULL AND checklist_json IS NOT NULL THEN
        INSERT INTO tool_checklists (tool_id, item_name, required, company_id)
        SELECT 
            NEW.id,
            (item->>'item_name')::text,
            (item->>'required')::boolean,
            NEW.company_id
        FROM jsonb_array_elements(checklist_json) AS item;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS create_tool_with_checklist_trigger ON tools;

-- Create the trigger
CREATE TRIGGER create_tool_with_checklist_trigger
AFTER INSERT ON tools
FOR EACH ROW
EXECUTE FUNCTION create_tool_with_checklist(); 