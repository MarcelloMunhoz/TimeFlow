// Test script to verify the phases API
import 'dotenv/config';

async function testPhasesAPI() {
  console.log('🧪 Testing Phases API...\n');

  try {
    // Test 1: Get all phases
    console.log('📅 Step 1: Testing GET /api/phases...');
    
    const response = await fetch('http://localhost:5000/api/phases');
    
    if (response.ok) {
      const phases = await response.json();
      console.log('✅ GET /api/phases working correctly');
      console.log('📊 Found phases:', phases.length);
      phases.forEach(phase => {
        console.log(`  - ${phase.name} (${phase.color})`);
      });
    } else {
      const error = await response.text();
      console.error('❌ GET /api/phases failed:', error);
      return;
    }

    // Test 2: Create a new phase
    console.log('\n📅 Step 2: Testing POST /api/phases...');
    
    const newPhase = {
      name: "Test Phase",
      description: "A test phase for API validation",
      color: "#FF5733"
    };

    const createResponse = await fetch('http://localhost:5000/api/phases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPhase)
    });

    if (createResponse.ok) {
      const createdPhase = await createResponse.json();
      console.log('✅ POST /api/phases working correctly');
      console.log('📊 Created phase:', createdPhase.name, 'with ID:', createdPhase.id);

      // Test 3: Update the phase
      console.log('\n📅 Step 3: Testing PATCH /api/phases/:id...');
      
      const updateData = {
        name: "Updated Test Phase",
        description: "Updated description"
      };

      const updateResponse = await fetch(`http://localhost:5000/api/phases/${createdPhase.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (updateResponse.ok) {
        const updatedPhase = await updateResponse.json();
        console.log('✅ PATCH /api/phases/:id working correctly');
        console.log('📊 Updated phase name:', updatedPhase.name);
      } else {
        const error = await updateResponse.text();
        console.error('❌ PATCH /api/phases/:id failed:', error);
      }

      // Test 4: Delete the phase
      console.log('\n📅 Step 4: Testing DELETE /api/phases/:id...');
      
      const deleteResponse = await fetch(`http://localhost:5000/api/phases/${createdPhase.id}`, {
        method: 'DELETE'
      });

      if (deleteResponse.ok) {
        console.log('✅ DELETE /api/phases/:id working correctly');
      } else {
        const error = await deleteResponse.text();
        console.error('❌ DELETE /api/phases/:id failed:', error);
      }

    } else {
      const error = await createResponse.text();
      console.error('❌ POST /api/phases failed:', error);
    }

    console.log('\n🎉 Phases API test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testPhasesAPI().catch(console.error);
