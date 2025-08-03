import { Client } from 'pg';

async function cleanupTestProject() {
  const client = new Client({
    connectionString: 'postgres://timeflow:timeflow123@localhost:5432/timeflowdb'
  });

  try {
    await client.connect();
    console.log('🔗 Connected to database');

    const projectId = 26; // Test Progress Project
    console.log(`\n🧹 Cleaning up Test Progress Project (ID: ${projectId})`);
    console.log('=' .repeat(60));

    // Get project details
    const projectResult = await client.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    if (projectResult.rows.length === 0) {
      console.log('❌ Project not found');
      return;
    }

    const project = projectResult.rows[0];
    console.log(`📋 Project: "${project.name}"`);

    // Step 1: Delete all appointments linked to this project
    console.log('\n🗑️ Step 1: Deleting appointments linked to this project...');
    
    const appointmentsResult = await client.query(`
      SELECT id, title, date, start_time, status
      FROM appointments 
      WHERE project_id = $1
      ORDER BY date, start_time
    `, [projectId]);

    console.log(`📊 Found ${appointmentsResult.rows.length} appointments to delete:`);
    
    if (appointmentsResult.rows.length > 0) {
      for (const apt of appointmentsResult.rows) {
        console.log(`  🗑️ Deleting: [${apt.status}] ${apt.title} - ${apt.date} ${apt.start_time}`);
        await client.query('DELETE FROM appointments WHERE id = $1', [apt.id]);
      }
      console.log(`✅ Deleted ${appointmentsResult.rows.length} appointments`);
    } else {
      console.log('  ✅ No appointments to delete');
    }

    // Step 2: Delete project phases (if any)
    console.log('\n🗑️ Step 2: Deleting project phases...');
    
    const phasesResult = await client.query(`
      SELECT pp.id, p.name as phase_name
      FROM project_phases pp
      JOIN phases p ON pp.phase_id = p.id
      WHERE pp.project_id = $1
    `, [projectId]);

    console.log(`📊 Found ${phasesResult.rows.length} project phases to delete:`);
    
    if (phasesResult.rows.length > 0) {
      for (const phase of phasesResult.rows) {
        console.log(`  🗑️ Deleting project phase: ${phase.phase_name}`);
        await client.query('DELETE FROM project_phases WHERE id = $1', [phase.id]);
      }
      console.log(`✅ Deleted ${phasesResult.rows.length} project phases`);
    } else {
      console.log('  ✅ No project phases to delete');
    }

    // Step 3: Delete project subphases (if any)
    console.log('\n🗑️ Step 3: Deleting project subphases...');
    
    const subphasesResult = await client.query(`
      SELECT ps.id, s.name as subphase_name
      FROM project_subphases ps
      JOIN subphases s ON ps.subphase_id = s.id
      JOIN project_phases pp ON ps.project_phase_id = pp.id
      WHERE pp.project_id = $1
    `, [projectId]);

    console.log(`📊 Found ${subphasesResult.rows.length} project subphases to delete:`);
    
    if (subphasesResult.rows.length > 0) {
      for (const subphase of subphasesResult.rows) {
        console.log(`  🗑️ Deleting project subphase: ${subphase.subphase_name}`);
        await client.query('DELETE FROM project_subphases WHERE id = $1', [subphase.id]);
      }
      console.log(`✅ Deleted ${subphasesResult.rows.length} project subphases`);
    } else {
      console.log('  ✅ No project subphases to delete');
    }

    // Step 4: Delete project tasks (if any)
    console.log('\n🗑️ Step 4: Deleting project tasks...');
    
    const tasksResult = await client.query(`
      SELECT id FROM project_tasks WHERE project_id = $1
    `, [projectId]);

    console.log(`📊 Found ${tasksResult.rows.length} project tasks to delete:`);
    
    if (tasksResult.rows.length > 0) {
      for (const task of tasksResult.rows) {
        console.log(`  🗑️ Deleting project task ID: ${task.id}`);
        await client.query('DELETE FROM project_tasks WHERE id = $1', [task.id]);
      }
      console.log(`✅ Deleted ${tasksResult.rows.length} project tasks`);
    } else {
      console.log('  ✅ No project tasks to delete');
    }

    // Step 5: Delete project roadmap entries (if any)
    console.log('\n🗑️ Step 5: Deleting project roadmap entries...');
    
    const roadmapResult = await client.query(`
      SELECT id FROM project_roadmap WHERE project_id = $1
    `, [projectId]);

    console.log(`📊 Found ${roadmapResult.rows.length} roadmap entries to delete:`);
    
    if (roadmapResult.rows.length > 0) {
      for (const roadmap of roadmapResult.rows) {
        console.log(`  🗑️ Deleting roadmap entry ID: ${roadmap.id}`);
        await client.query('DELETE FROM project_roadmap WHERE id = $1', [roadmap.id]);
      }
      console.log(`✅ Deleted ${roadmapResult.rows.length} roadmap entries`);
    } else {
      console.log('  ✅ No roadmap entries to delete');
    }

    // Step 6: Now try to delete the project
    console.log('\n🗑️ Step 6: Attempting to delete the project...');
    
    const deleteResult = await client.query('DELETE FROM projects WHERE id = $1', [projectId]);
    
    if (deleteResult.rowCount > 0) {
      console.log(`✅ Project "${project.name}" deleted successfully!`);
    } else {
      console.log('❌ Failed to delete project');
    }

    // Final verification
    console.log('\n🔍 Final verification...');
    const verifyResult = await client.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    
    if (verifyResult.rows.length === 0) {
      console.log('✅ Confirmed: Project has been completely removed from database');
    } else {
      console.log('❌ Project still exists in database');
    }

    console.log('\n🎉 Cleanup completed!');
    console.log('💡 You can now try deleting the project from the frontend - it should work now.');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

cleanupTestProject();
