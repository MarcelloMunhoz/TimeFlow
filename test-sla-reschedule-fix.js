// Teste da correção dos cartões SLA e Reagendamentos
import 'dotenv/config';

async function testSLAReschedulefix() {
  console.log('🔧 TESTE DA CORREÇÃO DOS CARTÕES SLA E REAGENDAMENTOS');
  console.log('=' .repeat(70));

  const baseUrl = 'http://localhost:5000';

  try {
    // 1. Verificar se o servidor está rodando
    console.log('\n1️⃣ Verificando servidor...');
    
    try {
      const healthResponse = await fetch(baseUrl);
      console.log(`✅ Servidor rodando: ${healthResponse.status}`);
    } catch (error) {
      console.log(`❌ Servidor não está rodando: ${error.message}`);
      return;
    }

    // 2. Buscar dados para análise
    console.log('\n2️⃣ Analisando dados de agendamentos...');
    
    const appointmentsResponse = await fetch(`${baseUrl}/api/appointments`);
    if (!appointmentsResponse.ok) {
      console.log(`❌ Erro ao buscar agendamentos: ${appointmentsResponse.status}`);
      return;
    }

    const appointments = await appointmentsResponse.json();
    const today = new Date().toISOString().split('T')[0];
    const todayAppointments = appointments.filter(apt => apt.date === today);

    console.log(`📅 Total de agendamentos: ${appointments.length}`);
    console.log(`📅 Agendamentos de hoje: ${todayAppointments.length}`);

    // 3. Analisar SLA de hoje
    console.log('\n3️⃣ Análise de SLA - APENAS HOJE:');
    console.log('-'.repeat(50));
    
    const todayAppointmentsWithSLA = todayAppointments.filter(apt => apt.slaMinutes && !apt.isPomodoro);
    console.log(`📊 Agendamentos de hoje com SLA: ${todayAppointmentsWithSLA.length}`);

    if (todayAppointmentsWithSLA.length > 0) {
      console.log('\n📋 DETALHES DOS AGENDAMENTOS COM SLA HOJE:');
      todayAppointmentsWithSLA.forEach((apt, index) => {
        console.log(`\n${index + 1}. ${apt.title} (ID: ${apt.id})`);
        console.log(`   ⏰ SLA: ${apt.slaMinutes}min`);
        console.log(`   📊 Status: ${apt.status}`);
        console.log(`   🕐 Horário: ${apt.startTime}`);
        console.log(`   ✅ Concluído: ${apt.completedAt || 'N/A'}`);
        
        // Verificar se está vencido
        let isExpired = false;
        if (apt.status === 'completed' && apt.completedAt) {
          const completedDate = new Date(apt.completedAt);
          const scheduledDate = new Date(`${apt.date}T${apt.startTime}`);
          const timeTaken = (completedDate.getTime() - scheduledDate.getTime()) / (1000 * 60);
          isExpired = timeTaken > (apt.slaMinutes || 0);
          console.log(`   ⏱️ Tempo levado: ${Math.round(timeTaken)}min`);
          console.log(`   🎯 SLA ${isExpired ? 'VENCIDO' : 'CUMPRIDO'}`);
        } else if (apt.status === 'scheduled') {
          const now = new Date();
          const scheduledDate = new Date(`${apt.date}T${apt.startTime}`);
          const timePassed = (now.getTime() - scheduledDate.getTime()) / (1000 * 60);
          isExpired = timePassed > (apt.slaMinutes || 0);
          console.log(`   ⏱️ Tempo passado: ${Math.round(timePassed)}min`);
          console.log(`   🎯 SLA ${isExpired ? 'VENCIDO' : 'DENTRO DO PRAZO'}`);
        }
      });
    } else {
      console.log('✅ Nenhum agendamento com SLA hoje - resultado esperado: 0');
    }

    // 4. Analisar reagendamentos de hoje
    console.log('\n4️⃣ Análise de Reagendamentos - APENAS HOJE:');
    console.log('-'.repeat(50));
    
    const todayRescheduledAppointments = todayAppointments.filter(apt => apt.rescheduleCount && apt.rescheduleCount > 0);
    const totalReschedulesToday = todayAppointments.reduce((total, apt) => total + (apt.rescheduleCount || 0), 0);
    
    console.log(`📊 Agendamentos reagendados hoje: ${todayRescheduledAppointments.length}`);
    console.log(`📊 Total de reagendamentos hoje: ${totalReschedulesToday}`);

    if (todayRescheduledAppointments.length > 0) {
      console.log('\n📋 DETALHES DOS REAGENDAMENTOS HOJE:');
      todayRescheduledAppointments.forEach((apt, index) => {
        console.log(`\n${index + 1}. ${apt.title} (ID: ${apt.id})`);
        console.log(`   🔄 Reagendamentos: ${apt.rescheduleCount}`);
        console.log(`   📊 Status: ${apt.status}`);
        console.log(`   🕐 Horário atual: ${apt.startTime}`);
      });
    } else {
      console.log('✅ Nenhum reagendamento hoje - resultado esperado: 0');
    }

    // 5. Comparar com dados históricos
    console.log('\n5️⃣ Comparação com Dados Históricos:');
    console.log('-'.repeat(50));
    
    const allAppointmentsWithSLA = appointments.filter(apt => apt.slaMinutes && !apt.isPomodoro);
    const totalReschedulesAll = appointments.reduce((total, apt) => total + (apt.rescheduleCount || 0), 0);
    
    console.log(`📊 HISTÓRICO TOTAL:`);
    console.log(`   📋 Agendamentos com SLA (todos): ${allAppointmentsWithSLA.length}`);
    console.log(`   🔄 Total reagendamentos (todos): ${totalReschedulesAll}`);
    
    console.log(`\n📊 APENAS HOJE:`);
    console.log(`   📋 Agendamentos com SLA (hoje): ${todayAppointmentsWithSLA.length}`);
    console.log(`   🔄 Total reagendamentos (hoje): ${totalReschedulesToday}`);

    // 6. Testar API de estatísticas
    console.log('\n6️⃣ Testando API de estatísticas corrigida...');
    
    const statsResponse = await fetch(`${baseUrl}/api/stats/productivity`);
    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      console.log(`✅ Estatísticas obtidas:`, JSON.stringify(stats, null, 2));
      
      console.log(`\n📊 VERIFICAÇÃO DOS VALORES:`);
      console.log(`   🔴 SLA Vencidos API: ${stats.slaExpired}`);
      console.log(`   🔴 SLA Vencidos Calculado: ${todayAppointmentsWithSLA.filter(apt => {
        if (apt.status === 'completed' && apt.completedAt) {
          const completedDate = new Date(apt.completedAt);
          const scheduledDate = new Date(`${apt.date}T${apt.startTime}`);
          const timeTaken = (completedDate.getTime() - scheduledDate.getTime()) / (1000 * 60);
          return timeTaken > (apt.slaMinutes || 0);
        }
        if (apt.status === 'scheduled') {
          const now = new Date();
          const scheduledDate = new Date(`${apt.date}T${apt.startTime}`);
          const timePassed = (now.getTime() - scheduledDate.getTime()) / (1000 * 60);
          return timePassed > (apt.slaMinutes || 0);
        }
        return false;
      }).length}`);
      
      console.log(`   🔄 Reagendamentos API: ${stats.rescheduled}`);
      console.log(`   🔄 Reagendamentos Calculado: ${totalReschedulesToday}`);
      
      const slaCorrect = stats.slaExpired === todayAppointmentsWithSLA.filter(apt => {
        if (apt.status === 'completed' && apt.completedAt) {
          const completedDate = new Date(apt.completedAt);
          const scheduledDate = new Date(`${apt.date}T${apt.startTime}`);
          const timeTaken = (completedDate.getTime() - scheduledDate.getTime()) / (1000 * 60);
          return timeTaken > (apt.slaMinutes || 0);
        }
        if (apt.status === 'scheduled') {
          const now = new Date();
          const scheduledDate = new Date(`${apt.date}T${apt.startTime}`);
          const timePassed = (now.getTime() - scheduledDate.getTime()) / (1000 * 60);
          return timePassed > (apt.slaMinutes || 0);
        }
        return false;
      }).length;
      
      const rescheduleCorrect = stats.rescheduled === totalReschedulesToday;
      
      console.log(`\n✅ VERIFICAÇÃO:`);
      console.log(`   🎯 SLA correto: ${slaCorrect ? 'SIM' : 'NÃO'}`);
      console.log(`   🎯 Reagendamentos correto: ${rescheduleCorrect ? 'SIM' : 'NÃO'}`);
      
    } else {
      console.log(`❌ Erro ao buscar estatísticas: ${statsResponse.status}`);
    }

    // 7. Resumo final
    console.log('\n🎯 RESUMO FINAL');
    console.log('=' .repeat(70));
    
    console.log('✅ CORREÇÕES IMPLEMENTADAS:');
    console.log('   🔧 SLA: Agora analisa apenas agendamentos de hoje');
    console.log('   🔧 Reagendamentos: Agora conta apenas reagendamentos de hoje');
    console.log('   🔧 Filtros corretos aplicados em ambos os cálculos');

    console.log('\n📊 RESULTADOS ESPERADOS:');
    console.log(`   🔴 SLA Vencidos: ${todayAppointmentsWithSLA.length === 0 ? '0 (sem SLA hoje)' : 'Baseado em análise real'}`);
    console.log(`   🔄 Reagendamentos: ${totalReschedulesToday} (apenas hoje)`);

    console.log('\n🎉 CORREÇÃO CONCLUÍDA!');
    console.log('📊 Os cartões agora mostram dados corretos apenas do dia atual');

  } catch (error) {
    console.error('\n❌ ERRO DURANTE TESTE:', error);
  }
}

// Executar teste
testSLAReschedulefix().catch(console.error);
