-- Add unique constraint on tool numbers
ALTER TABLE tools
    ADD CONSTRAINT tools_number_unique UNIQUE (number);

-- Add deleted_user_name to tool_transactions
ALTER TABLE tool_transactions
    ADD COLUMN deleted_from_user_name TEXT,
    ADD COLUMN deleted_to_user_name TEXT;

-- Create function to store user name before deletion
CREATE OR REPLACE FUNCTION store_deleted_user_name()
RETURNS TRIGGER AS $$
BEGIN
    -- Update transactions where this user was the from_user
    UPDATE tool_transactions
    SET deleted_from_user_name = OLD.name
    WHERE from_user_id = OLD.id;
    
    -- Update transactions where this user was the to_user
    UPDATE tool_transactions
    SET deleted_to_user_name = OLD.name
    WHERE to_user_id = OLD.id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to store user name before deletion
CREATE TRIGGER before_user_delete
    BEFORE DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION store_deleted_user_name(); 