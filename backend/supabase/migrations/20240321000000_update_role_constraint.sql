-- Drop existing role check constraint if it exists
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add new role check constraint
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'tech'));

-- Update existing 'technician' roles to 'tech'
UPDATE users SET role = 'tech' WHERE role = 'technician'; 