-- Update existing transactions where we need to store deleted user names
UPDATE tool_transactions t
SET 
    deleted_from_user_name = u.name,
    from_user_id = NULL
FROM users u
WHERE t.from_user_id = u.id
AND NOT EXISTS (SELECT 1 FROM users WHERE id = u.id);

UPDATE tool_transactions t
SET 
    deleted_to_user_name = u.name,
    to_user_id = NULL
FROM users u
WHERE t.to_user_id = u.id
AND NOT EXISTS (SELECT 1 FROM users WHERE id = u.id);

-- Drop existing function
DROP FUNCTION IF EXISTS delete_user;

CREATE OR REPLACE FUNCTION delete_user(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_last_admin BOOLEAN;
BEGIN
    -- Check if this is the last admin
    SELECT COUNT(*) = 1 INTO is_last_admin
    FROM users
    WHERE role = 'admin';

    IF is_last_admin AND EXISTS (
        SELECT 1 FROM users 
        WHERE id = user_id AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Cannot delete the last admin user';
    END IF;

    -- Store user's name in transactions before deleting
    UPDATE tool_transactions
    SET 
        deleted_from_user_name = (SELECT name FROM users WHERE id = user_id),
        from_user_id = NULL
    WHERE from_user_id = user_id;

    UPDATE tool_transactions
    SET 
        deleted_to_user_name = (SELECT name FROM users WHERE id = user_id),
        to_user_id = NULL
    WHERE to_user_id = user_id;

    -- Delete from both users table and auth.users
    DELETE FROM users WHERE id = user_id;
    DELETE FROM auth.users WHERE id = user_id;
END;
$$;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION delete_user TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user TO service_role; 