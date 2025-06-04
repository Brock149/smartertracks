-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can update their own information" ON users;

-- Create policy for users to update their own information
CREATE POLICY "Users can update their own information" ON users
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND
        role = (SELECT role FROM users WHERE id = auth.uid())
    ); 