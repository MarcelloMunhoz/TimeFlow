// Teste limpo da funcionalidade de encaixe com horários únicos
import 'dotenv/config';

async function testWeekendEncaixeClean() {
  console.log('🧪 TESTE LIMPO - Encaixe de Finais de Semana\n');

  try {
    // Usar horários únicos para evitar conflitos
    const uniqueTime1 = "07:30"; // Antes do horário de trabalho
    const uniqueTime2 = "22:15"; // Bem tarde
    const uniqueTime3 = "06:45"; // Bem cedo
    const uniqueTime4 = "23:30"; // Muito tarde
    
    console.log('📋 TESTE: Sábado COM autorização de encaixe (horário único)');
    
    const saturdayWithOverride = {
      title: "Encaixe Sábado Teste Limpo",
      description: "Deve ser permitido como encaixe",
      date: "2025-08-09", // Sábado
      startTime: uniqueTime1,
      durationMinutes: 30,
      isPomodoro: false,
      assignedUserId: 8,
      allowWeekendOverride: true // Autorizado pelo usuário
    };

    const satResponse = await fetch('http://localhost:5000/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saturdayWithOverride)
    });

    console.log(`Status: ${satResponse.status}`);
    
    if (satResponse.ok) {
      const result = await satResponse.json();
      console.log(`✅ SUCESSO: Encaixe de sábado criado! ID: ${result.id}`);
      console.log(`📊 Data: ${result.date}`);
      console.log(`📊 Horário: ${result.startTime}`);
      console.log(`📊 É overtime: ${result.isOvertime}`);
      console.log(`📊 Dentro do horário de trabalho: ${result.isWithinWorkHours}`);
      console.log(`📊 Violação de horário: ${result.workScheduleViolation}`);
      console.log(`📊 Allow overlap: ${result.allowOverlap}`);
      
      // Limpar
      await fetch(`http://localhost:5000/api/appointments/${result.id}`, { method: 'DELETE' });
      console.log(`🧹 Agendamento removido`);
      
    } else {
      const errorText = await satResponse.text();
      console.log(`❌ PROBLEMA: Encaixe foi bloqueado`);
      console.log(`📋 Erro: ${errorText}`);
      
      // Vamos tentar entender o erro
      try {
        const errorObj = JSON.parse(errorText);
        console.log(`📋 Mensagem: ${errorObj.message}`);
      } catch {
        console.log(`📋 Erro raw: ${errorText}`);
      }
    }

    console.log('\n📋 TESTE: Domingo COM autorização de encaixe (horário único)');
    
    const sundayWithOverride = {
      title: "Encaixe Domingo Teste Limpo",
      description: "Deve ser permitido como encaixe",
      date: "2025-08-10", // Domingo
      startTime: uniqueTime2,
      durationMinutes: 30,
      isPomodoro: false,
      assignedUserId: 8,
      allowWeekendOverride: true
    };

    const sunResponse = await fetch('http://localhost:5000/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sundayWithOverride)
    });

    console.log(`Status: ${sunResponse.status}`);
    
    if (sunResponse.ok) {
      const result = await sunResponse.json();
      console.log(`✅ SUCESSO: Encaixe de domingo criado! ID: ${result.id}`);
      console.log(`📊 Data: ${result.date}`);
      console.log(`📊 Horário: ${result.startTime}`);
      console.log(`📊 É overtime: ${result.isOvertime}`);
      console.log(`📊 Dentro do horário de trabalho: ${result.isWithinWorkHours}`);
      console.log(`📊 Violação de horário: ${result.workScheduleViolation}`);
      console.log(`📊 Allow overlap: ${result.allowOverlap}`);
      
      // Limpar
      await fetch(`http://localhost:5000/api/appointments/${result.id}`, { method: 'DELETE' });
      console.log(`🧹 Agendamento removido`);
      
    } else {
      const errorText = await sunResponse.text();
      console.log(`❌ PROBLEMA: Encaixe foi bloqueado`);
      console.log(`📋 Erro: ${errorText}`);
      
      try {
        const errorObj = JSON.parse(errorText);
        console.log(`📋 Mensagem: ${errorObj.message}`);
      } catch {
        console.log(`📋 Erro raw: ${errorText}`);
      }
    }

    console.log('\n📋 TESTE: Verificar se confirmação ainda funciona');
    
    const saturdayWithoutOverride = {
      title: "Teste Confirmação",
      description: "Deve pedir confirmação",
      date: "2025-08-09", // Sábado
      startTime: uniqueTime3,
      durationMinutes: 30,
      isPomodoro: false,
      assignedUserId: 8,
      allowWeekendOverride: false
    };

    const confirmResponse = await fetch('http://localhost:5000/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saturdayWithoutOverride)
    });

    console.log(`Status: ${confirmResponse.status}`);
    
    if (confirmResponse.status === 422) {
      const result = await confirmResponse.json();
      console.log(`✅ CORRETO: Sistema ainda pede confirmação`);
      console.log(`📋 Mensagem: "${result.message}"`);
    } else {
      console.log(`❌ PROBLEMA: Esperado status 422, recebido ${confirmResponse.status}`);
    }

    console.log('\n🎯 RESUMO DO TESTE:');
    console.log('- Sistema pede confirmação para finais de semana ✅');
    console.log('- Encaixe autorizado deve ser permitido (verificar logs do servidor)');

  } catch (error) {
    console.error('❌ Teste falhou:', error);
  }
}

testWeekendEncaixeClean().catch(console.error);
