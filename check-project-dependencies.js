import { Client } from 'pg';

async function checkProjectDependencies() {
  const client = new Client({
    connectionString: 'postgres://timeflow:timeflow123@localhost:5432/timeflowdb'
  });

  try {
    await client.connect();
    console.log('🔗 Connected to database');

    const projectId = 26; // Test Progress Project
    console.log(`\n🔍 Checking dependencies for project ID: ${projectId}`);
    console.log('=' .repeat(60));

    // Get project details
    const projectResult = await client.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    if (projectResult.rows.length === 0) {
      console.log('❌ Project not found');
      return;
    }

    const project = projectResult.rows[0];
    console.log(`📋 Project: "${project.name}"`);
    console.log(`📋 Description: ${project.description || 'N/A'}`);
    console.log(`📋 Status: ${project.status}`);

    // Check appointments linked to this project
    console.log('\n📅 Checking appointments linked to this project...');
    const appointmentsResult = await client.query(`
      SELECT id, title, date, start_time, status, project_subphase_id
      FROM appointments 
      WHERE project_id = $1
      ORDER BY date, start_time
    `, [projectId]);

    console.log(`📊 Found ${appointmentsResult.rows.length} appointments linked to this project:`);
    
    if (appointmentsResult.rows.length > 0) {
      appointmentsResult.rows.forEach((apt, index) => {
        const subphaseInfo = apt.project_subphase_id ? ` (Subphase: ${apt.project_subphase_id})` : '';
        console.log(`  ${index + 1}. [${apt.status}] ${apt.title} - ${apt.date} ${apt.start_time}${subphaseInfo}`);
      });
    } else {
      console.log('  ✅ No appointments found');
    }

    // Check project phases
    console.log('\n📋 Checking project phases...');
    const phasesResult = await client.query(`
      SELECT pp.id, p.name as phase_name, pp.status, pp.progress_percentage
      FROM project_phases pp
      JOIN phases p ON pp.phase_id = p.id
      WHERE pp.project_id = $1
      ORDER BY p.order_index
    `, [projectId]);

    console.log(`📊 Found ${phasesResult.rows.length} phases for this project:`);
    
    if (phasesResult.rows.length > 0) {
      phasesResult.rows.forEach((phase, index) => {
        console.log(`  ${index + 1}. ${phase.phase_name} - Status: ${phase.status}, Progress: ${phase.progress_percentage}%`);
      });
    } else {
      console.log('  ✅ No phases found');
    }

    // Check project subphases
    console.log('\n📋 Checking project subphases...');
    const subphasesResult = await client.query(`
      SELECT ps.id, s.name as subphase_name, ps.status, ps.progress_percentage
      FROM project_subphases ps
      JOIN subphases s ON ps.subphase_id = s.id
      JOIN project_phases pp ON ps.project_phase_id = pp.id
      WHERE pp.project_id = $1
      ORDER BY s.order_index
    `, [projectId]);

    console.log(`📊 Found ${subphasesResult.rows.length} subphases for this project:`);
    
    if (subphasesResult.rows.length > 0) {
      subphasesResult.rows.forEach((subphase, index) => {
        console.log(`  ${index + 1}. ${subphase.subphase_name} - Status: ${subphase.status}, Progress: ${subphase.progress_percentage}%`);
      });
    } else {
      console.log('  ✅ No subphases found');
    }

    // Check project tasks
    console.log('\n📋 Checking project tasks...');
    const tasksResult = await client.query(`
      SELECT id, status, priority
      FROM project_tasks
      WHERE project_id = $1
    `, [projectId]);

    console.log(`📊 Found ${tasksResult.rows.length} project tasks:`);
    
    if (tasksResult.rows.length > 0) {
      tasksResult.rows.forEach((task, index) => {
        console.log(`  ${index + 1}. Task ID: ${task.id} - Status: ${task.status}, Priority: ${task.priority}`);
      });
    } else {
      console.log('  ✅ No project tasks found');
    }

    // Check project roadmap
    console.log('\n📋 Checking project roadmap...');
    const roadmapResult = await client.query(`
      SELECT id, stage_id, status
      FROM project_roadmap
      WHERE project_id = $1
    `, [projectId]);

    console.log(`📊 Found ${roadmapResult.rows.length} roadmap entries:`);
    
    if (roadmapResult.rows.length > 0) {
      roadmapResult.rows.forEach((roadmap, index) => {
        console.log(`  ${index + 1}. Roadmap ID: ${roadmap.id} - Stage: ${roadmap.stage_id}, Status: ${roadmap.status}`);
      });
    } else {
      console.log('  ✅ No roadmap entries found');
    }

    // Summary
    console.log('\n📊 DELETION BLOCKING SUMMARY:');
    console.log('=' .repeat(40));
    
    const blockingFactors = [];
    if (appointmentsResult.rows.length > 0) {
      blockingFactors.push(`${appointmentsResult.rows.length} appointments`);
    }
    if (phasesResult.rows.length > 0) {
      blockingFactors.push(`${phasesResult.rows.length} project phases`);
    }
    if (subphasesResult.rows.length > 0) {
      blockingFactors.push(`${subphasesResult.rows.length} project subphases`);
    }
    if (tasksResult.rows.length > 0) {
      blockingFactors.push(`${tasksResult.rows.length} project tasks`);
    }
    if (roadmapResult.rows.length > 0) {
      blockingFactors.push(`${roadmapResult.rows.length} roadmap entries`);
    }

    if (blockingFactors.length > 0) {
      console.log('❌ PROJECT CANNOT BE DELETED due to:');
      blockingFactors.forEach(factor => {
        console.log(`   - ${factor}`);
      });
      console.log('\n💡 To delete this project, you need to:');
      console.log('   1. Delete or reassign all appointments');
      console.log('   2. Remove all project phases and subphases');
      console.log('   3. Delete all project tasks and roadmap entries');
    } else {
      console.log('✅ PROJECT CAN BE DELETED - No blocking dependencies found');
    }

  } catch (error) {
    console.error('❌ Error checking project dependencies:', error);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

checkProjectDependencies();
