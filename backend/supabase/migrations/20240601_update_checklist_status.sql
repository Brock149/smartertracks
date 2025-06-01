ALTER TABLE checklist_reports DROP CONSTRAINT IF EXISTS checklist_reports_status_check;

ALTER TABLE checklist_reports
  ADD CONSTRAINT checklist_reports_status_check
  CHECK (status IN (
    'Damaged/Needs Repair',
    'Needs Replacement/Resupply',
    'ok'
  )); 