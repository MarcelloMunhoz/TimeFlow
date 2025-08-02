// Aplicar trigger no banco de dados para bloquear finais de semana
import 'dotenv/config';
import { db } from './server/db.js';
import { sql } from 'drizzle-orm';
import fs from 'fs';

async function applyWeekendTrigger() {
  console.log('🔧 Aplicando trigger de bloqueio de finais de semana no banco de dados...\n');

  try {
    // Ler o arquivo SQL
    const triggerSQL = fs.readFileSync('create-weekend-trigger.sql', 'utf8');
    
    // Executar o SQL
    await db.execute(sql.raw(triggerSQL));
    
    console.log('✅ Trigger aplicado com sucesso!');
    console.log('📋 Agora o banco de dados irá bloquear automaticamente:');
    console.log('   - Sábados (dia da semana 6)');
    console.log('   - Domingos (dia da semana 0)');
    
    // Testar o trigger
    console.log('\n🧪 Testando o trigger...');
    
    try {
      await db.execute(sql`
        INSERT INTO appointments (
          title, description, date, start_time, duration_minutes, end_time,
          status, is_pomodoro
        ) VALUES (
          'Teste Trigger Sábado', 'Deve ser bloqueado', '2024-08-24', '10:00', 60, '11:00',
          'scheduled', false
        )
      `);
      
      console.log('❌ PROBLEMA: Trigger não funcionou - sábado foi inserido!');
      
    } catch (error) {
      if (error.message.includes('finais de semana')) {
        console.log('✅ SUCCESS: Trigger funcionou - sábado foi bloqueado!');
        console.log(`   Mensagem: ${error.message}`);
      } else {
        console.log('❌ Erro inesperado:', error.message);
      }
    }
    
    console.log('\n🎉 Trigger de bloqueio de finais de semana aplicado!');
    console.log('📋 Agora NENHUM agendamento de final de semana será permitido,');
    console.log('   independentemente do código da aplicação.');

  } catch (error) {
    console.error('❌ Erro ao aplicar trigger:', error);
  }
}

applyWeekendTrigger().catch(console.error);
