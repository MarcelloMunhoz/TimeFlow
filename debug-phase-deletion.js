// Debug da exclusão de fases
import 'dotenv/config';
import { db } from './server/db.ts';

async function debugPhaseDeletion() {
  console.log('🔍 DEBUG DA EXCLUSÃO DE FASES');
  console.log('=' .repeat(50));

  const phaseId = 1082;

  try {
    // 1. Verificar se a fase existe
    console.log(`\n1️⃣ Verificando se a fase ${phaseId} existe...`);
    const phaseExists = await db.execute(`SELECT * FROM phases WHERE id = ${phaseId}`);
    
    if (phaseExists.rows.length === 0) {
      console.log(`❌ Fase ${phaseId} NÃO EXISTE no banco de dados`);
      
      // Listar fases existentes
      console.log('\n📋 Fases existentes:');
      const allPhases = await db.execute('SELECT id, name FROM phases ORDER BY id DESC LIMIT 10');
      allPhases.rows.forEach(phase => {
        console.log(`   - ID: ${phase.id}, Nome: ${phase.name}`);
      });
      
      return;
    }
    
    const phase = phaseExists.rows[0];
    console.log(`✅ Fase encontrada: ${phase.name} (ID: ${phase.id})`);

    // 2. Verificar subphases
    console.log(`\n2️⃣ Verificando subphases da fase ${phaseId}...`);
    const subphases = await db.execute(`SELECT * FROM subphases WHERE phase_id = ${phaseId}`);
    
    if (subphases.rows.length > 0) {
      console.log(`❌ Fase tem ${subphases.rows.length} subphases:`);
      subphases.rows.forEach(sub => {
        console.log(`   - ID: ${sub.id}, Nome: ${sub.name}`);
      });
    } else {
      console.log('✅ Fase não tem subphases');
    }

    // 3. Verificar project_phases
    console.log(`\n3️⃣ Verificando project_phases da fase ${phaseId}...`);
    const projectPhases = await db.execute(`
      SELECT pp.*, p.name as project_name 
      FROM project_phases pp 
      LEFT JOIN projects p ON pp.project_id = p.id 
      WHERE pp.phase_id = ${phaseId}
    `);
    
    if (projectPhases.rows.length > 0) {
      console.log(`❌ Fase está associada a ${projectPhases.rows.length} projetos:`);
      projectPhases.rows.forEach(pp => {
        console.log(`   - Projeto: ${pp.project_name} (ID: ${pp.project_id})`);
      });
    } else {
      console.log('✅ Fase não está associada a projetos');
    }

    // 4. Verificar appointments
    console.log(`\n4️⃣ Verificando appointments da fase ${phaseId}...`);
    const appointments = await db.execute(`SELECT * FROM appointments WHERE phase_id = ${phaseId}`);
    
    if (appointments.rows.length > 0) {
      console.log(`❌ Fase está associada a ${appointments.rows.length} appointments:`);
      appointments.rows.forEach(apt => {
        console.log(`   - Appointment ID: ${apt.id}, Título: ${apt.title}`);
      });
    } else {
      console.log('✅ Fase não está associada a appointments');
    }

    // 5. Verificar project_subphases
    console.log(`\n5️⃣ Verificando project_subphases da fase ${phaseId}...`);
    const projectSubphases = await db.execute(`
      SELECT ps.*, s.name as subphase_name, p.name as project_name
      FROM project_subphases ps
      LEFT JOIN subphases s ON ps.subphase_id = s.id
      LEFT JOIN projects p ON ps.project_id = p.id
      WHERE s.phase_id = ${phaseId}
    `);
    
    if (projectSubphases.rows.length > 0) {
      console.log(`❌ Fase tem subphases associadas a ${projectSubphases.rows.length} projetos:`);
      projectSubphases.rows.forEach(ps => {
        console.log(`   - Projeto: ${ps.project_name}, Subphase: ${ps.subphase_name}`);
      });
    } else {
      console.log('✅ Subphases da fase não estão associadas a projetos');
    }

    // 6. Resumo
    console.log(`\n📊 RESUMO PARA FASE ${phaseId}:`);
    console.log(`   - Existe: ${phaseExists.rows.length > 0 ? 'SIM' : 'NÃO'}`);
    console.log(`   - Subphases: ${subphases.rows.length}`);
    console.log(`   - Projetos associados: ${projectPhases.rows.length}`);
    console.log(`   - Appointments: ${appointments.rows.length}`);
    console.log(`   - Project subphases: ${projectSubphases.rows.length}`);

    const canDelete = phaseExists.rows.length > 0 && 
                     subphases.rows.length === 0 && 
                     projectPhases.rows.length === 0 && 
                     appointments.rows.length === 0 &&
                     projectSubphases.rows.length === 0;

    console.log(`\n🎯 PODE DELETAR: ${canDelete ? '✅ SIM' : '❌ NÃO'}`);

    if (!canDelete) {
      console.log('\n💡 PARA DELETAR A FASE:');
      if (subphases.rows.length > 0) {
        console.log('   1. Delete todas as subphases primeiro');
      }
      if (projectPhases.rows.length > 0) {
        console.log('   2. Remova a fase dos projetos');
      }
      if (appointments.rows.length > 0) {
        console.log('   3. Remova a fase dos appointments');
      }
      if (projectSubphases.rows.length > 0) {
        console.log('   4. Remova as subphases dos projetos');
      }
      console.log('   5. Ou use force delete: DELETE /api/phases/:id/force');
    }

    // 7. Testar API diretamente
    console.log(`\n🧪 TESTANDO API DIRETAMENTE...`);
    
    try {
      const response = await fetch(`http://localhost:5000/api/phases/${phaseId}`, {
        method: 'DELETE'
      });
      
      console.log(`   Status: ${response.status}`);
      
      if (response.ok) {
        const result = await response.json();
        console.log(`   ✅ Sucesso: ${result.message}`);
      } else {
        const error = await response.json();
        console.log(`   ❌ Erro: ${error.message}`);
      }
    } catch (error) {
      console.log(`   ❌ Erro na requisição: ${error.message}`);
    }

  } catch (error) {
    console.error('\n❌ ERRO DURANTE DEBUG:', error);
  }
}

// Executar debug
debugPhaseDeletion().catch(console.error);
