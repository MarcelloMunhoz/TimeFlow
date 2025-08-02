// Test script to verify project phases UPDATE and DELETE operations
import 'dotenv/config';

async function testProjectPhasesOperations() {
  console.log('🧪 Testing Project Phases UPDATE and DELETE operations...\n');

  try {
    // Step 1: Get a project to work with
    console.log('📅 Step 1: Getting a project to test with...');
    
    const projectsResponse = await fetch('http://localhost:5000/api/projects');
    if (!projectsResponse.ok) {
      console.error('❌ Could not fetch projects');
      return;
    }
    
    const projects = await projectsResponse.json();
    if (projects.length === 0) {
      console.error('❌ No projects found');
      return;
    }

    const testProject = projects[0];
    console.log(`✅ Using project: ${testProject.name} (ID: ${testProject.id})`);

    // Step 2: Get available phases
    console.log('\n📅 Step 2: Getting available phases...');
    
    const phasesResponse = await fetch('http://localhost:5000/api/phases');
    if (!phasesResponse.ok) {
      console.error('❌ Could not fetch phases');
      return;
    }
    
    const phases = await phasesResponse.json();
    if (phases.length === 0) {
      console.error('❌ No phases found');
      return;
    }

    const testPhase = phases[0];
    console.log(`✅ Using phase: ${testPhase.name} (ID: ${testPhase.id})`);

    // Step 3: Add phase to project
    console.log('\n📅 Step 3: Adding phase to project...');
    
    const addPhaseData = {
      phaseId: testPhase.id,
      deadline: "2024-12-31"
    };

    const addResponse = await fetch(`http://localhost:5000/api/projects/${testProject.id}/phases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addPhaseData)
    });

    if (addResponse.ok) {
      const addedPhase = await addResponse.json();
      console.log('✅ Phase added to project successfully');
      console.log(`📊 Added: ${testPhase.name} with deadline: ${addPhaseData.deadline}`);
    } else {
      const error = await addResponse.text();
      console.log('ℹ️ Add phase result:', error);
      // Continue with test even if phase already exists
    }

    // Step 4: Test UPDATE operation
    console.log('\n📅 Step 4: Testing UPDATE project phase deadline...');
    
    const updateData = {
      deadline: "2025-01-15"
    };

    const updateResponse = await fetch(`http://localhost:5000/api/projects/${testProject.id}/phases/${testPhase.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });

    if (updateResponse.ok) {
      const updatedPhase = await updateResponse.json();
      console.log('✅ Phase deadline updated successfully');
      console.log(`📊 New deadline: ${updatedPhase.deadline}`);
    } else {
      const error = await updateResponse.text();
      console.error('❌ UPDATE failed:', error);
      console.error('Response status:', updateResponse.status);
    }

    // Step 5: Verify the update
    console.log('\n📅 Step 5: Verifying the update...');
    
    const verifyResponse = await fetch(`http://localhost:5000/api/projects/${testProject.id}/phases`);
    if (verifyResponse.ok) {
      const projectPhases = await verifyResponse.json();
      const updatedPhase = projectPhases.find(pp => pp.phaseId === testPhase.id);
      
      if (updatedPhase) {
        console.log('✅ Update verified');
        console.log(`📊 Current deadline: ${updatedPhase.deadline}`);
      } else {
        console.log('⚠️ Phase not found in project phases');
      }
    } else {
      console.error('❌ Could not verify update');
    }

    // Step 6: Test DELETE operation
    console.log('\n📅 Step 6: Testing DELETE project phase...');
    
    const deleteResponse = await fetch(`http://localhost:5000/api/projects/${testProject.id}/phases/${testPhase.id}`, {
      method: 'DELETE'
    });

    if (deleteResponse.ok) {
      const deleteResult = await deleteResponse.json();
      console.log('✅ Phase removed from project successfully');
      console.log(`📊 Result: ${deleteResult.message}`);
    } else {
      const error = await deleteResponse.text();
      console.error('❌ DELETE failed:', error);
      console.error('Response status:', deleteResponse.status);
    }

    // Step 7: Verify the deletion
    console.log('\n📅 Step 7: Verifying the deletion...');
    
    const verifyDeleteResponse = await fetch(`http://localhost:5000/api/projects/${testProject.id}/phases`);
    if (verifyDeleteResponse.ok) {
      const projectPhases = await verifyDeleteResponse.json();
      const deletedPhase = projectPhases.find(pp => pp.phaseId === testPhase.id);
      
      if (!deletedPhase) {
        console.log('✅ Deletion verified - phase no longer in project');
      } else {
        console.log('⚠️ Phase still found in project phases');
      }
      
      console.log(`📊 Project now has ${projectPhases.length} phases`);
    } else {
      console.error('❌ Could not verify deletion');
    }

    console.log('\n🎉 Project phases operations test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testProjectPhasesOperations().catch(console.error);
