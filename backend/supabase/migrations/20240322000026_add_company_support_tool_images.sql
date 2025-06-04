-- Add company_id to tool_images table
ALTER TABLE tool_images 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- Migrate existing data to have company_id values
UPDATE tool_images
SET company_id = tools.company_id
FROM tools
WHERE tool_images.tool_id = tools.id;

-- Make company_id NOT NULL after migration
ALTER TABLE tool_images ALTER COLUMN company_id SET NOT NULL;

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can do anything" ON tool_images;
DROP POLICY IF EXISTS "Users can delete images for their tools" ON tool_images;
DROP POLICY IF EXISTS "Users can insert images for their tools" ON tool_images;
DROP POLICY IF EXISTS "Users can view images for their tools" ON tool_images;

-- Create new company-aware policies for tool_images
CREATE POLICY "Users can view images in their company" ON tool_images
    FOR SELECT TO authenticated
    USING (
        company_id = get_user_company_id(auth.uid()) OR
        EXISTS (
            SELECT 1 FROM tools
            WHERE tools.id = tool_images.tool_id
            AND tools.current_owner = auth.uid()
        )
    );

CREATE POLICY "Users can insert images in their company" ON tool_images
    FOR INSERT TO authenticated
    WITH CHECK (
        company_id = get_user_company_id(auth.uid()) AND
        EXISTS (
            SELECT 1 FROM tools
            WHERE tools.id = tool_images.tool_id
            AND tools.company_id = get_user_company_id(auth.uid())
        )
    );

CREATE POLICY "Users can delete images in their company" ON tool_images
    FOR DELETE TO authenticated
    USING (
        company_id = get_user_company_id(auth.uid()) OR
        EXISTS (
            SELECT 1 FROM tools
            WHERE tools.id = tool_images.tool_id
            AND tools.current_owner = auth.uid()
        )
    );

CREATE POLICY "Admins can manage images in their company" ON tool_images
    FOR ALL TO authenticated
    USING (
        is_admin(auth.uid()) AND
        company_id = get_user_company_id(auth.uid())
    );

-- Service role policy for edge functions
CREATE POLICY "Service role can do everything on tool_images" ON tool_images
    TO service_role USING (true) WITH CHECK (true); 