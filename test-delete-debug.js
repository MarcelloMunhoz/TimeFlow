// Debug test for delete operation
import 'dotenv/config';

async function testDeleteDebug() {
  console.log('🧪 Testing DELETE operation debug...\n');

  try {
    const projectId = 20;
    const phaseId = 1;
    
    // Step 1: Check if project phase exists
    console.log('📅 Step 1: Check if project phase exists');
    const phasesResponse = await fetch(`http://localhost:5000/api/projects/${projectId}/phases`);
    
    if (phasesResponse.ok) {
      const phases = await phasesResponse.json();
      console.log('Project phases:', phases);
      
      const targetPhase = phases.find(p => p.phaseId === phaseId);
      if (targetPhase) {
        console.log('✅ Target phase found:', targetPhase);
        
        // Step 2: Try to delete
        console.log('\n📅 Step 2: Attempting to delete');
        const deleteResponse = await fetch(`http://localhost:5000/api/projects/${projectId}/phases/${phaseId}`, {
          method: 'DELETE'
        });
        
        console.log('Delete status:', deleteResponse.status);
        
        if (deleteResponse.ok) {
          const result = await deleteResponse.json();
          console.log('✅ Delete successful:', result);
        } else {
          const error = await deleteResponse.text();
          console.log('❌ Delete failed:', error);
        }
        
        // Step 3: Verify deletion
        console.log('\n📅 Step 3: Verify deletion');
        const verifyResponse = await fetch(`http://localhost:5000/api/projects/${projectId}/phases`);
        
        if (verifyResponse.ok) {
          const updatedPhases = await verifyResponse.json();
          console.log('Updated project phases:', updatedPhases);
          
          const stillExists = updatedPhases.find(p => p.phaseId === phaseId);
          if (stillExists) {
            console.log('⚠️ Phase still exists after delete attempt');
          } else {
            console.log('✅ Phase successfully removed');
          }
        }
        
      } else {
        console.log('⚠️ Target phase not found, adding it first');
        
        // Add the phase first
        const addResponse = await fetch(`http://localhost:5000/api/projects/${projectId}/phases`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phaseId: phaseId, deadline: '2024-12-31' })
        });
        
        if (addResponse.ok) {
          console.log('✅ Phase added, now trying to delete');
          
          const deleteResponse = await fetch(`http://localhost:5000/api/projects/${projectId}/phases/${phaseId}`, {
            method: 'DELETE'
          });
          
          console.log('Delete status:', deleteResponse.status);
          
          if (deleteResponse.ok) {
            const result = await deleteResponse.json();
            console.log('✅ Delete successful:', result);
          } else {
            const error = await deleteResponse.text();
            console.log('❌ Delete failed:', error);
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testDeleteDebug().catch(console.error);
