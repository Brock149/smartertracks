# Supabase Rebuild Guide

This guide outlines the steps needed to rebuild and reconfigure your Supabase database and edge functions from scratch.

## 1. Create New Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Fill in project details:
   - Organization: Select your org
   - Name: "sasi-hvac-tools" (or your preferred name)
   - Database Password: Generate a secure password and save it
   - Region: Choose closest to your users
   - Pricing Plan: Select appropriate plan

## 2. Database Setup

### 2.1 Create Tables
Run the following SQL in the Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'technician')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create tools table
CREATE TABLE tools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    serial_number TEXT UNIQUE,
    status TEXT NOT NULL CHECK (status IN ('available', 'assigned', 'maintenance', 'retired')),
    current_location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create tool_transfers table
CREATE TABLE tool_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_id UUID REFERENCES tools(id) NOT NULL,
    from_user_id UUID REFERENCES users(id),
    to_user_id UUID REFERENCES users(id),
    transfer_type TEXT NOT NULL CHECK (transfer_type IN ('checkout', 'return', 'maintenance')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create tool_maintenance table
CREATE TABLE tool_maintenance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_id UUID REFERENCES tools(id) NOT NULL,
    maintenance_type TEXT NOT NULL,
    description TEXT,
    performed_by UUID REFERENCES users(id),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    next_maintenance_due TIMESTAMP WITH TIME ZONE
);
```

### 2.2 Set Up Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_maintenance ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users table policies
CREATE POLICY "Users can view their own data" ON users
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admins can update users" ON users
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

-- Tools table policies
CREATE POLICY "Anyone can view tools" ON tools
    FOR SELECT USING (true);
CREATE POLICY "Admins can manage tools" ON tools
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Tool transfers policies
CREATE POLICY "Anyone can view transfers" ON tool_transfers
    FOR SELECT USING (true);
CREATE POLICY "Admins can create transfers" ON tool_transfers
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Users can create their own transfers" ON tool_transfers
    FOR INSERT WITH CHECK (auth.uid() = to_user_id);

-- Tool maintenance policies
CREATE POLICY "Anyone can view maintenance records" ON tool_maintenance
    FOR SELECT USING (true);
CREATE POLICY "Admins can manage maintenance" ON tool_maintenance
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
```

## 3. Edge Functions Setup

### 3.1 Install Supabase CLI
```bash
npm install -g supabase
```

### 3.2 Initialize Edge Functions
```bash
cd backend
supabase init
supabase functions new tool-transfer
```

### 3.3 Create Tool Transfer Function
Create file `backend/supabase/functions/tool-transfer/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { tool_id, from_user_id, to_user_id, transfer_type, notes } = await req.json()

    // Start a transaction
    const { data: transfer, error: transferError } = await supabaseClient
      .from('tool_transfers')
      .insert([
        {
          tool_id,
          from_user_id,
          to_user_id,
          transfer_type,
          notes,
        },
      ])
      .select()
      .single()

    if (transferError) throw transferError

    // Update tool status
    const { error: toolError } = await supabaseClient
      .from('tools')
      .update({ status: transfer_type === 'checkout' ? 'assigned' : 'available' })
      .eq('id', tool_id)

    if (toolError) throw toolError

    return new Response(
      JSON.stringify({ success: true, transfer }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
```

### 3.4 Deploy Edge Function
```bash
supabase functions deploy tool-transfer
```

## 4. Update Environment Variables

### 4.1 Get New Project Credentials
1. Go to Project Settings > API
2. Copy the following:
   - Project URL
   - anon/public key
   - service_role key (keep this secure)

### 4.2 Update Local Environment
Create/update `.env` file in adminportal:
```
VITE_SUPABASE_URL=your_new_project_url
VITE_SUPABASE_ANON_KEY=your_new_anon_key
```

### 4.3 Update Edge Function Environment
In Supabase Dashboard:
1. Go to Settings > Functions
2. Add environment variables:
   - SUPABASE_URL
   - SUPABASE_ANON_KEY

## 5. Test Configuration

1. Test database connection:
```typescript
const { data, error } = await supabase
  .from('tools')
  .select('*')
  .limit(1)
```

2. Test edge function:
```typescript
const { data, error } = await supabase.functions.invoke('tool-transfer', {
  body: {
    tool_id: 'test-tool-id',
    from_user_id: 'test-from-id',
    to_user_id: 'test-to-id',
    transfer_type: 'checkout',
    notes: 'Test transfer'
  }
})
```

## 6. Troubleshooting

### Common Issues:
1. CORS errors:
   - Check CORS settings in Supabase Dashboard
   - Verify edge function CORS headers

2. Authentication errors:
   - Verify JWT configuration
   - Check RLS policies
   - Verify user roles

3. Database connection errors:
   - Verify environment variables
   - Check database password
   - Verify network access

4. Edge function errors:
   - Check function logs in Supabase Dashboard
   - Verify environment variables
   - Check function permissions

## 7. Backup and Restore

### 7.1 Backup Current Data
```bash
supabase db dump -f backup.sql
```

### 7.2 Restore Data
```bash
supabase db reset
psql -f backup.sql
```

## 8. Cleanup

1. Delete old project if no longer needed
2. Remove old environment variables
3. Update any documentation with new credentials
4. Update any CI/CD pipelines with new configuration

## Notes

- Always backup your data before making major changes
- Keep your service_role key secure and never expose it in client-side code
- Test thoroughly in a staging environment before applying to production
- Document any custom configurations or policies you add
- Consider setting up automated backups
- Monitor function logs and database performance after deployment 