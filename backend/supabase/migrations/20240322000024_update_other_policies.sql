-- Drop existing policies
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

-- Create new policies using get_user_company_id function

-- Tools policies
CREATE POLICY "Users can view tools in their company" ON tools
    FOR SELECT TO authenticated
    USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage tools in their company" ON tools
    FOR ALL TO authenticated
    USING (
        is_admin(auth.uid()) AND
        company_id = get_user_company_id(auth.uid())
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
            WHERE id = to_user_id
            AND company_id = get_user_company_id(auth.uid())
        )
    );

CREATE POLICY "Admins can manage transactions in their company" ON tool_transactions
    FOR ALL TO authenticated
    USING (
        is_admin(auth.uid()) AND
        company_id = get_user_company_id(auth.uid())
    );

-- Tool checklists policies
CREATE POLICY "Users can view checklists in their company" ON tool_checklists
    FOR SELECT TO authenticated
    USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage checklists in their company" ON tool_checklists
    FOR ALL TO authenticated
    USING (
        is_admin(auth.uid()) AND
        company_id = get_user_company_id(auth.uid())
    );

-- Checklist reports policies
CREATE POLICY "Users can view checklist reports in their company" ON checklist_reports
    FOR SELECT TO authenticated
    USING (
        company_id = get_user_company_id(auth.uid()) OR
        EXISTS (
            SELECT 1 FROM tool_transactions
            WHERE id = checklist_reports.transaction_id
            AND (from_user_id = auth.uid() OR to_user_id = auth.uid())
        )
    );

CREATE POLICY "Users can create checklist reports in their company" ON checklist_reports
    FOR INSERT TO authenticated
    WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage checklist reports in their company" ON checklist_reports
    FOR ALL TO authenticated
    USING (
        is_admin(auth.uid()) AND
        company_id = get_user_company_id(auth.uid())
    );

-- Companies policies
CREATE POLICY "Users can view their own company" ON companies
    FOR SELECT TO authenticated
    USING (id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage their own company" ON companies
    FOR ALL TO authenticated
    USING (
        is_admin(auth.uid()) AND
        id = get_user_company_id(auth.uid())
    ); 