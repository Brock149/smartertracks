-- Drop existing user update policy
DROP POLICY IF EXISTS "Users can update their own information" ON users;

-- Create a more specific policy for users to update their own information
CREATE POLICY "Users can update their own information" ON users
    FOR UPDATE TO authenticated
    USING (
        auth.uid() = id AND
        -- Only allow updating name and email
        (name IS NOT NULL AND email IS NOT NULL)
    )
    WITH CHECK (
        auth.uid() = id AND
        -- Only allow updating name and email
        (name IS NOT NULL AND email IS NOT NULL) AND
        -- Ensure role and company_id remain unchanged
        role = (SELECT role FROM users WHERE id = auth.uid()) AND
        company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    ); 