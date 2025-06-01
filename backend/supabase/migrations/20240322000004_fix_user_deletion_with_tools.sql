-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_user_deleted ON users;
DROP FUNCTION IF EXISTS handle_user_deletion();

-- Create function to handle user deletion with tool ownership
CREATE OR REPLACE FUNCTION handle_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- First, update any tools owned by this user to have NULL owner
    UPDATE tools
    SET current_owner = NULL
    WHERE current_owner = OLD.id;

    -- Then update any transactions where this user was involved
    UPDATE tool_transactions
    SET 
        from_user_id = NULL,
        deleted_from_user_name = OLD.name
    WHERE from_user_id = OLD.id;

    UPDATE tool_transactions
    SET 
        to_user_id = NULL,
        deleted_to_user_name = OLD.name
    WHERE to_user_id = OLD.id;

    -- Finally delete from auth.users
    DELETE FROM auth.users WHERE id = OLD.id;
    
    RETURN OLD;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error
        RAISE NOTICE 'Error in handle_user_deletion: %', SQLERRM;
        -- Still allow the deletion to proceed
        RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_user_deleted
    BEFORE DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION handle_user_deletion();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_user_deletion() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_user_deletion() TO service_role; 