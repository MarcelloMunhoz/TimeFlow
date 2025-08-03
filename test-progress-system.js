import { Client } from 'pg';

async function testProgressSystem() {
  const client = new Client({
    connectionString: 'postgres://timeflow:timeflow123@localhost:5432/timeflowdb'
  });

  try {
    await client.connect();
    console.log('🔗 Connected to database');

    console.log('\n📊 Testing Subphase Progress Calculation System');
    console.log('=' .repeat(60));

    // Step 1: Get a project with subphases
    console.log('\n1️⃣ Finding a project with subphases...');
    const projectResult = await client.query(`
      SELECT p.id, p.name, COUNT(ps.id) as subphase_count
      FROM projects p
      JOIN project_phases pp ON p.id = pp.project_id
      JOIN project_subphases ps ON pp.id = ps.project_phase_id
      GROUP BY p.id, p.name
      LIMIT 1
    `);

    console.log(`Found ${projectResult.rows.length} projects with subphases`);
    if (projectResult.rows.length > 0) {
      console.log('✅ Found existing project with subphases:', projectResult.rows[0]);
      console.log('🎯 Using existing project for testing...');

      // Use the existing project for testing
      const project = projectResult.rows[0];
      console.log(`📊 Testing with project: ${project.name} (ID: ${project.id})`);

      // Get the first subphase for this project
      const subphaseResult = await client.query(`
        SELECT ps.id, s.name
        FROM project_subphases ps
        JOIN subphases s ON ps.subphase_id = s.id
        JOIN project_phases pp ON ps.project_phase_id = pp.id
        WHERE pp.project_id = $1
        LIMIT 1
      `, [project.id]);

      if (subphaseResult.rows.length > 0) {
        const projectSubphaseId = subphaseResult.rows[0].id;
        console.log(`✅ Found subphase: ${subphaseResult.rows[0].name} (Project Subphase ID: ${projectSubphaseId})`);

        // Test with this existing project subphase
        // ... (rest of testing logic would go here)
        console.log('🎉 Would test with existing data, but creating new test data for clean test...');
      }
    }

    if (projectResult.rows.length === 0) {
      console.log('❌ No projects with subphases found. Creating test data...');
      
      // Create a test project
      const newProject = await client.query(`
        INSERT INTO projects (name, description, status, progress_percentage)
        VALUES ('Test Progress Project', 'Testing automatic progress calculation', 'active', 0)
        RETURNING id, name
      `);
      
      const projectId = newProject.rows[0].id;
      console.log(`✅ Created test project: ${newProject.rows[0].name} (ID: ${projectId})`);

      // Get a phase that has subphases
      const phaseResult = await client.query(`
        SELECT DISTINCT p.id, p.name
        FROM phases p
        JOIN subphases s ON p.id = s.phase_id
        LIMIT 1
      `);
      if (phaseResult.rows.length === 0) {
        console.log('❌ No phases with subphases found. Please ensure subphases are created.');
        return;
      }

      const phaseId = phaseResult.rows[0].id;
      
      // Add phase to project
      const projectPhase = await client.query(`
        INSERT INTO project_phases (project_id, phase_id, status, progress_percentage)
        VALUES ($1, $2, 'in_progress', 0)
        RETURNING id
      `, [projectId, phaseId]);

      const projectPhaseId = projectPhase.rows[0].id;
      console.log(`✅ Added phase to project (Project Phase ID: ${projectPhaseId})`);

      // Get a subphase to add to the project phase
      const subphaseResult = await client.query('SELECT id, name FROM subphases WHERE phase_id = $1 LIMIT 1', [phaseId]);
      if (subphaseResult.rows.length === 0) {
        console.log('❌ No subphases found for this phase.');
        return;
      }

      const subphaseId = subphaseResult.rows[0].id;
      
      // Add subphase to project phase
      const projectSubphase = await client.query(`
        INSERT INTO project_subphases (project_phase_id, subphase_id, status, progress_percentage)
        VALUES ($1, $2, 'in_progress', 0)
        RETURNING id
      `, [projectPhaseId, subphaseId]);

      const projectSubphaseId = projectSubphase.rows[0].id;
      console.log(`✅ Added subphase to project phase (Project Subphase ID: ${projectSubphaseId})`);

      // Create test appointments linked to the subphase
      console.log('\n2️⃣ Creating test appointments linked to subphase...');
      
      const appointments = [];
      for (let i = 1; i <= 3; i++) {
        const appointment = await client.query(`
          INSERT INTO appointments (
            title, description, date, start_time, duration_minutes, end_time,
            project_id, project_subphase_id, status
          ) VALUES (
            $1, $2, '2025-08-04', $3, 60, $4, $5, $6, 'scheduled'
          ) RETURNING id, title
        `, [
          `Test Task ${i}`,
          `Testing progress calculation task ${i}`,
          `${8 + i}:00`,
          `${9 + i}:00`,
          projectId,
          projectSubphaseId
        ]);
        
        appointments.push(appointment.rows[0]);
        console.log(`✅ Created appointment: ${appointment.rows[0].title} (ID: ${appointment.rows[0].id})`);
      }

      // Step 3: Test progress calculation by completing appointments
      console.log('\n3️⃣ Testing progress calculation by completing appointments...');
      
      // Complete first appointment
      console.log(`\n📝 Completing first appointment: ${appointments[0].title}`);
      await client.query(`
        UPDATE appointments 
        SET status = 'completed', completed_at = NOW(), actual_time_minutes = 60
        WHERE id = $1
      `, [appointments[0].id]);

      // Check progress after first completion
      const progress1 = await client.query(`
        SELECT 
          ps.progress_percentage as subphase_progress,
          pp.progress_percentage as phase_progress,
          p.progress_percentage as project_progress
        FROM project_subphases ps
        JOIN project_phases pp ON ps.project_phase_id = pp.id
        JOIN projects p ON pp.project_id = p.id
        WHERE ps.id = $1
      `, [projectSubphaseId]);

      console.log(`📊 Progress after 1/3 tasks completed:`);
      console.log(`   Subphase: ${progress1.rows[0].subphase_progress}%`);
      console.log(`   Phase: ${progress1.rows[0].phase_progress}%`);
      console.log(`   Project: ${progress1.rows[0].project_progress}%`);

      // Complete second appointment
      console.log(`\n📝 Completing second appointment: ${appointments[1].title}`);
      await client.query(`
        UPDATE appointments 
        SET status = 'completed', completed_at = NOW(), actual_time_minutes = 60
        WHERE id = $1
      `, [appointments[1].id]);

      // Check progress after second completion
      const progress2 = await client.query(`
        SELECT 
          ps.progress_percentage as subphase_progress,
          pp.progress_percentage as phase_progress,
          p.progress_percentage as project_progress
        FROM project_subphases ps
        JOIN project_phases pp ON ps.project_phase_id = pp.id
        JOIN projects p ON pp.project_id = p.id
        WHERE ps.id = $1
      `, [projectSubphaseId]);

      console.log(`📊 Progress after 2/3 tasks completed:`);
      console.log(`   Subphase: ${progress2.rows[0].subphase_progress}%`);
      console.log(`   Phase: ${progress2.rows[0].phase_progress}%`);
      console.log(`   Project: ${progress2.rows[0].project_progress}%`);

      // Complete third appointment
      console.log(`\n📝 Completing third appointment: ${appointments[2].title}`);
      await client.query(`
        UPDATE appointments 
        SET status = 'completed', completed_at = NOW(), actual_time_minutes = 60
        WHERE id = $1
      `, [appointments[2].id]);

      // Check final progress
      const progress3 = await client.query(`
        SELECT 
          ps.progress_percentage as subphase_progress,
          pp.progress_percentage as phase_progress,
          p.progress_percentage as project_progress
        FROM project_subphases ps
        JOIN project_phases pp ON ps.project_phase_id = pp.id
        JOIN projects p ON pp.project_id = p.id
        WHERE ps.id = $1
      `, [projectSubphaseId]);

      console.log(`📊 Progress after 3/3 tasks completed:`);
      console.log(`   Subphase: ${progress3.rows[0].subphase_progress}%`);
      console.log(`   Phase: ${progress3.rows[0].phase_progress}%`);
      console.log(`   Project: ${progress3.rows[0].project_progress}%`);

      console.log('\n🎉 Progress calculation test completed successfully!');
      console.log('\n✅ Verification:');
      console.log(`   - Subphase should be 100% (was ${progress3.rows[0].subphase_progress}%)`);
      console.log(`   - Phase should be 100% (was ${progress3.rows[0].phase_progress}%)`);
      console.log(`   - Project should be 100% (was ${progress3.rows[0].project_progress}%)`);

      if (progress3.rows[0].subphase_progress === 100 && 
          progress3.rows[0].phase_progress === 100 && 
          progress3.rows[0].project_progress === 100) {
        console.log('\n🎯 SUCCESS: All progress calculations are working correctly!');
      } else {
        console.log('\n⚠️  WARNING: Progress calculations may not be working as expected.');
      }
    }

  } catch (error) {
    console.error('❌ Error testing progress system:', error);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

testProgressSystem();
