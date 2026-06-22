-- Adds a separate participation field so Priority can stay focused on business importance.
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS engagement_type text
    CHECK (engagement_type IN ('Sponsor', 'Exhibit', 'Attend', 'Speaking', 'Follow'));

-- Drop the older priority constraint before moving legacy values.
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_discovery_priority_check;

-- Preserve the intent of legacy discovery_priority values before they were split.
UPDATE events
SET engagement_type = discovery_priority
WHERE engagement_type IS NULL
  AND discovery_priority IN ('Sponsor', 'Attend', 'Follow');

UPDATE events
SET discovery_priority = CASE discovery_priority
  WHEN 'Sponsor' THEN 'High'
  WHEN 'Attend' THEN 'Medium'
  WHEN 'Follow' THEN 'Low'
  ELSE discovery_priority
END
WHERE discovery_priority IN ('Sponsor', 'Attend', 'Follow');

-- Normalize any legacy "Monitor Only" values to the new simple scale.
UPDATE events
SET discovery_priority = 'Low'
WHERE discovery_priority = 'Monitor Only';

-- Re-add the clean priority constraint after all legacy values have been migrated.
ALTER TABLE events ADD CONSTRAINT events_discovery_priority_check
  CHECK (discovery_priority IS NULL OR discovery_priority IN ('High', 'Medium', 'Low'));
