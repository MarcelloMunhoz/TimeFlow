-- Migration: Add Work Schedule System
-- This migration adds work schedule tables and updates appointments table

-- Create work_schedules table
CREATE TABLE IF NOT EXISTS work_schedules (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    is_active BOOLEAN DEFAULT true,
    created_at TEXT NOT NULL DEFAULT (now()::text),
    updated_at TEXT DEFAULT (now()::text)
);

-- Create work_schedule_rules table
CREATE TABLE IF NOT EXISTS work_schedule_rules (
    id SERIAL PRIMARY KEY,
    work_schedule_id INTEGER NOT NULL REFERENCES work_schedules(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL, -- 0=Sunday, 1=Monday, ..., 6=Saturday
    start_time TEXT NOT NULL, -- HH:MM format
    end_time TEXT NOT NULL, -- HH:MM format
    rule_type TEXT NOT NULL, -- "work", "break", "lunch", "unavailable"
    is_working_time BOOLEAN DEFAULT true, -- false for breaks/lunch
    allow_overlap BOOLEAN DEFAULT false, -- true for "encaixe" periods
    description TEXT, -- e.g., "Morning shift", "Lunch break", "After hours"
    created_at TEXT NOT NULL DEFAULT (now()::text)
);

-- Add work schedule compliance columns to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS is_within_work_hours BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_overtime BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS work_schedule_violation TEXT,
ADD COLUMN IF NOT EXISTS allow_overlap BOOLEAN DEFAULT false;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_work_schedules_user_id ON work_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_work_schedules_active ON work_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_work_schedule_rules_schedule_id ON work_schedule_rules(work_schedule_id);
CREATE INDEX IF NOT EXISTS idx_work_schedule_rules_day ON work_schedule_rules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_appointments_work_hours ON appointments(is_within_work_hours);
CREATE INDEX IF NOT EXISTS idx_appointments_overtime ON appointments(is_overtime);

-- Insert default work schedule for the main user (assuming user ID 1)
-- First, ensure we have a user (only if no users exist)
INSERT INTO users (name, email, type, is_active)
SELECT 'Main User', 'user@timeflow.com', 'internal', true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'user@timeflow.com');

-- Get the user ID (will be 1 if it's the first user)
DO $$
DECLARE
    main_user_id INTEGER;
BEGIN
    SELECT id INTO main_user_id FROM users WHERE email = 'user@timeflow.com' LIMIT 1;
    
    -- Insert default work schedule (only if none exists for this user)
    INSERT INTO work_schedules (user_id, name, timezone, is_active)
    SELECT main_user_id, 'Standard Business Hours', 'America/Sao_Paulo', true
    WHERE NOT EXISTS (SELECT 1 FROM work_schedules WHERE user_id = main_user_id);
    
    -- Get the work schedule ID
    DECLARE
        schedule_id INTEGER;
    BEGIN
        SELECT id INTO schedule_id FROM work_schedules WHERE user_id = main_user_id LIMIT 1;
        
        -- Insert work schedule rules for Monday to Friday
        -- Morning shift: 8:00 AM to 12:00 PM
        INSERT INTO work_schedule_rules (work_schedule_id, day_of_week, start_time, end_time, rule_type, is_working_time, allow_overlap, description)
        VALUES 
            (schedule_id, 1, '08:00', '12:00', 'work', true, false, 'Morning shift'),
            (schedule_id, 2, '08:00', '12:00', 'work', true, false, 'Morning shift'),
            (schedule_id, 3, '08:00', '12:00', 'work', true, false, 'Morning shift'),
            (schedule_id, 4, '08:00', '12:00', 'work', true, false, 'Morning shift'),
            (schedule_id, 5, '08:00', '12:00', 'work', true, false, 'Morning shift');
        
        -- Lunch break: 12:00 PM to 1:00 PM
        INSERT INTO work_schedule_rules (work_schedule_id, day_of_week, start_time, end_time, rule_type, is_working_time, allow_overlap, description)
        VALUES 
            (schedule_id, 1, '12:00', '13:00', 'lunch', false, false, 'Lunch break'),
            (schedule_id, 2, '12:00', '13:00', 'lunch', false, false, 'Lunch break'),
            (schedule_id, 3, '12:00', '13:00', 'lunch', false, false, 'Lunch break'),
            (schedule_id, 4, '12:00', '13:00', 'lunch', false, false, 'Lunch break'),
            (schedule_id, 5, '12:00', '13:00', 'lunch', false, false, 'Lunch break');
        
        -- Afternoon shift: 1:00 PM to 6:00 PM
        INSERT INTO work_schedule_rules (work_schedule_id, day_of_week, start_time, end_time, rule_type, is_working_time, allow_overlap, description)
        VALUES 
            (schedule_id, 1, '13:00', '18:00', 'work', true, false, 'Afternoon shift'),
            (schedule_id, 2, '13:00', '18:00', 'work', true, false, 'Afternoon shift'),
            (schedule_id, 3, '13:00', '18:00', 'work', true, false, 'Afternoon shift'),
            (schedule_id, 4, '13:00', '18:00', 'work', true, false, 'Afternoon shift'),
            (schedule_id, 5, '13:00', '18:00', 'work', true, false, 'Afternoon shift');
        
        -- After hours: 6:00 PM to 11:59 PM (overtime/encaixe allowed)
        INSERT INTO work_schedule_rules (work_schedule_id, day_of_week, start_time, end_time, rule_type, is_working_time, allow_overlap, description)
        VALUES 
            (schedule_id, 1, '18:00', '23:59', 'work', false, true, 'After hours (overtime)'),
            (schedule_id, 2, '18:00', '23:59', 'work', false, true, 'After hours (overtime)'),
            (schedule_id, 3, '18:00', '23:59', 'work', false, true, 'After hours (overtime)'),
            (schedule_id, 4, '18:00', '23:59', 'work', false, true, 'After hours (overtime)'),
            (schedule_id, 5, '18:00', '23:59', 'work', false, true, 'After hours (overtime)');
        
        -- Weekends: Saturday and Sunday (unavailable)
        INSERT INTO work_schedule_rules (work_schedule_id, day_of_week, start_time, end_time, rule_type, is_working_time, allow_overlap, description)
        VALUES 
            (schedule_id, 0, '00:00', '23:59', 'unavailable', false, false, 'Weekend - Sunday'),
            (schedule_id, 6, '00:00', '23:59', 'unavailable', false, false, 'Weekend - Saturday');
    END;
END $$;
