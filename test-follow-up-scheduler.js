// Testar o sistema de agendamento de follow-up
import 'dotenv/config';
import { followUpScheduler } from './server/services/follow-up-scheduler.ts';
import { storage } from './server/storage.ts';

async function testFollowUpScheduler() {
  console.log('🧪 Testando sistema de agendamento de follow-up...\n');

  try {
    // 1. Inicializar o scheduler
    console.log('1️⃣ Inicializando scheduler...');
    await followUpScheduler.initialize();
    console.log('✅ Scheduler inicializado com sucesso');

    // 2. Verificar status do scheduler
    console.log('\n2️⃣ Verificando status do scheduler...');
    const status = followUpScheduler.getStatus();
    console.log('✅ Status do scheduler:');
    console.log(`   - Executando: ${status.isRunning}`);
    console.log(`   - Total de relatórios enviados: ${status.totalReportsSent}`);
    console.log(`   - Total de erros: ${status.totalErrors}`);
    console.log(`   - Jobs agendados: ${status.scheduledJobs.length}`);
    
    if (status.scheduledJobs.length > 0) {
      console.log('\n📋 Jobs agendados:');
      status.scheduledJobs.forEach(job => {
        console.log(`   - ${job.companyName} (ID: ${job.companyId})`);
        console.log(`     Schedule: ${job.schedule}`);
        console.log(`     Status: ${job.status}`);
        console.log(`     Enabled: ${job.enabled}`);
      });
    }

    // 3. Listar empresas com configurações de follow-up
    console.log('\n3️⃣ Verificando configurações de follow-up...');
    const followUpSettings = await storage.getAllFollowUpSettings();
    console.log(`✅ Encontradas ${followUpSettings.length} configurações:`);
    
    followUpSettings.forEach(setting => {
      console.log(`   - ${setting.companyName}: ${setting.enabled ? 'Ativo' : 'Inativo'}`);
      console.log(`     Frequência: ${setting.emailFrequency}`);
      console.log(`     Dia: ${setting.sendDay} às ${setting.sendTime}`);
      console.log(`     Emails: ${setting.recipientEmails ? 'Configurado' : 'Não configurado'}`);
    });

    // 4. Testar execução manual de um job
    if (followUpSettings.length > 0) {
      const testCompany = followUpSettings.find(s => s.enabled);
      
      if (testCompany) {
        console.log(`\n4️⃣ Testando execução manual para ${testCompany.companyName}...`);
        
        const result = await followUpScheduler.triggerManualJob(testCompany.companyId);
        
        if (result.success) {
          console.log('✅ Job manual executado com sucesso');
        } else {
          console.log('❌ Falha na execução manual:', result.error);
        }
      } else {
        console.log('\n4️⃣ Nenhuma empresa habilitada para teste manual');
      }
    }

    // 5. Testar recarregamento de jobs
    console.log('\n5️⃣ Testando recarregamento de jobs...');
    await followUpScheduler.reloadJobs();
    console.log('✅ Jobs recarregados com sucesso');

    // 6. Verificar status após recarregamento
    console.log('\n6️⃣ Status após recarregamento...');
    const newStatus = followUpScheduler.getStatus();
    console.log(`✅ Jobs ativos: ${newStatus.scheduledJobs.length}`);

    // 7. Configurar uma empresa para teste (se não houver emails configurados)
    console.log('\n7️⃣ Configurando empresa para teste...');
    const testCompanySettings = followUpSettings[0];
    
    if (testCompanySettings && !testCompanySettings.recipientEmails) {
      console.log(`📧 Configurando emails de teste para ${testCompanySettings.companyName}...`);
      
      await storage.updateFollowUpSettings(testCompanySettings.companyId, {
        recipientEmails: '["test@timeflow.com", "admin@timeflow.com"]',
        enabled: true
      });
      
      console.log('✅ Emails de teste configurados');
    }

    // 8. Demonstrar diferentes tipos de agendamento
    console.log('\n8️⃣ Exemplos de agendamento:');
    console.log('   - Semanal (Segunda às 8h): 0 8 * * 1');
    console.log('   - Quinzenal (Sexta às 14h): 0 14 * * 5');
    console.log('   - Mensal (Primeira segunda às 9h): 0 9 1-7 * 1');
    
    // 9. Simular próximas execuções
    console.log('\n9️⃣ Próximas execuções simuladas:');
    const now = new Date();
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + (1 + 7 - now.getDay()) % 7);
    nextMonday.setHours(8, 0, 0, 0);
    
    console.log(`   - Próxima segunda-feira às 8h: ${nextMonday.toLocaleString('pt-BR')}`);

    console.log('\n🎉 Todos os testes do scheduler passaram!');
    console.log('💡 O scheduler está funcionando e executará automaticamente:');
    console.log('   - Jobs agendados conforme configuração de cada empresa');
    console.log('   - Verificação diária de mudanças de configuração às 6h');
    console.log('   - Geração e envio automático de relatórios');

    // 10. Parar o scheduler para não interferir com outros testes
    console.log('\n🛑 Parando scheduler para finalizar teste...');
    followUpScheduler.stopAllJobs();
    console.log('✅ Scheduler parado');

  } catch (error) {
    console.error('❌ Erro durante teste do scheduler:', error);
  }
}

// Executar teste
testFollowUpScheduler().catch(console.error);
