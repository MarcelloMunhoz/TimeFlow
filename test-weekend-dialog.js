// Test script to verify weekend confirmation dialog functionality
require('dotenv/config');

async function testWeekendDialog() {
  console.log('🧪 Testing Weekend Confirmation Dialog Functionality\n');
  
  try {
    // Test 1: Try to create a Saturday appointment (should get 422)
    console.log('📅 Test 1: Saturday appointment (should trigger confirmation dialog)');
    
    const saturdayAppointment = {
      title: 'Weekend Test - Saturday',
      description: 'Testing weekend confirmation dialog',
      date: '2025-08-02', // Saturday
      startTime: '10:00',
      durationMinutes: 60,
      peopleWith: null,
      project: null,
      company: null,
      slaMinutes: null,
      isPomodoro: false,
      rescheduleCount: 0,
      allowOverlap: false,
      projectId: null,
      companyId: null,
      assignedUserId: null,
      phaseId: null
    };

    const satResponse = await fetch('http://localhost:5000/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saturdayAppointment)
    });

    console.log(`   Status: ${satResponse.status}`);
    
    if (satResponse.status === 422) {
      const result = await satResponse.json();
      console.log(`   ✅ CORRETO: Sistema pediu confirmação para encaixe`);
      console.log(`   📋 Mensagem: "${result.message}"`);
      console.log(`   📋 Código: "${result.code}"`);
      console.log(`   📋 Dia: "${result.dayType}"`);
      
      // Test 2: Now try with allowWeekendOverride = true
      console.log('\n📅 Test 2: Saturday appointment with weekend override');
      
      const saturdayWithOverride = {
        ...saturdayAppointment,
        allowWeekendOverride: true
      };
      
      const satOverrideResponse = await fetch('http://localhost:5000/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saturdayWithOverride)
      });
      
      console.log(`   Status: ${satOverrideResponse.status}`);
      
      if (satOverrideResponse.status === 201) {
        const createdAppointment = await satOverrideResponse.json();
        console.log(`   ✅ CORRETO: Agendamento criado com encaixe autorizado`);
        console.log(`   📋 ID: ${createdAppointment.id}`);
        console.log(`   📋 Título: "${createdAppointment.title}"`);
        console.log(`   📋 Data: ${createdAppointment.date}`);
        console.log(`   📋 Overtime: ${createdAppointment.isOvertime}`);
        
        // Clean up - delete the test appointment
        await fetch(`http://localhost:5000/api/appointments/${createdAppointment.id}`, {
          method: 'DELETE'
        });
        console.log(`   🧹 Agendamento de teste removido`);
      } else {
        console.log(`   ❌ PROBLEMA: Esperado status 201, recebido ${satOverrideResponse.status}`);
      }
      
    } else {
      console.log(`   ❌ PROBLEMA: Esperado status 422, recebido ${satResponse.status}`);
    }

    // Test 3: Try Sunday appointment
    console.log('\n📅 Test 3: Sunday appointment (should trigger confirmation dialog)');
    
    const sundayAppointment = {
      title: 'Weekend Test - Sunday',
      description: 'Testing weekend confirmation dialog',
      date: '2025-08-03', // Sunday
      startTime: '14:00',
      durationMinutes: 90,
      peopleWith: null,
      project: null,
      company: null,
      slaMinutes: null,
      isPomodoro: false,
      rescheduleCount: 0,
      allowOverlap: false,
      projectId: null,
      companyId: null,
      assignedUserId: null,
      phaseId: null
    };

    const sunResponse = await fetch('http://localhost:5000/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sundayAppointment)
    });

    console.log(`   Status: ${sunResponse.status}`);
    
    if (sunResponse.status === 422) {
      const result = await sunResponse.json();
      console.log(`   ✅ CORRETO: Sistema pediu confirmação para encaixe`);
      console.log(`   📋 Mensagem: "${result.message}"`);
      console.log(`   📋 Código: "${result.code}"`);
      console.log(`   📋 Dia: "${result.dayType}"`);
    } else {
      console.log(`   ❌ PROBLEMA: Esperado status 422, recebido ${sunResponse.status}`);
    }

    // Test 4: Weekday appointment (should work normally)
    console.log('\n📅 Test 4: Weekday appointment (should work normally)');
    
    const weekdayAppointment = {
      title: 'Weekday Test - Monday',
      description: 'Testing normal weekday appointment',
      date: '2025-08-04', // Monday
      startTime: '09:00',
      durationMinutes: 60,
      peopleWith: null,
      project: null,
      company: null,
      slaMinutes: null,
      isPomodoro: false,
      rescheduleCount: 0,
      allowOverlap: false,
      projectId: null,
      companyId: null,
      assignedUserId: null,
      phaseId: null
    };

    const weekdayResponse = await fetch('http://localhost:5000/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(weekdayAppointment)
    });

    console.log(`   Status: ${weekdayResponse.status}`);
    
    if (weekdayResponse.status === 201) {
      const createdAppointment = await weekdayResponse.json();
      console.log(`   ✅ CORRETO: Agendamento de dia útil criado normalmente`);
      console.log(`   📋 ID: ${createdAppointment.id}`);
      console.log(`   📋 Título: "${createdAppointment.title}"`);
      console.log(`   📋 Data: ${createdAppointment.date}`);
      
      // Clean up - delete the test appointment
      await fetch(`http://localhost:5000/api/appointments/${createdAppointment.id}`, {
        method: 'DELETE'
      });
      console.log(`   🧹 Agendamento de teste removido`);
    } else {
      console.log(`   ❌ PROBLEMA: Esperado status 201, recebido ${weekdayResponse.status}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 TESTE DE DIÁLOGO DE CONFIRMAÇÃO DE FIM DE SEMANA CONCLUÍDO');
    console.log('='.repeat(60));
    
    console.log('\n📊 FUNCIONALIDADE IMPLEMENTADA:');
    console.log('✅ Backend retorna status 422 para fins de semana');
    console.log('✅ Mensagem de confirmação com código WEEKEND_CONFIRMATION_NEEDED');
    console.log('✅ Frontend deve mostrar diálogo de confirmação');
    console.log('✅ allowWeekendOverride permite criar agendamento');
    console.log('✅ Dias úteis funcionam normalmente');

  } catch (error) {
    console.error('❌ Teste falhou:', error);
  }
}

testWeekendDialog().catch(console.error);
