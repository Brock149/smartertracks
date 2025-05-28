
# 🧰 Tool Checklist Feature – Design & Integration Overview

## 📌 Why We're Adding This Feature (Problem It Solves)
Currently, users are able to check tools in and out via the Sasi system. However, some tools are kits that include multiple components — for example, a **pump kit** might contain:

- Pliers  
- Grease  
- Glue  
- O-rings  

Over time, these items may go missing or run out (e.g., no grease left, glue dried up, pliers lost). But the person returning the tool often forgets to report it — or doesn’t realize something’s missing. As a result:

- The **next user checks it out unaware it's incomplete**, only to find out at the job site.
- This results in **job delays, frustration, and poor accountability**.
- The admin team has **no visibility** that supplies are missing or replacements are needed until it’s too late.

## ✅ What This Feature Does
The **Tool Checklist** ensures that when a tool (especially a kit) is checked in or out, the user is shown a list of expected components, and can report missing or depleted items. This:

- Improves **accountability** between users.
- Provides **admins with real-time alerts** when items need to be replaced or resupplied.
- Ensures **field workers have what they need** when they arrive on-site.

## 🔁 High-Level Flow

1. **Admin creates or edits a tool in the admin portal.**  
   → If the tool has multiple components, the admin can define a checklist of expected items.

2. **Checklist items are stored in the database and tied to that tool.**  
   → e.g., Tool ID = 123, checklist = `[“pliers”, “grease”, “glue”]`.

3. **User initiates a transfer (checkout or return).**  
   → The app checks if the tool has a checklist.

4. **If it does, the user is prompted with a yes/no checklist.**  
   → "Is grease included?" ✅  
   → "Are the pliers in the kit?" ❌ (user marks it missing)

5. **If any items are marked missing or damaged:**  
   → A report is automatically logged in the database.  
   → Optionally, an **email or alert is sent to the admin team**.

6. **Admins can view reports and act on them.**  
   → Order replacements, investigate missing items, or follow up with users.

## 🗃️ How It Fits into the Database (Schema Design)

### New Table: `tool_checklists`
| Field         | Type       | Description                         |
|---------------|------------|-------------------------------------|
| id            | UUID (PK)  | Unique checklist item ID            |
| tool_id       | UUID (FK)  | References `tools.id`               |
| item_name     | TEXT       | Name of checklist item (e.g., glue)|
| required      | BOOLEAN    | Whether the item is critical        |

### New Table: `checklist_reports`
| Field            | Type       | Description                                 |
|------------------|------------|---------------------------------------------|
| id               | UUID (PK)  | Unique report ID                            |
| transaction_id   | UUID (FK)  | References `transactions.id`               |
| checklist_item_id| UUID (FK)  | References `tool_checklists.id`             |
| status           | TEXT       | e.g., "missing", "damaged", "ok"            |
| comments         | TEXT       | Optional notes from the user                |
| created_at       | TIMESTAMP  | When the report was submitted               |

## 🧭 Where It Fits in the App Flow

- **Tool Creation (Admin Portal):**  
  Admins define checklist items when creating or editing tools. This is optional but encouraged for kits.

- **Tool Checkout/Return (Mobile App):**  
  If the tool has a checklist, the user is **prompted during the transfer flow** to confirm each item.

- **Reporting:**  
  If issues are reported, a new `checklist_report` entry is created and optionally alerts admins.

## ✉️ Optional Notifications (for later)
- Send email or in-app notification to admins when a checklist report has issues (e.g., "Grease missing from Pump Kit").

## 🔒 Permissions & RLS Considerations
- Only admins should be able to define checklists.
- Only authenticated users involved in a transaction can submit checklist reports.
- Checklist reports should be readable by admins (and optionally by the user who submitted them).

## 🧪 Future Enhancements (Optional Down the Line)
- Allow attaching photos to checklist reports.
- Visual analytics for tools with frequent issues.
- Require users to complete checklist before submitting transfer.
