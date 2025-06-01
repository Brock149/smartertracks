-- Drop existing function if it exists
DROP FUNCTION IF EXISTS delete_tool(UUID);

-- Add is_deleted column to tools table if it doesn't exist
ALTER TABLE tools
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Create a function to safely delete a tool
CREATE OR REPLACE FUNCTION delete_tool(p_tool_id UUID)
RETURNS void AS $$
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
        -- Store the tool's details
        UPDATE tool_transactions
        SET 
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_tool(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_tool(UUID) TO service_role;

-- Add columns to store deleted tool information
ALTER TABLE tool_transactions
    ADD COLUMN IF NOT EXISTS deleted_tool_number TEXT,
    ADD COLUMN IF NOT EXISTS deleted_tool_name TEXT; 