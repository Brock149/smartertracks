# SASI Super Admin Portal

This is the super admin portal for managing companies in the SASI Tool Tracking system.

## Setup Instructions

### 1. Install Dependencies
```bash
cd superadminportal
npm install
```

### 2. Environment Configuration
Copy your Supabase credentials to `.env.local`:

```bash
# Copy from your main admin portal .env.local
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 3. Create Your Super Admin Account

First, make sure you have an account in Supabase Auth, then run this SQL in your Supabase SQL editor:

```sql
-- Replace with your actual details
INSERT INTO users (id, name, email, role, company_id)
VALUES (
  'your-auth-uuid-here',  -- Your Supabase Auth UUID
  'Your Name',            -- Your name
  'your-email@domain.com', -- Your email
  'superadmin',           -- Role
  NULL                    -- No company_id for superadmin
)
ON CONFLICT (id) 
DO UPDATE SET 
  role = 'superadmin',
  company_id = NULL;
```

### 4. Run the Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:5174`

## Features

- **Company Overview**: View all companies with stats (users, tools, activity)
- **Company Management**: Activate/suspend companies manually
- **Secure Access**: Only users with `superadmin` role can access
- **Real-time Data**: Uses the same Supabase backend as your admin portal

## Next Steps

After Phase 2 is complete, we'll add:
- Company creation functionality
- Company deletion with full data cleanup
- Access code generation
- User management per company

## Tech Stack

- React 19 + TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Supabase for backend
- React Router for navigation 