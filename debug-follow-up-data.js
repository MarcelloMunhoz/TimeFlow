// Debug dos dados de follow-up para identificar problemas
import 'dotenv/config';
import { db } from './server/db.ts';

async function debugFollowUpData() {
  console.log('🔍 Debugando dados de follow-up...\n');

  try {
    // 1. Verificar dados da tabela follow_up_settings
    console.log('1️⃣ Verificando follow_up_settings...');
    const settings = await db.execute('SELECT * FROM follow_up_settings ORDER BY id');
    
    console.log(`✅ ${settings.rows.length} registros encontrados:`);
    settings.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. Empresa ID: ${row.company_id}`);
      console.log(`      - Enabled: ${row.enabled}`);
      console.log(`      - Email Frequency: ${row.email_frequency}`);
      console.log(`      - Send Day: ${row.send_day}`);
      console.log(`      - Send Time: ${row.send_time}`);
      console.log(`      - Recipient Emails: ${row.recipient_emails}`);
      console.log(`      - Last Sent Date: ${row.last_sent_date}`);
      console.log(`      - Created At: ${row.created_at}`);
      console.log(`      - Updated At: ${row.updated_at}`);
      console.log('');
    });

    // 2. Verificar dados da tabela follow_up_reports
    console.log('2️⃣ Verificando follow_up_reports...');
    const reports = await db.execute('SELECT * FROM follow_up_reports ORDER BY id DESC LIMIT 10');
    
    console.log(`✅ ${reports.rows.length} relatórios encontrados (últimos 10):`);
    reports.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. Report ID: ${row.id}`);
      console.log(`      - Company ID: ${row.company_id}`);
      console.log(`      - Report Date: ${row.report_date}`);
      console.log(`      - Period Start: ${row.report_period_start}`);
      console.log(`      - Period End: ${row.report_period_end}`);
      console.log(`      - Total Projects: ${row.total_projects}`);
      console.log(`      - Completed Projects: ${row.completed_projects}`);
      console.log(`      - Projects At Risk: ${row.projects_at_risk}`);
      console.log(`      - Overall Progress: ${row.overall_progress}`);
      console.log(`      - Email Sent: ${row.email_sent}`);
      console.log(`      - Sent At: ${row.sent_at}`);
      console.log(`      - Created At: ${row.created_at}`);
      console.log('');
    });

    // 3. Verificar dados da tabela email_settings
    console.log('3️⃣ Verificando email_settings...');
    const emailSettings = await db.execute('SELECT * FROM email_settings');
    
    console.log(`✅ ${emailSettings.rows.length} configurações de email encontradas:`);
    emailSettings.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. Settings ID: ${row.id}`);
      console.log(`      - SMTP Host: ${row.smtp_host}`);
      console.log(`      - SMTP Port: ${row.smtp_port}`);
      console.log(`      - SMTP User: ${row.smtp_user}`);
      console.log(`      - From Email: ${row.from_email}`);
      console.log(`      - From Name: ${row.from_name}`);
      console.log(`      - Is Active: ${row.is_active}`);
      console.log(`      - Created At: ${row.created_at}`);
      console.log(`      - Updated At: ${row.updated_at}`);
      console.log('');
    });

    // 4. Verificar dados da tabela email_logs
    console.log('4️⃣ Verificando email_logs...');
    const emailLogs = await db.execute('SELECT * FROM email_logs ORDER BY id DESC LIMIT 5');
    
    console.log(`✅ ${emailLogs.rows.length} logs de email encontrados (últimos 5):`);
    emailLogs.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. Log ID: ${row.id}`);
      console.log(`      - Report ID: ${row.report_id}`);
      console.log(`      - Recipient: ${row.recipient_email}`);
      console.log(`      - Subject: ${row.subject}`);
      console.log(`      - Status: ${row.status}`);
      console.log(`      - Error: ${row.error_message}`);
      console.log(`      - Sent At: ${row.sent_at}`);
      console.log(`      - Created At: ${row.created_at}`);
      console.log('');
    });

    // 5. Verificar join com companies
    console.log('5️⃣ Verificando join com companies...');
    const joinQuery = await db.execute(`
      SELECT 
        fs.id,
        fs.company_id,
        c.name as company_name,
        fs.enabled,
        fs.email_frequency,
        fs.send_day,
        fs.send_time,
        fs.recipient_emails,
        fs.last_sent_date,
        fs.is_active
      FROM follow_up_settings fs
      LEFT JOIN companies c ON fs.company_id = c.id
      ORDER BY c.name
    `);

    console.log(`✅ ${joinQuery.rows.length} registros com join:`);
    joinQuery.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.company_name || 'EMPRESA NÃO ENCONTRADA'} (ID: ${row.company_id})`);
      console.log(`      - Enabled: ${row.enabled}`);
      console.log(`      - Frequency: ${row.email_frequency}`);
      console.log(`      - Day: ${row.send_day} Time: ${row.send_time}`);
      console.log(`      - Emails: ${row.recipient_emails ? 'Configurado' : 'Não configurado'}`);
      console.log(`      - Last Sent: ${row.last_sent_date || 'Nunca'}`);
      console.log('');
    });

    // 6. Verificar se há datas inválidas
    console.log('6️⃣ Verificando datas inválidas...');
    
    // Verificar created_at e updated_at em follow_up_settings
    const invalidDatesSettings = await db.execute(`
      SELECT id, company_id, created_at, updated_at 
      FROM follow_up_settings 
      WHERE created_at IS NULL OR updated_at IS NULL OR created_at = '' OR updated_at = ''
    `);
    
    if (invalidDatesSettings.rows.length > 0) {
      console.log(`❌ ${invalidDatesSettings.rows.length} registros com datas inválidas em follow_up_settings:`);
      invalidDatesSettings.rows.forEach(row => {
        console.log(`   - ID: ${row.id}, Company: ${row.company_id}, Created: ${row.created_at}, Updated: ${row.updated_at}`);
      });
    } else {
      console.log('✅ Todas as datas em follow_up_settings são válidas');
    }

    // Verificar created_at em follow_up_reports
    const invalidDatesReports = await db.execute(`
      SELECT id, company_id, created_at, sent_at 
      FROM follow_up_reports 
      WHERE created_at IS NULL OR created_at = ''
    `);
    
    if (invalidDatesReports.rows.length > 0) {
      console.log(`❌ ${invalidDatesReports.rows.length} registros com datas inválidas em follow_up_reports:`);
      invalidDatesReports.rows.forEach(row => {
        console.log(`   - ID: ${row.id}, Company: ${row.company_id}, Created: ${row.created_at}, Sent: ${row.sent_at}`);
      });
    } else {
      console.log('✅ Todas as datas em follow_up_reports são válidas');
    }

    console.log('\n🎯 Debug concluído!');

  } catch (error) {
    console.error('❌ Erro durante debug:', error);
  }
}

// Executar debug
debugFollowUpData().catch(console.error);
