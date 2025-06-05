-- Enable RLS on company_access_codes table
ALTER TABLE company_access_codes ENABLE ROW LEVEL SECURITY;

-- Policy for admins to manage access codes in their company
CREATE POLICY "Admins can manage access codes in their company"
ON company_access_codes
FOR ALL
TO authenticated
USING (
    is_admin(auth.uid()) AND
    company_id = get_user_company_id(auth.uid())
);

-- Policy for techs to view tech access codes in their company
CREATE POLICY "Techs can view tech access codes in their company"
ON company_access_codes
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'tech'
        AND users.company_id = company_access_codes.company_id
    )
    AND role = 'tech'
);

-- Policy for service role to do everything
CREATE POLICY "Service role can do everything on access codes"
ON company_access_codes
TO service_role
USING (true)
WITH CHECK (true); 