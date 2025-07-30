-- Reset project actualHours to 0 since we're changing from hours to minutes storage
-- This ensures clean data for the new minutes-based system
UPDATE projects SET actual_hours = 0;

-- Add comment to clarify that actual_hours now stores minutes
COMMENT ON COLUMN projects.actual_hours IS 'Stores actual time spent in minutes (not hours)';
