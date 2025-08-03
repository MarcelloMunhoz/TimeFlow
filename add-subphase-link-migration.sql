-- Add project_subphase_id column to appointments table
-- This enables linking appointments/tasks directly to specific project subphases for progress calculation

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS project_subphase_id INTEGER 
REFERENCES project_subphases(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_appointments_project_subphase_id 
ON appointments(project_subphase_id);

-- Add comment for documentation
COMMENT ON COLUMN appointments.project_subphase_id IS 'Links appointment/task to specific project subphase for progress calculation';

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'appointments' 
AND column_name = 'project_subphase_id';
