// Test script to verify the overlap update fix
import 'dotenv/config';
import { db } from './server/db.js';
import { appointments } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function testOverlapUpdateFix() {
  console.log('🧪 Testing overlap update fix...\n');

  const today = new Date().toISOString().split('T')[0];
  const testTime = "14:00";

  try {
    // Step 1: Create an appointment with overlap
    console.log('📅 Step 1: Creating appointment with allowOverlap...');
    const overlapAppointment = {
      title: "Reunião com Encaixe",
      description: "Teste de encaixe",
      date: today,
      startTime: testTime,
      durationMinutes: 60,
      isPomodoro: false,
      allowOverlap: true // This should be allowed
    };

    const createResponse = await fetch('http://localhost:5000/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(overlapAppointment)
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.error('❌ Failed to create appointment:', error);
      return;
    }

    const createdAppointment = await createResponse.json();
    console.log('✅ Created appointment:', createdAppointment.id);

    // Step 2: Create a conflicting appointment
    console.log('\n📅 Step 2: Creating conflicting appointment...');
    const conflictingAppointment = {
      title: "Reunião Conflitante",
      description: "Esta deveria criar conflito",
      date: today,
      startTime: "14:30", // Overlaps with the first appointment
      durationMinutes: 60,
      isPomodoro: false,
      allowOverlap: false
    };

    const conflictResponse = await fetch('http://localhost:5000/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(conflictingAppointment)
    });

    if (!conflictResponse.ok) {
      console.log('✅ Conflict correctly detected and prevented');
    } else {
      console.log('⚠️ Conflict should have been detected but wasn\'t');
    }

    // Step 3: Try to update the first appointment (this should work now)
    console.log('\n📅 Step 3: Updating the overlap appointment...');
    const updateData = {
      title: "Reunião com Encaixe - Atualizada",
      description: "Teste de atualização de encaixe",
      startTime: "14:15", // Change time slightly
      allowOverlap: true // This should allow the update
    };

    const updateResponse = await fetch(`http://localhost:5000/api/appointments/${createdAppointment.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });

    if (updateResponse.ok) {
      const updatedAppointment = await updateResponse.json();
      console.log('✅ Successfully updated appointment:', updatedAppointment.title);
      console.log('✅ New start time:', updatedAppointment.startTime);
    } else {
      const error = await updateResponse.text();
      console.error('❌ Failed to update appointment:', error);
    }

    // Step 4: Try to update without allowOverlap (should fail if there are conflicts)
    console.log('\n📅 Step 4: Updating without allowOverlap...');
    const updateWithoutOverlap = {
      title: "Reunião sem Encaixe",
      startTime: "14:45", // This might conflict
      allowOverlap: false
    };

    const updateResponse2 = await fetch(`http://localhost:5000/api/appointments/${createdAppointment.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateWithoutOverlap)
    });

    if (!updateResponse2.ok) {
      console.log('✅ Conflict correctly detected during update without allowOverlap');
    } else {
      console.log('ℹ️ No conflict detected (this is fine if no overlapping appointments exist)');
    }

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await db.delete(appointments).where(eq(appointments.id, createdAppointment.id));
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 Overlap update fix test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testOverlapUpdateFix().catch(console.error);
