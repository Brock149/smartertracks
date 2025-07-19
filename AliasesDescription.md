Great — here's a clear structural plan to describe to Cursor that will let you implement **location aliasing** for your HVAC tool tracking app. This lets you normalize fuzzy/variant location inputs (e.g. "shop", "1455") into a standard, clean location ("Warehouse").

---

## 🧱 1. **Database Structure**

### **New Table: `location_aliases`**

This table maps alias terms to a canonical location name for a specific company.

```sql
-- Example schema
CREATE TABLE location_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  normalized_location TEXT NOT NULL
);
```

### Explanation:

* `alias` → user-inputted term (e.g. "shop", "1455", "main office")
* `normalized_location` → canonical location (e.g. "Warehouse", "UM Campus")
* `company_id` → ensures each company can have their own custom aliases

---

## 🧠 2. **Logic Flow (Explain to Cursor)**

When a user submits a transaction and types a location:

1. Check if the submitted location matches any `alias` (case-insensitive) for their `company_id`.
2. If it matches, **replace it with the `normalized_location`** before saving the transaction.
3. If it doesn't match, save it as-is.

This should be implemented:

* In the client-side form handler **before submission**, or
* In an **Edge Function** or server-side API route (safer and more scalable)

---

## 💡 Optional Enhancements

* Add a UI for company admins to manage their own aliases (`+ Add Alias`, `Edit`, `Delete`)
* Show a message like: “This location was auto-normalized to ‘Warehouse’ based on your company settings.”

---

## 🧪 Bonus Tip for Testing

You can test normalization with a simple SQL query like:

```sql
SELECT normalized_location
FROM location_aliases
WHERE company_id = :companyId AND LOWER(alias) = LOWER(:inputText)
LIMIT 1;
```

---

## ✅ Summary for Cursor Prompt

> "Create a `location_aliases` table with columns: `id`, `company_id`, `alias`, and `normalized_location`. Then, in the transaction creation logic, check if the submitted location matches any alias for the user's company (case-insensitive). If it does, replace it with the `normalized_location` before saving the transaction."

Let me know if you want help writing that SQL logic or implementing the fallback (e.g., warn users if no alias match is found).
