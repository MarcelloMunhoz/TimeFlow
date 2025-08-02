// Aplicar trigger corrigido
import 'dotenv/config';
import { db } from './server/db.js';
import { sql } from 'drizzle-orm';
import fs from 'fs';

async function applyFixedTrigger() {
  console.log('🔧 Aplicando trigger CORRIGIDO para bloqueio de finais de semana...\n');

  try {
    // Ler o arquivo SQL corrigido
    const triggerSQL = fs.readFileSync('fix-db-trigger.sql', 'utf8');
    
    // Executar o SQL
    await db.execute(sql.raw(triggerSQL));
    
    console.log('✅ Trigger corrigido aplicado com sucesso!');
    
    // Testar cada dia da semana
    const testDates = [
      { date: '2024-08-12', expected: 'DOMINGO', shouldBlock: true },
      { date: '2024-08-13', expected: 'SEGUNDA', shouldBlock: false },
      { date: '2024-08-14', expected: 'TERÇA', shouldBlock: false },
      { date: '2024-08-15', expected: 'QUARTA', shouldBlock: false },
      { date: '2024-08-16', expected: 'QUINTA', shouldBlock: false },
      { date: '2024-08-17', expected: 'SEXTA', shouldBlock: false },
      { date: '2024-08-18', expected: 'SÁBADO', shouldBlock: true },
    ];
    
    console.log('\n🧪 Testando trigger corrigido:');
    
    for (const test of testDates) {
      console.log(`\n📋 Testando ${test.expected} (${test.date})`);
      
      try {
        await db.execute(sql`
          INSERT INTO appointments (
            title, description, date, start_time, duration_minutes, end_time,
            status, is_pomodoro
          ) VALUES (
            ${`Teste ${test.expected}`}, 'Teste trigger', ${test.date}, '10:00', 60, '11:00',
            'scheduled', false
          )
        `);
        
        if (test.shouldBlock) {
          console.log(`   ❌ ERRO: ${test.expected} foi inserido mas deveria ser bloqueado!`);
        } else {
          console.log(`   ✅ CORRETO: ${test.expected} foi inserido (dia útil)`);
          
          // Limpar o registro de teste
          await db.execute(sql`
            DELETE FROM appointments 
            WHERE title = ${`Teste ${test.expected}`} AND date = ${test.date}
          `);
        }
        
      } catch (error) {
        if (test.shouldBlock) {
          console.log(`   ✅ CORRETO: ${test.expected} foi bloqueado`);
          console.log(`   📋 Mensagem: ${error.message}`);
        } else {
          console.log(`   ❌ ERRO: ${test.expected} foi bloqueado mas deveria ser permitido!`);
          console.log(`   📋 Mensagem: ${error.message}`);
        }
      }
    }
    
    console.log('\n🎉 Trigger corrigido aplicado e testado!');

  } catch (error) {
    console.error('❌ Erro ao aplicar trigger corrigido:', error);
  }
}

applyFixedTrigger().catch(console.error);
