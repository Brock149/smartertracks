-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_user_deleted ON users;
DROP FUNCTION IF EXISTS handle_user_deletion();

-- Create a function to safely delete a user
CREATE OR REPLACE FUNCTION delete_user(user_id UUID)
RETURNS void AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- First check if user exists and get their role
    SELECT role INTO user_role
    FROM users
    WHERE id = user_id;

    IF user_role IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Check if this is the last admin
    IF user_role = 'admin' THEN
        IF (SELECT COUNT(*) FROM users WHERE role = 'admin') <= 1 THEN
            RAISE EXCEPTION 'Cannot delete the last admin user';
        END IF;
    END IF;

    -- Start a transaction
    BEGIN
        -- First, update any tools owned by this user to have NULL owner
        UPDATE tools
        SET current_owner = NULL
        WHERE current_owner = user_id;

        -- Then update any transactions where this user was involved
        UPDATE tool_transactions
        SET 
            from_user_id = NULL,
            deleted_from_user_name = (SELECT name FROM users WHERE id = user_id)
        WHERE from_user_id = user_id;

        UPDATE tool_transactions
        SET 
            to_user_id = NULL,
            deleted_to_user_name = (SELECT name FROM users WHERE id = user_id)
        WHERE to_user_id = user_id;

        -- Delete from auth.users first
        DELETE FROM auth.users WHERE id = user_id;

        -- Finally delete from our users table
        DELETE FROM users WHERE id = user_id;
    EXCEPTION
        WHEN OTHERS THEN
            -- If anything fails, roll back the transaction
            RAISE EXCEPTION 'Failed to delete user: %', SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user(UUID) TO service_role; 