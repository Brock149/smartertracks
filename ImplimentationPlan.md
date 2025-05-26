
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
16. Add foreign keys for all appropriate references.
17. Apply Supabase migrations using `supabase db push`.
18. Enable Supabase Auth and configure email sign-in.
19. Create `RLS` policies for row-level security on each table.
20. Enable insert/select/update/delete based on user roles.
21. Add a `roles` enum (`admin`, `user`) to distinguish permissions.
22. Add storage buckets to Supabase for tool photos.
23. Create a function `transfer_tool` in SQL that performs a validated transfer.
24. Test creating, reading, updating, and transferring a tool via Supabase Dashboard.
25. Commit all SQL to Git under `backend/supabase`.

## 🧪 Backend Functions & Supabase SDK (26–35)
26. Create `backend/functions` with reusable Supabase queries.
27. Install `@supabase/supabase-js` in both the admin and app folders.
28. Create a shared file `supabaseClient.ts` for initializing Supabase.
29. Write a function to sign in users and fetch their role.
30. Write a function to create a tool (admin only).
31. Write a function to fetch all tools (with filters).
32. Write a function to fetch tools owned by current user.
33. Write a function to transfer ownership (validate ownership).
34. Write a function to fetch a tool’s transaction history.
35. Write a function to fetch all users (admin only).

## 🧱 Admin Portal Scaffolding (36–45)
36. Scaffold `adminportal` with Vite + React + TypeScript.
37. Install TailwindCSS and ShadCN UI for components.
38. Create folder structure: `components`, `pages`, `lib`, `hooks`, `auth`.
39. Set up routing with `react-router-dom`.
40. Create a basic layout with a sidebar and top bar.
41. Add login and logout logic using Supabase Auth.
42. Create a protected route wrapper that checks for `admin` role.
43. Set up a Dashboard page with summary of tools/users.
44. Create reusable UI components: Table, Modal, Input, Dropdown.
45. Add global state (e.g. `zustand` or context) for user info.

## 🧰 Admin Tool Management (46–55)
46. Build “All Tools” page with search/filter by name, number, location.
47. Display tool list with photo, name, owner, location, stored_at, last transfer.
48. Add ability to create new tool (form with optional photo/description).
49. Add ability to edit/delete a tool.
50. Add image upload UI that stores images in Supabase Storage.
51. Add location input as a freeform text field (e.g. Pinecrest).
52. Add dropdown for "Stored At" (`truck`, `jobsite`, etc).
53. Show tool history when clicking a tool row.
54. Allow admin to transfer a tool manually from tool detail page.
55. Display a warning if tool data is incomplete or duplicate.

## 👤 Admin User Management (56–65)
56. Build "Users" page with list of users and their roles.
57. Add ability to invite a user (email + role).
58. Add ability to change user role (admin/user).
59. Add ability to deactivate or remove user.
60. Show list of tools per user.
61. Disable login for deactivated users.
62. Prevent users from seeing data not assigned to them.
63. Add form validation and toast notifications.
64. Add audit logs or admin notes to user changes (optional).
65. Prevent deletion of the only admin user.

## 📊 Admin Reports View (66–70)
66. Build "Reports" page that looks like a spreadsheet.
67. Columns: Tool Name, Number, Owner, Location, Stored At, Last Transfer.
68. Fetch and display all tools in a paginated table.
69. Allow export to CSV or Excel.
70. Add filters to narrow by job site, owner, or date.

## 📱 Sasi Mobile App Scaffolding (71–80)
71. Scaffold `app` using Expo with TypeScript + React Native.
72. Set up Supabase SDK and `supabaseClient.ts`.
73. Create screens: Login, AllTools, MyTools, TransferTool, Account.
74. Add navigation with React Navigation.
75. Add global state for auth/session (e.g. `zustand` or context).
76. Implement login/logout using Supabase Auth.
77. Reuse Supabase queries from backend functions.
78. Add error handling and loading indicators.
79. Show toast notifications or snackbars.
80. Use native camera/gallery picker for future photo support.

## 📱 Mobile App Features (81–90)
81. All Tools screen: search/filter tools, claim ownership.
82. My Tools screen: list of tools you own.
83. Transfer Tools screen: choose tools to transfer, select recipient.
84. Account screen: show name, email, logout button.
85. Display tool photos and info cleanly.
86. Add transaction history on tool details.
87. Validate transfers against Supabase rules.
88. Auto-refresh lists after transfer.
89. Use pull-to-refresh on key screens.
90. Handle offline gracefully (optional: queue transfers).

## 🚀 Deployment & Production Setup (91–100)
91. Set up production Supabase project (if staging used before).
92. Create `.env.production` files with Supabase prod keys.
93. In `adminportal`, set up deployment to Vercel or Netlify.
94. In `app`, configure EAS or Expo for app store deployment.
95. Create icons and splash screens for the mobile app.
96. Configure analytics if needed (e.g. Supabase logs, Sentry).
97. Lock down Supabase policies and monitor usage.
98. Back up your Supabase database regularly.
99. Write deployment docs and onboarding guide for future devs.
100. Celebrate 🎉 and create a changelog or feedback loop.
