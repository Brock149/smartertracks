Project Name: Sasi HVAC Tool Tracker
🧭 Overview
This project is a digital tool-tracking system for an HVAC company with fewer than 100 employees. The purpose is to track the possession and movement of physical tools that are already labeled (e.g., "127" written with Sharpie). The platform consists of:

✅ An Admin Web Portal (to be built first)

📱 A Mobile App (iOS + Android) for employees

The system allows users to claim and transfer tools and enables admins to manage users, tools, and see comprehensive reports.

🏗 Tech Stack
Layer	Tech
Frontend	React + Vite (admin portal), React Native (mobile app)
Backend	Supabase (PostgreSQL + Auth + Storage + Edge Functions)
Hosting	Supabase-hosted database and auth, optional Vercel for frontends
Monorepo	Root folder SasiProject with:
- adminportal/ (React + Tailwind)
- app/ (React Native via Expo or Bare)
- backend/ (optional custom logic via Supabase Edge Functions or external API)

📁 Folder Structure
graphql
Copy
Edit
SasiProject/
├── adminportal/       # Web admin panel (React)
├── app/               # Mobile app for field users (React Native)
├── backend/           # Optional API extensions (Edge Functions or Node)
└── supabase/          # Supabase config, SQL migrations, storage
👥 User Roles
admin: Full access to manage users, tools, transfers, reports.

user: Can view/claim/transfer tools they have access to.

🔐 Auth & Access Control
Supabase Auth with email/password login.

Row-level security (RLS) for:

Only showing tools assigned to the logged-in user (for users).

Full access to everything (for admins).

User roles stored in the users table.

🧱 Database Schema (Supabase / PostgreSQL)
users
Field	Type	Notes
id	UUID	Default: auth.uid()
name	Text	Full name
email	Text	Unique
role	Text	admin or user
created_at	Timestamp	Default: now()

tools
Field	Type	Notes
id	UUID	Default: gen_random_uuid()
number	Text	Physical label (e.g. 127)
name	Text	Tool name
description	Text	Optional
photo_url	Text	Optional (Supabase Storage)
current_owner	UUID	Foreign key → users(id)
created_at	Timestamp	Default: now()

tool_checklists
Field	Type	Notes
id	UUID	Default: gen_random_uuid()
tool_id	UUID	Foreign key → tools(id)
item_name	Text	Name of checklist item (e.g., glue)
required	Boolean	Whether the item is critical
created_at	Timestamp	Default: now()

checklist_reports
Field	Type	Notes
id	UUID	Default: gen_random_uuid()
transaction_id	UUID	Foreign key → transactions(id)
checklist_item_id	UUID	Foreign key → tool_checklists(id)
status	Text	missing, damaged, or ok
comments	Text	Optional notes from user
created_at	Timestamp	Default: now()

tool_transactions
Field	Type	Notes
id	UUID	Default: gen_random_uuid()
tool_id	UUID	FK to tools
from_user_id	UUID	FK to users, nullable for first entry
to_user_id	UUID	FK to users
location	Text	Where the tool was handed off
stored_at	Text	Where it's now stored
notes	Text	Optional transaction notes
timestamp	Timestamp	When the transaction occurred
created_at	Timestamp	Default: now()

📋 Admin Portal Features (Build First)
Tool Management
 Create tools with name, number, photo (optional), and description (optional)

 Edit tools

 Delete tools

 Manually transfer ownership

 Define tool checklists for kits (list of required components)

User Management
 View all users

 Set role (admin or user)

 Disable/remove users

Transactions & Reports
 See live table of all tools with:

Tool name

Tool number

Current owner

Current location

Stored at (Truck / Jobsite / Warehouse)

Time/Date of last transfer

 View full transaction history per tool

📱 Mobile App Features (Build Second)
All Tools Screen
Search by number, name, or category

Claim any tool (even if it's listed under someone else)

Complete tool checklists during checkout/return

My Tools Screen
View all tools the current user "owns"

Transfer tools to another employee

Transfer Screen
Search employees

Select multiple tools to transfer to another user

Complete tool checklists for kits during transfer

Account Screen
Edit profile, view login info

🔄 Tool Transfer Workflow
User takes a tool physically from another.

User searches for the tool in the app and claims it.

If tool has a checklist, user confirms all components are present.

App records a transaction:

from_user → to_user

time

new storage and location

checklist status (if applicable)

If an error occurs or is forgotten, admin can manually fix it.

📷 Tool Photos
Optional

Stored in Supabase Storage

Upload available at creation or later via edit

📊 Reporting
Admin portal shows a table-style report of all tools

Option to export to CSV later if needed

Each tool page shows complete transaction history

🚧 Dev Process Tips
Build the admin portal first to set up your tool and user infrastructure

Use Supabase for:

Auth (no need to write it yourself)

DB (PostgreSQL, structured)

Storage (tool images)

Edge Functions (for future automation or custom API needs)

Use Cursor with a monorepo layout so it can read across your admin + app + backend folders easily