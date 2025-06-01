-- Drop existing trigger and function
DROP TRIGGER IF EXISTS before_user_delete ON users;
DROP FUNCTION IF EXISTS store_deleted_user_name();

-- Recreate the function with proper permissions and error handling
CREATE OR REPLACE FUNCTION store_deleted_user_name()
RETURNS TRIGGER AS $$
BEGIN
    -- First update transactions where this user was the from_user
    UPDATE tool_transactions
    SET deleted_from_user_name = OLD.name
    WHERE from_user_id = OLD.id;
    
    -- Then update transactions where this user was the to_user
    UPDATE tool_transactions
    SET deleted_to_user_name = OLD.name
    WHERE to_user_id = OLD.id;
    
    -- Finally, update any tools where this user is the current owner
    UPDATE tools
    SET current_owner = NULL
    WHERE current_owner = OLD.id;
    
    RETURN OLD;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error (you can check the logs in Supabase)
        RAISE NOTICE 'Error in store_deleted_user_name: %', SQLERRM;
        -- Still allow the deletion to proceed
        RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER before_user_delete
    BEFORE DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION store_deleted_user_name();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION store_deleted_user_name() TO authenticated;
GRANT EXECUTE ON FUNCTION store_deleted_user_name() TO service_role; 