-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view users in their company" ON users;
DROP POLICY IF EXISTS "Users can view their own record" ON users;
DROP POLICY IF EXISTS "Admins can manage users in their company" ON users;
DROP POLICY IF EXISTS "Users can view tools in their company" ON tools;
DROP POLICY IF EXISTS "Admins can manage tools in their company" ON tools;
DROP POLICY IF EXISTS "Users can view transactions in their company" ON tool_transactions;
DROP POLICY IF EXISTS "Users can create transactions in their company" ON tool_transactions;
DROP POLICY IF EXISTS "Admins can manage transactions in their company" ON tool_transactions;
DROP POLICY IF EXISTS "Users can view checklists in their company" ON tool_checklists;
DROP POLICY IF EXISTS "Admins can manage checklists in their company" ON tool_checklists;
DROP POLICY IF EXISTS "Users can view checklist reports in their company" ON checklist_reports;
DROP POLICY IF EXISTS "Users can create checklist reports in their company" ON checklist_reports;
DROP POLICY IF EXISTS "Admins can manage checklist reports in their company" ON checklist_reports;
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Admins can manage their own company" ON companies;

-- Drop service role policies
DROP POLICY IF EXISTS "Service role can do everything on companies" ON companies;
DROP POLICY IF EXISTS "Service role can do everything on users" ON users;
DROP POLICY IF EXISTS "Service role can do everything on tools" ON tools;
DROP POLICY IF EXISTS "Service role can do everything on transactions" ON tool_transactions;
DROP POLICY IF EXISTS "Service role can do everything on checklists" ON tool_checklists;
DROP POLICY IF EXISTS "Service role can do everything on reports" ON checklist_reports;

-- Drop existing is_admin function if it exists
DROP FUNCTION IF EXISTS is_admin(UUID);

-- Create a function to check if a user is an admin
CREATE OR REPLACE FUNCTION is_admin(uid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = uid
    AND role = 'admin'
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO service_role;

-- Users table policies
CREATE POLICY "Users can view their own record" ON users
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Admins can view users in their company" ON users
    FOR SELECT TO authenticated
    USING (
        is_admin(auth.uid()) AND
        company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Admins can manage users in their company" ON users
    FOR ALL TO authenticated
    USING (
        is_admin(auth.uid()) AND
        company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    );

-- Tools table policies
CREATE POLICY "Users can view tools in their company" ON tools
    FOR SELECT TO authenticated
    USING (
        company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Admins can manage tools in their company" ON tools
    FOR ALL TO authenticated
    USING (
        is_admin(auth.uid()) AND
        company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    );

-- Tool transactions policies
CREATE POLICY "Users can view transactions in their company" ON tool_transactions
    FOR SELECT TO authenticated
    USING (
        company_id = (SELECT company_id FROM users WHERE id = auth.uid()) OR
        from_user_id = auth.uid() OR
        to_user_id = auth.uid()
    );

CREATE POLICY "Users can create transactions in their company" ON tool_transactions
    FOR INSERT TO authenticated
    WITH CHECK (
        company_id = (SELECT company_id FROM users WHERE id = auth.uid()) AND
        (from_user_id = auth.uid() OR from_user_id IS NULL) AND
        EXISTS (
            SELECT 1 FROM users
            WHERE id = to_user_id
            AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    );

CREATE POLICY "Admins can manage transactions in their company" ON tool_transactions
    FOR ALL TO authenticated
    USING (
        is_admin(auth.uid()) AND
        company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    );

-- Tool checklists policies
CREATE POLICY "Users can view checklists in their company" ON tool_checklists
    FOR SELECT TO authenticated
    USING (
        company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Admins can manage checklists in their company" ON tool_checklists
    FOR ALL TO authenticated
    USING (
        is_admin(auth.uid()) AND
        company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    );

-- Checklist reports policies
CREATE POLICY "Users can view checklist reports in their company" ON checklist_reports
    FOR SELECT TO authenticated
    USING (
        company_id = (SELECT company_id FROM users WHERE id = auth.uid()) OR
        EXISTS (
            SELECT 1 FROM tool_transactions
            WHERE id = checklist_reports.transaction_id
            AND (from_user_id = auth.uid() OR to_user_id = auth.uid())
        )
    );

CREATE POLICY "Users can create checklist reports in their company" ON checklist_reports
    FOR INSERT TO authenticated
    WITH CHECK (
        company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Admins can manage checklist reports in their company" ON checklist_reports
    FOR ALL TO authenticated
    USING (
        is_admin(auth.uid()) AND
        company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    );

-- Companies table policies
CREATE POLICY "Users can view their own company" ON companies
    FOR SELECT TO authenticated
    USING (
        id = (SELECT company_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Admins can manage their own company" ON companies
    FOR ALL TO authenticated
    USING (
        is_admin(auth.uid()) AND
        id = (SELECT company_id FROM users WHERE id = auth.uid())
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