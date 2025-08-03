// Test script to debug subphase update issue
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testSubphaseUpdate() {
  try {
    console.log('🔍 Testing subphase update functionality...');
    
    // First, let's get all phases to find one with subphases
    console.log('📋 Fetching phases...');
    const phasesResponse = await fetch(`${BASE_URL}/api/phases`);
    const phases = await phasesResponse.json();
    console.log('Phases found:', phases.length);
    
    if (phases.length === 0) {
      console.log('❌ No phases found');
      return;
    }
    
    // Get subphases for the first phase
    const firstPhase = phases[0];
    console.log(`📋 Fetching subphases for phase: ${firstPhase.name} (ID: ${firstPhase.id})`);
    
    const subphasesResponse = await fetch(`${BASE_URL}/api/phases/${firstPhase.id}/subphases`);
    const subphases = await subphasesResponse.json();
    console.log('Subphases found:', subphases.length);
    
    if (subphases.length === 0) {
      console.log('❌ No subphases found for this phase');
      
      // Create a test subphase first
      console.log('🔧 Creating a test subphase...');
      const createResponse = await fetch(`${BASE_URL}/api/subphases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phaseId: firstPhase.id,
          name: 'Test Subphase',
          description: 'This is a test subphase',
          color: '#8B5CF6',
          orderIndex: 1,
          estimatedDurationDays: 5,
          isRequired: true
        })
      });
      
      if (!createResponse.ok) {
        const error = await createResponse.text();
        console.log('❌ Failed to create test subphase:', error);
        return;
      }
      
      const newSubphase = await createResponse.json();
      console.log('✅ Test subphase created:', newSubphase);
      subphases.push(newSubphase);
    }
    
    // Now try to update the first subphase
    const subphaseToUpdate = subphases[0];
    console.log(`🔧 Attempting to update subphase: ${subphaseToUpdate.name} (ID: ${subphaseToUpdate.id})`);
    
    const updateData = {
      name: 'Updated Test Subphase Name',
      description: 'Updated description',
      color: '#FF5733',
      orderIndex: subphaseToUpdate.orderIndex,
      estimatedDurationDays: 7,
      isRequired: true
    };
    
    console.log('📤 Update data:', JSON.stringify(updateData, null, 2));
    
    const updateResponse = await fetch(`${BASE_URL}/api/subphases/${subphaseToUpdate.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData)
    });
    
    console.log('📥 Response status:', updateResponse.status);
    console.log('📥 Response headers:', Object.fromEntries(updateResponse.headers.entries()));
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.log('❌ Update failed with error:', errorText);
      
      // Try to parse as JSON if possible
      try {
        const errorJson = JSON.parse(errorText);
        console.log('❌ Parsed error:', JSON.stringify(errorJson, null, 2));
      } catch (e) {
        console.log('❌ Raw error text:', errorText);
      }
    } else {
      const updatedSubphase = await updateResponse.json();
      console.log('✅ Subphase updated successfully:', updatedSubphase);
    }
    
  } catch (error) {
    console.error('💥 Test failed with exception:', error);
  }
}

// Run the test
testSubphaseUpdate();
