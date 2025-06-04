-- Drop all existing user policies
DROP POLICY IF EXISTS "Admins can manage users in their company" ON users;
DROP POLICY IF EXISTS "Users can update their own information" ON users;
DROP POLICY IF EXISTS "Users can view their own record" ON users;
DROP POLICY IF EXISTS "Admins can view users in their company" ON users;

-- Create base policy for users to view their own record
CREATE POLICY "Users can view their own record" ON users
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

-- Create policy for users to update their own information
CREATE POLICY "Users can update their own information" ON users
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND
        role = (SELECT role FROM users WHERE id = auth.uid())
    );

-- Create policy for admins to manage other users
CREATE POLICY "Admins can manage other users" ON users
    FOR ALL TO authenticated
    USING (
        is_admin(auth.uid()) AND 
        company_id = get_user_company_id(auth.uid()) AND
        id != auth.uid()  -- Prevent admins from managing their own record through this policy
    ); 