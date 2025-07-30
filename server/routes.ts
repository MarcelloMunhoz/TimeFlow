import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertAppointmentSchema, updateAppointmentSchema,
  insertCompanySchema, updateCompanySchema,
  insertProjectSchema, updateProjectSchema,
  insertUserSchema, updateUserSchema
} from "@shared/schema";
import { z } from "zod";
import { db } from "./db";
import { projects, appointments } from "@shared/schema";
import { eq, sql, and, ne } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  console.log('🚀 REGISTERING ROUTES...');

  // ===== COMPANIES ROUTES =====

  // Get all companies
  app.get("/api/companies", async (req, res) => {
    try {
      const companies = await storage.getCompanies();
      res.json(companies);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  // Get single company
  app.get("/api/companies/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const company = await storage.getCompany(parseInt(id));
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      res.json(company);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch company" });
    }
  });

  // Create company
  app.post("/api/companies", async (req, res) => {
    try {
      const validatedData = insertCompanySchema.parse(req.body);
      const company = await storage.createCompany(validatedData);
      res.status(201).json(company);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid company data", errors: error.errors });
      }
      console.error("Error creating company:", error);
      res.status(500).json({ message: "Failed to create company" });
    }
  });

  // Update company
  app.patch("/api/companies/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = updateCompanySchema.parse(req.body);
      const company = await storage.updateCompany(parseInt(id), validatedData);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      res.json(company);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid company data", errors: error.errors });
      }
      console.error("Error updating company:", error);
      res.status(500).json({ message: "Failed to update company" });
    }
  });

  // Delete company
  app.delete("/api/companies/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteCompany(parseInt(id));
      if (!deleted) {
        return res.status(404).json({ message: "Company not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      console.error('Delete company error:', error);
      if (error.message && error.message.includes('Cannot delete company')) {
        return res.status(400).json({
          message: "Não é possível excluir esta empresa",
          details: error.message,
          type: "constraint_violation"
        });
      }
      res.status(500).json({ message: "Failed to delete company" });
    }
  });

  // ===== PROJECTS ROUTES =====

  // Get all projects
  app.get("/api/projects", async (req, res) => {
    try {
      const { companyId } = req.query;
      let projects;

      if (companyId) {
        projects = await storage.getProjectsByCompany(parseInt(companyId as string));
      } else {
        projects = await storage.getProjects();
      }

      res.json(projects);
    } catch (error: any) {
      console.error("Error fetching projects:", error);
      res.status(500).json({
        message: "Failed to fetch projects",
        details: error.message || "Unknown error"
      });
    }
  });

  // Get single project
  app.get("/api/projects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const project = await storage.getProject(parseInt(id));
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  // Create project
  app.post("/api/projects", async (req, res) => {
    try {
      console.log("Received project data:", JSON.stringify(req.body, null, 2));
      const validatedData = insertProjectSchema.parse(req.body);
      console.log("Validated project data:", JSON.stringify(validatedData, null, 2));
      const project = await storage.createProject(validatedData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  // Update project
  app.patch("/api/projects/:id", async (req, res) => {
    try {
      console.log(`🔄 Updating project ${req.params.id} with data:`, JSON.stringify(req.body, null, 2));

      const { id } = req.params;
      const validatedData = updateProjectSchema.parse(req.body);

      console.log(`✅ Validated project data:`, JSON.stringify(validatedData, null, 2));

      const project = await storage.updateProject(parseInt(id), validatedData);
      if (!project) {
        console.log(`❌ Project ${id} not found`);
        return res.status(404).json({ message: "Project not found" });
      }

      console.log(`✅ Project ${id} updated successfully:`, JSON.stringify(project, null, 2));
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error(`❌ Validation error for project ${req.params.id}:`, error.errors);
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      console.error(`❌ Error updating project ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  // Delete project
  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`DELETE /api/projects/${id} - Starting deletion process`);
      const deleted = await storage.deleteProject(parseInt(id));
      if (!deleted) {
        console.log(`DELETE /api/projects/${id} - Project not found`);
        return res.status(404).json({ message: "Project not found" });
      }
      console.log(`DELETE /api/projects/${id} - Project deleted successfully`);
      res.status(204).send();
    } catch (error: any) {
      const { id } = req.params;
      console.error(`DELETE /api/projects/${id} - Error:`, error);

      // Check for foreign key constraint violation
      if (error.code === '23503' && error.constraint === 'appointments_project_id_projects_id_fk') {
        return res.status(400).json({
          message: "Não é possível excluir este projeto",
          details: "Este projeto possui agendamentos atribuídos a ele. Remova ou reatribua os agendamentos antes de excluir o projeto.",
          type: "constraint_violation"
        });
      }

      // Check for our custom validation error (from storage layer)
      if (error.message && error.message.includes('Cannot delete project: has')) {
        return res.status(400).json({
          message: "Não é possível excluir este projeto",
          details: error.message.replace('Cannot delete project: has', 'Este projeto possui'),
          type: "constraint_violation"
        });
      }

      res.status(500).json({
        message: "Failed to delete project",
        details: error.message || "Unknown error"
      });
    }
  });

  // ===== USERS ROUTES =====

  // Get all users
  app.get("/api/users", async (req, res) => {
    try {
      const { companyId, type } = req.query;
      let users;

      if (companyId) {
        users = await storage.getUsersByCompany(parseInt(companyId as string));
      } else if (type && (type === 'internal' || type === 'external')) {
        users = await storage.getUsersByType(type);
      } else {
        users = await storage.getUsers();
      }

      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Get single user
  app.get("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.getUser(parseInt(id));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Create user
  app.post("/api/users", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(validatedData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Update user
  app.patch("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = updateUserSchema.parse(req.body);
      const user = await storage.updateUser(parseInt(id), validatedData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Delete user
  app.delete("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`DELETE /api/users/${id} - Starting deletion process`);
      const deleted = await storage.deleteUser(parseInt(id));
      if (!deleted) {
        console.log(`DELETE /api/users/${id} - User not found`);
        return res.status(404).json({ message: "User not found" });
      }
      console.log(`DELETE /api/users/${id} - User deleted successfully`);
      res.status(204).send();
    } catch (error: any) {
      const { id } = req.params;
      console.error(`DELETE /api/users/${id} - Error:`, error);

      // Check for foreign key constraint violation
      if (error.code === '23503' && error.constraint === 'appointments_assigned_user_id_users_id_fk') {
        return res.status(400).json({
          message: "Não é possível excluir este usuário",
          details: "Este usuário possui agendamentos atribuídos a ele. Remova ou reatribua os agendamentos antes de excluir o usuário.",
          type: "constraint_violation"
        });
      }

      // Check for our custom validation error (from storage layer)
      if (error.message && error.message.includes('Cannot delete user: has')) {
        return res.status(400).json({
          message: "Não é possível excluir este usuário",
          details: error.message.replace('Cannot delete user: has', 'Este usuário possui'),
          type: "constraint_violation"
        });
      }

      res.status(500).json({
        message: "Failed to delete user",
        details: error.message || "Unknown error"
      });
    }
  });

  // ===== APPOINTMENTS ROUTES =====

  // Get all appointments
  app.get("/api/appointments", async (req, res) => {
    try {
      const appointments = await storage.getAppointments();
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });

  // Get appointments by date
  app.get("/api/appointments/date/:date", async (req, res) => {
    try {
      const { date } = req.params;
      const appointments = await storage.getAppointmentsByDate(date);
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch appointments for date" });
    }
  });

  // Get appointments by date range
  app.get("/api/appointments/range", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "startDate and endDate are required" });
      }
      const appointments = await storage.getAppointmentsByDateRange(
        startDate as string,
        endDate as string
      );
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch appointments for date range" });
    }
  });

  // Get appointments by project
  app.get("/api/appointments/project/:projectId", async (req, res) => {
    try {
      const { projectId } = req.params;
      const appointments = await storage.getAppointmentsByProject(parseInt(projectId));
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch appointments for project" });
    }
  });

  // Get appointments by user
  app.get("/api/appointments/user/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const appointments = await storage.getAppointmentsByUser(parseInt(userId));
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch appointments for user" });
    }
  });

  // Get single appointment
  app.get("/api/appointments/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const appointment = await storage.getAppointment(id);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      res.json(appointment);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch appointment" });
    }
  });

  // Create appointment
  app.post("/api/appointments", async (req, res) => {
    try {
      const validatedData = insertAppointmentSchema.parse(req.body);
      const appointment = await storage.createAppointment(validatedData);
      res.status(201).json(appointment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid appointment data", errors: error.errors });
      }
      if (error instanceof Error && error.message.includes("Conflito de horário")) {
        return res.status(409).json({ message: error.message });
      }
      console.error("Error creating appointment:", error);
      res.status(500).json({ message: "Failed to create appointment" });
    }
  });

  // Update appointment
  app.patch("/api/appointments/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = updateAppointmentSchema.parse(req.body);

      // Get the current appointment before updating
      const currentAppointment = await storage.getAppointment(id);
      if (!currentAppointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      const appointment = await storage.updateAppointment(id, validatedData);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      // Enhancement 1: Auto-update project progress when task is manually completed
      if (validatedData.status === 'completed' && currentAppointment.status !== 'completed' && appointment.projectId) {
        try {
          console.log(`📊 Task manually completed - updating project progress for project ${appointment.projectId}`);

          // Use estimated time (durationMinutes) if no actual time was recorded
          const timeToAdd = appointment.actualTimeMinutes > 0
            ? appointment.actualTimeMinutes
            : appointment.durationMinutes;

          console.log(`⏱️ Adding ${timeToAdd} minutes to project progress (${appointment.actualTimeMinutes > 0 ? 'actual' : 'estimated'} time)`);

          // Get all appointments for this project
          const projectAppointments = await db
            .select()
            .from(appointments)
            .where(eq(appointments.projectId, appointment.projectId));

          // Calculate total time: actual time where available, estimated time for manually completed tasks
          const totalMinutes = projectAppointments.reduce((total, apt) => {
            if (apt.id === parseInt(id)) {
              // Use the time we calculated above for the current appointment
              return total + timeToAdd;
            }
            // For other appointments, use actual time if available, otherwise use estimated time for completed tasks
            if (apt.status === 'completed') {
              return total + (apt.actualTimeMinutes > 0 ? apt.actualTimeMinutes : apt.durationMinutes);
            }
            return total;
          }, 0);

          // Update project's actualHours (store as minutes)
          await db
            .update(projects)
            .set({ actualHours: totalMinutes })
            .where(eq(projects.id, appointment.projectId));

          console.log(`✅ Auto-updated project ${appointment.projectId} progress: ${Math.round((totalMinutes / 60) * 10) / 10}h (manual completion)`);
        } catch (error) {
          console.error('❌ Error auto-updating project progress on manual completion:', error);
          // Don't fail the appointment update if project update fails
        }
      }

      res.json(appointment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid appointment data", errors: error.errors });
      }
      if (error instanceof Error && error.message.includes("Conflito de horário")) {
        return res.status(409).json({ message: error.message });
      }
      console.error("Error updating appointment:", error);
      res.status(500).json({ message: "Failed to update appointment" });
    }
  });

  // Delete appointment
  app.delete("/api/appointments/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`🗑️ DELETE /api/appointments/${id} - Starting deletion process`);

      // Validate ID format
      const appointmentId = parseInt(id);
      if (isNaN(appointmentId)) {
        console.log(`❌ DELETE /api/appointments/${id} - Invalid ID format`);
        return res.status(400).json({ message: "Invalid appointment ID format" });
      }

      // Check if appointment exists before deletion
      const existingAppointment = await storage.getAppointment(id);
      if (!existingAppointment) {
        console.log(`❌ DELETE /api/appointments/${id} - Appointment not found`);
        return res.status(404).json({ message: "Appointment not found" });
      }

      console.log(`📋 DELETE /api/appointments/${id} - Found appointment: "${existingAppointment.title}"`);

      // Perform deletion
      const deleted = await storage.deleteAppointment(id);
      if (!deleted) {
        console.log(`❌ DELETE /api/appointments/${id} - Deletion failed (no rows affected)`);
        return res.status(500).json({ message: "Failed to delete appointment - no rows affected" });
      }

      console.log(`✅ DELETE /api/appointments/${id} - Appointment deleted successfully`);
      res.status(204).send();
    } catch (error: any) {
      console.error(`❌ DELETE /api/appointments/${req.params.id} - Error:`, error);
      console.error(`❌ DELETE /api/appointments/${req.params.id} - Stack:`, error.stack);
      res.status(500).json({
        message: "Failed to delete appointment",
        details: error.message || "Unknown error"
      });
    }
  });

  // Get productivity stats
  app.get("/api/stats/productivity", async (req, res) => {
    try {
      const stats = await storage.getProductivityStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch productivity stats" });
    }
  });

  // ===== RECURRING APPOINTMENTS ROUTES =====

  // Create recurring appointment
  app.post("/api/appointments/recurring", async (req, res) => {
    try {
      console.log('🔄 POST /api/appointments/recurring - Creating recurring appointment');
      console.log('📋 Request body:', JSON.stringify(req.body, null, 2));

      const { createRecurringAppointmentSchema } = await import('../shared/schema.js');
      const validatedData = createRecurringAppointmentSchema.parse(req.body);

      const result = await storage.createRecurringAppointment(validatedData);

      console.log(`✅ Created recurring appointment: template ID ${result.template.id}, ${result.instances.length} instances`);
      res.status(201).json(result);
    } catch (error: any) {
      console.error('❌ Error creating recurring appointment:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid recurring appointment data",
          errors: error.errors
        });
      }

      if (error instanceof Error) {
        if (error.message.includes("Validation failed")) {
          return res.status(400).json({ message: error.message });
        }
        if (error.message.includes("Conflito de horário")) {
          return res.status(409).json({ message: error.message });
        }
      }

      res.status(500).json({
        message: "Failed to create recurring appointment",
        details: error.message || "Unknown error"
      });
    }
  });

  // Get recurring task instances
  app.get("/api/appointments/recurring/:recurringTaskId", async (req, res) => {
    try {
      const { recurringTaskId } = req.params;
      console.log(`📋 GET /api/appointments/recurring/${recurringTaskId} - Fetching instances`);

      const instances = await storage.getRecurringTaskInstances(parseInt(recurringTaskId));
      console.log(`✅ Found ${instances.length} instances for recurring task ${recurringTaskId}`);

      res.json(instances);
    } catch (error: any) {
      console.error(`❌ Error fetching recurring task instances:`, error);
      res.status(500).json({
        message: "Failed to fetch recurring task instances",
        details: error.message || "Unknown error"
      });
    }
  });

  // Update recurring task series
  app.patch("/api/appointments/recurring/:recurringTaskId", async (req, res) => {
    try {
      const { recurringTaskId } = req.params;
      console.log(`🔄 PATCH /api/appointments/recurring/${recurringTaskId} - Updating series`);

      const validatedData = updateAppointmentSchema.parse(req.body);
      const updatedInstances = await storage.updateRecurringTaskSeries(parseInt(recurringTaskId), validatedData);

      console.log(`✅ Updated ${updatedInstances.length} instances in recurring series`);
      res.json(updatedInstances);
    } catch (error: any) {
      console.error(`❌ Error updating recurring task series:`, error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid update data",
          errors: error.errors
        });
      }

      res.status(500).json({
        message: "Failed to update recurring task series",
        details: error.message || "Unknown error"
      });
    }
  });

  // Delete recurring task series
  app.delete("/api/appointments/recurring/:recurringTaskId", async (req, res) => {
    try {
      const { recurringTaskId } = req.params;
      console.log(`🗑️ DELETE /api/appointments/recurring/${recurringTaskId} - Deleting series`);

      const deleted = await storage.deleteRecurringTaskSeries(parseInt(recurringTaskId));
      if (!deleted) {
        return res.status(404).json({ message: "Recurring task series not found" });
      }

      console.log(`✅ Deleted recurring task series ${recurringTaskId}`);
      res.status(204).send();
    } catch (error: any) {
      console.error(`❌ Error deleting recurring task series:`, error);
      res.status(500).json({
        message: "Failed to delete recurring task series",
        details: error.message || "Unknown error"
      });
    }
  });

  // Delete recurring task instance (with option to delete all)
  app.delete("/api/appointments/:id/recurring", async (req, res) => {
    try {
      const { id } = req.params;
      const { deleteAll } = req.query;

      console.log(`🗑️ DELETE /api/appointments/${id}/recurring - deleteAll: ${deleteAll}`);

      const deleted = await storage.deleteRecurringTaskInstance(id, deleteAll === 'true');
      if (!deleted) {
        return res.status(404).json({ message: "Recurring task instance not found" });
      }

      console.log(`✅ Deleted recurring task instance ${id}`);
      res.status(204).send();
    } catch (error: any) {
      console.error(`❌ Error deleting recurring task instance:`, error);
      res.status(500).json({
        message: "Failed to delete recurring task instance",
        details: error.message || "Unknown error"
      });
    }
  });

  // ===== TIMER ROUTES =====

  // Helper function to calculate elapsed time
  function calculateElapsedMinutes(startTime: string): number {
    // Parse the local timestamp directly
    // Format: "2025-07-30 09:50:04.891"
    const parts = startTime.split(' ');
    const datePart = parts[0]; // "2025-07-30"
    const timePart = parts[1]; // "09:50:04.891"

    const [year, month, day] = datePart.split('-').map(Number);
    const [time, ms] = timePart.split('.');
    const [hours, minutes, seconds] = time.split(':').map(Number);
    const milliseconds = ms ? parseInt(ms.padEnd(3, '0')) : 0;

    // Create date object with local time components
    const start = new Date(year, month - 1, day, hours, minutes, seconds, milliseconds);
    const now = new Date();

    // Check if the parsed date is valid
    if (isNaN(start.getTime())) {
      console.error(`❌ Invalid start time: ${startTime}`);
      return 0;
    }

    const elapsedMs = now.getTime() - start.getTime();
    const elapsedMinutes = elapsedMs / (1000 * 60);

    console.log(`⏱️ Time calculation:`);
    console.log(`   Start: ${startTime} -> ${start.toLocaleString()}`);
    console.log(`   Now:   ${now.toLocaleString()}`);
    console.log(`   Elapsed: ${elapsedMinutes.toFixed(2)} minutes`);

    // Return 0 if negative or unreasonable (more than 24 hours)
    if (elapsedMinutes < 0 || elapsedMinutes > 1440) {
      console.warn(`⚠️ Unreasonable elapsed time: ${elapsedMinutes.toFixed(2)} minutes, returning 0`);
      return 0;
    }

    return Math.round(elapsedMinutes);
  }

  // Project progress update endpoint
  app.post('/api/projects/:id/update-progress', async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);

      // Get all appointments for this project
      const projectAppointments = await db
        .select()
        .from(appointments)
        .where(eq(appointments.projectId, projectId));

      // Calculate total actual time in minutes from all appointments
      const totalMinutes = projectAppointments.reduce((total, appointment) => {
        return total + (appointment.actualTimeMinutes || 0);
      }, 0);

      // Store total minutes directly (we'll convert to hours in frontend)
      // Update project's actualHours (storing as minutes for precision)
      await db
        .update(projects)
        .set({ actualHours: totalMinutes })
        .where(eq(projects.id, projectId));

      console.log(`📊 Updated project ${projectId} progress: ${totalMinutes} minutes`);

      res.json({
        success: true,
        totalMinutes,
        message: `Project progress updated: ${Math.round((totalMinutes / 60) * 10) / 10}h`
      });
    } catch (error) {
      console.error('❌ Error updating project progress:', error);
      res.status(500).json({ error: 'Failed to update project progress' });
    }
  });

  // Test endpoint to debug routing issues
  console.log('📝 Registering test debug endpoint: POST /api/test-debug');
  app.post('/api/test-debug', async (req, res) => {
    console.log('🧪 TEST DEBUG ENDPOINT CALLED!');
    res.json({ success: true, message: 'Test endpoint working!' });
  });

  // Enhancement 2: Auto-complete overdue Pomodoro tasks
  console.log('📝 Registering auto-complete-pomodoros endpoint: POST /api/appointments/auto-complete-pomodoros');
  app.post('/api/appointments/auto-complete-pomodoros', async (req, res) => {
    try {
      console.log('🍅 AUTO-COMPLETE POMODOROS ENDPOINT CALLED!');

      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes since midnight
      const today = now.toISOString().split('T')[0]; // Today's date in YYYY-MM-DD format

      console.log(`⏰ Current time: ${now.toLocaleTimeString()}, checking for overdue Pomodoros on ${today}`);

      // Get all Pomodoro tasks that are scheduled for today and not yet completed
      const overduePomodoros = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.isPomodoro, true),
            eq(appointments.date, today),
            ne(appointments.status, 'completed'),
            ne(appointments.status, 'cancelled')
          )
        );

      console.log(`📋 Found ${overduePomodoros.length} Pomodoro tasks to check`);

      const autoCompletedTasks = [];
      const projectUpdates = new Map(); // Track project updates to avoid duplicates

      for (const pomodoro of overduePomodoros) {
        try {
          // Parse start time and calculate end time
          const [startHours, startMinutes] = pomodoro.startTime.split(':').map(Number);
          const startTimeMinutes = startHours * 60 + startMinutes;
          const endTimeMinutes = startTimeMinutes + pomodoro.durationMinutes;

          console.log(`🔍 Checking Pomodoro "${pomodoro.title}": ${pomodoro.startTime} - ${Math.floor(endTimeMinutes / 60).toString().padStart(2, '0')}:${(endTimeMinutes % 60).toString().padStart(2, '0')}`);

          // Check if the Pomodoro's scheduled end time has passed
          if (currentTime > endTimeMinutes) {
            console.log(`⏰ Pomodoro "${pomodoro.title}" is overdue, auto-completing...`);

            // Auto-complete the Pomodoro task
            const completedAt = now.toISOString();
            await db
              .update(appointments)
              .set({
                status: 'completed',
                completedAt: completedAt,
                // Use estimated duration for actualTimeMinutes since timer wasn't used
                actualTimeMinutes: pomodoro.durationMinutes
              })
              .where(eq(appointments.id, pomodoro.id));

            autoCompletedTasks.push({
              id: pomodoro.id,
              title: pomodoro.title,
              startTime: pomodoro.startTime,
              durationMinutes: pomodoro.durationMinutes,
              projectId: pomodoro.projectId,
              completedAt
            });

            // Track project for progress update
            if (pomodoro.projectId) {
              if (!projectUpdates.has(pomodoro.projectId)) {
                projectUpdates.set(pomodoro.projectId, []);
              }
              projectUpdates.get(pomodoro.projectId).push(pomodoro);
            }

            console.log(`✅ Auto-completed Pomodoro "${pomodoro.title}" (${pomodoro.durationMinutes} minutes)`);
          } else {
            const remainingMinutes = endTimeMinutes - currentTime;
            console.log(`⏳ Pomodoro "${pomodoro.title}" still has ${remainingMinutes} minutes remaining`);
          }
        } catch (taskError) {
          console.error(`❌ Error processing Pomodoro task ${pomodoro.id}:`, taskError);
          // Continue with other tasks even if one fails
        }
      }

      // Update project progress for affected projects
      const projectProgressUpdates = [];
      for (const [projectId, completedPomodoros] of projectUpdates) {
        try {
          console.log(`📊 Updating progress for project ${projectId} (${completedPomodoros.length} auto-completed Pomodoros)`);

          // Get all appointments for this project
          const projectAppointments = await db
            .select()
            .from(appointments)
            .where(eq(appointments.projectId, projectId));

          // Calculate total time: actual time where available, estimated time for completed tasks
          const totalMinutes = projectAppointments.reduce((total, apt) => {
            if (apt.status === 'completed') {
              // Use actual time if available, otherwise use estimated time
              return total + (apt.actualTimeMinutes > 0 ? apt.actualTimeMinutes : apt.durationMinutes);
            }
            return total;
          }, 0);

          // Update project's actualHours (store as minutes)
          await db
            .update(projects)
            .set({ actualHours: totalMinutes })
            .where(eq(projects.id, projectId));

          projectProgressUpdates.push({
            projectId,
            totalMinutes,
            totalHours: Math.round((totalMinutes / 60) * 10) / 10,
            autoCompletedTasks: completedPomodoros.length
          });

          console.log(`✅ Updated project ${projectId} progress: ${Math.round((totalMinutes / 60) * 10) / 10}h`);
        } catch (projectError) {
          console.error(`❌ Error updating project ${projectId} progress:`, projectError);
          // Continue with other projects even if one fails
        }
      }

      console.log(`🎉 Auto-completed ${autoCompletedTasks.length} overdue Pomodoro tasks`);
      console.log(`📊 Updated progress for ${projectProgressUpdates.length} projects`);

      res.json({
        success: true,
        autoCompletedTasks,
        projectProgressUpdates,
        message: `Auto-completed ${autoCompletedTasks.length} overdue Pomodoro tasks and updated ${projectProgressUpdates.length} project(s)`
      });
    } catch (error) {
      console.error('❌ Error auto-completing Pomodoro tasks:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({
        error: 'Failed to auto-complete Pomodoro tasks',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Endpoint to update all projects progress
  console.log('📝 Registering update-all-progress endpoint: POST /api/projects/update-all-progress');
  app.post('/api/projects/update-all-progress', async (req, res) => {
    try {
      console.log('🚀 UPDATE ALL PROGRESS ENDPOINT CALLED!');

      // Get all projects
      const allProjects = await db.select().from(projects);
      console.log(`📋 Found ${allProjects.length} projects to update`);

      const updates = [];

      for (const project of allProjects) {
        try {
          console.log(`🔄 Processing project ${project.id}: ${project.name}`);

          // Get all appointments for this project
          const projectAppointments = await db
            .select()
            .from(appointments)
            .where(eq(appointments.projectId, project.id));

          console.log(`📅 Found ${projectAppointments.length} appointments for project ${project.id}`);

          // Calculate total time: actual time where available, estimated time for completed tasks
          const totalMinutes = projectAppointments.reduce((total, appointment) => {
            let minutes = 0;
            if (appointment.status === 'completed') {
              // Use actual time if available, otherwise use estimated time for completed tasks
              minutes = appointment.actualTimeMinutes > 0 ? appointment.actualTimeMinutes : appointment.durationMinutes;
              console.log(`  - Appointment ${appointment.id} (${appointment.title}): ${minutes} minutes (${appointment.actualTimeMinutes > 0 ? 'actual' : 'estimated'})`);
            } else {
              console.log(`  - Appointment ${appointment.id} (${appointment.title}): 0 minutes (not completed)`);
            }
            return total + minutes;
          }, 0);

          console.log(`⏱️ Total minutes for project ${project.id}: ${totalMinutes}`);

          // Update project (store as minutes)
          const updateResult = await db
            .update(projects)
            .set({ actualHours: totalMinutes })
            .where(eq(projects.id, project.id))
            .returning();

          console.log(`✅ Updated project ${project.id} actualHours to ${totalMinutes}. Result:`, updateResult);

          updates.push({
            projectId: project.id,
            projectName: project.name,
            totalMinutes,
            totalHours: Math.round((totalMinutes / 60) * 10) / 10
          });
        } catch (projectError) {
          console.error(`❌ Error processing project ${project.id}:`, projectError);
          // Continue with other projects even if one fails
        }
      }

      console.log(`📊 Updated progress for ${updates.length} projects`);
      console.log('📤 Sending response with updates:', updates);

      res.json({
        success: true,
        updates,
        message: `Updated progress for ${updates.length} projects`
      });
    } catch (error) {
      console.error('❌ Error updating all projects progress:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({
        error: 'Failed to update all projects progress',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Start timer for an appointment
  app.post("/api/appointments/:id/timer/start", async (req, res) => {
    try {
      const appointmentId = parseInt(req.params.id);

      // Get current appointment
      const appointment = await storage.getAppointment(appointmentId.toString());

      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }

      // Check if timer is already running
      if (appointment.timerState === "running") {
        return res.status(400).json({ error: "Timer is already running" });
      }

      // Start the timer - use local timestamp
      const now = new Date();
      const localTimestamp = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0') + ' ' +
        String(now.getHours()).padStart(2, '0') + ':' +
        String(now.getMinutes()).padStart(2, '0') + ':' +
        String(now.getSeconds()).padStart(2, '0') + '.' +
        String(now.getMilliseconds()).padStart(3, '0');

      await storage.updateAppointment(appointmentId.toString(), {
        timerState: "running",
        timerStartedAt: localTimestamp,
        timerPausedAt: null,
      });

      res.json({ success: true, message: "Timer started", startedAt: now });
    } catch (error) {
      console.error("Error starting timer:", error);
      res.status(500).json({ error: "Failed to start timer" });
    }
  });

  // Pause timer for an appointment
  app.post("/api/appointments/:id/timer/pause", async (req, res) => {
    try {
      const appointmentId = parseInt(req.params.id);

      // Get current appointment
      const appointment = await storage.getAppointment(appointmentId.toString());

      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }

      // Check if timer is running
      if (appointment.timerState !== "running") {
        return res.status(400).json({ error: "Timer is not running" });
      }

      // Calculate elapsed time since start
      const elapsedMinutes = calculateElapsedMinutes(appointment.timerStartedAt!);
      const newAccumulatedTime = (appointment.accumulatedTimeMinutes || 0) + elapsedMinutes;

      // Pause the timer - use local timestamp
      const now = new Date();
      const localTimestamp = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0') + ' ' +
        String(now.getHours()).padStart(2, '0') + ':' +
        String(now.getMinutes()).padStart(2, '0') + ':' +
        String(now.getSeconds()).padStart(2, '0') + '.' +
        String(now.getMilliseconds()).padStart(3, '0');

      await storage.updateAppointment(appointmentId.toString(), {
        timerState: "paused",
        timerPausedAt: localTimestamp,
        accumulatedTimeMinutes: newAccumulatedTime,
        actualTimeMinutes: newAccumulatedTime,
      });

      // Update project progress if appointment is linked to a project
      if (appointment.projectId) {
        try {
          // Get all appointments for this project
          const projectAppointments = await db
            .select()
            .from(appointments)
            .where(eq(appointments.projectId, appointment.projectId));

          // Calculate total actual time in minutes from all appointments
          const totalMinutes = projectAppointments.reduce((total, apt) => {
            // Use updated time for current appointment, existing time for others
            if (apt.id === appointmentId) {
              return total + newAccumulatedTime;
            }
            return total + (apt.actualTimeMinutes || 0);
          }, 0);

          // Update project's actualHours (store as minutes)
          await db
            .update(projects)
            .set({ actualHours: totalMinutes })
            .where(eq(projects.id, appointment.projectId));

          console.log(`📊 Auto-updated project ${appointment.projectId} progress: ${Math.round((totalMinutes / 60) * 10) / 10}h`);
        } catch (error) {
          console.error('❌ Error auto-updating project progress:', error);
          // Don't fail the timer pause if project update fails
        }
      }

      res.json({
        success: true,
        message: "Timer paused",
        pausedAt: now,
        elapsedMinutes,
        totalMinutes: newAccumulatedTime
      });
    } catch (error) {
      console.error("Error pausing timer:", error);
      res.status(500).json({ error: "Failed to pause timer" });
    }
  });

  // Resume timer for an appointment
  app.post("/api/appointments/:id/timer/resume", async (req, res) => {
    try {
      const appointmentId = parseInt(req.params.id);

      // Get current appointment
      const appointment = await storage.getAppointment(appointmentId.toString());

      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }

      // Check if timer is paused
      if (appointment.timerState !== "paused") {
        return res.status(400).json({ error: "Timer is not paused" });
      }

      // Resume the timer - use local timestamp
      const now = new Date();
      const localTimestamp = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0') + ' ' +
        String(now.getHours()).padStart(2, '0') + ':' +
        String(now.getMinutes()).padStart(2, '0') + ':' +
        String(now.getSeconds()).padStart(2, '0') + '.' +
        String(now.getMilliseconds()).padStart(3, '0');

      await storage.updateAppointment(appointmentId.toString(), {
        timerState: "running",
        timerStartedAt: localTimestamp,
        timerPausedAt: null,
      });

      res.json({ success: true, message: "Timer resumed", resumedAt: localTimestamp });
    } catch (error) {
      console.error("Error resuming timer:", error);
      res.status(500).json({ error: "Failed to resume timer" });
    }
  });

  // Complete appointment and stop timer
  app.post("/api/appointments/:id/timer/complete", async (req, res) => {
    try {
      const appointmentId = parseInt(req.params.id);

      // Get current appointment
      const appointment = await storage.getAppointment(appointmentId.toString());

      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }

      let finalTimeMinutes = appointment.accumulatedTimeMinutes || 0;

      // If timer is running, calculate final elapsed time
      if (appointment.timerState === "running" && appointment.timerStartedAt) {
        const elapsedMinutes = calculateElapsedMinutes(appointment.timerStartedAt);
        finalTimeMinutes += elapsedMinutes;
      }

      // Complete the appointment
      const now = new Date().toISOString();
      await storage.updateAppointment(appointmentId.toString(), {
        status: "completed",
        timerState: "stopped",
        completedAt: now,
        actualTimeMinutes: finalTimeMinutes,
        accumulatedTimeMinutes: finalTimeMinutes,
        timerStartedAt: null,
        timerPausedAt: null,
      });

      // Update project progress if appointment is linked to a project
      if (appointment.projectId) {
        try {
          // Get all appointments for this project
          const projectAppointments = await db
            .select()
            .from(appointments)
            .where(eq(appointments.projectId, appointment.projectId));

          // Calculate total actual time in minutes from all appointments
          const totalMinutes = projectAppointments.reduce((total, apt) => {
            // Use final time for current appointment, existing time for others
            if (apt.id === appointmentId) {
              return total + finalTimeMinutes;
            }
            return total + (apt.actualTimeMinutes || 0);
          }, 0);

          // Update project's actualHours (store as minutes)
          await db
            .update(projects)
            .set({ actualHours: totalMinutes })
            .where(eq(projects.id, appointment.projectId));

          console.log(`📊 Auto-updated project ${appointment.projectId} progress: ${Math.round((totalMinutes / 60) * 10) / 10}h (task completed)`);
        } catch (error) {
          console.error('❌ Error auto-updating project progress:', error);
          // Don't fail the completion if project update fails
        }
      }

      res.json({
        success: true,
        message: "Appointment completed",
        completedAt: now,
        finalTimeMinutes
      });
    } catch (error) {
      console.error("Error completing appointment:", error);
      res.status(500).json({ error: "Failed to complete appointment" });
    }
  });

  // Get timer status for an appointment
  app.get("/api/appointments/:id/timer/status", async (req, res) => {
    try {
      const appointmentId = parseInt(req.params.id);

      // Disable caching for timer status
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');

      // Get current appointment
      const appointment = await storage.getAppointment(appointmentId.toString());

      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }

      let currentTimeMinutes = appointment.accumulatedTimeMinutes || 0;

      // If timer is running, add current session time
      if (appointment.timerState === "running" && appointment.timerStartedAt) {
        const elapsedMinutes = calculateElapsedMinutes(appointment.timerStartedAt);
        currentTimeMinutes += elapsedMinutes;
      }

      const response = {
        timerState: appointment.timerState,
        estimatedMinutes: appointment.durationMinutes,
        actualTimeMinutes: currentTimeMinutes,
        accumulatedTimeMinutes: appointment.accumulatedTimeMinutes || 0,
        timerStartedAt: appointment.timerStartedAt,
        timerPausedAt: appointment.timerPausedAt,
        status: appointment.status,
        completedAt: appointment.completedAt,
      };

      console.log(`🔍 Timer status for appointment ${appointmentId}:`, response);
      res.json(response);
    } catch (error) {
      console.error("Error getting timer status:", error);
      res.status(500).json({ error: "Failed to get timer status" });
    }
  });

  // Migrate timer fields (temporary route)
  app.post("/api/migrate-timer-fields", async (req, res) => {
    try {
      await storage.migrateTimerFields();
      res.json({ success: true, message: "Timer fields migrated successfully" });
    } catch (error) {
      console.error("Migration error:", error);
      res.status(500).json({ error: "Migration failed", details: error.message });
    }
  });

  // Reset timer for an appointment (temporary route)
  app.post("/api/appointments/:id/timer/reset", async (req, res) => {
    try {
      const appointmentId = parseInt(req.params.id);

      await storage.updateAppointment(appointmentId.toString(), {
        timerState: "stopped",
        timerStartedAt: null,
        timerPausedAt: null,
        accumulatedTimeMinutes: 0,
        actualTimeMinutes: 0,
      });

      res.json({ success: true, message: "Timer reset successfully" });
    } catch (error) {
      console.error("Timer reset error:", error);
      res.status(500).json({ error: "Timer reset failed", details: error.message });
    }
  });

  // Reset project hours migration (temporary route)
  app.post("/api/migrate-project-hours", async (req, res) => {
    try {
      console.log("🔄 Resetting project hours to use minutes-based storage...");

      // First, update any null values specifically using raw SQL
      const nullUpdateResult = await db.execute(sql`UPDATE projects SET actual_hours = 0 WHERE actual_hours IS NULL`);
      console.log(`📝 Updated ${nullUpdateResult.rowsAffected || 0} projects with null actual_hours`);

      // Then reset all project actualHours to 0 to ensure consistency
      const allUpdateResult = await db.update(projects).set({ actualHours: 0 });
      console.log(`📝 Reset all project actual_hours to 0`);

      console.log("✅ Project hours reset completed!");
      res.json({
        success: true,
        message: "Project hours reset successfully",
        nullUpdated: nullUpdateResult.rowsAffected || 0
      });
    } catch (error) {
      console.error("Project hours migration error:", error);
      res.status(500).json({ error: "Project hours migration failed", details: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
