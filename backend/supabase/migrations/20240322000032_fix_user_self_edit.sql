-- Drop existing user update policy
DROP POLICY IF EXISTS "Users can update their own information" ON users;

-- Create a policy that allows users to update their own information
CREATE POLICY "Users can update their own information" ON users
    FOR UPDATE TO authenticated
    USING (
        auth.uid() = id
    )
    WITH CHECK (
        auth.uid() = id AND
        -- Ensure role and company_id remain unchanged
        role = (SELECT role FROM users WHERE id = auth.uid()) AND
        company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    ); 