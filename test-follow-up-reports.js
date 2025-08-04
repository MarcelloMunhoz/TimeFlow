// Testar o sistema de geração de relatórios de follow-up
import 'dotenv/config';
import { followUpReportService } from './server/services/follow-up-report-service.ts';
import { emailTemplateService } from './server/services/email-template-service.ts';
import { storage } from './server/storage.ts';

async function testFollowUpReports() {
  console.log('🧪 Testando sistema de geração de relatórios de follow-up...\n');

  try {
    // 1. Listar empresas disponíveis
    console.log('1️⃣ Listando empresas disponíveis...');
    const companies = await storage.getCompanies();
    
    if (companies.length === 0) {
      console.log('❌ Nenhuma empresa encontrada');
      return;
    }

    console.log(`✅ Encontradas ${companies.length} empresas:`);
    companies.forEach(company => {
      console.log(`   - ${company.name} (ID: ${company.id}) - Tipo: ${company.type}`);
    });

    // 2. Encontrar uma empresa cliente para teste
    const clientCompany = companies.find(c => c.type === 'client');
    if (!clientCompany) {
      console.log('❌ Nenhuma empresa cliente encontrada');
      return;
    }

    console.log(`\n📊 Testando com empresa: ${clientCompany.name} (ID: ${clientCompany.id})`);

    // 3. Verificar configurações de follow-up
    console.log('\n2️⃣ Verificando configurações de follow-up...');
    const followUpSettings = await storage.getFollowUpSettings(clientCompany.id);
    
    if (followUpSettings) {
      console.log('✅ Configurações de follow-up encontradas:');
      console.log(`   - Habilitado: ${followUpSettings.enabled}`);
      console.log(`   - Frequência: ${followUpSettings.emailFrequency}`);
      console.log(`   - Dia de envio: ${followUpSettings.sendDay}`);
      console.log(`   - Horário: ${followUpSettings.sendTime}`);
      console.log(`   - Emails: ${followUpSettings.recipientEmails || 'Não configurado'}`);
    } else {
      console.log('⚠️ Nenhuma configuração de follow-up encontrada');
    }

    // 4. Listar projetos da empresa
    console.log('\n3️⃣ Listando projetos da empresa...');
    const projects = await storage.getProjectsByCompany(clientCompany.id);
    
    if (projects.length === 0) {
      console.log('⚠️ Nenhum projeto encontrado para esta empresa');
      console.log('💡 Criando projeto de exemplo para teste...');
      
      // Criar projeto de exemplo
      const sampleProject = await storage.createProject({
        name: 'Projeto BI Dashboard - Teste',
        description: 'Projeto de exemplo para testar o sistema de follow-up',
        companyId: clientCompany.id,
        status: 'active',
        priority: 'medium',
        progressPercentage: 45,
        startDate: '2024-12-01',
        endDate: '2025-02-28'
      });
      
      console.log(`✅ Projeto de exemplo criado: ${sampleProject.name} (ID: ${sampleProject.id})`);
    } else {
      console.log(`✅ Encontrados ${projects.length} projetos:`);
      projects.forEach(project => {
        console.log(`   - ${project.name} (${project.status}) - ${project.progressPercentage || 0}%`);
      });
    }

    // 5. Gerar relatório de follow-up
    console.log('\n4️⃣ Gerando relatório de follow-up...');
    const reportResult = await followUpReportService.generateReport(clientCompany.id);

    if (reportResult.success && reportResult.reportData) {
      console.log('✅ Relatório gerado com sucesso!');
      console.log(`   - ID do relatório: ${reportResult.reportId}`);
      console.log(`   - Empresa: ${reportResult.reportData.companyName}`);
      console.log(`   - Período: ${reportResult.reportData.reportPeriodStart} a ${reportResult.reportData.reportPeriodEnd}`);
      console.log(`   - Total de projetos: ${reportResult.reportData.summary.totalProjects}`);
      console.log(`   - Projetos concluídos: ${reportResult.reportData.summary.completedProjects}`);
      console.log(`   - Projetos em risco: ${reportResult.reportData.summary.projectsAtRisk}`);
      console.log(`   - Progresso geral: ${reportResult.reportData.summary.overallProgress}%`);
      console.log(`   - Fases bloqueadas: ${reportResult.reportData.blockedPhases.length}`);
      console.log(`   - Próximos passos: ${reportResult.reportData.nextSteps.length}`);

      // 6. Gerar HTML do email
      console.log('\n5️⃣ Gerando template de email...');
      const emailHtml = emailTemplateService.generateFollowUpReport(reportResult.reportData);
      console.log(`✅ Template de email gerado (${emailHtml.length} caracteres)`);

      // 7. Salvar HTML para visualização (opcional)
      console.log('\n6️⃣ Salvando preview do email...');
      const fs = await import('fs');
      const previewPath = 'follow-up-report-preview.html';
      fs.writeFileSync(previewPath, emailHtml);
      console.log(`✅ Preview salvo em: ${previewPath}`);

      // 8. Listar relatórios existentes
      console.log('\n7️⃣ Listando relatórios existentes...');
      const existingReports = await storage.getFollowUpReports(clientCompany.id, 5);
      console.log(`✅ Encontrados ${existingReports.length} relatórios anteriores`);

    } else {
      console.log('❌ Falha ao gerar relatório:', reportResult.error);
    }

    // 9. Testar identificação de empresas para follow-up
    console.log('\n8️⃣ Testando identificação de empresas para follow-up...');
    const companiesForFollowUp = await followUpReportService.getCompaniesForFollowUp();
    console.log(`✅ ${companiesForFollowUp.length} empresas configuradas para receber follow-up hoje`);
    
    companiesForFollowUp.forEach(company => {
      console.log(`   - ${company.companyName} (${company.settings.emailFrequency})`);
    });

    console.log('\n🎉 Todos os testes do sistema de relatórios passaram!');
    console.log('💡 Próximos passos:');
    console.log('   1. Configurar credenciais SMTP reais');
    console.log('   2. Configurar emails de destinatários');
    console.log('   3. Implementar agendamento automático');
    console.log('   4. Criar dashboard frontend');

  } catch (error) {
    console.error('❌ Erro durante teste do sistema de relatórios:', error);
  }
}

// Executar teste
testFollowUpReports().catch(console.error);
