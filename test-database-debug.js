// Debug test for database structure
import 'dotenv/config';
import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

async function testDatabaseDebug() {
  console.log('🧪 Testing Database structure...\n');

  try {
    // Step 1: Check if project_phases table exists and its structure
    console.log('📅 Step 1: Check project_phases table structure');
    
    const tableInfo = await db.execute(sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'project_phases'
      ORDER BY ordinal_position
    `);
    
    console.log('Table structure:', tableInfo.rows);
    
    // Step 2: Check current data in project_phases table
    console.log('\n📅 Step 2: Check current data in project_phases table');
    
    const currentData = await db.execute(sql`SELECT * FROM project_phases`);
    console.log('Current data:', currentData.rows);
    
    // Step 3: Insert a test record directly
    console.log('\n📅 Step 3: Insert test record directly');
    
    const insertResult = await db.execute(sql`
      INSERT INTO project_phases (project_id, phase_id, deadline, created_at) 
      VALUES (20, 1, '2024-12-31', now()::text)
      ON CONFLICT (project_id, phase_id) DO UPDATE SET deadline = EXCLUDED.deadline
      RETURNING *
    `);
    
    console.log('Insert result:', insertResult.rows);
    
    // Step 4: Try to find the record
    console.log('\n📅 Step 4: Find the record');
    
    const findResult = await db.execute(sql`
      SELECT * FROM project_phases 
      WHERE project_id = 20 AND phase_id = 1
    `);
    
    console.log('Find result:', findResult.rows);
    
    // Step 5: Try to delete the record directly
    console.log('\n📅 Step 5: Delete the record directly');
    
    const deleteResult = await db.execute(sql`
      DELETE FROM project_phases 
      WHERE project_id = 20 AND phase_id = 1
    `);
    
    console.log('Delete result:', deleteResult);
    console.log('Rows affected:', deleteResult.rowsAffected);
    
    // Step 6: Verify deletion
    console.log('\n📅 Step 6: Verify deletion');
    
    const verifyResult = await db.execute(sql`
      SELECT * FROM project_phases 
      WHERE project_id = 20 AND phase_id = 1
    `);
    
    console.log('Verify result:', verifyResult.rows);
    
    console.log('\n🎉 Database debug test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testDatabaseDebug().catch(console.error);
