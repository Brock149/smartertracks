-- Remove the deleted user placeholder
DELETE FROM users WHERE email = 'deleted@internal';

-- Update any transactions that were using the deleted user placeholder
UPDATE tool_transactions
SET 
    from_user_id = NULL,
    to_user_id = NULL
WHERE 
    from_user_id IN (SELECT id FROM users WHERE email = 'deleted@internal')
    OR to_user_id IN (SELECT id FROM users WHERE email = 'deleted@internal'); 