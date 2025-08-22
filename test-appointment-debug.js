// Teste específico para debugar criação de agendamentos
console.log('🔍 Iniciando debug de criação de agendamentos...');

// Teste 1: Dados mínimos obrigatórios
const testData1 = {
  title: "Teste Mínimo",
  date: "2025-01-20",
  startTime: "09:00",
  durationMinutes: 60
};

// Teste 2: Dados completos
const testData2 = {
  title: "Teste Completo",
  description: "Descrição completa",
  date: "2025-01-20",
  startTime: "09:00",
  durationMinutes: 60,
  allowWeekendOverride: false
};

// Teste 3: Dados com fim de semana (deve falhar)
const testData3 = {
  title: "Teste Fim de Semana",
  date: "2025-01-19", // Sábado
  startTime: "09:00",
  durationMinutes: 60,
  allowWeekendOverride: false
};

// Teste 4: Dados com fim de semana permitido
const testData4 = {
  title: "Teste Fim de Semana Permitido",
  date: "2025-01-19", // Sábado
  startTime: "09:00",
  durationMinutes: 60,
  allowWeekendOverride: true
};

async function testAppointment(data, testName) {
  console.log(`\n🧪 ${testName}:`, data);
  
  try {
    const response = await fetch('/api/appointments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    console.log(`📥 ${testName} - Status:`, response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`❌ ${testName} - Erro:`, errorData);
      return false;
    }
    
    const result = await response.json();
    console.log(`✅ ${testName} - Sucesso:`, result);
    return true;
    
  } catch (error) {
    console.error(`💥 ${testName} - Erro de conexão:`, error);
    return false;
  }
}

// Executar todos os testes
async function runAllTests() {
  console.log('🚀 Executando todos os testes...');
  
  const results = await Promise.all([
    testAppointment(testData1, "Teste Mínimo"),
    testAppointment(testData2, "Teste Completo"),
    testAppointment(testData3, "Teste Fim de Semana (deve falhar)"),
    testAppointment(testData4, "Teste Fim de Semana Permitido")
  ]);
  
  console.log('\n📊 Resumo dos testes:');
  results.forEach((result, index) => {
    const testNames = ["Mínimo", "Completo", "Fim de Semana (falha)", "Fim de Semana Permitido"];
    console.log(`${testNames[index]}: ${result ? '✅' : '❌'}`);
  });
}

// Executar os testes
runAllTests();

