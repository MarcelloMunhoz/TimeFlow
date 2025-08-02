// TESTE REAL - Vamos ver o que realmente está acontecendo
import 'dotenv/config';

async function testRealWeekend() {
  console.log('🔍 TESTE REAL - Verificando o que realmente está acontecendo\n');

  try {
    // Primeiro, vamos testar um agendamento individual no SÁBADO
    console.log('📋 TESTE 1: Tentando agendar no SÁBADO (2024-08-10)');
    
    const saturdayTest = {
      title: "Teste Sábado Real",
      description: "Este deveria ser BLOQUEADO",
      date: "2024-08-10", // Sábado
      startTime: "10:00",
      durationMinutes: 60,
      isPomodoro: false,
      assignedUserId: 8
    };

    const satResponse = await fetch('http://localhost:5000/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saturdayTest)
    });

    console.log(`Status: ${satResponse.status}`);
    
    if (satResponse.ok) {
      const result = await satResponse.json();
      console.log(`❌ PROBLEMA CONFIRMADO: Sábado foi agendado! ID: ${result.id}`);
      console.log(`   Data: ${result.date}`);
      
      // Limpar
      await fetch(`http://localhost:5000/api/appointments/${result.id}`, { method: 'DELETE' });
      
    } else {
      const error = await satResponse.text();
      console.log(`✅ Sábado foi bloqueado: ${error}`);
    }

    // Teste no DOMINGO
    console.log('\n📋 TESTE 2: Tentando agendar no DOMINGO (2024-08-11)');
    
    const sundayTest = {
      title: "Teste Domingo Real",
      description: "Este deveria ser BLOQUEADO",
      date: "2024-08-11", // Domingo
      startTime: "14:00",
      durationMinutes: 60,
      isPomodoro: false,
      assignedUserId: 8
    };

    const sunResponse = await fetch('http://localhost:5000/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sundayTest)
    });

    console.log(`Status: ${sunResponse.status}`);
    
    if (sunResponse.ok) {
      const result = await sunResponse.json();
      console.log(`❌ PROBLEMA CONFIRMADO: Domingo foi agendado! ID: ${result.id}`);
      console.log(`   Data: ${result.date}`);
      
      // Limpar
      await fetch(`http://localhost:5000/api/appointments/${result.id}`, { method: 'DELETE' });
      
    } else {
      const error = await sunResponse.text();
      console.log(`✅ Domingo foi bloqueado: ${error}`);
    }

    // Teste na SEGUNDA
    console.log('\n📋 TESTE 3: Tentando agendar na SEGUNDA (2024-08-12)');
    
    const mondayTest = {
      title: "Teste Segunda Real",
      description: "Este deveria ser PERMITIDO",
      date: "2024-08-12", // Segunda
      startTime: "09:00",
      durationMinutes: 60,
      isPomodoro: false,
      assignedUserId: 8
    };

    const monResponse = await fetch('http://localhost:5000/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mondayTest)
    });

    console.log(`Status: ${monResponse.status}`);
    
    if (monResponse.ok) {
      const result = await monResponse.json();
      console.log(`✅ Segunda foi permitida: ID: ${result.id}`);
      console.log(`   Data: ${result.date}`);
      
      // Limpar
      await fetch(`http://localhost:5000/api/appointments/${result.id}`, { method: 'DELETE' });
      
    } else {
      const error = await monResponse.text();
      console.log(`❌ PROBLEMA: Segunda foi bloqueada: ${error}`);
    }

    // Agora teste recorrente REAL
    console.log('\n📋 TESTE 4: Agendamento recorrente começando SEXTA (2024-08-16)');
    
    const recurringTest = {
      title: "Teste Recorrente Real",
      description: "Começando sexta, deve pular sábado e domingo",
      date: "2024-08-16", // Sexta
      startTime: "15:00",
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
      body: JSON.stringify(recurringTest)
    });

    console.log(`Status: ${recurringResponse.status}`);

    if (recurringResponse.ok) {
      const result = await recurringResponse.json();
      console.log(`✅ Recorrente criado: ${result.instances.length} instâncias`);
      
      console.log('\n📊 INSTÂNCIAS REAIS CRIADAS:');
      result.instances.forEach((instance, index) => {
        const date = new Date(instance.date);
        const dayOfWeek = date.getDay();
        
        // Verificar que dia da semana é
        let dayName;
        switch(dayOfWeek) {
          case 0: dayName = 'DOMINGO'; break;
          case 1: dayName = 'SEGUNDA'; break;
          case 2: dayName = 'TERÇA'; break;
          case 3: dayName = 'QUARTA'; break;
          case 4: dayName = 'QUINTA'; break;
          case 5: dayName = 'SEXTA'; break;
          case 6: dayName = 'SÁBADO'; break;
          default: dayName = 'DESCONHECIDO';
        }
        
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const status = isWeekend ? '❌ FINAL DE SEMANA!' : '✅ DIA ÚTIL';
        
        console.log(`   ${index + 1}. ${instance.date} = ${dayName} (${dayOfWeek}) ${status}`);
      });
      
      // Contar finais de semana
      const weekendCount = result.instances.filter(instance => {
        const date = new Date(instance.date);
        const dayOfWeek = date.getDay();
        return dayOfWeek === 0 || dayOfWeek === 6;
      }).length;
      
      if (weekendCount > 0) {
        console.log(`\n❌ PROBLEMA CONFIRMADO: ${weekendCount} agendamentos de final de semana foram criados!`);
      } else {
        console.log(`\n✅ SUCESSO: Nenhum agendamento de final de semana foi criado!`);
      }
      
      // Limpar
      console.log('\n🧹 Limpando...');
      await fetch(`http://localhost:5000/api/appointments/${result.template.id}`, { method: 'DELETE' });
      for (const instance of result.instances) {
        await fetch(`http://localhost:5000/api/appointments/${instance.id}`, { method: 'DELETE' });
      }
      
    } else {
      const error = await recurringResponse.text();
      console.log(`❌ Falha no recorrente: ${error}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DO TESTE REAL');
    console.log('='.repeat(60));
    console.log('Este teste mostra EXATAMENTE o que está acontecendo.');
    console.log('Se há problemas, eles serão mostrados acima.');

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testRealWeekend().catch(console.error);
