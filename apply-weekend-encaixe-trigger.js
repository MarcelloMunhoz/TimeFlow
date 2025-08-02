// Aplicar trigger atualizado que permite encaixe de finais de semana
import 'dotenv/config';
import { db } from './server/db.js';
import { sql } from 'drizzle-orm';
import fs from 'fs';

async function applyWeekendEncaixeTrigger() {
  console.log('🔧 Aplicando trigger atualizado para permitir encaixe de finais de semana...\n');

  try {
    // Ler o arquivo SQL atualizado
    const triggerSQL = fs.readFileSync('update-weekend-trigger.sql', 'utf8');
    
    // Executar o SQL
    await db.execute(sql.raw(triggerSQL));
    
    console.log('✅ Trigger atualizado aplicado com sucesso!');
    console.log('📋 Agora o sistema irá:');
    console.log('   - Bloquear finais de semana por padrão');
    console.log('   - Permitir encaixe se allow_overlap = true');
    console.log('   - Marcar agendamentos de final de semana como overtime');
    
    console.log('\n🎉 Sistema de encaixe de finais de semana ativado!');

  } catch (error) {
    console.error('❌ Erro ao aplicar trigger atualizado:', error);
  }
}

applyWeekendEncaixeTrigger().catch(console.error);
