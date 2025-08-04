// Testar as APIs de follow-up diretamente
import 'dotenv/config';

async function testFollowUpAPIs() {
  console.log('🧪 Testando APIs de follow-up...\n');

  const baseUrl = 'http://localhost:5000';

  try {
    // 1. Testar API de configurações
    console.log('1️⃣ Testando GET /api/follow-up-settings...');
    const settingsResponse = await fetch(`${baseUrl}/api/follow-up-settings`);
    
    if (settingsResponse.ok) {
      const settingsData = await settingsResponse.json();
      console.log(`✅ Status: ${settingsResponse.status}`);
      console.log(`✅ Dados recebidos: ${settingsData.length} registros`);
      
      if (settingsData.length > 0) {
        console.log('📋 Primeiro registro:');
        console.log(JSON.stringify(settingsData[0], null, 2));
      }
    } else {
      console.log(`❌ Erro: ${settingsResponse.status} - ${settingsResponse.statusText}`);
      const errorText = await settingsResponse.text();
      console.log(`❌ Resposta: ${errorText}`);
    }

    // 2. Testar API de relatórios
    console.log('\n2️⃣ Testando GET /api/follow-up-reports...');
    const reportsResponse = await fetch(`${baseUrl}/api/follow-up-reports`);
    
    if (reportsResponse.ok) {
      const reportsData = await reportsResponse.json();
      console.log(`✅ Status: ${reportsResponse.status}`);
      console.log(`✅ Dados recebidos: ${reportsData.length} registros`);
      
      if (reportsData.length > 0) {
        console.log('📋 Primeiro registro:');
        console.log(JSON.stringify(reportsData[0], null, 2));
        
        // Verificar se as datas estão válidas
        const firstReport = reportsData[0];
        console.log('\n🔍 Verificando datas:');
        console.log(`   - createdAt: ${firstReport.createdAt} (tipo: ${typeof firstReport.createdAt})`);
        console.log(`   - sentAt: ${firstReport.sentAt} (tipo: ${typeof firstReport.sentAt})`);
        console.log(`   - reportDate: ${firstReport.reportDate} (tipo: ${typeof firstReport.reportDate})`);
        
        // Testar conversão de data
        try {
          const date = new Date(firstReport.createdAt);
          console.log(`   - Data convertida: ${date.toISOString()}`);
          console.log(`   - Data válida: ${!isNaN(date.getTime())}`);
        } catch (error) {
          console.log(`   - Erro na conversão: ${error.message}`);
        }
      }
    } else {
      console.log(`❌ Erro: ${reportsResponse.status} - ${reportsResponse.statusText}`);
      const errorText = await reportsResponse.text();
      console.log(`❌ Resposta: ${errorText}`);
    }

    // 3. Testar API de configurações de email
    console.log('\n3️⃣ Testando GET /api/email-settings...');
    const emailResponse = await fetch(`${baseUrl}/api/email-settings`);
    
    if (emailResponse.ok) {
      const emailData = await emailResponse.json();
      console.log(`✅ Status: ${emailResponse.status}`);
      console.log('📋 Configurações de email:');
      console.log(JSON.stringify(emailData, null, 2));
    } else {
      console.log(`❌ Erro: ${emailResponse.status} - ${emailResponse.statusText}`);
      const errorText = await emailResponse.text();
      console.log(`❌ Resposta: ${errorText}`);
    }

    console.log('\n🎯 Teste das APIs concluído!');

  } catch (error) {
    console.error('❌ Erro durante teste das APIs:', error);
  }
}

// Executar teste
testFollowUpAPIs().catch(console.error);
