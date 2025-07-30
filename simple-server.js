// Simple server to test the API endpoints without vite
import 'dotenv/config';
import express from 'express';
import { db } from './server/db.js';
import { projects, appointments } from './shared/schema.js';
import { eq } from 'drizzle-orm';
import { updateProjectSchema } from './shared/schema.js';

const app = express();
app.use(express.json());

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Simple server is working!' });
});

// Get all projects
app.get('/api/projects', async (req, res) => {
  try {
    const allProjects = await db.select().from(projects);
    res.json(allProjects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Update project
app.patch('/api/projects/:id', async (req, res) => {
  try {
    console.log(`🔄 Updating project ${req.params.id} with data:`, JSON.stringify(req.body, null, 2));
    
    const { id } = req.params;
    const validatedData = updateProjectSchema.parse(req.body);
    
    console.log(`✅ Validated project data:`, JSON.stringify(validatedData, null, 2));
    
    const [updatedProject] = await db
      .update(projects)
      .set(validatedData)
      .where(eq(projects.id, parseInt(id)))
      .returning();
    
    if (!updatedProject) {
      console.log(`❌ Project ${id} not found`);
      return res.status(404).json({ message: "Project not found" });
    }
    
    console.log(`✅ Project ${id} updated successfully:`, JSON.stringify(updatedProject, null, 2));
    res.json(updatedProject);
  } catch (error) {
    console.error(`❌ Error updating project ${req.params.id}:`, error);
    res.status(500).json({ message: "Failed to update project", error: error.message });
  }
});

// Update all progress
app.post('/api/projects/update-all-progress', async (req, res) => {
  try {
    console.log('🚀 UPDATE ALL PROGRESS ENDPOINT CALLED!');

    const allProjects = await db.select().from(projects);
    console.log(`📋 Found ${allProjects.length} projects to update`);

    const updates = [];

    for (const project of allProjects) {
      try {
        console.log(`🔄 Processing project ${project.id}: ${project.name}`);

        const projectAppointments = await db
          .select()
          .from(appointments)
          .where(eq(appointments.projectId, project.id));

        console.log(`📅 Found ${projectAppointments.length} appointments for project ${project.id}`);

        const totalMinutes = projectAppointments.reduce((total, appointment) => {
          const minutes = appointment.actualTimeMinutes || 0;
          console.log(`  - Appointment ${appointment.id} (${appointment.title}): ${minutes} minutes`);
          return total + minutes;
        }, 0);

        console.log(`⏱️ Total minutes for project ${project.id}: ${totalMinutes}`);

        const [updateResult] = await db
          .update(projects)
          .set({ actualHours: totalMinutes })
          .where(eq(projects.id, project.id))
          .returning();

        console.log(`✅ Updated project ${project.id} actualHours to ${totalMinutes}`);

        updates.push({
          projectId: project.id,
          projectName: project.name,
          totalMinutes,
          totalHours: Math.round((totalMinutes / 60) * 10) / 10
        });
      } catch (projectError) {
        console.error(`❌ Error processing project ${project.id}:`, projectError);
      }
    }

    console.log(`📊 Updated progress for ${updates.length} projects`);

    res.json({
      success: true,
      updates,
      message: `Updated progress for ${updates.length} projects`
    });
  } catch (error) {
    console.error('❌ Error updating all projects progress:', error);
    res.status(500).json({ 
      error: 'Failed to update all projects progress',
      details: error.message
    });
  }
});

const port = 5001; // Use different port to avoid conflicts
app.listen(port, () => {
  console.log(`🚀 Simple server running on port ${port}`);
  console.log(`📋 Test endpoints:`);
  console.log(`   GET  http://localhost:${port}/api/test`);
  console.log(`   GET  http://localhost:${port}/api/projects`);
  console.log(`   PATCH http://localhost:${port}/api/projects/:id`);
  console.log(`   POST http://localhost:${port}/api/projects/update-all-progress`);
});
