-- Let events/tasks be deleted without being blocked by attached assets.
-- The asset record stays available, but its event/task link is cleared automatically.

ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_event_id_fkey;

ALTER TABLE assets
  ADD CONSTRAINT assets_event_id_fkey
  FOREIGN KEY (event_id)
  REFERENCES events(id)
  ON DELETE SET NULL;

ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_task_id_fkey;

ALTER TABLE assets
  ADD CONSTRAINT assets_task_id_fkey
  FOREIGN KEY (task_id)
  REFERENCES tasks(id)
  ON DELETE SET NULL;
