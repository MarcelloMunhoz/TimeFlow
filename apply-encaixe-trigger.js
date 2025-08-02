// Aplicar trigger que permite QUALQUER agendamento quando for encaixe
import 'dotenv/config';
import { db } from './server/db.js';
import { sql } from 'drizzle-orm';
import fs from 'fs';

async function applyEncaixeTrigger() {
  console.log('🔧 Aplicando trigger de ENCAIXE TOTAL...\n');

  try {
    // Ler o arquivo SQL
    const triggerSQL = fs.readFileSync('update-encaixe-trigger.sql', 'utf8');
    
    // Executar o SQL
    await db.execute(sql.raw(triggerSQL));
    
    console.log('✅ Trigger de ENCAIXE TOTAL aplicado com sucesso!');
    console.log('📋 Agora o sistema irá:');
    console.log('   - Bloquear finais de semana por padrão');
    console.log('   - PERMITIR TUDO quando allow_overlap = true (encaixe)');
    console.log('   - Encaixe ignora: finais de semana, conflitos, horário de almoço');
    console.log('   - Encaixe permite: empilhar agendamentos no mesmo horário');
    
    console.log('\n🎉 Sistema de ENCAIXE TOTAL ativado!');
    console.log('💡 Encaixe = Sem nenhuma restrição!');

  } catch (error) {
    console.error('❌ Erro ao aplicar trigger:', error);
  }
}

applyEncaixeTrigger().catch(console.error);
