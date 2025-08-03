import { Client } from 'pg';

async function fixWeekendTrigger() {
  const client = new Client({
    connectionString: 'postgres://timeflow:timeflow123@localhost:5432/timeflowdb'
  });

  try {
    await client.connect();
    console.log('🔗 Connected to database');

    // Remove existing triggers and function
    console.log('🗑️ Removing existing triggers and function...');
    await client.query('DROP TRIGGER IF EXISTS prevent_weekend_appointments_insert ON appointments');
    await client.query('DROP TRIGGER IF EXISTS prevent_weekend_appointments_update ON appointments');
    await client.query('DROP FUNCTION IF EXISTS validate_weekend_appointments()');
    console.log('✅ Existing triggers and function removed');

    // Create new function
    console.log('🔧 Creating new weekend validation function...');
    const functionSQL = `
      CREATE OR REPLACE FUNCTION validate_weekend_appointments()
      RETURNS TRIGGER AS $$
      DECLARE
          day_of_week INTEGER;
      BEGIN
          -- Extract day of week (0=sunday, 1=monday, ..., 6=saturday)
          day_of_week := EXTRACT(DOW FROM NEW.date::date);
          
          -- Log for debug
          RAISE NOTICE 'Validating appointment for date: %, day of week: %, allow_overlap: %', NEW.date, day_of_week, NEW.allow_overlap;
          
          -- Allow weekend appointments if allow_overlap is true
          IF NEW.allow_overlap = true THEN
              RAISE NOTICE 'Weekend appointment allowed due to allow_overlap = true';
              RETURN NEW;
          END IF;
          
          -- Block weekends only if allow_overlap is false or null
          IF day_of_week = 0 THEN
              RAISE EXCEPTION 'DOMINGO NÃO É PERMITIDO! Escolha segunda a sexta ou confirme o encaixe.';
          END IF;
          
          IF day_of_week = 6 THEN
              RAISE EXCEPTION 'SÁBADO NÃO É PERMITIDO! Escolha segunda a sexta ou confirme o encaixe.';
          END IF;
          
          -- If we got here, it's allowed
          RAISE NOTICE 'Appointment allowed for day %', day_of_week;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    await client.query(functionSQL);
    console.log('✅ New function created');

    // Create new triggers
    console.log('🔧 Creating new triggers...');
    await client.query(`
      CREATE TRIGGER prevent_weekend_appointments_insert
          BEFORE INSERT ON appointments
          FOR EACH ROW
          EXECUTE FUNCTION validate_weekend_appointments();
    `);
    
    await client.query(`
      CREATE TRIGGER prevent_weekend_appointments_update
          BEFORE UPDATE ON appointments
          FOR EACH ROW
          EXECUTE FUNCTION validate_weekend_appointments();
    `);
    
    console.log('✅ New triggers created');
    console.log('🎉 Weekend trigger fix completed successfully!');

  } catch (error) {
    console.error('❌ Error fixing weekend trigger:', error);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

fixWeekendTrigger();
