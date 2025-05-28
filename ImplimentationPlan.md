# Sasi HVAC Tool Tracking App — 100 Step Build Checklist

This is a complete 100-step guide to building and deploying the Sasi tool tracking app using Supabase, with a monorepo structure for the admin portal, mobile app, and backend.

---

## 🧱 Project Setup & Planning (1–10)
1. Create a new folder called `SasiProject`.
2. Inside `SasiProject`, create three folders: `adminportal`, `app`, and `backend`.
3. Initialize a new Git repo at the root of `SasiProject`.
4. Create a `README.md` explaining the project purpose and structure.
5. Add `.gitignore` files in each subfolder (ignore `node_modules`, `.env`, etc.).
6. Choose a package manager (e.g., `pnpm`) and install it if needed.
7. Run `pnpm init` in each folder (`adminportal`, `app`, `backend`).
8. Create a Supabase project at https://supabase.com.
9. Save the Supabase project URL and anon/service keys into `.env` files.
10. Install the Supabase CLI globally (`npm install -g supabase`).

## 🛠 Backend with Supabase Schema (11–25)
11. In `backend`, run `supabase init`.
12. Create `supabase/migrations` and `supabase/schema.sql`.
13. Define the `users` table with fields: `id`, `name`, `email`, `role`, etc.
14. Define the `tools` table with: `id`, `name`, `number`, `description`, `photo_url`, `location`, `stored_at`, `owner_id`.
15. Define the `transactions` table with: `id`, `tool_id`, `from_user_id`, `to_user_id`, `location`, `stored_at`, `timestamp`.
16. Define the `tool_checklists` table with: `id`, `tool_id`, `item_name`, `required`.
17. Define the `checklist_reports` table with: `id`, `transaction_id`, `checklist_item_id`, `status`, `comments`.
18. Add foreign keys for all appropriate references.
19. Apply Supabase migrations using `supabase db push`.
20. Enable Supabase Auth and configure email sign-in.
21. Create `RLS` policies for row-level security on each table.
22. Enable insert/select/update/delete based on user roles.
23. Add a `roles` enum (`admin`, `user`) to distinguish permissions.
24. Add storage buckets to Supabase for tool photos.
25. Create a function `transfer_tool` in SQL that performs a validated transfer.
26. Test creating, reading, updating, and transferring a tool via Supabase Dashboard.
27. Commit all SQL to Git under `backend/supabase`.

## 🧪 Backend Functions & Supabase SDK (28–40)
28. Create `backend/functions` with reusable Supabase queries.
29. Install `@supabase/supabase-js` in both the admin and app folders.
30. Create a shared file `supabaseClient.ts` for initializing Supabase.
31. Write a function to sign in users and fetch their role.
32. Write a function to create a tool (admin only).
33. Write a function to fetch all tools (with filters).
34. Write a function to fetch tools owned by current user.
35. Write a function to transfer ownership (validate ownership).
36. Write a function to fetch a tool's transaction history.
37. Write a function to fetch all users (admin only).
38. Write a function to manage tool checklists (create, update, delete).
39. Write a function to submit checklist reports during transfers.
40. Write a function to fetch checklist history for a tool.

## 🧱 Admin Portal Scaffolding (41–50)
41. Scaffold `adminportal` with Vite + React + TypeScript.
42. Install TailwindCSS and ShadCN UI for components.
43. Create folder structure: `components`, `pages`, `lib`, `hooks`, `auth`.
44. Set up routing with `react-router-dom`.
45. Create a basic layout with a sidebar and top bar.
46. Add login and logout logic using Supabase Auth.
47. Create a protected route wrapper that checks for `admin` role.
48. Set up a Dashboard page with summary of tools/users.
49. Create reusable UI components: Table, Modal, Input, Dropdown.
50. Add global state (e.g. `zustand` or context) for user info.

## 🧰 Admin Tool Management (51–65)
51. Build "All Tools" page with search/filter by name, number, location.
52. Display tool list with photo, name, owner, location, stored_at, last transfer.
53. Add ability to create new tool (form with optional photo/description).
54. Add ability to edit/delete a tool.
55. Add image upload UI that stores images in Supabase Storage.
56. Add location input as a freeform text field (e.g. Pinecrest).
57. Add dropdown for "Stored At" (`truck`, `jobsite`, etc).
58. Show tool history when clicking a tool row.
59. Allow admin to transfer a tool manually from tool detail page.
60. Display a warning if tool data is incomplete or duplicate.
61. Add tool checklist management UI for kits.
62. Allow adding/removing checklist items.
63. Set required/optional status for checklist items.
64. View checklist reports and missing items.
65. Export checklist reports for inventory management.

## 👤 Admin User Management (66–75)
66. Build "Users" page with list of users and their roles.
67. Add ability to invite a user (email + role).
68. Add ability to change user role (admin/user).
69. Add ability to deactivate or remove user.
70. Show list of tools per user.
71. Disable login for deactivated users.
72. Prevent users from seeing data not assigned to them.
73. Add form validation and toast notifications.
74. Add audit logs or admin notes to user changes (optional).
75. Prevent deletion of the only admin user.

## 📊 Admin Reports View (76–80)
76. Build "Reports" page that looks like a spreadsheet.
77. Columns: Tool Name, Number, Owner, Location, Stored At, Last Transfer.
78. Fetch and display all tools in a paginated table.
79. Allow export to CSV or Excel.
80. Add filters to narrow by job site, owner, or date.

## 📱 Sasi Mobile App Scaffolding (81–95)
81. Scaffold `app` using Expo with TypeScript + React Native.
82. Set up Supabase SDK and `supabaseClient.ts`.
83. Create screens: Login, AllTools, MyTools, TransferTool, Account.
84. Add navigation with React Navigation.
85. Add global state for auth/session (e.g. `zustand` or context).
86. Implement login/logout using Supabase Auth.
87. Reuse Supabase queries from backend functions.
88. Add error handling and loading indicators.
89. Show toast notifications or snackbars.
90. Use native camera/gallery picker for future photo support.

## 📱 Mobile App Features (81–95)
91. All Tools screen: search/filter tools, claim ownership.
92. My Tools screen: list of tools you own.
93. Transfer Tools screen: choose tools to transfer, select recipient.
94. Account screen: show name, email, logout button.
95. Display tool photos and info cleanly.
96. Add transaction history on tool details.
97. Validate transfers against Supabase rules.
98. Auto-refresh lists after transfer.
99. Use pull-to-refresh on key screens.
100. Handle offline gracefully (optional: queue transfers).
101. Implement tool checklist UI during transfers.
102. Show checklist items with status indicators.
103. Allow marking items as missing/damaged.
104. Add comments for missing/damaged items.
105. Show checklist history in tool details.

## 🚀 Deployment & Production Setup (96–100)
96. Set up production Supabase project (if staging used before).
97. Create `.env.production` files with Supabase prod keys.
98. In `adminportal`, set up deployment to Vercel or Netlify.
99. In `app`, configure EAS or Expo for app store deployment.
100. Create icons and splash screens for the mobile app.
101. Configure analytics if needed (e.g. Supabase logs, Sentry).
102. Lock down Supabase policies and monitor usage.
103. Back up your Supabase database regularly.
104. Write deployment docs and onboarding guide for future devs.
105. Celebrate 🎉 and create a changelog or feedback loop.
