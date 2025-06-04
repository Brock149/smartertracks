-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage users in their company" ON users;
DROP POLICY IF EXISTS "Users can update their own information" ON users;

-- Create policy for admins to manage other users (but not their own record)
CREATE POLICY "Admins can manage other users in their company" ON users
    FOR ALL TO authenticated
    USING (
        is_admin(auth.uid()) AND 
        company_id = get_user_company_id(auth.uid()) AND
        id != auth.uid()  -- Prevent admins from managing their own record through this policy
    );

-- Create policy for users to update their own information
CREATE POLICY "Users can update their own information" ON users
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND
        role = (SELECT role FROM users WHERE id = auth.uid())
    ); 