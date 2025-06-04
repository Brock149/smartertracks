-- Drop all existing user policies
DROP POLICY IF EXISTS "Admins can manage users in their company" ON users;
DROP POLICY IF EXISTS "Users can update their own information" ON users;
DROP POLICY IF EXISTS "Users can view their own record" ON users;
DROP POLICY IF EXISTS "Admins can view users in their company" ON users;
DROP POLICY IF EXISTS "Admins can manage other users" ON users;
DROP POLICY IF EXISTS "Admins can manage other users except self" ON users;

-- Create the original working policies
CREATE POLICY "Users can view their own record" ON users
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own information" ON users
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND
        role = (SELECT role FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Admins can manage other users except self" ON users
    FOR ALL TO authenticated
    USING (
        is_admin(auth.uid()) AND 
        company_id = get_user_company_id(auth.uid()) AND
        id != auth.uid()
    ); 