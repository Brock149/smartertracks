Absolutely — here’s your updated Product Requirements Document (PRD) for your HVAC Tool Tracking app, incorporating all the features you've built into the admin portal and plans for the upcoming mobile app.

✅ Updated PRD: SASI Tool Tracking App (MVP v1)
🏗️ Architecture Overview
Monorepo with three main parts:


adminportal/ — Web portal for company admins


app/ — Mobile app for field technicians (starting now)


backend/ — Supabase backend (Auth, Postgres DB, RLS, Edge Functions)


🧩 Core Data Models
users — linked to Supabase Auth


companies — multi-tenant support


tools — inventory of equipment


tool_transactions — tracks tool movement


tool_images — multiple photos per tool


tool_checklists — customizable tool checklists


checklist_reports — individual user reports tied to checklists


company_access_codes — tech/admin invite codes


location_aliases — normalize variants of location names (e.g. “1455” → “Warehouse”)



🧑‍💼 Admin Portal (✅ Complete for MVP)
🔐 Auth
Supabase Auth with email/password login


Admin + tech roles via users.role


Signup with company-specific invite codes (tech/admin)


🛠️ Tool Management
Create/edit/delete tools


Assign to default company location and default company user on creation (e.g. "Warehouse")(“bob”)


Upload multiple photos per tool


View history of tool transactions


Filter tools by location, status, etc.


🔁 Tool Transactions
Manually transfer tools between locations or users


Auto-normalizes location input using location_aliases


View full transaction log per tool


📸 Tool Images
Tools can have multiple images stored in Supabase Storage


Upload during edit or creation (staged upload system)


✅ Checklists
Create/edit reusable checklists (per company)


Assign checklist to tool and user


Track completion status via checklist_reports


📥 Company Access Management
Admins generate invite codes:


One for admins


One for technicians


Signup enforces proper company and role assignment


🧠 Location Normalization (Aliases)
Admins define aliases like “shop”, “1455”, “sasi” → “Warehouse”


Used to clean data during tool transactions



🔒 Security
Row-level security (RLS) via Supabase for company isolation


All reads/writes scoped by company_id



📱 Mobile App (Beginning Development)
🧾 Target Users
Field technicians


Lightweight, fast interface


Designed for daily use on job sites


📲 Core Features to Build
✅ Auth (reuses Supabase Auth)


Login with email/password


Role-based access


🧰 Tool Lookup


View tool list


Search/filter by location or name


View tool photos, history, and checklist


🔄 Transfers


Transfer tool to a new location or technician


Normalize input using location_aliases


📋 Checklist Reporting


Fill out tool-specific checklist


Submit report, attach optional notes



🧠 Admin/Maintenance Tools
Company-specific alias editor (admin portal)


“Apply aliases” SQL trigger to fix legacy location data


View reports of tools not at default/known locations


Future: email automation for reports, low inventory, or overdue checklists



📦 Supabase Setup Summary
Auth: handles users


RLS: fully set up per company_id


Storage: private bucket for tool_images


Edge Functions: (e.g., for custom logic / future email automation)



🧪 MVP Completion Criteria
Admins can manage company inventory and users from portal ✅


Technicians can log in, view and transfer tools, and fill out checklists (🚧 building now)


Data is secure and isolated per company ✅


All images, checklists, and locations are synced between web and mobile ✅



Here’s a breakdown of your tech stack and how to best structure the mobile app, with a focus on iOS and Android compatibility, and tight integration with your existing Supabase-powered backend and admin portal.

📱 Mobile App: Tech Stack & Integrations
🧱 Core Tech Stack
Layer
Tech
Notes
UI / App Runtime
React Native + Expo
Best for rapid dev, cross-platform, web-compatible if needed
Auth
Supabase Auth
Reuse exactly as on admin portal: email/password login
Database / API
Supabase Postgres + RLS
Access via Supabase client SDK (with row-level security)
Storage
Supabase Storage
For tool photos, checklist images, etc.
Permissions
Supabase Policies (RLS)
Already scoped to company_id and roles
State Mgmt
React Context or Zustand
Lightweight, works well with Supabase hooks
Navigation
React Navigation
Industry standard for mobile routing




















🔐 Auth Integration
Use @supabase/supabase-js in React Native (works with Expo)


Sign up and login via Supabase Auth


On success, store session via Supabase client


Reuse access tokens automatically with Supabase SDK




⚙️ Permissions and RLS
Supabase RLS already enforced by company_id


No extra config needed on mobile side


Just make sure authenticated Supabase client is initialized correctly



🔧 Project Setup (Suggested Folder Structure)
app/
├── components/
├── screens/
├── context/
├── hooks/
├── supabase/              ← client init here
├── utils/
├── assets/
├── App.tsx
└── app.config.js          ← Expo config


💬 Push Notifications
Use Expo Push Notifications if needed later for:


Tool transfer notifications (you received this too from ___l) (you sent this tool to ____)



🚀 Why Expo + Supabase Is Ideal for You
Reason
Benefit
Cross-platform
iOS and Android with one codebase
Fast dev loop
Expo dev server + OTA updates
Full Supabase support
Auth, RLS, Storage, Realtime, and SQL
Clean DX
Works well with VSCode, Cursor, TypeScript
Low infrastructure overhead
No need to manage native builds right away



