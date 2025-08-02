// Simple test to check API endpoints
import 'dotenv/config';

async function testSimpleAPI() {
  console.log('🧪 Testing Simple API calls...\n');

  try {
    // Test 1: Get projects
    console.log('📅 Test 1: GET /api/projects');
    const projectsResponse = await fetch('http://localhost:5000/api/projects');
    console.log('Status:', projectsResponse.status);
    
    if (projectsResponse.ok) {
      const projects = await projectsResponse.json();
      console.log('✅ Projects:', projects.length);
      
      if (projects.length > 0) {
        const projectId = projects[0].id;
        console.log('Using project ID:', projectId);
        
        // Test 2: Get project phases
        console.log('\n📅 Test 2: GET /api/projects/' + projectId + '/phases');
        const phasesResponse = await fetch(`http://localhost:5000/api/projects/${projectId}/phases`);
        console.log('Status:', phasesResponse.status);
        
        if (phasesResponse.ok) {
          const phases = await phasesResponse.json();
          console.log('✅ Project phases:', phases.length);
          
          // Test 3: Add a phase to project
          console.log('\n📅 Test 3: POST /api/projects/' + projectId + '/phases');
          const addPhaseResponse = await fetch(`http://localhost:5000/api/projects/${projectId}/phases`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phaseId: 1, deadline: '2024-12-31' })
          });
          console.log('Status:', addPhaseResponse.status);
          
          if (addPhaseResponse.ok) {
            const addedPhase = await addPhaseResponse.json();
            console.log('✅ Phase added:', addedPhase);
            
            // Test 4: Update phase deadline
            console.log('\n📅 Test 4: PATCH /api/projects/' + projectId + '/phases/1');
            const updateResponse = await fetch(`http://localhost:5000/api/projects/${projectId}/phases/1`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ deadline: '2025-01-15' })
            });
            console.log('Status:', updateResponse.status);
            
            if (updateResponse.ok) {
              const updatedPhase = await updateResponse.json();
              console.log('✅ Phase updated:', updatedPhase);
            } else {
              const error = await updateResponse.text();
              console.log('❌ Update error:', error);
            }
            
            // Test 5: Delete phase from project
            console.log('\n📅 Test 5: DELETE /api/projects/' + projectId + '/phases/1');
            const deleteResponse = await fetch(`http://localhost:5000/api/projects/${projectId}/phases/1`, {
              method: 'DELETE'
            });
            console.log('Status:', deleteResponse.status);
            
            if (deleteResponse.ok) {
              const deleteResult = await deleteResponse.json();
              console.log('✅ Phase deleted:', deleteResult);
            } else {
              const error = await deleteResponse.text();
              console.log('❌ Delete error:', error);
            }
            
          } else {
            const error = await addPhaseResponse.text();
            console.log('❌ Add phase error:', error);
          }
          
        } else {
          const error = await phasesResponse.text();
          console.log('❌ Get phases error:', error);
        }
      }
    } else {
      console.log('❌ Projects error:', projectsResponse.status);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSimpleAPI().catch(console.error);
