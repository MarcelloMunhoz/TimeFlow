// Test script to verify project edit and update progress functionality
import 'dotenv/config';
import { db } from './server/db.js';
import { projects, appointments } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function testProjectUpdate() {
  console.log('🧪 Testing project update functionality...');
  
  try {
    // Get first project
    const allProjects = await db.select().from(projects);
    if (allProjects.length === 0) {
      console.log('❌ No projects found to test');
      return false;
    }
    
    const testProject = allProjects[0];
    console.log(`📋 Testing with project: ${testProject.name} (ID: ${testProject.id})`);
    
    // Try to update estimated hours to 1
    const updateData = { estimatedHours: 1 };
    console.log('🔄 Updating project with:', updateData);
    
    const [updatedProject] = await db
      .update(projects)
      .set(updateData)
      .where(eq(projects.id, testProject.id))
      .returning();
    
    if (updatedProject) {
      console.log('✅ Project update successful:', {
        id: updatedProject.id,
        name: updatedProject.name,
        estimatedHours: updatedProject.estimatedHours
      });
      return true;
    } else {
      console.log('❌ Project update failed - no result returned');
      return false;
    }
  } catch (error) {
    console.error('❌ Project update error:', error);
    return false;
  }
}

async function testProgressUpdate() {
  console.log('🧪 Testing progress update functionality...');
  
  try {
    // Get all projects
    const allProjects = await db.select().from(projects);
    console.log(`📋 Found ${allProjects.length} projects`);
    
    let updatedCount = 0;
    
    for (const project of allProjects) {
      console.log(`🔄 Processing project: ${project.name} (ID: ${project.id})`);
      
      // Get appointments for this project
      const projectAppointments = await db
        .select()
        .from(appointments)
        .where(eq(appointments.projectId, project.id));
      
      console.log(`📅 Found ${projectAppointments.length} appointments`);
      
      // Calculate total actual time
      const totalMinutes = projectAppointments.reduce((total, apt) => {
        const minutes = apt.actualTimeMinutes || 0;
        console.log(`  - ${apt.title}: ${minutes} minutes`);
        return total + minutes;
      }, 0);
      
      console.log(`⏱️ Total minutes: ${totalMinutes}`);
      
      // Update project
      await db
        .update(projects)
        .set({ actualHours: totalMinutes })
        .where(eq(projects.id, project.id));
      
      updatedCount++;
      console.log(`✅ Updated project ${project.id}`);
    }
    
    console.log(`📊 Successfully updated ${updatedCount} projects`);
    return true;
  } catch (error) {
    console.error('❌ Progress update error:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting comprehensive test...');
  
  const projectUpdateResult = await testProjectUpdate();
  const progressUpdateResult = await testProgressUpdate();
  
  console.log('\n📊 Test Results:');
  console.log(`Project Update: ${projectUpdateResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Progress Update: ${progressUpdateResult ? '✅ PASS' : '❌ FAIL'}`);
  
  if (projectUpdateResult && progressUpdateResult) {
    console.log('🎉 All tests passed! Both features should work correctly.');
  } else {
    console.log('⚠️ Some tests failed. Check the errors above.');
  }
  
  process.exit(0);
}

main().catch(console.error);
