import { Client } from 'pg';

async function fixTriggerAmbiguity() {
  const client = new Client({
    connectionString: 'postgres://timeflow:timeflow123@localhost:5432/timeflowdb'
  });

  try {
    await client.connect();
    console.log('🔗 Connected to database');

    console.log('🔧 Fixing trigger function ambiguity...');

    // Drop existing triggers
    await client.query('DROP TRIGGER IF EXISTS trigger_update_subphase_progress_on_appointment_update ON appointments');
    await client.query('DROP TRIGGER IF EXISTS trigger_update_subphase_progress_on_appointment_delete ON appointments');

    // Create fixed function
    await client.query(`
      CREATE OR REPLACE FUNCTION update_subphase_progress_trigger()
      RETURNS TRIGGER AS $$
      DECLARE
          target_subphase_id INTEGER;
          total_appointments INTEGER;
          completed_appointments INTEGER;
          calculated_progress INTEGER;
          target_phase_id INTEGER;
          target_project_id INTEGER;
      BEGIN
          -- Get the project_subphase_id from the appointment
          IF TG_OP = 'UPDATE' THEN
              target_subphase_id := NEW.project_subphase_id;
          ELSIF TG_OP = 'DELETE' THEN
              target_subphase_id := OLD.project_subphase_id;
          END IF;

          -- Only proceed if appointment is linked to a subphase
          IF target_subphase_id IS NOT NULL THEN
              -- Calculate subphase progress
              SELECT COUNT(*) INTO total_appointments
              FROM appointments 
              WHERE project_subphase_id = target_subphase_id;

              SELECT COUNT(*) INTO completed_appointments
              FROM appointments 
              WHERE project_subphase_id = target_subphase_id 
              AND status = 'completed';

              -- Calculate progress percentage
              IF total_appointments > 0 THEN
                  calculated_progress := ROUND((completed_appointments::DECIMAL / total_appointments) * 100);
              ELSE
                  calculated_progress := 0;
              END IF;

              -- Update project subphase progress
              UPDATE project_subphases
              SET progress_percentage = calculated_progress,
                  actual_hours = (
                      SELECT COALESCE(SUM(COALESCE(actual_time_minutes, duration_minutes)), 0) / 60.0
                      FROM appointments 
                      WHERE project_subphase_id = target_subphase_id 
                      AND status = 'completed'
                  )
              WHERE id = target_subphase_id;

              -- Get phase and project IDs for cascading updates
              SELECT ps.project_phase_id, pp.project_id
              INTO target_phase_id, target_project_id
              FROM project_subphases ps
              JOIN project_phases pp ON ps.project_phase_id = pp.id
              WHERE ps.id = target_subphase_id;

              -- Update phase progress (average of all subphases in the phase)
              IF target_phase_id IS NOT NULL THEN
                  UPDATE project_phases
                  SET progress_percentage = (
                      SELECT COALESCE(ROUND(AVG(progress_percentage)), 0)
                      FROM project_subphases
                      WHERE project_phase_id = target_phase_id
                  )
                  WHERE id = target_phase_id;

                  -- Update project progress (average of all phases in the project)
                  IF target_project_id IS NOT NULL THEN
                      UPDATE projects
                      SET progress_percentage = (
                          SELECT COALESCE(ROUND(AVG(progress_percentage)), 0)
                          FROM project_phases
                          WHERE project_id = target_project_id
                      )
                      WHERE id = target_project_id;
                  END IF;
              END IF;

              RAISE NOTICE 'Progress updated for subphase %, phase %, project %',
                  target_subphase_id, target_phase_id, target_project_id;
          END IF;

          IF TG_OP = 'DELETE' THEN
              RETURN OLD;
          ELSE
              RETURN NEW;
          END IF;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Recreate triggers
    await client.query(`
      CREATE TRIGGER trigger_update_subphase_progress_on_appointment_update
          AFTER UPDATE OF status, project_subphase_id, actual_time_minutes ON appointments
          FOR EACH ROW
          EXECUTE FUNCTION update_subphase_progress_trigger();
    `);

    await client.query(`
      CREATE TRIGGER trigger_update_subphase_progress_on_appointment_delete
          AFTER DELETE ON appointments
          FOR EACH ROW
          EXECUTE FUNCTION update_subphase_progress_trigger();
    `);

    console.log('✅ Trigger function fixed and recreated');

  } catch (error) {
    console.error('❌ Error fixing trigger:', error);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

fixTriggerAmbiguity();
