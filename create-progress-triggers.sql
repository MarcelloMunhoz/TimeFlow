-- Create PostgreSQL triggers for automatic progress calculation
-- This will automatically update subphase → phase → project progress when appointments are completed

-- Function to update subphase progress when appointments change
CREATE OR REPLACE FUNCTION update_subphase_progress_trigger()
RETURNS TRIGGER AS $$
DECLARE
    subphase_id INTEGER;
    total_appointments INTEGER;
    completed_appointments INTEGER;
    progress_percentage INTEGER;
    phase_id INTEGER;
    project_id INTEGER;
BEGIN
    -- Get the project_subphase_id from the appointment
    IF TG_OP = 'UPDATE' THEN
        subphase_id := NEW.project_subphase_id;
    ELSIF TG_OP = 'DELETE' THEN
        subphase_id := OLD.project_subphase_id;
    END IF;

    -- Only proceed if appointment is linked to a subphase
    IF subphase_id IS NOT NULL THEN
        -- Calculate subphase progress
        SELECT COUNT(*) INTO total_appointments
        FROM appointments 
        WHERE project_subphase_id = subphase_id;

        SELECT COUNT(*) INTO completed_appointments
        FROM appointments 
        WHERE project_subphase_id = subphase_id 
        AND status = 'completed';

        -- Calculate progress percentage
        IF total_appointments > 0 THEN
            progress_percentage := ROUND((completed_appointments::DECIMAL / total_appointments) * 100);
        ELSE
            progress_percentage := 0;
        END IF;

        -- Update project subphase progress
        UPDATE project_subphases 
        SET progress_percentage = progress_percentage,
            actual_hours = (
                SELECT COALESCE(SUM(COALESCE(actual_time_minutes, duration_minutes)), 0) / 60.0
                FROM appointments 
                WHERE project_subphase_id = subphase_id 
                AND status = 'completed'
            )
        WHERE id = subphase_id;

        -- Get phase and project IDs for cascading updates
        SELECT ps.project_phase_id, pp.project_id 
        INTO phase_id, project_id
        FROM project_subphases ps
        JOIN project_phases pp ON ps.project_phase_id = pp.id
        WHERE ps.id = subphase_id;

        -- Update phase progress (average of all subphases in the phase)
        IF phase_id IS NOT NULL THEN
            UPDATE project_phases 
            SET progress_percentage = (
                SELECT COALESCE(ROUND(AVG(progress_percentage)), 0)
                FROM project_subphases 
                WHERE project_phase_id = phase_id
            )
            WHERE id = phase_id;

            -- Update project progress (average of all phases in the project)
            IF project_id IS NOT NULL THEN
                UPDATE projects 
                SET progress_percentage = (
                    SELECT COALESCE(ROUND(AVG(progress_percentage)), 0)
                    FROM project_phases 
                    WHERE project_id = project_id
                )
                WHERE id = project_id;
            END IF;
        END IF;

        RAISE NOTICE 'Progress updated for subphase %, phase %, project %',
            subphase_id, phase_id, project_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for appointment changes
DROP TRIGGER IF EXISTS trigger_update_subphase_progress_on_appointment_update ON appointments;
DROP TRIGGER IF EXISTS trigger_update_subphase_progress_on_appointment_delete ON appointments;

CREATE TRIGGER trigger_update_subphase_progress_on_appointment_update
    AFTER UPDATE OF status, project_subphase_id, actual_time_minutes ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_subphase_progress_trigger();

CREATE TRIGGER trigger_update_subphase_progress_on_appointment_delete
    AFTER DELETE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_subphase_progress_trigger();

-- Function to recalculate all progress for a project (useful for manual recalculation)
CREATE OR REPLACE FUNCTION recalculate_project_progress(target_project_id INTEGER)
RETURNS VOID AS $$
DECLARE
    subphase_record RECORD;
BEGIN
    -- Recalculate progress for all subphases in the project
    FOR subphase_record IN 
        SELECT ps.id as subphase_id
        FROM project_subphases ps
        JOIN project_phases pp ON ps.project_phase_id = pp.id
        WHERE pp.project_id = target_project_id
    LOOP
        -- Trigger the progress update for each subphase
        UPDATE project_subphases 
        SET progress_percentage = progress_percentage 
        WHERE id = subphase_record.subphase_id;
    END LOOP;
    
    RAISE NOTICE 'Recalculated progress for project %', target_project_id;
END;
$$ LANGUAGE plpgsql;
