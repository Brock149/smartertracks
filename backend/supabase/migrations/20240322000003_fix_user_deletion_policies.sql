-- Add DELETE policy for users table
CREATE POLICY "Admins can delete users"
    ON users
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Create function to handle user deletion from auth.users
CREATE OR REPLACE FUNCTION handle_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete from auth.users first
    DELETE FROM auth.users WHERE id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to handle auth.users deletion
CREATE TRIGGER on_user_deleted
    AFTER DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION handle_user_deletion();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_user_deletion() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_user_deletion() TO service_role; 