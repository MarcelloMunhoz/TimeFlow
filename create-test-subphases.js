import { Client } from 'pg';

async function createTestSubphases() {
  const client = new Client({
    connectionString: 'postgres://timeflow:timeflow123@localhost:5432/timeflowdb'
  });

  try {
    await client.connect();
    console.log('🔗 Connected to database');

    // Check existing phases
    console.log('📋 Checking existing phases...');
    const phases = await client.query('SELECT id, name FROM phases ORDER BY id');
    console.log(`Found ${phases.rows.length} phases:`);
    phases.rows.forEach(phase => {
      console.log(`  - ${phase.name} (ID: ${phase.id})`);
    });

    if (phases.rows.length === 0) {
      console.log('❌ No phases found. Please ensure phases are seeded.');
      return;
    }

    // Create subphases for the first phase
    const firstPhase = phases.rows[0];
    console.log(`\n📝 Creating subphases for phase: ${firstPhase.name}`);

    const subphases = [
      {
        name: 'Requirements Gathering',
        description: 'Collect and document project requirements',
        orderIndex: 1,
        estimatedDurationDays: 3,
        isRequired: true
      },
      {
        name: 'Analysis & Design',
        description: 'Analyze requirements and create design documents',
        orderIndex: 2,
        estimatedDurationDays: 5,
        isRequired: true
      },
      {
        name: 'Implementation Planning',
        description: 'Plan the implementation approach and timeline',
        orderIndex: 3,
        estimatedDurationDays: 2,
        isRequired: true
      }
    ];

    for (const subphase of subphases) {
      const result = await client.query(`
        INSERT INTO subphases (phase_id, name, description, order_index, estimated_duration_days, is_required)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name
      `, [firstPhase.id, subphase.name, subphase.description, subphase.orderIndex, subphase.estimatedDurationDays, subphase.isRequired]);

      console.log(`✅ Created subphase: ${result.rows[0].name} (ID: ${result.rows[0].id})`);
    }

    console.log('\n🎉 Test subphases created successfully!');

  } catch (error) {
    console.error('❌ Error creating test subphases:', error);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

createTestSubphases();
