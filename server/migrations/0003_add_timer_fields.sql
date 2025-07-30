-- Add timer control fields to appointments table
ALTER TABLE appointments 
ADD COLUMN actual_time_minutes INTEGER DEFAULT 0,
ADD COLUMN timer_state TEXT NOT NULL DEFAULT 'stopped',
ADD COLUMN timer_started_at TEXT,
ADD COLUMN timer_paused_at TEXT,
ADD COLUMN accumulated_time_minutes INTEGER DEFAULT 0;

-- Add check constraint for timer_state
ALTER TABLE appointments 
ADD CONSTRAINT check_timer_state 
CHECK (timer_state IN ('stopped', 'running', 'paused'));
