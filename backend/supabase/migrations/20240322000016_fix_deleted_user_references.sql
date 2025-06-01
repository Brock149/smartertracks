-- Drop existing function
DROP FUNCTION IF EXISTS delete_user(UUID);

-- Create a function to safely delete a user
CREATE OR REPLACE FUNCTION delete_user(user_id UUID)
RETURNS void AS $$
DECLARE
    user_role TEXT;
    user_name TEXT;
    user_email TEXT;
    deleted_user_id UUID;
BEGIN
    -- First check if user exists and get their role and name
    SELECT role, name, email INTO user_role, user_name, user_email
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

    -- Get or create a deleted user placeholder
    SELECT id INTO deleted_user_id
    FROM users
    WHERE email = 'deleted@internal';

    IF deleted_user_id IS NULL THEN
        -- Create a deleted user placeholder if it doesn't exist
        INSERT INTO users (id, name, email, role)
        VALUES (
            gen_random_uuid(),
            'Deleted User',
            'deleted@internal',
            'user'
        )
        RETURNING id INTO deleted_user_id;
    END IF;

    -- Start a transaction
    BEGIN
        -- First, update any tools owned by this user to have NULL owner
        -- but store the user's name in a new column deleted_owner_name
        UPDATE tools
        SET 
            current_owner = NULL,
            deleted_owner_name = user_name
        WHERE current_owner = user_id;

        -- Then update any transactions where this user was involved
        -- For from_user_id, we can set to NULL and store the name
        UPDATE tool_transactions
        SET 
            from_user_id = NULL,
            deleted_from_user_name = user_name
        WHERE from_user_id = user_id;

        -- For to_user_id, we need to set it to the deleted user placeholder
        -- but store the original user's name
        UPDATE tool_transactions
        SET 
            to_user_id = deleted_user_id,
            deleted_to_user_name = user_name
        WHERE to_user_id = user_id;

        -- Update any checklist reports
        UPDATE checklist_reports
        SET 
            deleted_user_name = user_name
        WHERE user_id = user_id;

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