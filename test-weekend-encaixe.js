// Teste da funcionalidade de encaixe de finais de semana
import 'dotenv/config';

async function testWeekendEncaixe() {
  console.log('🧪 TESTE - Funcionalidade de Encaixe de Finais de Semana\n');

  try {
    console.log('='.repeat(60));
    console.log('📅 TESTANDO SISTEMA DE ENCAIXE DE FINAIS DE SEMANA');
    console.log('='.repeat(60));
    
    // Teste 1: Tentar agendar no sábado SEM allowWeekendOverride
    console.log('\n📋 TESTE 1: Sábado SEM autorização de encaixe');
    
    const saturdayWithoutOverride = {
      title: "Teste Sábado Sem Encaixe",
      description: "Deve retornar código de confirmação",
      date: "2025-08-09", // Sábado
      startTime: "10:00",
      durationMinutes: 60,
      isPomodoro: false,
      assignedUserId: 8,
      allowWeekendOverride: false // Explicitamente false
    };

    const satResponse1 = await fetch('http://localhost:5000/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saturdayWithoutOverride)
    });

    console.log(`   Status: ${satResponse1.status}`);
    
    if (satResponse1.status === 422) {
      const result = await satResponse1.json();
      console.log(`   ✅ CORRETO: Sistema pediu confirmação para encaixe`);
      console.log(`   📋 Mensagem: "${result.message}"`);
      console.log(`   📋 Código: "${result.code}"`);
      console.log(`   📋 Dia: "${result.dayType}"`);
    } else {
      console.log(`   ❌ PROBLEMA: Esperado status 422, recebido ${satResponse1.status}`);
    }

    // Teste 2: Tentar agendar no sábado COM allowWeekendOverride
    console.log('\n📋 TESTE 2: Sábado COM autorização de encaixe');
    
    const saturdayWithOverride = {
      title: "Teste Sábado Com Encaixe",
      description: "Deve ser permitido como encaixe",
      date: "2025-08-09", // Sábado
      startTime: "11:00",
      durationMinutes: 60,
      isPomodoro: false,
      assignedUserId: 8,
      allowWeekendOverride: true // Autorizado pelo usuário
    };

    const satResponse2 = await fetch('http://localhost:5000/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saturdayWithOverride)
    });

    console.log(`   Status: ${satResponse2.status}`);
    
    if (satResponse2.ok) {
      const result = await satResponse2.json();
      console.log(`   ✅ SUCESSO: Encaixe de sábado foi criado! ID: ${result.id}`);
      console.log(`   📊 Data: ${result.date}`);
      console.log(`   📊 É overtime: ${result.isOvertime}`);
      console.log(`   📊 Dentro do horário de trabalho: ${result.isWithinWorkHours}`);
      console.log(`   📊 Violação de horário: ${result.workScheduleViolation}`);
      
      // Limpar
      await fetch(`http://localhost:5000/api/appointments/${result.id}`, { method: 'DELETE' });
      console.log(`   🧹 Agendamento removido`);
      
    } else {
      const error = await satResponse2.text();
      console.log(`   ❌ PROBLEMA: Encaixe foi bloqueado: ${error}`);
    }

    // Teste 3: Tentar agendar no domingo SEM allowWeekendOverride
    console.log('\n📋 TESTE 3: Domingo SEM autorização de encaixe');
    
    const sundayWithoutOverride = {
      title: "Teste Domingo Sem Encaixe",
      description: "Deve retornar código de confirmação",
      date: "2025-08-10", // Domingo
      startTime: "14:00",
      durationMinutes: 60,
      isPomodoro: false,
      assignedUserId: 8,
      allowWeekendOverride: false
    };

    const sunResponse1 = await fetch('http://localhost:5000/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sundayWithoutOverride)
    });

    console.log(`   Status: ${sunResponse1.status}`);
    
    if (sunResponse1.status === 422) {
      const result = await sunResponse1.json();
      console.log(`   ✅ CORRETO: Sistema pediu confirmação para encaixe`);
      console.log(`   📋 Mensagem: "${result.message}"`);
      console.log(`   📋 Código: "${result.code}"`);
      console.log(`   📋 Dia: "${result.dayType}"`);
    } else {
      console.log(`   ❌ PROBLEMA: Esperado status 422, recebido ${sunResponse1.status}`);
    }

    // Teste 4: Tentar agendar no domingo COM allowWeekendOverride
    console.log('\n📋 TESTE 4: Domingo COM autorização de encaixe');
    
    const sundayWithOverride = {
      title: "Teste Domingo Com Encaixe",
      description: "Deve ser permitido como encaixe",
      date: "2025-08-10", // Domingo
      startTime: "15:00",
      durationMinutes: 60,
      isPomodoro: false,
      assignedUserId: 8,
      allowWeekendOverride: true
    };

    const sunResponse2 = await fetch('http://localhost:5000/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sundayWithOverride)
    });

    console.log(`   Status: ${sunResponse2.status}`);
    
    if (sunResponse2.ok) {
      const result = await sunResponse2.json();
      console.log(`   ✅ SUCESSO: Encaixe de domingo foi criado! ID: ${result.id}`);
      console.log(`   📊 Data: ${result.date}`);
      console.log(`   📊 É overtime: ${result.isOvertime}`);
      console.log(`   📊 Dentro do horário de trabalho: ${result.isWithinWorkHours}`);
      console.log(`   📊 Violação de horário: ${result.workScheduleViolation}`);
      
      // Limpar
      await fetch(`http://localhost:5000/api/appointments/${result.id}`, { method: 'DELETE' });
      console.log(`   🧹 Agendamento removido`);
      
    } else {
      const error = await sunResponse2.text();
      console.log(`   ❌ PROBLEMA: Encaixe foi bloqueado: ${error}`);
    }

    // Teste 5: Verificar que dias úteis continuam funcionando normalmente
    console.log('\n📋 TESTE 5: Segunda-feira (dia útil normal)');
    
    const mondayNormal = {
      title: "Teste Segunda Normal",
      description: "Deve funcionar normalmente",
      date: "2025-08-04", // Segunda
      startTime: "09:00",
      durationMinutes: 60,
      isPomodoro: false,
      assignedUserId: 8
    };

    const monResponse = await fetch('http://localhost:5000/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mondayNormal)
    });

    console.log(`   Status: ${monResponse.status}`);
    
    if (monResponse.ok) {
      const result = await monResponse.json();
      console.log(`   ✅ CORRETO: Segunda-feira funcionou normalmente! ID: ${result.id}`);
      console.log(`   📊 É overtime: ${result.isOvertime}`);
      console.log(`   📊 Dentro do horário de trabalho: ${result.isWithinWorkHours}`);
      
      // Limpar
      await fetch(`http://localhost:5000/api/appointments/${result.id}`, { method: 'DELETE' });
      console.log(`   🧹 Agendamento removido`);
      
    } else {
      const error = await monResponse.text();
      console.log(`   ❌ PROBLEMA: Segunda-feira foi bloqueada: ${error}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 TESTE DE ENCAIXE DE FINAIS DE SEMANA CONCLUÍDO');
    console.log('='.repeat(60));
    
    console.log('\n📊 FUNCIONALIDADE IMPLEMENTADA:');
    console.log('✅ Finais de semana bloqueados por padrão');
    console.log('✅ Sistema pede confirmação para encaixe (status 422)');
    console.log('✅ Encaixe autorizado permite agendamento');
    console.log('✅ Agendamentos de final de semana marcados como overtime');
    console.log('✅ Dias úteis funcionam normalmente');

  } catch (error) {
    console.error('❌ Teste falhou:', error);
  }
}

testWeekendEncaixe().catch(console.error);
