import { Client } from 'pg';

async function testProgressSimple() {
  const client = new Client({
    connectionString: 'postgres://timeflow:timeflow123@localhost:5432/timeflowdb'
  });

  try {
    await client.connect();
    console.log('🔗 Connected to database');

    console.log('\n📊 Testing Subphase Progress Calculation');
    console.log('=' .repeat(50));

    // Find existing project with subphases
    const projectResult = await client.query(`
      SELECT p.id, p.name, COUNT(ps.id) as subphase_count
      FROM projects p
      JOIN project_phases pp ON p.id = pp.project_id
      JOIN project_subphases ps ON pp.id = ps.project_phase_id
      GROUP BY p.id, p.name
      LIMIT 1
    `);

    if (projectResult.rows.length === 0) {
      console.log('❌ No projects with subphases found');
      return;
    }

    const project = projectResult.rows[0];
    console.log(`📋 Using project: ${project.name} (ID: ${project.id})`);

    // Get project subphase
    const subphaseResult = await client.query(`
      SELECT ps.id, s.name, ps.progress_percentage
      FROM project_subphases ps
      JOIN subphases s ON ps.subphase_id = s.id
      JOIN project_phases pp ON ps.project_phase_id = pp.id
      WHERE pp.project_id = $1
      LIMIT 1
    `, [project.id]);

    const projectSubphase = subphaseResult.rows[0];
    console.log(`📋 Using subphase: ${projectSubphase.name} (ID: ${projectSubphase.id})`);
    console.log(`📊 Current progress: ${projectSubphase.progress_percentage}%`);

    // Check existing appointments for this subphase
    const existingAppts = await client.query(`
      SELECT id, title, status
      FROM appointments 
      WHERE project_subphase_id = $1
    `, [projectSubphase.id]);

    console.log(`\n📋 Found ${existingAppts.rows.length} existing appointments:`);
    existingAppts.rows.forEach(apt => {
      console.log(`  - ${apt.title} (${apt.status})`);
    });

    // Create 3 new test appointments
    console.log('\n📝 Creating 3 new test appointments...');
    const newAppointments = [];
    
    for (let i = 1; i <= 3; i++) {
      const result = await client.query(`
        INSERT INTO appointments (
          title, description, date, start_time, duration_minutes, end_time,
          project_id, project_subphase_id, status
        ) VALUES (
          $1, $2, '2025-08-05', $3, 60, $4, $5, $6, 'scheduled'
        ) RETURNING id, title
      `, [
        `Progress Test Task ${i}`,
        `Testing automatic progress calculation ${i}`,
        `${9 + i}:00`,
        `${10 + i}:00`,
        project.id,
        projectSubphase.id
      ]);
      
      newAppointments.push(result.rows[0]);
      console.log(`✅ Created: ${result.rows[0].title} (ID: ${result.rows[0].id})`);
    }

    // Check progress after creating appointments (should still be same)
    const progressAfterCreate = await client.query(`
      SELECT progress_percentage FROM project_subphases WHERE id = $1
    `, [projectSubphase.id]);
    console.log(`📊 Progress after creating appointments: ${progressAfterCreate.rows[0].progress_percentage}%`);

    // Complete appointments one by one and check progress
    for (let i = 0; i < newAppointments.length; i++) {
      const appointment = newAppointments[i];
      console.log(`\n📝 Completing appointment ${i + 1}/3: ${appointment.title}`);
      
      await client.query(`
        UPDATE appointments 
        SET status = 'completed', completed_at = NOW(), actual_time_minutes = 60
        WHERE id = $1
      `, [appointment.id]);

      // Check progress after completion
      const progressResult = await client.query(`
        SELECT 
          ps.progress_percentage as subphase_progress,
          pp.progress_percentage as phase_progress,
          p.progress_percentage as project_progress
        FROM project_subphases ps
        JOIN project_phases pp ON ps.project_phase_id = pp.id
        JOIN projects p ON pp.project_id = p.id
        WHERE ps.id = $1
      `, [projectSubphase.id]);

      const progress = progressResult.rows[0];
      console.log(`📊 Progress after completing ${i + 1}/3 tasks:`);
      console.log(`   Subphase: ${progress.subphase_progress}%`);
      console.log(`   Phase: ${progress.phase_progress}%`);
      console.log(`   Project: ${progress.project_progress}%`);
    }

    // Final verification
    const totalAppointments = await client.query(`
      SELECT COUNT(*) as total, 
             COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
      FROM appointments 
      WHERE project_subphase_id = $1
    `, [projectSubphase.id]);

    const stats = totalAppointments.rows[0];
    const expectedProgress = Math.round((stats.completed / stats.total) * 100);

    console.log(`\n🎯 Final Verification:`);
    console.log(`   Total appointments: ${stats.total}`);
    console.log(`   Completed appointments: ${stats.completed}`);
    console.log(`   Expected progress: ${expectedProgress}%`);

    const finalProgress = await client.query(`
      SELECT progress_percentage FROM project_subphases WHERE id = $1
    `, [projectSubphase.id]);

    const actualProgress = finalProgress.rows[0].progress_percentage;
    console.log(`   Actual progress: ${actualProgress}%`);

    if (actualProgress === expectedProgress) {
      console.log('\n🎉 SUCCESS: Progress calculation is working correctly!');
    } else {
      console.log('\n⚠️  WARNING: Progress calculation mismatch!');
    }

  } catch (error) {
    console.error('❌ Error testing progress:', error);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

testProgressSimple();
