// Teste final para verificar bloqueio de finais de semana
import 'dotenv/config';

async function testWeekendBlockingFinal() {
  console.log('🧪 TESTE FINAL - BLOQUEIO DE FINAIS DE SEMANA\n');

  try {
    console.log('='.repeat(60));
    console.log('📅 TESTANDO CADA DIA DA SEMANA');
    console.log('='.repeat(60));
    
    const testDates = [
      { date: '2024-08-05', expected: 'SEGUNDA', shouldWork: true },   // Segunda
      { date: '2024-08-06', expected: 'TERÇA', shouldWork: true },     // Terça  
      { date: '2024-08-07', expected: 'QUARTA', shouldWork: true },    // Quarta
      { date: '2024-08-08', expected: 'QUINTA', shouldWork: true },    // Quinta
      { date: '2024-08-09', expected: 'SEXTA', shouldWork: true },     // Sexta
      { date: '2024-08-10', expected: 'SÁBADO', shouldWork: false },   // Sábado
      { date: '2024-08-11', expected: 'DOMINGO', shouldWork: false },  // Domingo
    ];

    for (const test of testDates) {
      console.log(`\n📋 Testando ${test.expected} (${test.date})`);
      
      const appointment = {
        title: `Teste ${test.expected}`,
        description: `Testando agendamento em ${test.expected}`,
        date: test.date,
        startTime: "10:00",
        durationMinutes: 60,
        isPomodoro: false,
        assignedUserId: 8
      };

      try {
        const response = await fetch('http://localhost:5000/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(appointment)
        });

        if (response.ok) {
          const result = await response.json();
          
          if (test.shouldWork) {
            console.log(`✅ ${test.expected}: Agendamento criado corretamente (ID: ${result.id})`);
            // Limpar
            await fetch(`http://localhost:5000/api/appointments/${result.id}`, { method: 'DELETE' });
          } else {
            console.log(`❌ PROBLEMA: ${test.expected} foi agendado mas deveria ser BLOQUEADO! (ID: ${result.id})`);
            // Limpar
            await fetch(`http://localhost:5000/api/appointments/${result.id}`, { method: 'DELETE' });
          }
          
        } else {
          const error = await response.text();
          
          if (test.shouldWork) {
            console.log(`❌ PROBLEMA: ${test.expected} foi bloqueado mas deveria ser PERMITIDO!`);
            console.log(`   Erro: ${error}`);
          } else {
            console.log(`✅ ${test.expected}: Corretamente BLOQUEADO`);
            console.log(`   Mensagem: ${error}`);
          }
        }
        
      } catch (err) {
        console.log(`❌ Erro no teste ${test.expected}:`, err.message);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 TESTE DE AGENDAMENTO RECORRENTE');
    console.log('='.repeat(60));
    
    // Teste recorrente começando na sexta-feira
    console.log('\n📋 Criando agendamento recorrente diário começando na SEXTA-FEIRA');
    
    const recurringAppointment = {
      title: "Teste Recorrente Final",
      description: "Deve pular sábado e domingo",
      date: "2024-08-09", // Sexta-feira
      startTime: "14:00",
      durationMinutes: 30,
      isRecurring: true,
      recurrencePattern: "daily",
      recurrenceInterval: 1,
      recurrenceEndCount: 5, // 5 dias: Sex, Sab, Dom, Seg, Ter
      isPomodoro: false,
      assignedUserId: 8
    };

    const recurringResponse = await fetch('http://localhost:5000/api/appointments/recurring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recurringAppointment)
    });

    if (recurringResponse.ok) {
      const result = await recurringResponse.json();
      console.log(`✅ Agendamento recorrente criado: ${result.instances.length} instâncias`);
      
      console.log('\n📊 Instâncias criadas:');
      result.instances.forEach((instance, index) => {
        const date = new Date(instance.date);
        const dayOfWeek = date.getDay();
        const dayName = dayOfWeek === 0 ? 'DOMINGO' : dayOfWeek === 1 ? 'SEGUNDA' : dayOfWeek === 2 ? 'TERÇA' : dayOfWeek === 3 ? 'QUARTA' : dayOfWeek === 4 ? 'QUINTA' : dayOfWeek === 5 ? 'SEXTA' : dayOfWeek === 6 ? 'SÁBADO' : 'DESCONHECIDO';
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        
        console.log(`   ${index + 1}. ${instance.date} (${dayName}) ${isWeekend ? '❌ FINAL DE SEMANA!' : '✅ DIA ÚTIL'}`);
      });
      
      // Verificar se há finais de semana
      const weekendInstances = result.instances.filter(instance => {
        const date = new Date(instance.date);
        const dayOfWeek = date.getDay();
        return dayOfWeek === 0 || dayOfWeek === 6;
      });
      
      if (weekendInstances.length === 0) {
        console.log('\n✅ SUCESSO: Nenhum agendamento de final de semana foi criado!');
      } else {
        console.log(`\n❌ PROBLEMA: ${weekendInstances.length} agendamentos de final de semana foram criados:`);
        weekendInstances.forEach(instance => {
          const date = new Date(instance.date);
          const dayName = date.getDay() === 0 ? 'DOMINGO' : 'SÁBADO';
          console.log(`   - ${instance.date} (${dayName})`);
        });
      }
      
      // Limpar
      console.log('\n🧹 Limpando agendamentos...');
      await fetch(`http://localhost:5000/api/appointments/${result.template.id}`, { method: 'DELETE' });
      for (const instance of result.instances) {
        await fetch(`http://localhost:5000/api/appointments/${instance.id}`, { method: 'DELETE' });
      }
      console.log('✅ Limpeza concluída');
      
    } else {
      const error = await recurringResponse.text();
      console.log(`❌ Falha no agendamento recorrente: ${error}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 TESTE FINAL CONCLUÍDO');
    console.log('='.repeat(60));
    
    console.log('\n📋 RESUMO DO QUE DEVE FUNCIONAR:');
    console.log('✅ Segunda a Sexta: PERMITIDOS');
    console.log('🚫 Sábado e Domingo: BLOQUEADOS');
    console.log('✅ Agendamentos recorrentes: Devem pular finais de semana');
    console.log('✅ Agendamentos após 18h: Marcados como "encaixe/overtime"');

  } catch (error) {
    console.error('❌ Teste falhou:', error);
  }
}

testWeekendBlockingFinal().catch(console.error);
