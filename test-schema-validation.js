// Teste de validação do schema
console.log('🧪 Testando validação do schema...');

// Dados de teste que deveriam passar na validação
const testData = {
  title: "Teste de Validação",
  description: "Teste para verificar se o schema está funcionando",
  date: "2025-01-20",
  startTime: "09:00",
  durationMinutes: 60,
  allowWeekendOverride: false
};

console.log('📤 Dados de teste:', testData);

// Testar se os dados são válidos
try {
  // Simular a validação que acontece no servidor
  const requiredFields = ['title', 'date', 'startTime', 'durationMinutes'];
  const missingFields = requiredFields.filter(field => !testData[field]);
  
  if (missingFields.length > 0) {
    console.error('❌ Campos obrigatórios faltando:', missingFields);
  } else {
    console.log('✅ Todos os campos obrigatórios estão presentes');
  }
  
  // Verificar tipos dos campos
  if (typeof testData.title !== 'string' || testData.title.length === 0) {
    console.error('❌ Título deve ser uma string não vazia');
  } else {
    console.log('✅ Título válido');
  }
  
  if (typeof testData.date !== 'string' || testData.date.length === 0) {
    console.error('❌ Data deve ser uma string não vazia');
  } else {
    console.log('✅ Data válida');
  }
  
  if (typeof testData.startTime !== 'string' || testData.startTime.length === 0) {
    console.error('❌ Hora de início deve ser uma string não vazia');
  } else {
    console.log('✅ Hora de início válida');
  }
  
  if (typeof testData.durationMinutes !== 'number' || testData.durationMinutes <= 0) {
    console.error('❌ Duração deve ser um número maior que 0');
  } else {
    console.log('✅ Duração válida');
  }
  
  console.log('✅ Validação básica concluída');
  
} catch (error) {
  console.error('💥 Erro na validação:', error);
}

// Testar a API
console.log('🧪 Testando API...');

fetch('/api/appointments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(testData)
})
.then(response => {
  console.log('📥 Status da resposta:', response.status);
  console.log('📥 OK:', response.ok);
  
  if (!response.ok) {
    return response.json().then(errorData => {
      console.error('❌ Erro na resposta:', errorData);
      console.error('❌ Detalhes do erro:', {
        message: errorData.message,
        errors: errorData.errors,
        code: errorData.code
      });
    });
  }
  
  return response.json();
})
.then(result => {
  if (result) {
    console.log('✅ Sucesso na criação:', result);
  }
})
.catch(error => {
  console.error('💥 Erro na requisição:', error);
});

