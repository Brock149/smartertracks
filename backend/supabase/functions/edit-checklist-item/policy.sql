-- Enable RLS if not already enabled
ALTER TABLE tool_checklists ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can update checklist items
CREATE POLICY "Admins can update tool_checklists" ON tool_checklists
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  ); 