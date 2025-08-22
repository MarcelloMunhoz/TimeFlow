// Teste simples para verificar a API de agendamentos
console.log('🧪 Iniciando teste de criação de agendamento...');

const testData = {
  title: "Teste Simples",
  description: "Teste básico",
  date: "2025-01-20",
  startTime: "09:00",
  durationMinutes: 60
};

console.log('📤 Dados de teste:', testData);

fetch('/api/appointments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(testData)
})
.then(response => {
  console.log('📥 Status:', response.status);
  console.log('📥 OK:', response.ok);
  
  if (!response.ok) {
    return response.json().then(errorData => {
      console.error('❌ Erro na resposta:', errorData);
      throw new Error(`HTTP ${response.status}: ${errorData.message || 'Erro desconhecido'}`);
    });
  }
  
  return response.json();
})
.then(result => {
  console.log('✅ Sucesso:', result);
})
.catch(error => {
  console.error('💥 Erro:', error);
});

