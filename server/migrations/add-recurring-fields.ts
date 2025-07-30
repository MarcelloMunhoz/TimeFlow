import { db } from '../db.js';

export async function addRecurringFields() {
  console.log('🔄 Starting recurring task fields migration...');
  
  const migrations = [
    {
      name: 'is_recurring',
      sql: 'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false',
    },
    {
      name: 'recurrence_pattern',
      sql: 'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT',
    },
    {
      name: 'recurrence_interval',
      sql: 'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER DEFAULT 1',
    },
    {
      name: 'recurrence_end_date',
      sql: 'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS recurrence_end_date TEXT',
    },
    {
      name: 'recurrence_end_count',
      sql: 'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS recurrence_end_count INTEGER',
    },
    {
      name: 'parent_task_id',
      sql: 'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS parent_task_id INTEGER',
    },
    {
      name: 'recurring_task_id',
      sql: 'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS recurring_task_id INTEGER',
    },
    {
      name: 'is_recurring_template',
      sql: 'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS is_recurring_template BOOLEAN DEFAULT false',
    },
    {
      name: 'original_date',
      sql: 'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS original_date TEXT',
    },
    {
      name: 'was_rescheduled_from_weekend',
      sql: 'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS was_rescheduled_from_weekend BOOLEAN DEFAULT false',
    },
  ];

  for (const migration of migrations) {
    try {
      console.log(`📝 Executing: ${migration.sql}`);
      await db.execute(migration.sql);
      console.log(`✅ Query executed successfully`);
    } catch (error) {
      console.error(`❌ Error executing migration for ${migration.name}:`, error);
      throw error;
    }
  }

  console.log('🎉 Recurring task fields migration completed successfully!');
}
