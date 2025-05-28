Project Overview: HVAC Tool Tracking System
Purpose
This system is designed for an HVAC company to track physical tool ownership and transfers across employees and job sites. It includes:

A web-based admin portal to manage users, tools, and transfers.

A mobile app (iOS + Android) for employees to view, claim, and transfer tool ownership.

Core Concept
Each tool is physically labeled with a number (e.g., "127"). The app digitizes this ownership system, allowing employees to take digital possession of tools and transfer them as jobs change.

Feature Breakdown
Mobile App (for workers)
Includes four primary tabs:

All Tools

Search by tool number, name, or category.

View tool details (name, number, description, picture, current owner, location, storage type).

Claim possession of a tool from anyone—whether from the warehouse or another user.

Complete tool checklists for kits during checkout/return.

My Tools

Shows a list of tools currently owned by the logged-in user.

Allows initiating transfers to another employee.

Transfer Tools

Select one or more tools from your inventory to transfer.

Search the company directory to choose a recipient.

Complete tool checklists for kits during transfer.

Account

View and update profile information.

Log out and manage account settings.

Admin Portal (for management)
Accessible via desktop browser:

Tool Management

Create, edit, and delete tools.

Upload optional tool photos.

Add optional descriptions.

Define starting owner, location, and storage state.

Create and manage tool checklists for kits.

User Management

Create users with roles (Admin or Worker).

Deactivate/remove users who leave the company.

Ownership Transfers

Manually transfer tools between users to correct mistakes.

Reporting

Table view showing all tools with columns: Tool Name, Number, Owner, Location, Stored At, Time of Last Transaction.

Export-style visibility for quick audits.

Tool History

Each tool includes a full transaction log showing all past owners, times, dates, and locations of transfers.

Key Data Fields for Each Tool
Tool Number (e.g., "127")

Tool Name

Optional Description

Optional Image

Current Owner (User ID)

Created At Timestamp

Tool Checklist (for kits):
- List of required components
- Component status during transfers
- Missing/damaged item reports

Transaction History Fields:
- Tool ID
- From User ID
- To User ID
- Location
- Stored At
- Notes
- Transaction Timestamp
- Created At Timestamp

Technical Architecture
File Structure (Monorepo)
bash
Copy
Edit
SasiProject/
│
├── apps/
│   ├── admin-portal/       # Next.js or React app for admin control
│   └── sasi-app/           # React Native app for workers
│
├── backend/                # Backend logic if needed (e.g., custom functions or middlewares)
│
├── supabase/               # Supabase project config (schema, SQL, auth policies)
│
├── .env                    # Shared environment variables
├── README.md
└── package.json
Cursor will work better when it can read all apps + backend together in one parent folder (SasiProject/).

Keeping this structure also makes deployment and local dev simpler.

Platform & Hosting
Database & Auth
Hosted by Supabase:

PostgreSQL database

Role-based Auth (Admin/Worker)

Realtime sync (optional)

Row-level security (RLS) for fine-tuned data access control

File Uploads
Tool images are stored in Supabase Storage.

Admins can upload/edit tool images from the portal.

Why Supabase?
✅ Pros:
All-in-one (auth, db, storage, API)

Built-in roles and RLS to prevent unauthorized access

Hosted + managed = less DevOps headache

Easier migration and scale-up later

Good developer experience (especially in Cursor)

❌ Cons:
Slightly opinionated (but flexible)

Not as customizable as full DIY infrastructure (e.g., AWS + custom Postgres)

May be more expensive at massive scale

Scaling & Switching Later
You can export the entire database schema/data from Supabase.

Switching to something like Railway, PlanetScale, or AWS RDS later is straightforward.

Supabase scales fine up to mid-sized businesses (thousands of users, millions of records).

Costs remain low (<$25–50/mo) until your traffic, data, or file storage grows significantly.

Final Notes / Development Tips
✅ Build the Admin Portal first, so you can manage and test tools before integrating the app.

✅ Use Git with frequent commits/checkpoints before major changes.

✅ Use Supabase's dashboard to manage schema visually and avoid corrupting migrations.

✅ Keep your .env secrets safe and consistent between apps.

✅ Document your schema and permissions early—it'll pay off when adding auth rules or scaling to more users.