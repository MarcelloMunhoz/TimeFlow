// Debug para entender exatamente qual é o problema com os dias da semana
import 'dotenv/config';

async function debugDaysOfWeek() {
  console.log('🔍 DEBUG - Verificando EXATAMENTE qual é o problema com os dias da semana\n');

  // Testar cada dia da semana individualmente
  const testDates = [
    '2024-08-12', // Segunda-feira
    '2024-08-13', // Terça-feira
    '2024-08-14', // Quarta-feira
    '2024-08-15', // Quinta-feira
    '2024-08-16', // Sexta-feira
    '2024-08-17', // Sábado
    '2024-08-18', // Domingo
  ];

  console.log('📅 Verificando dias da semana no JavaScript:');
  testDates.forEach(dateStr => {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();
    
    let dayName;
    switch(dayOfWeek) {
      case 0: dayName = 'DOMINGO'; break;
      case 1: dayName = 'SEGUNDA'; break;
      case 2: dayName = 'TERÇA'; break;
      case 3: dayName = 'QUARTA'; break;
      case 4: dayName = 'QUINTA'; break;
      case 5: dayName = 'SEXTA'; break;
      case 6: dayName = 'SÁBADO'; break;
      default: dayName = 'ERRO';
    }
    
    const shouldBeAllowed = dayOfWeek >= 1 && dayOfWeek <= 5; // Segunda a Sexta
    const status = shouldBeAllowed ? '✅ DEVE SER PERMITIDO' : '🚫 DEVE SER BLOQUEADO';
    
    console.log(`   ${dateStr}: ${dayName} (${dayOfWeek}) ${status}`);
  });

  console.log('\n🧪 Testando cada dia no servidor:');
  
  for (const dateStr of testDates) {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();
    
    let expectedDayName;
    switch(dayOfWeek) {
      case 0: expectedDayName = 'DOMINGO'; break;
      case 1: expectedDayName = 'SEGUNDA'; break;
      case 2: expectedDayName = 'TERÇA'; break;
      case 3: expectedDayName = 'QUARTA'; break;
      case 4: expectedDayName = 'QUINTA'; break;
      case 5: expectedDayName = 'SEXTA'; break;
      case 6: expectedDayName = 'SÁBADO'; break;
      default: expectedDayName = 'ERRO';
    }
    
    const shouldWork = dayOfWeek >= 1 && dayOfWeek <= 5;
    
    console.log(`\n📋 Testando ${expectedDayName} (${dateStr})`);
    console.log(`   Esperado: ${shouldWork ? 'PERMITIR' : 'BLOQUEAR'}`);
    
    const testAppointment = {
      title: `Teste ${expectedDayName}`,
      description: `Testando ${expectedDayName}`,
      date: dateStr,
      startTime: "10:00",
      durationMinutes: 60,
      isPomodoro: false,
      assignedUserId: 8
    };

    try {
      const response = await fetch('http://localhost:5000/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testAppointment)
      });

      console.log(`   Status: ${response.status}`);

      if (response.ok) {
        const result = await response.json();
        
        if (shouldWork) {
          console.log(`   ✅ CORRETO: ${expectedDayName} foi permitido (ID: ${result.id})`);
          // Limpar
          await fetch(`http://localhost:5000/api/appointments/${result.id}`, { method: 'DELETE' });
        } else {
          console.log(`   ❌ ERRO: ${expectedDayName} foi permitido mas deveria ser BLOQUEADO! (ID: ${result.id})`);
          // Limpar
          await fetch(`http://localhost:5000/api/appointments/${result.id}`, { method: 'DELETE' });
        }
        
      } else {
        const errorText = await response.text();
        const errorObj = JSON.parse(errorText);
        
        if (shouldWork) {
          console.log(`   ❌ ERRO: ${expectedDayName} foi BLOQUEADO mas deveria ser permitido!`);
          console.log(`   📋 Mensagem de erro: "${errorObj.message}"`);
          
          // Analisar a mensagem de erro
          if (errorObj.message.includes('DOMINGO')) {
            console.log(`   🔍 PROBLEMA IDENTIFICADO: Sistema está confundindo ${expectedDayName} com DOMINGO!`);
          } else if (errorObj.message.includes('SÁBADO')) {
            console.log(`   🔍 PROBLEMA IDENTIFICADO: Sistema está confundindo ${expectedDayName} com SÁBADO!`);
          }
          
        } else {
          console.log(`   ✅ CORRETO: ${expectedDayName} foi bloqueado`);
          console.log(`   📋 Mensagem: "${errorObj.message}"`);
        }
      }
      
    } catch (error) {
      console.log(`   ❌ Erro na requisição: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO DO DEBUG');
  console.log('='.repeat(60));
  console.log('Se há confusão nos dias da semana, será mostrado acima.');
  console.log('SEGUNDA a SEXTA devem ser PERMITIDOS.');
  console.log('SÁBADO e DOMINGO devem ser BLOQUEADOS.');
}

debugDaysOfWeek().catch(console.error);
