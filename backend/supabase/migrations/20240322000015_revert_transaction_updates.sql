-- Revert the changes made to tool_transactions
UPDATE tool_transactions
SET 
  deleted_from_user_name = NULL,
  deleted_to_user_name = NULL
WHERE 
  (from_user_id IS NOT NULL OR to_user_id IS NOT NULL); 