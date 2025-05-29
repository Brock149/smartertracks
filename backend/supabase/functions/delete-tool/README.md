# delete-tool Edge Function

This Supabase Edge Function deletes a tool and all its associated checklist items from the database.

## Usage
- **Method:** POST
- **Body:** `{ "id": "<tool_id>" }`
- Requires admin authorization (service role key).

## Behavior
- Deletes all checklist items in `tool_checklists` for the given tool.
- Deletes the tool from the `tools` table.
- Returns `{ success: true }` on success, or `{ error: "..." }` on failure. 