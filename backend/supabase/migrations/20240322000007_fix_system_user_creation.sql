-- Drop existing function
DROP FUNCTION IF EXISTS delete_user(UUID);

-- Create a function to safely delete a user
CREATE OR REPLACE FUNCTION delete_user(user_id UUID)
RETURNS void AS $$
DECLARE
    user_role TEXT;
    system_user_id UUID;
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

    -- Get or create a system user for handling deleted user transactions
    SELECT id INTO system_user_id
    FROM users
    WHERE email = 'system@internal';

    IF system_user_id IS NULL THEN
        -- Generate a new UUID for the system user
        system_user_id := gen_random_uuid();
        
        -- Create the system user in auth.users first
        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            role
        ) VALUES (
            system_user_id,
            'system@internal',
            crypt('system-password-' || system_user_id, gen_salt('bf')),
            now(),
            now(),
            now(),
            '{"provider":"email","providers":["email"]}',
            '{"name":"System"}',
            false,
            'authenticated'
        );

        -- Then create the user in our users table
        INSERT INTO users (id, name, email, role)
        VALUES (
            system_user_id,
            'System',
            'system@internal',
            'admin'
        );
    END IF;

    -- Start a transaction
    BEGIN
        -- First, update any tools owned by this user to have NULL owner
        UPDATE tools
        SET current_owner = NULL
        WHERE current_owner = user_id;

        -- Then update any transactions where this user was involved
        -- For from_user_id, we can set to NULL and store the name
        UPDATE tool_transactions
        SET 
            from_user_id = NULL,
            deleted_from_user_name = (SELECT name FROM users WHERE id = user_id)
        WHERE from_user_id = user_id;

        -- For to_user_id, we need to set it to the system user since it can't be NULL
        UPDATE tool_transactions
        SET 
            to_user_id = system_user_id,
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