-- Add company_id to tables that need multi-company support

-- Add company_id to tools table
ALTER TABLE tools 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- Add company_id to tool_transactions table
ALTER TABLE tool_transactions 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- Add company_id to tool_checklists table
ALTER TABLE tool_checklists 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- Add company_id to checklist_reports table
ALTER TABLE checklist_reports 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- Migrate existing data to have company_id values
-- First, set all NULL company_id values to the existing company (safer approach)
UPDATE tools 
SET company_id = '9c7d873f-e40b-4e18-9ef0-65054043fde5'
WHERE company_id IS NULL;

UPDATE tool_transactions 
SET company_id = '9c7d873f-e40b-4e18-9ef0-65054043fde5'
WHERE company_id IS NULL;

UPDATE tool_checklists 
SET company_id = '9c7d873f-e40b-4e18-9ef0-65054043fde5'
WHERE company_id IS NULL;

UPDATE checklist_reports 
SET company_id = '9c7d873f-e40b-4e18-9ef0-65054043fde5'
WHERE company_id IS NULL;

-- Now make the company_id columns NOT NULL
ALTER TABLE tools ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE tool_transactions ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE tool_checklists ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE checklist_reports ALTER COLUMN company_id SET NOT NULL;

-- Create a helper function to get a user's company_id
CREATE OR REPLACE FUNCTION get_user_company_id(user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT company_id FROM users WHERE id = user_id;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_company_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_company_id(UUID) TO service_role;

-- Update RLS policies for company-aware access

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can do everything with tools" ON tools;
DROP POLICY IF EXISTS "Users can view tools" ON tools;
DROP POLICY IF EXISTS "Users can view their transactions" ON tool_transactions;
DROP POLICY IF EXISTS "Users can create transactions" ON tool_transactions;
DROP POLICY IF EXISTS "Admins can do everything" ON tool_checklists;
DROP POLICY IF EXISTS "All users can view checklist" ON tool_checklists;
DROP POLICY IF EXISTS "Users can view their checklist reports" ON checklist_reports;
DROP POLICY IF EXISTS "Users can create checklist reports" ON checklist_reports;

-- Create new company-aware policies

-- Users table policies
CREATE POLICY "Admins can view users in their company" ON users
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
            AND u.company_id = users.company_id
        )
    );

CREATE POLICY "Users can view their own record" ON users
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Admins can manage users in their company" ON users
    FOR ALL TO authenticated
    USING (
        company_id = get_user_company_id(auth.uid()) AND
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Tools table policies
CREATE POLICY "Users can view tools in their company" ON tools
    FOR SELECT TO authenticated
    USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage tools in their company" ON tools
    FOR ALL TO authenticated
    USING (
        company_id = get_user_company_id(auth.uid()) AND
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Tool transactions policies
CREATE POLICY "Users can view transactions in their company" ON tool_transactions
    FOR SELECT TO authenticated
    USING (
        company_id = get_user_company_id(auth.uid()) OR
        from_user_id = auth.uid() OR
        to_user_id = auth.uid()
    );

CREATE POLICY "Users can create transactions in their company" ON tool_transactions
    FOR INSERT TO authenticated
    WITH CHECK (
        company_id = get_user_company_id(auth.uid()) AND
        (from_user_id = auth.uid() OR from_user_id IS NULL) AND
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = to_user_id
            AND users.company_id = get_user_company_id(auth.uid())
        )
    );

CREATE POLICY "Admins can manage transactions in their company" ON tool_transactions
    FOR ALL TO authenticated
    USING (
        company_id = get_user_company_id(auth.uid()) AND
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Tool checklists policies
CREATE POLICY "Users can view checklists in their company" ON tool_checklists
    FOR SELECT TO authenticated
    USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage checklists in their company" ON tool_checklists
    FOR ALL TO authenticated
    USING (
        company_id = get_user_company_id(auth.uid()) AND
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Checklist reports policies
CREATE POLICY "Users can view checklist reports in their company" ON checklist_reports
    FOR SELECT TO authenticated
    USING (
        company_id = get_user_company_id(auth.uid()) OR
        EXISTS (
            SELECT 1 FROM tool_transactions
            WHERE tool_transactions.id = checklist_reports.transaction_id
            AND (tool_transactions.from_user_id = auth.uid() OR tool_transactions.to_user_id = auth.uid())
        )
    );

CREATE POLICY "Users can create checklist reports in their company" ON checklist_reports
    FOR INSERT TO authenticated
    WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage checklist reports in their company" ON checklist_reports
    FOR ALL TO authenticated
    USING (
        company_id = get_user_company_id(auth.uid()) AND
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Companies table policies
CREATE POLICY "Users can view their own company" ON companies
    FOR SELECT TO authenticated
    USING (id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage their own company" ON companies
    FOR ALL TO authenticated
    USING (
        id = get_user_company_id(auth.uid()) AND
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Service role policies (for edge functions)
CREATE POLICY "Service role can do everything on companies" ON companies
    TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything on users" ON users
    TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything on tools" ON tools
    TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything on transactions" ON tool_transactions
    TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything on checklists" ON tool_checklists
    TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything on reports" ON checklist_reports
    TO service_role USING (true) WITH CHECK (true); 