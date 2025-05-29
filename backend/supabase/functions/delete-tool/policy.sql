-- Policy for deleting tools (admin only)
-- Enable RLS first if not already enabled
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can delete tools" ON tools
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Policy for deleting tool_checklists (admin only)
ALTER TABLE tool_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can delete tool_checklists" ON tool_checklists
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  ); 