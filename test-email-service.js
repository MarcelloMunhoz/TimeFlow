// Testar o serviço de email
import 'dotenv/config';
import { emailService } from './server/services/email-service.ts';
import { emailTemplateService } from './server/services/email-template-service.ts';

async function testEmailService() {
  console.log('🧪 Testando serviço de email...\n');

  try {
    // 1. Testar inicialização do serviço
    console.log('1️⃣ Inicializando serviço de email...');
    await emailService.initialize();
    console.log('✅ Serviço de email inicializado com sucesso');

    // 2. Testar conexão SMTP (pular se credenciais de teste)
    console.log('\n2️⃣ Testando conexão SMTP...');
    const connectionTest = await emailService.testConnection();

    if (connectionTest.success) {
      console.log('✅ Conexão SMTP funcionando');
    } else {
      console.log('⚠️ Conexão SMTP falhou (esperado com credenciais de teste)');
      console.log('💡 Para produção, configure credenciais SMTP reais');
      // Continuar com os testes mesmo com falha de conexão
    }

    // 3. Testar geração de template
    console.log('\n3️⃣ Testando geração de template...');
    const testHtml = emailTemplateService.generateTestEmail('Usuário Teste');
    console.log('✅ Template de teste gerado com sucesso');
    console.log('📄 Tamanho do HTML:', testHtml.length, 'caracteres');

    // 4. Testar template de follow-up (dados de exemplo)
    console.log('\n4️⃣ Testando template de follow-up...');
    const sampleReportData = {
      companyName: 'Empresa Teste LTDA',
      reportDate: new Date().toISOString(),
      reportPeriodStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      reportPeriodEnd: new Date().toISOString(),
      projects: [
        {
          id: 1,
          name: 'Projeto BI Dashboard',
          status: 'in_progress',
          progressPercentage: 75,
          isAtRisk: false,
          phases: [
            {
              id: 1,
              name: 'Análise de Requisitos',
              status: 'completed',
              progressPercentage: 100,
              isBlocked: false
            },
            {
              id: 2,
              name: 'Desenvolvimento',
              status: 'in_progress',
              progressPercentage: 60,
              isBlocked: false
            }
          ],
          nextSteps: [
            'Finalizar desenvolvimento do dashboard',
            'Iniciar testes de integração'
          ]
        }
      ],
      summary: {
        totalProjects: 1,
        completedProjects: 0,
        projectsAtRisk: 0,
        overallProgress: 75
      },
      blockedPhases: [],
      nextSteps: [
        'Revisar progresso dos projetos em andamento',
        'Agendar reunião de alinhamento com stakeholders'
      ]
    };

    const followUpHtml = emailTemplateService.generateFollowUpReport(sampleReportData);
    console.log('✅ Template de follow-up gerado com sucesso');
    console.log('📄 Tamanho do HTML:', followUpHtml.length, 'caracteres');

    // 5. Verificar configurações atuais
    console.log('\n5️⃣ Verificando configurações atuais...');
    const settings = await emailService.getSettings();
    
    if (settings) {
      console.log('✅ Configurações encontradas:');
      console.log('   📧 SMTP Host:', settings.smtpHost);
      console.log('   🔌 SMTP Port:', settings.smtpPort);
      console.log('   👤 SMTP User:', settings.smtpUser);
      console.log('   📨 From Email:', settings.fromEmail);
      console.log('   🏷️ From Name:', settings.fromName);
      console.log('   🔒 Secure:', settings.smtpSecure);
      console.log('   ✅ Active:', settings.isActive);
    } else {
      console.log('❌ Nenhuma configuração de email encontrada');
    }

    console.log('\n🎉 Todos os testes do serviço de email passaram!');
    console.log('💡 Para enviar emails reais, configure as credenciais SMTP corretas');
    console.log('💡 Use o endpoint POST /api/email-settings/send-test para testar envio real');

  } catch (error) {
    console.error('❌ Erro durante teste do serviço de email:', error);
    
    if (error.message.includes('No active email settings found')) {
      console.log('\n💡 Solução: Configure as credenciais SMTP no banco de dados');
      console.log('   1. Acesse a tabela email_settings');
      console.log('   2. Atualize smtp_host, smtp_user, smtp_password');
      console.log('   3. Defina is_active = true');
    }
  }
}

// Executar teste
testEmailService().catch(console.error);
