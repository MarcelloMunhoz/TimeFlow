const { Pool } = require('pg');

async function runDeadlineMigration() {
  let pool;
  
  try {
    console.log('🚀 Executando migração para adicionar campo deadline...');
    
    // Create connection pool
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/timeflow'
    });
    
    // Add deadline column to projects table
    await pool.query(`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS deadline TEXT;
    `);
    
    console.log('✅ Coluna deadline adicionada com sucesso');
    
    // Add comment to document the purpose
    await pool.query(`
      COMMENT ON COLUMN projects.deadline IS 'Execution deadline in YYYY-MM-DDTHH:MM format. When set, automatically creates appointments with 1h duration and 2h SLA';
    `);
    
    console.log('✅ Comentário adicionado à coluna deadline');
    
    // Verify the column was added
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'projects' AND column_name = 'deadline';
    `);
    
    console.log('📊 Verificação da coluna deadline:');
    console.log(result.rows);
    
    console.log('🎉 Migração concluída com sucesso!');
    
  } catch (error) {
    console.error('💥 Erro durante a migração:', error);
  } finally {
    if (pool) {
      await pool.end();
    }
    process.exit(0);
  }
}

runDeadlineMigration();
