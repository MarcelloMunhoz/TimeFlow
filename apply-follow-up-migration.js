// Aplicar migração do sistema de follow-up no banco de dados
import 'dotenv/config';
import { db } from './server/db.ts';
import { readFileSync } from 'fs';

async function applyFollowUpMigration() {
  console.log('🔧 Aplicando migração do sistema de follow-up...\n');

  try {
    console.log('🔄 Executando migração do sistema de follow-up...');

    const migrationSQL = readFileSync('./server/migrations/0007_add_follow_up_system.sql', 'utf8');

    // Execute the entire migration as one transaction
    console.log('📝 Executando migração...');
    try {
      await db.execute(migrationSQL);
      console.log('✅ Migração executada com sucesso');
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log('ℹ️ Migração ignorada (já existe)');
      } else {
        console.error('❌ Migração falhou:', error.message);
        throw error;
      }
    }

    console.log('✅ Migração do sistema de follow-up aplicada com sucesso!');
    console.log('📋 Tabelas criadas:');
    console.log('   - email_settings (configurações SMTP)');
    console.log('   - follow_up_settings (configurações por empresa)');
    console.log('   - follow_up_reports (histórico de relatórios)');
    console.log('   - email_logs (logs de envio de email)');

    // Verificar a migração
    console.log('\n🔍 Verificando migração...');

    try {
      const emailSettings = await db.execute('SELECT COUNT(*) FROM email_settings');
      console.log(`✅ email_settings table exists with ${emailSettings.rows[0].count} records`);

      const followUpSettings = await db.execute('SELECT COUNT(*) FROM follow_up_settings');
      console.log(`✅ follow_up_settings table exists with ${followUpSettings.rows[0].count} records`);

      const followUpReports = await db.execute('SELECT COUNT(*) FROM follow_up_reports');
      console.log(`✅ follow_up_reports table exists with ${followUpReports.rows[0].count} records`);

      const emailLogs = await db.execute('SELECT COUNT(*) FROM email_logs');
      console.log(`✅ email_logs table exists with ${emailLogs.rows[0].count} records`);

      console.log('🎉 Verificação da migração concluída!');
    } catch (error) {
      console.error('❌ Verificação da migração falhou:', error);
    }

    console.log('\n🎉 Sistema de follow-up pronto para uso!');
    console.log('💡 Próximos passos:');
    console.log('   1. Configurar credenciais SMTP');
    console.log('   2. Configurar empresas que receberão relatórios');
    console.log('   3. Implementar serviço de email');
    console.log('   4. Criar dashboard de follow-up');

  } catch (error) {
    console.error('❌ Erro ao aplicar migração do sistema de follow-up:', error);
    process.exit(1);
  }
}

// Executar a migração
applyFollowUpMigration().catch(console.error);
