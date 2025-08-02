// Debug test for phase deletion
import 'dotenv/config';

async function testPhaseDeleteDebug() {
  console.log('🧪 Testing Phase Delete Debug...\n');

  try {
    // Step 1: Create a test phase
    console.log('📋 Step 1: Create test phase');
    const createData = {
      name: 'Debug Test Phase',
      description: 'This phase is for debugging deletion',
      color: '#FF0000'
    };
    
    const createResponse = await fetch('http://localhost:5000/api/phases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createData)
    });
    
    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.log(`❌ CREATE failed: ${error}`);
      return;
    }
    
    const createdPhase = await createResponse.json();
    console.log(`✅ CREATE successful: ${createdPhase.name} (ID: ${createdPhase.id})`);
    
    // Step 2: Verify the phase exists
    console.log('\n📋 Step 2: Verify phase exists');
    const getResponse = await fetch(`http://localhost:5000/api/phases/${createdPhase.id}`);
    
    if (getResponse.ok) {
      const phase = await getResponse.json();
      console.log(`✅ Phase found: ${phase.name}`);
    } else {
      console.log(`❌ Phase not found after creation`);
      return;
    }
    
    // Step 3: Check if phase is used in projects
    console.log('\n📋 Step 3: Check if phase is used in projects');
    const projectPhasesResponse = await fetch('http://localhost:5000/api/projects');
    
    if (projectPhasesResponse.ok) {
      const projects = await projectPhasesResponse.json();
      let isUsedInProjects = false;
      
      for (const project of projects) {
        const projectPhasesResp = await fetch(`http://localhost:5000/api/projects/${project.id}/phases`);
        if (projectPhasesResp.ok) {
          const projectPhases = await projectPhasesResp.json();
          const usedPhase = projectPhases.find(pp => pp.phaseId === createdPhase.id);
          if (usedPhase) {
            isUsedInProjects = true;
            console.log(`⚠️ Phase is used in project: ${project.name}`);
            break;
          }
        }
      }
      
      if (!isUsedInProjects) {
        console.log('✅ Phase is not used in any projects');
      }
    }
    
    // Step 4: Check if phase is used in appointments
    console.log('\n📋 Step 4: Check if phase is used in appointments');
    const appointmentsResponse = await fetch('http://localhost:5000/api/appointments');
    
    if (appointmentsResponse.ok) {
      const appointments = await appointmentsResponse.json();
      const usedInAppointments = appointments.filter(apt => apt.phaseId === createdPhase.id);
      
      if (usedInAppointments.length === 0) {
        console.log('✅ Phase is not used in any appointments');
      } else {
        console.log(`⚠️ Phase is used in ${usedInAppointments.length} appointments`);
      }
    }
    
    // Step 5: Attempt to delete the phase
    console.log('\n📋 Step 5: Attempt to delete the phase');
    const deleteResponse = await fetch(`http://localhost:5000/api/phases/${createdPhase.id}`, {
      method: 'DELETE'
    });
    
    console.log(`Delete response status: ${deleteResponse.status}`);
    
    if (deleteResponse.ok) {
      const deleteResult = await deleteResponse.json();
      console.log(`✅ DELETE successful: ${JSON.stringify(deleteResult)}`);
      
      // Step 6: Verify deletion
      console.log('\n📋 Step 6: Verify deletion');
      const verifyResponse = await fetch(`http://localhost:5000/api/phases/${createdPhase.id}`);
      
      if (verifyResponse.status === 404) {
        console.log('✅ Phase successfully deleted');
      } else {
        console.log('❌ Phase still exists after deletion');
      }
      
    } else {
      const error = await deleteResponse.text();
      console.log(`❌ DELETE failed: ${error}`);
      
      // Try to get more details about the error
      console.log('\n🔍 Investigating deletion failure...');
      
      // Check if it's a constraint error
      if (error.includes('assigned to projects') || error.includes('assigned to appointments')) {
        console.log('💡 Deletion failed due to foreign key constraints');
      } else {
        console.log('💡 Deletion failed for unknown reason');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testPhaseDeleteDebug().catch(console.error);
