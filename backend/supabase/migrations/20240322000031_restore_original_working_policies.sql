-- Drop all current user policies
DROP POLICY IF EXISTS "Admins can manage other users except self" ON users;
DROP POLICY IF EXISTS "Service role can do everything on users" ON users;
DROP POLICY IF EXISTS "Users can update their own information" ON users;
DROP POLICY IF EXISTS "Users can view their own record" ON users;
DROP POLICY IF EXISTS "Admins can manage users in their company" ON users;
DROP POLICY IF EXISTS "Admins can view users in their company" ON users;

-- Recreate the original working policies from backup
CREATE POLICY "Users can view their own record" ON users
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Admins can manage users in their company" ON users
    FOR ALL TO authenticated
    USING (
        is_admin(auth.uid()) AND
        company_id = get_user_company_id(auth.uid())
    );

CREATE POLICY "Service role can do everything on users" ON users
    TO service_role USING (true) WITH CHECK (true); 