-- Add ON DELETE CASCADE for tool_checklists when a tool is deleted
ALTER TABLE tool_checklists
    DROP CONSTRAINT IF EXISTS tool_checklists_tool_id_fkey,
    ADD CONSTRAINT tool_checklists_tool_id_fkey
    FOREIGN KEY (tool_id)
    REFERENCES tools(id)
    ON DELETE CASCADE;

-- Add ON DELETE CASCADE for checklist_reports when a tool_checklist is deleted
ALTER TABLE checklist_reports
    DROP CONSTRAINT IF EXISTS checklist_reports_checklist_item_id_fkey,
    ADD CONSTRAINT checklist_reports_checklist_item_id_fkey
    FOREIGN KEY (checklist_item_id)
    REFERENCES tool_checklists(id)
    ON DELETE CASCADE;

-- Add ON DELETE CASCADE for checklist_reports when a transaction is deleted
ALTER TABLE checklist_reports
    DROP CONSTRAINT IF EXISTS checklist_reports_transaction_id_fkey,
    ADD CONSTRAINT checklist_reports_transaction_id_fkey
    FOREIGN KEY (transaction_id)
    REFERENCES tool_transactions(id)
    ON DELETE CASCADE;

-- Add ON DELETE SET NULL for tool_transactions when a tool is deleted
-- This preserves transaction history but removes the tool reference
ALTER TABLE tool_transactions
    DROP CONSTRAINT IF EXISTS tool_transactions_tool_id_fkey,
    ADD CONSTRAINT tool_transactions_tool_id_fkey
    FOREIGN KEY (tool_id)
    REFERENCES tools(id)
    ON DELETE SET NULL;

-- Add ON DELETE SET NULL for tool_transactions when a user is deleted
-- This preserves transaction history but removes the user reference
ALTER TABLE tool_transactions
    DROP CONSTRAINT IF EXISTS tool_transactions_from_user_id_fkey,
    ADD CONSTRAINT tool_transactions_from_user_id_fkey
    FOREIGN KEY (from_user_id)
    REFERENCES users(id)
    ON DELETE SET NULL;

ALTER TABLE tool_transactions
    DROP CONSTRAINT IF EXISTS tool_transactions_to_user_id_fkey,
    ADD CONSTRAINT tool_transactions_to_user_id_fkey
    FOREIGN KEY (to_user_id)
    REFERENCES users(id)
    ON DELETE SET NULL;

-- Add ON DELETE SET NULL for tools when a user is deleted
-- This removes ownership but preserves the tool
ALTER TABLE tools
    DROP CONSTRAINT IF EXISTS tools_current_owner_fkey,
    ADD CONSTRAINT tools_current_owner_fkey
    FOREIGN KEY (current_owner)
    REFERENCES users(id)
    ON DELETE SET NULL; 