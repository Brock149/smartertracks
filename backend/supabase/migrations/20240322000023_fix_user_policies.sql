-- Drop existing user policies
DROP POLICY IF EXISTS "Users can view their own record" ON users;
DROP POLICY IF EXISTS "Admins can manage users in their company" ON users;
DROP POLICY IF EXISTS "Admins can view users in their company" ON users;
DROP POLICY IF EXISTS "Company admins can view all users in their company" ON users;
DROP POLICY IF EXISTS "Service role can do everything on users" ON users;

-- Create a function to get user's company_id efficiently
CREATE OR REPLACE FUNCTION get_user_company_id(user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM users WHERE id = user_id;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_company_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_company_id(UUID) TO service_role;

-- Create new user policies
CREATE POLICY "Users can view their own record" ON users
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Admins can manage users in their company" ON users
    FOR ALL TO authenticated
    USING (
        is_admin(auth.uid()) AND
        company_id = get_user_company_id(auth.uid())
    );

-- Service role policy
CREATE POLICY "Service role can do everything on users" ON users
    TO service_role USING (true) WITH CHECK (true); 