import { Client } from 'pg';

async function testSubphasesCount() {
  const client = new Client({
    connectionString: 'postgres://timeflow:timeflow123@localhost:5432/timeflowdb'
  });

  try {
    await client.connect();
    console.log('🔗 Connected to database');

    console.log('\n📊 Testing Subphases Count');
    console.log('=' .repeat(40));

    // Count total subphases in database
    const totalSubphases = await client.query('SELECT COUNT(*) as count FROM subphases');
    console.log(`📋 Total subphases in database: ${totalSubphases.rows[0].count}`);

    // Count active subphases
    const activeSubphases = await client.query('SELECT COUNT(*) as count FROM subphases WHERE is_active = true');
    console.log(`✅ Active subphases: ${activeSubphases.rows[0].count}`);

    // List all subphases with their phases
    const subphasesList = await client.query(`
      SELECT s.id, s.name, s.is_active, p.name as phase_name
      FROM subphases s
      JOIN phases p ON s.phase_id = p.id
      ORDER BY s.id
    `);

    console.log(`\n📋 All subphases (${subphasesList.rows.length} total):`);
    subphasesList.rows.forEach((subphase, index) => {
      const status = subphase.is_active ? '✅' : '❌';
      console.log(`  ${index + 1}. ${status} ${subphase.name} (Phase: ${subphase.phase_name}) - ID: ${subphase.id}`);
    });

    // Test the API endpoint simulation
    console.log('\n🔍 Testing what the API endpoint should return...');
    const apiResult = await client.query(`
      SELECT s.* FROM subphases s 
      WHERE s.is_active = true 
      ORDER BY s.order_index, s.name
    `);

    console.log(`📡 API endpoint should return ${apiResult.rows.length} subphases`);

    if (apiResult.rows.length === 0) {
      console.log('\n⚠️  WARNING: No active subphases found!');
      console.log('This explains why the dashboard shows 0 subphases.');
      
      // Check if there are inactive subphases
      const inactiveCount = await client.query('SELECT COUNT(*) as count FROM subphases WHERE is_active = false');
      if (inactiveCount.rows[0].count > 0) {
        console.log(`💡 Found ${inactiveCount.rows[0].count} inactive subphases. Consider activating them.`);
      }
    } else {
      console.log('\n🎉 SUCCESS: Active subphases found! The dashboard should show the correct count.');
    }

  } catch (error) {
    console.error('❌ Error testing subphases count:', error);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

testSubphasesCount();
