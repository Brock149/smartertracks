-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT auth.uid(),
    name TEXT,
    email TEXT,
    role TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create tools table
CREATE TABLE tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    number TEXT,
    name TEXT,
    description TEXT,
    photo_url TEXT,
    current_owner UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create tool_transactions table
CREATE TABLE tool_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id UUID,
    from_user_id UUID,
    to_user_id UUID,
    location TEXT,
    stored_at TEXT,
    notes TEXT,
    timestamp TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
); 