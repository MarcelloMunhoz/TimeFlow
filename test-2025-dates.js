// Teste com datas corretas de 2025
import 'dotenv/config';

async function test2025Dates() {
  console.log('🔍 TESTE COM DATAS CORRETAS DE 2025\n');

  const testDates = [
    { date: '2025-08-04', expected: 'SEGUNDA-FEIRA', shouldWork: true },   // Segunda
    { date: '2025-08-05', expected: 'TERÇA-FEIRA', shouldWork: true },     // Terça  
    { date: '2025-08-06', expected: 'QUARTA-FEIRA', shouldWork: true },    // Quarta
    { date: '2025-08-07', expected: 'QUINTA-FEIRA', shouldWork: true },    // Quinta
    { date: '2025-08-08', expected: 'SEXTA-FEIRA', shouldWork: true },     // Sexta
    { date: '2025-08-09', expected: 'SÁBADO', shouldWork: false },         // Sábado
    { date: '2025-08-10', expected: 'DOMINGO', shouldWork: false },        // Domingo
  ];

  console.log('📅 Verificando dias da semana em 2025:');
  testDates.forEach(test => {
    const date = new Date(test.date);
    const dayOfWeek = date.getDay();
    const actualDay = date.toLocaleDateString('pt-BR', { weekday: 'long' });
    
    console.log(`   ${test.date}: ${actualDay.toUpperCase()} (${dayOfWeek}) - Esperado: ${test.expected}`);
  });

  console.log('\n🧪 Testando cada dia no servidor:');
  
  for (const test of testDates) {
    console.log(`\n📋 Testando ${test.expected} (${test.date})`);
    console.log(`   Esperado: ${test.shouldWork ? 'PERMITIR' : 'BLOQUEAR'}`);
    
    const testAppointment = {
      title: `Teste ${test.expected}`,
      description: `Testando ${test.expected} em 2025`,
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
        body: JSON.stringify(testAppointment)
      });

      console.log(`   Status: ${response.status}`);

      if (response.ok) {
        const result = await response.json();
        
        if (test.shouldWork) {
          console.log(`   ✅ CORRETO: ${test.expected} foi permitido (ID: ${result.id})`);
          // Limpar
          await fetch(`http://localhost:5000/api/appointments/${result.id}`, { method: 'DELETE' });
        } else {
          console.log(`   ❌ ERRO: ${test.expected} foi permitido mas deveria ser BLOQUEADO! (ID: ${result.id})`);
          // Limpar
          await fetch(`http://localhost:5000/api/appointments/${result.id}`, { method: 'DELETE' });
        }
        
      } else {
        const errorText = await response.text();
        let errorMessage;
        
        try {
          const errorObj = JSON.parse(errorText);
          errorMessage = errorObj.message;
        } catch {
          errorMessage = errorText;
        }
        
        if (test.shouldWork) {
          console.log(`   ❌ ERRO GRAVE: ${test.expected} foi BLOQUEADO mas deveria ser permitido!`);
          console.log(`   📋 Mensagem de erro: "${errorMessage}"`);
          
          // Analisar a mensagem de erro
          if (errorMessage.includes('DOMINGO')) {
            console.log(`   🔍 PROBLEMA: Sistema está confundindo ${test.expected} com DOMINGO!`);
          } else if (errorMessage.includes('SÁBADO')) {
            console.log(`   🔍 PROBLEMA: Sistema está confundindo ${test.expected} com SÁBADO!`);
          }
          
        } else {
          console.log(`   ✅ CORRETO: ${test.expected} foi bloqueado`);
          console.log(`   📋 Mensagem: "${errorMessage}"`);
        }
      }
      
    } catch (error) {
      console.log(`   ❌ Erro na requisição: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO - TESTE COM DATAS DE 2025');
  console.log('='.repeat(60));
  console.log('SEGUNDA a SEXTA (2025-08-04 a 2025-08-08) devem ser PERMITIDOS.');
  console.log('SÁBADO e DOMINGO (2025-08-09 e 2025-08-10) devem ser BLOQUEADOS.');
}

test2025Dates().catch(console.error);
