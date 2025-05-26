-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_transactions ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own record"
    ON users
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Tools table policies
CREATE POLICY "Admins have full access to tools"
    ON tools
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Users can view all tools"
    ON tools
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update tools they own"
    ON tools
    FOR UPDATE
    TO authenticated
    USING (
        current_owner = auth.uid()
        OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Tool transactions policies
CREATE POLICY "Users can view their own transactions"
    ON tool_transactions
    FOR SELECT
    TO authenticated
    USING (
        from_user_id = auth.uid()
        OR to_user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Users can create transactions"
    ON tool_transactions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        from_user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    ); 