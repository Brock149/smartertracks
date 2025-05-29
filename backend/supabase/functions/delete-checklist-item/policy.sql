-- Enable RLS if not already enabled
ALTER TABLE tool_checklists ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can delete checklist items
CREATE POLICY "Admins can delete tool_checklists" ON tool_checklists
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  ); 