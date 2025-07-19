Thanks for the update—you're making great progress.

Now let’s summarize the steps and purpose of adding **multi-company support** using a `company_id` across your app. Below is a Cursor-ready breakdown, with small, testable goals and prompts you can use to guide implementation.

---

## 🧩 Goal: Add Multi-Company Support to the Sasi Admin Portal

### 💡 Why We're Doing This

You're preparing for the app to serve multiple HVAC companies instead of just one (e.g., “Sasi”). Each company should only see and manage its own users, tools, checklists, reports, and transactions.

This allows:

* Clear data separation between companies
* Company-specific rules (e.g., warehouse naming, default ownership)
* Scalable expansion to serve more clients
* Secure access and clean permissions via Supabase RLS

---

## ✅ High-Level Steps

### 1. **Add `company_id` to All Relevant Tables**

**Prompt for Cursor:**
"Update the Supabase schema by adding a `company_id UUID` foreign key to these tables: `users`, `tools`, `transactions`, `tool_checklists`, and `checklist_reports`. It should reference a new `companies` table. Make sure `company_id` is not nullable."

**Why:** Every row in these tables should belong to a company.

---

### 2. **Create the `companies` Table**

**Prompt for Cursor:**
"Create a `companies` table with columns: `id UUID`, `name TEXT`, and `created_at TIMESTAMP`. This will be used to group users, tools, and other data under the same company."

**Why:** It serves as the parent for everything company-specific.

---

### 3. **Link Users to a Company**

**Prompt for Cursor:**
"Update the `users` table to include `company_id`, and modify your edge functions (`create-user`, etc.) to require a `company_id`. You can hardcode this for now or pass it from the frontend UI."

**Why:** A user needs to be scoped to a company so RLS policies can work.

---

### 4. **Update RLS Policies to Enforce Company Boundaries**

**Prompt for Cursor:**
"Update RLS policies for each table to ensure users can only see, update, or insert rows where `company_id = auth.uid()`’s company. This may require a function to get a user’s company from the users table."

**Why:** Ensures each company’s data stays private and secure.

---

### 5. **Update Edge Functions to Handle `company_id` Automatically**

**Prompt for Cursor:**
"Update all edge functions (`create-tool`, `create-transaction`, etc.) to read the `company_id` from the requesting user (via Supabase Auth) and attach it to inserted records."

**Why:** Keeps data integrity without trusting the frontend to send `company_id`.

---

### 6. **Add Company Context to Admin UI**

**Prompt for Cursor:**
"Add a company selector or context loader in the admin portal. When logged in, auto-fetch the current user’s `company_id` and use it to filter all data calls (tools, users, etc.)"

**Why:** Ensures UI only shows data relevant to that user’s company.

---

### 7. **Test with Multiple Companies**

**Prompt for Cursor:**
"Seed the database with two fake companies and a few users/tools under each. Verify that each user can only access their own company’s data."

**Why:** Confirms that your permission boundaries and RLS rules are working correctly.

---

### Optional (Future)

* Allow superadmins to manage multiple companies
* Add company-specific settings like “warehouse names”
* Customize company logos, emails, and branding

---

Let me know when you're ready to start and I’ll help you write the first Cursor prompt for your schema changes.
