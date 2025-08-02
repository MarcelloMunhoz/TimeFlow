// Debug test for update operation
import 'dotenv/config';

async function testUpdateDebug() {
  console.log('🧪 Testing UPDATE operation debug...\n');

  try {
    const projectId = 20;
    const phaseId = 1;
    
    // Step 1: Add a phase to project
    console.log('📅 Step 1: Add phase to project');
    const addResponse = await fetch(`http://localhost:5000/api/projects/${projectId}/phases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phaseId: phaseId, deadline: '2024-12-31' })
    });
    
    if (addResponse.ok) {
      const addedPhase = await addResponse.json();
      console.log('✅ Phase added:', addedPhase);
    } else {
      const error = await addResponse.text();
      console.log('ℹ️ Add phase result:', error);
    }
    
    // Step 2: Check current project phases
    console.log('\n📅 Step 2: Check current project phases');
    const phasesResponse = await fetch(`http://localhost:5000/api/projects/${projectId}/phases`);
    
    if (phasesResponse.ok) {
      const phases = await phasesResponse.json();
      console.log('Current project phases:', phases);
      
      const targetPhase = phases.find(p => p.phaseId === phaseId);
      if (targetPhase) {
        console.log('✅ Target phase found:', targetPhase);
        
        // Step 3: Update the deadline
        console.log('\n📅 Step 3: Update phase deadline');
        const updateResponse = await fetch(`http://localhost:5000/api/projects/${projectId}/phases/${phaseId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deadline: '2025-06-15' })
        });
        
        console.log('Update status:', updateResponse.status);
        
        if (updateResponse.ok) {
          const updatedPhase = await updateResponse.json();
          console.log('✅ Update successful:', updatedPhase);
        } else {
          const error = await updateResponse.text();
          console.log('❌ Update failed:', error);
        }
        
        // Step 4: Verify the update
        console.log('\n📅 Step 4: Verify the update');
        const verifyResponse = await fetch(`http://localhost:5000/api/projects/${projectId}/phases`);
        
        if (verifyResponse.ok) {
          const updatedPhases = await verifyResponse.json();
          const verifiedPhase = updatedPhases.find(p => p.phaseId === phaseId);
          
          if (verifiedPhase) {
            console.log('✅ Update verified:', verifiedPhase);
            console.log(`📊 New deadline: ${verifiedPhase.deadline}`);
          } else {
            console.log('⚠️ Phase not found after update');
          }
        }
        
        // Step 5: Test updating to null deadline
        console.log('\n📅 Step 5: Test updating to null deadline');
        const nullUpdateResponse = await fetch(`http://localhost:5000/api/projects/${projectId}/phases/${phaseId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deadline: null })
        });
        
        console.log('Null update status:', nullUpdateResponse.status);
        
        if (nullUpdateResponse.ok) {
          const nullUpdatedPhase = await nullUpdateResponse.json();
          console.log('✅ Null update successful:', nullUpdatedPhase);
        } else {
          const error = await nullUpdateResponse.text();
          console.log('❌ Null update failed:', error);
        }
        
        // Step 6: Clean up - delete the phase
        console.log('\n📅 Step 6: Clean up - delete the phase');
        const deleteResponse = await fetch(`http://localhost:5000/api/projects/${projectId}/phases/${phaseId}`, {
          method: 'DELETE'
        });
        
        if (deleteResponse.ok) {
          console.log('✅ Cleanup successful');
        } else {
          console.log('⚠️ Cleanup failed');
        }
        
      } else {
        console.log('⚠️ Target phase not found in project phases');
      }
    }

    console.log('\n🎉 UPDATE operation test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testUpdateDebug().catch(console.error);
