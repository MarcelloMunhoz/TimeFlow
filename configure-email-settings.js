// Configurar settings de email para teste
import 'dotenv/config';
import { db } from './server/db.ts';

async function configureEmailSettings() {
  console.log('⚙️ Configurando settings de email para teste...\n');

  try {
    // Ativar as configurações de email existentes para teste
    console.log('📧 Ativando configurações de email...');
    
    const result = await db.execute(`
      UPDATE email_settings 
      SET is_active = true,
          smtp_host = 'smtp.gmail.com',
          smtp_port = 587,
          smtp_user = 'test@timeflow.com',
          smtp_password = 'test_password_here',
          from_email = 'noreply@timeflow.com',
          from_name = 'TimeFlow - Sistema de Gestão de Projetos',
          smtp_secure = false,
          updated_at = NOW()::TEXT
      WHERE id = 1
    `);

    console.log('✅ Configurações de email ativadas para teste');
    
    // Verificar as configurações
    console.log('\n🔍 Verificando configurações atuais...');
    const settings = await db.execute('SELECT * FROM email_settings WHERE is_active = true');
    
    if (settings.rows.length > 0) {
      const setting = settings.rows[0];
      console.log('✅ Configurações encontradas:');
      console.log('   📧 SMTP Host:', setting.smtp_host);
      console.log('   🔌 SMTP Port:', setting.smtp_port);
      console.log('   👤 SMTP User:', setting.smtp_user);
      console.log('   📨 From Email:', setting.from_email);
      console.log('   🏷️ From Name:', setting.from_name);
      console.log('   🔒 Secure:', setting.smtp_secure);
      console.log('   ✅ Active:', setting.is_active);
    }

    console.log('\n🎉 Configurações de email prontas para teste!');
    console.log('⚠️ IMPORTANTE: Estas são configurações de teste');
    console.log('💡 Para produção, configure credenciais SMTP reais');
    console.log('💡 Agora você pode executar: npx tsx test-email-service.js');

  } catch (error) {
    console.error('❌ Erro ao configurar settings de email:', error);
  }
}

// Executar configuração
configureEmailSettings().catch(console.error);
