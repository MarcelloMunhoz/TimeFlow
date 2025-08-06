// Teste para analisar dados do cronômetro no banco
import 'dotenv/config';

async function testTimerDataAnalysis() {
  console.log('🔍 ANÁLISE DOS DADOS DO CRONÔMETRO NO BANCO');
  console.log('=' .repeat(60));

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

    // 2. Buscar agendamentos de hoje
    console.log('\n2️⃣ Buscando agendamentos de hoje...');
    
    const appointmentsResponse = await fetch(`${baseUrl}/api/appointments`);
    if (!appointmentsResponse.ok) {
      console.log(`❌ Erro ao buscar agendamentos: ${appointmentsResponse.status}`);
      return;
    }

    const appointments = await appointmentsResponse.json();
    const today = new Date().toISOString().split('T')[0];
    const todayAppointments = appointments.filter(apt => apt.date === today);
    const completedToday = todayAppointments.filter(apt => 
      apt.status === 'completed' && !apt.isPomodoro
    );

    console.log(`📅 Total de agendamentos: ${appointments.length}`);
    console.log(`📅 Agendamentos de hoje: ${todayAppointments.length}`);
    console.log(`✅ Concluídos hoje (não-Pomodoro): ${completedToday.length}`);

    // 3. Analisar dados detalhados dos agendamentos concluídos
    console.log('\n3️⃣ Análise detalhada dos agendamentos concluídos:');
    
    if (completedToday.length === 0) {
      console.log('ℹ️ Nenhum agendamento concluído hoje para análise');
      return;
    }

    let totalEstimatedMinutes = 0;
    let totalActualMinutes = 0;
    let tasksWithTimer = 0;
    let tasksWithoutTimer = 0;

    console.log('\n📋 DETALHES DE CADA TAREFA:');
    console.log('-'.repeat(80));

    completedToday.forEach((apt, index) => {
      const estimated = apt.durationMinutes || 0;
      const actual = apt.actualTimeMinutes || 0;
      const accumulated = apt.accumulatedTimeMinutes || 0;
      
      totalEstimatedMinutes += estimated;
      totalActualMinutes += actual;
      
      if (actual > 0) {
        tasksWithTimer++;
      } else {
        tasksWithoutTimer++;
      }

      console.log(`\n${index + 1}. ${apt.title} (ID: ${apt.id})`);
      console.log(`   📋 Duração estimada: ${estimated}min`);
      console.log(`   ⏱️ Tempo real (actualTimeMinutes): ${actual}min`);
      console.log(`   🔄 Tempo acumulado (accumulatedTimeMinutes): ${accumulated}min`);
      console.log(`   📊 Estado do timer: ${apt.timerState || 'N/A'}`);
      console.log(`   ✅ Concluído em: ${apt.completedAt || 'N/A'}`);
      console.log(`   🎯 Diferença: ${actual - estimated > 0 ? '+' : ''}${actual - estimated}min`);
      
      if (actual === 0 && estimated > 0) {
        console.log(`   ⚠️ PROBLEMA: Sem tempo real registrado!`);
      }
    });

    // 4. Resumo dos cálculos
    console.log('\n4️⃣ RESUMO DOS CÁLCULOS:');
    console.log('=' .repeat(60));
    
    console.log(`📊 ESTATÍSTICAS GERAIS:`);
    console.log(`   📋 Total estimado: ${totalEstimatedMinutes}min`);
    console.log(`   ⏱️ Total real: ${totalActualMinutes}min`);
    console.log(`   📊 Diferença: ${totalActualMinutes - totalEstimatedMinutes > 0 ? '+' : ''}${totalActualMinutes - totalEstimatedMinutes}min`);
    console.log(`   🎯 Tarefas com cronômetro: ${tasksWithTimer}`);
    console.log(`   ⚠️ Tarefas sem cronômetro: ${tasksWithoutTimer}`);

    // Converter para formato h/min
    const formatMinutes = (minutes) => {
      if (minutes === 0) return "0min";
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      if (hours === 0) return `${mins}min`;
      if (mins === 0) return `${hours}h`;
      return `${hours}h${mins}min`;
    };

    console.log(`\n📏 FORMATAÇÃO:`);
    console.log(`   📋 Total estimado: ${formatMinutes(totalEstimatedMinutes)}`);
    console.log(`   ⏱️ Total real: ${formatMinutes(totalActualMinutes)}`);

    // 5. Testar API de estatísticas
    console.log('\n5️⃣ Testando API de estatísticas...');
    
    const statsResponse = await fetch(`${baseUrl}/api/stats/productivity`);
    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      console.log(`✅ API retornou: "${stats.scheduledHoursToday}"`);
      console.log(`🔍 Tipo: ${typeof stats.scheduledHoursToday}`);
      
      // Comparar com nosso cálculo
      const expectedResult = formatMinutes(totalActualMinutes);
      const isCorrect = stats.scheduledHoursToday === expectedResult;
      
      console.log(`\n📊 COMPARAÇÃO:`);
      console.log(`   🎯 Esperado: ${expectedResult}`);
      console.log(`   📡 API retornou: ${stats.scheduledHoursToday}`);
      console.log(`   ✅ Correto: ${isCorrect ? 'SIM' : 'NÃO'}`);
      
      if (!isCorrect) {
        console.log(`\n❌ PROBLEMA IDENTIFICADO:`);
        console.log(`   A API não está retornando o valor correto!`);
        console.log(`   Possíveis causas:`);
        console.log(`   - Campo actualTimeMinutes não está sendo populado`);
        console.log(`   - Lógica de cálculo incorreta`);
        console.log(`   - Cache ou dados não atualizados`);
      }
      
    } else {
      console.log(`❌ Erro ao buscar estatísticas: ${statsResponse.status}`);
    }

    // 6. Verificar tarefas específicas mencionadas pelo usuário
    console.log('\n6️⃣ Verificando tarefas específicas mencionadas...');
    
    const timerIds = [44, 390, 396, 617, 618];
    const expectedTimes = {
      44: '8h15m',
      390: '8h1m', 
      396: '8h27m',
      617: '6h54m',
      618: '7h4m'
    };

    console.log('\n🔍 BUSCANDO TAREFAS COM TIMER IDs ESPECÍFICOS:');
    
    timerIds.forEach(timerId => {
      const task = appointments.find(apt => 
        apt.id === timerId || 
        apt.title?.includes(`Timer ID: ${timerId}`) ||
        apt.description?.includes(`Timer ID: ${timerId}`)
      );
      
      if (task) {
        console.log(`\n✅ Timer ID ${timerId} encontrado:`);
        console.log(`   📋 Título: ${task.title}`);
        console.log(`   ⏱️ actualTimeMinutes: ${task.actualTimeMinutes || 0}min`);
        console.log(`   🔄 accumulatedTimeMinutes: ${task.accumulatedTimeMinutes || 0}min`);
        console.log(`   📊 Status: ${task.status}`);
        console.log(`   🎯 Esperado: ${expectedTimes[timerId]}`);
        
        const actualMinutes = task.actualTimeMinutes || 0;
        const expectedMinutes = timerId === 44 ? 495 : // 8h15m
                               timerId === 390 ? 481 : // 8h1m
                               timerId === 396 ? 507 : // 8h27m
                               timerId === 617 ? 414 : // 6h54m
                               timerId === 618 ? 424 : 0; // 7h4m
        
        const isCorrect = actualMinutes === expectedMinutes;
        console.log(`   ✅ Tempo correto: ${isCorrect ? 'SIM' : 'NÃO'} (${actualMinutes}min vs ${expectedMinutes}min)`);
        
      } else {
        console.log(`❌ Timer ID ${timerId} não encontrado`);
      }
    });

    // 7. Resumo final
    console.log('\n🎯 RESUMO FINAL');
    console.log('=' .repeat(60));
    
    if (totalActualMinutes === 0 && totalEstimatedMinutes > 0) {
      console.log('❌ PROBLEMA CRÍTICO IDENTIFICADO:');
      console.log('   - Nenhuma tarefa tem actualTimeMinutes > 0');
      console.log('   - O cronômetro não está salvando os dados corretamente');
      console.log('   - API está usando apenas durationMinutes (estimado)');
    } else if (totalActualMinutes > 0) {
      console.log('✅ DADOS DO CRONÔMETRO ENCONTRADOS:');
      console.log(`   - ${tasksWithTimer} tarefas com tempo real registrado`);
      console.log(`   - ${formatMinutes(totalActualMinutes)} de tempo real trabalhado`);
      console.log(`   - API deveria mostrar: ${formatMinutes(totalActualMinutes)}`);
    }

    console.log('\n🔧 PRÓXIMOS PASSOS:');
    if (totalActualMinutes === 0) {
      console.log('   1. Verificar se o cronômetro está salvando actualTimeMinutes');
      console.log('   2. Verificar se as tarefas foram concluídas via cronômetro');
      console.log('   3. Verificar se há problemas na migração do banco');
    } else {
      console.log('   1. Verificar se a API está usando o campo correto');
      console.log('   2. Verificar se há cache ou dados não atualizados');
      console.log('   3. Testar com uma nova tarefa usando cronômetro');
    }

    console.log('\n🎉 ANÁLISE CONCLUÍDA!');

  } catch (error) {
    console.error('\n❌ ERRO DURANTE ANÁLISE:', error);
  }
}

// Executar análise
testTimerDataAnalysis().catch(console.error);
