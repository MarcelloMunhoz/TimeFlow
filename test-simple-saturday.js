// Teste simples para verificar se sábado está sendo agendado
import 'dotenv/config';

async function testSimpleSaturday() {
  console.log('🔍 TESTE SIMPLES - Verificando se sábado está sendo agendado\n');

  try {
    // Teste com uma data de sábado que não tenha conflitos
    const saturdayTest = {
      title: "Teste Sábado Simples",
      description: "Este NÃO deveria ser criado",
      date: "2024-08-24", // Sábado futuro
      startTime: "11:00",
      durationMinutes: 30,
      isPomodoro: false,
      assignedUserId: 8
    };

    console.log('📋 Tentando agendar no SÁBADO (2024-08-24) às 11:00');
    console.log('   Se for criado = PROBLEMA');
    console.log('   Se for bloqueado = CORRETO');

    const response = await fetch('http://localhost:5000/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saturdayTest)
    });

    console.log(`\nStatus da resposta: ${response.status}`);

    if (response.ok) {
      const result = await response.json();
      console.log('❌ PROBLEMA CONFIRMADO: Sábado foi agendado!');
      console.log(`   ID: ${result.id}`);
      console.log(`   Data: ${result.date}`);
      console.log(`   Título: ${result.title}`);
      
      // Limpar
      await fetch(`http://localhost:5000/api/appointments/${result.id}`, { method: 'DELETE' });
      console.log('🧹 Agendamento removido');
      
      return false; // Problema encontrado
      
    } else {
      const error = await response.text();
      console.log('✅ CORRETO: Sábado foi bloqueado');
      console.log(`   Erro: ${error}`);
      
      return true; // Funcionando corretamente
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error);
    return false;
  }
}

// Executar teste
testSimpleSaturday().then(success => {
  if (success) {
    console.log('\n🎉 SÁBADO ESTÁ SENDO BLOQUEADO CORRETAMENTE!');
  } else {
    console.log('\n💥 PROBLEMA: SÁBADO AINDA ESTÁ SENDO AGENDADO!');
  }
}).catch(console.error);
