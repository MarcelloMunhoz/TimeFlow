import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertAppointmentSchema, updateAppointmentSchema,
  insertCompanySchema, updateCompanySchema,
  insertProjectSchema, updateProjectSchema,
  insertUserSchema, updateUserSchema,
  insertPhaseSchema, updatePhaseSchema,
  insertProjectPhaseSchema, updateProjectPhaseSchema,
  insertSubphaseSchema, updateSubphaseSchema,
  insertProjectSubphaseSchema, updateProjectSubphaseSchema
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

  // Get project management KPIs
  app.get("/api/projects/kpis", async (req, res) => {
    try {
      console.log("📊 KPIs endpoint called with query:", req.query);
      const { startDate, endDate, companyId, status } = req.query;

      const filters: any = {};
      if (startDate) filters.startDate = startDate as string;
      if (endDate) filters.endDate = endDate as string;
      if (companyId) filters.companyId = parseInt(companyId as string);
      if (status) filters.status = status as string;

      console.log("📊 Calling calculateProjectKPIs with filters:", filters);
      const kpis = await storage.calculateProjectKPIs(filters);
      console.log("📊 KPIs calculated successfully:", kpis);
      res.json(kpis);
    } catch (error) {
      console.error("💥 Error calculating project KPIs:", error);
      res.status(500).json({ message: "Failed to calculate project KPIs" });
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

  // Create project (enhanced for BI templates)
  app.post("/api/projects", async (req, res) => {
    try {
      console.log("Received project data:", JSON.stringify(req.body, null, 2));
      const validatedData = insertProjectSchema.parse(req.body);
      console.log("Validated project data:", JSON.stringify(validatedData, null, 2));

      // Create the project
      const project = await storage.createProject(validatedData);
      console.log("✅ Project created:", project.id);

      // If a BI template is specified, generate the roadmap automatically
      if (validatedData.templateId && validatedData.startDate) {
        try {
          console.log(`🗺️ Generating roadmap for project ${project.id} using template ${validatedData.templateId}`);
          const roadmap = await storage.generateProjectRoadmap(
            project.id,
            validatedData.templateId,
            validatedData.startDate
          );
          console.log(`✅ Roadmap generated with ${roadmap.length} items`);

          // Update project with first stage as current stage
          if (roadmap.length > 0) {
            const firstStage = roadmap.find(item => item.stage_id && !item.main_task_id);
            if (firstStage) {
              await storage.updateProject(project.id, {
                currentStageId: firstStage.stage_id,
                actualStartDate: validatedData.startDate
              });
              console.log(`✅ Project updated with current stage: ${firstStage.stage_id}`);
            }
          }

          // Return project with roadmap information
          res.status(201).json({
            ...project,
            roadmapGenerated: true,
            roadmapItemsCount: roadmap.length
          });
        } catch (roadmapError) {
          console.error("Error generating roadmap:", roadmapError);
          // Still return the project even if roadmap generation fails
          res.status(201).json({
            ...project,
            roadmapGenerated: false,
            roadmapError: "Failed to generate roadmap"
          });
        }
      } else {
        // No template specified, return project as normal
        res.status(201).json(project);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  // Create BI project with template (specialized endpoint)
  app.post("/api/projects/bi", async (req, res) => {
    try {
      console.log("🚀 Creating BI project with template:", JSON.stringify(req.body, null, 2));

      const { templateId, startDate, ...projectData } = req.body;

      if (!templateId) {
        return res.status(400).json({ message: "Template ID is required for BI projects" });
      }

      if (!startDate) {
        return res.status(400).json({ message: "Start date is required for BI projects" });
      }

      // Get template information for validation and defaults
      const template = await storage.getBiProjectTemplate(templateId);
      if (!template) {
        return res.status(404).json({ message: "BI template not found" });
      }

      // Prepare project data with BI defaults
      const biProjectData = {
        ...projectData,
        templateId: parseInt(templateId),
        biCategory: template.category,
        startDate,
        estimatedHours: template.estimated_duration_weeks * 40, // Rough estimate: 40 hours per week
        riskLevel: template.complexity === 'complex' ? 'high' : template.complexity === 'medium' ? 'medium' : 'low'
      };

      console.log("📋 BI project data prepared:", JSON.stringify(biProjectData, null, 2));

      // Validate the data
      const validatedData = insertProjectSchema.parse(biProjectData);

      // Create the project
      const project = await storage.createProject(validatedData);
      console.log("✅ BI project created:", project.id);

      // Generate roadmap automatically
      console.log(`🗺️ Generating roadmap for BI project ${project.id}`);
      const roadmap = await storage.generateProjectRoadmap(
        project.id,
        templateId,
        startDate
      );
      console.log(`✅ Roadmap generated with ${roadmap.length} items`);

      // Update project with first stage as current stage
      if (roadmap.length > 0) {
        const firstStage = roadmap.find(item => item.stage_id && !item.main_task_id);
        if (firstStage) {
          await storage.updateProject(project.id, {
            currentStageId: firstStage.stage_id,
            actualStartDate: startDate
          });
          console.log(`✅ BI project updated with current stage: ${firstStage.stage_id}`);
        }
      }

      // Return comprehensive response
      res.status(201).json({
        project,
        template,
        roadmap,
        summary: {
          roadmapItemsCount: roadmap.length,
          estimatedDurationWeeks: template.estimated_duration_weeks,
          recommendedTeamSize: template.recommended_team_size,
          complexity: template.complexity
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("BI project validation error:", error.errors);
        return res.status(400).json({ message: "Invalid BI project data", errors: error.errors });
      }
      console.error("Error creating BI project:", error);
      res.status(500).json({ message: "Failed to create BI project" });
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

  // Get project progress
  app.get("/api/projects/:id/progress", async (req, res) => {
    try {
      const { id } = req.params;
      const progressPercentage = await storage.calculateProjectProgress(parseInt(id));
      res.json({ projectId: parseInt(id), progressPercentage });
    } catch (error) {
      console.error(`Error calculating project ${req.params.id} progress:`, error);
      res.status(500).json({ message: "Failed to calculate project progress" });
    }
  });

  // Update project progress manually
  app.patch("/api/projects/:id/progress", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.updateProjectProgress(parseInt(id));
      const progressPercentage = await storage.calculateProjectProgress(parseInt(id));
      res.json({ projectId: parseInt(id), progressPercentage, message: "Progress updated successfully" });
    } catch (error) {
      console.error(`Error updating project ${req.params.id} progress:`, error);
      res.status(500).json({ message: "Failed to update project progress" });
    }
  });

  // Get project deadline status and performance indicators
  app.get("/api/projects/:id/deadline-status", async (req, res) => {
    try {
      const { id } = req.params;
      const deadlineStatus = await storage.calculateProjectDeadlineStatus(parseInt(id));
      res.json(deadlineStatus);
    } catch (error) {
      console.error(`Error calculating project ${req.params.id} deadline status:`, error);
      res.status(500).json({ message: "Failed to calculate project deadline status" });
    }
  });



  // Delete project
  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { force } = req.query;

      console.log(`DELETE /api/projects/${id} - Starting deletion process (force: ${force})`);

      let deleted;
      if (force === 'true') {
        console.log(`🗑️ FORCE DELETE requested for project ${id}`);
        deleted = await storage.forceDeleteProject(parseInt(id));
      } else {
        deleted = await storage.deleteProject(parseInt(id));
      }

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

  // ===== PHASES ROUTES =====

  // Get all phases
  app.get("/api/phases", async (req, res) => {
    try {
      const phases = await storage.getPhases();
      res.json(phases);
    } catch (error) {
      console.error("Error fetching phases:", error);
      res.status(500).json({ message: "Failed to fetch phases" });
    }
  });

  // Get single phase
  app.get("/api/phases/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const phase = await storage.getPhase(parseInt(id));
      if (!phase) {
        return res.status(404).json({ message: "Phase not found" });
      }
      res.json(phase);
    } catch (error) {
      console.error("Error fetching phase:", error);
      res.status(500).json({ message: "Failed to fetch phase" });
    }
  });

  // Create phase
  app.post("/api/phases", async (req, res) => {
    try {
      const validatedData = insertPhaseSchema.parse(req.body);
      const phase = await storage.createPhase(validatedData);
      res.status(201).json(phase);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid phase data", errors: error.errors });
      }
      console.error("Error creating phase:", error);
      res.status(500).json({ message: "Failed to create phase" });
    }
  });

  // Reorder phases (MUST be before the /:id route)
  app.patch("/api/phases/reorder", async (req, res) => {
    try {
      console.log("🔄 Received phase reorder request");
      console.log("📝 Request body:", JSON.stringify(req.body, null, 2));

      const { phaseOrders } = req.body;

      // Validate the request body
      if (!Array.isArray(phaseOrders)) {
        console.log("❌ phaseOrders is not an array:", typeof phaseOrders);
        return res.status(400).json({ message: "phaseOrders must be an array" });
      }

      console.log("✅ phaseOrders is valid array with", phaseOrders.length, "items");

      // Validate each phase order object
      for (const order of phaseOrders) {
        if (typeof order.id !== 'number' || typeof order.orderIndex !== 'number') {
          console.log("❌ Invalid phase order object:", order);
          return res.status(400).json({ message: "Each phase order must have id and orderIndex as numbers" });
        }
      }

      console.log("✅ All phase order objects are valid");

      await storage.reorderPhases(phaseOrders);
      console.log("✅ Phases reordered successfully");
      res.json({ message: "Phases reordered successfully" });
    } catch (error) {
      console.error("💥 Error reordering phases:", error);
      console.error("💥 Error stack:", (error as Error).stack);
      res.status(500).json({
        message: "Failed to reorder phases",
        error: (error as Error).message,
        details: (error as Error).stack
      });
    }
  });

  // Update phase
  app.patch("/api/phases/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = updatePhaseSchema.parse(req.body);
      const phase = await storage.updatePhase(parseInt(id), validatedData);
      if (!phase) {
        return res.status(404).json({ message: "Phase not found" });
      }
      res.json(phase);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid phase data", errors: error.errors });
      }
      console.error("Error updating phase:", error);
      res.status(500).json({ message: "Failed to update phase" });
    }
  });

  // Delete phase
  app.delete("/api/phases/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { force } = req.query;

      let success;
      if (force === 'true') {
        console.log(`🗑️ FORCE DELETE requested for phase ${id}`);
        success = await storage.forceDeletePhase(parseInt(id));
      } else {
        success = await storage.deletePhase(parseInt(id));
      }

      if (!success) {
        return res.status(404).json({ message: "Phase not found" });
      }
      res.json({ message: `Phase ${id} deleted successfully` });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Cannot delete phase")) {
        return res.status(400).json({ message: error.message });
      }
      console.error("Error deleting phase:", error);
      res.status(500).json({ message: "Failed to delete phase" });
    }
  });

  // Force delete phase (removes all dependencies)
  app.delete("/api/phases/:id/force", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`🗑️ FORCE DELETE requested for phase ${id}`);
      const success = await storage.forceDeletePhase(parseInt(id));
      if (!success) {
        return res.status(404).json({ message: "Phase not found" });
      }
      res.json({ message: `Phase ${id} force deleted successfully` });
    } catch (error) {
      console.error("Error force deleting phase:", error);
      res.status(500).json({ message: "Failed to force delete phase" });
    }
  });

  // ===== PROJECT PHASES ROUTES =====

  // Get phases for a project
  app.get("/api/projects/:projectId/phases", async (req, res) => {
    try {
      const { projectId } = req.params;
      const projectPhases = await storage.getProjectPhases(parseInt(projectId));
      res.json(projectPhases);
    } catch (error) {
      console.error("Error fetching project phases:", error);
      res.status(500).json({ message: "Failed to fetch project phases" });
    }
  });

  // Add phase to project
  app.post("/api/projects/:projectId/phases", async (req, res) => {
    try {
      const { projectId } = req.params;
      const validatedData = insertProjectPhaseSchema.parse({
        ...req.body,
        projectId: parseInt(projectId)
      });
      const projectPhase = await storage.addPhaseToProject(validatedData);
      res.status(201).json(projectPhase);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project phase data", errors: error.errors });
      }
      console.error("Error adding phase to project:", error);
      res.status(500).json({ message: "Failed to add phase to project" });
    }
  });

  // Update project phase
  app.patch("/api/projects/:projectId/phases/:phaseId", async (req, res) => {
    try {
      const { projectId, phaseId } = req.params;


      // Check if body is empty
      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ message: "Request body cannot be empty" });
      }

      // Handle backward compatibility: convert 'deadline' to 'endDate'
      let requestBody = { ...req.body };
      if (requestBody.deadline && !requestBody.endDate) {
        requestBody.endDate = requestBody.deadline;
        delete requestBody.deadline;

      }

      const validatedData = updateProjectPhaseSchema.parse(requestBody);

      const projectPhase = await storage.updateProjectPhase(parseInt(projectId), parseInt(phaseId), validatedData);
      if (!projectPhase) {
        return res.status(404).json({ message: "Project phase not found" });
      }
      res.json(projectPhase);
    } catch (error) {
      if (error instanceof z.ZodError) {

        return res.status(400).json({ message: "Invalid project phase data", errors: error.errors });
      }
      console.error("Error updating project phase:", error);
      res.status(500).json({ message: "Failed to update project phase" });
    }
  });

  // Remove phase from project
  app.delete("/api/projects/:projectId/phases/:phaseId", async (req, res) => {
    try {
      const { projectId, phaseId } = req.params;
      const success = await storage.removePhaseFromProject(parseInt(projectId), parseInt(phaseId));
      if (!success) {
        return res.status(404).json({ message: "Project phase not found" });
      }
      res.json({ message: "Phase removed from project successfully" });
    } catch (error) {
      console.error("Error removing phase from project:", error);
      res.status(500).json({ message: "Failed to remove phase from project" });
    }
  });

  // ===== SUBPHASES ROUTES =====

  // Get all subphases (optionally filtered by phase)
  app.get("/api/subphases", async (req, res) => {
    try {
      const { phaseId } = req.query;
      const subphases = await storage.getSubphases(phaseId ? parseInt(phaseId as string) : undefined);
      res.json(subphases);
    } catch (error) {
      console.error("Error fetching subphases:", error);
      res.status(500).json({ message: "Failed to fetch subphases" });
    }
  });

  // Get subphases for a specific phase
  app.get("/api/phases/:phaseId/subphases", async (req, res) => {
    try {
      const { phaseId } = req.params;
      const subphases = await storage.getSubphases(parseInt(phaseId));
      res.json(subphases);
    } catch (error) {
      console.error("Error fetching phase subphases:", error);
      res.status(500).json({ message: "Failed to fetch phase subphases" });
    }
  });

  // Get single subphase
  app.get("/api/subphases/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const subphase = await storage.getSubphase(parseInt(id));
      if (!subphase) {
        return res.status(404).json({ message: "Subphase not found" });
      }
      res.json(subphase);
    } catch (error) {
      console.error("Error fetching subphase:", error);
      res.status(500).json({ message: "Failed to fetch subphase" });
    }
  });

  // Create subphase
  app.post("/api/subphases", async (req, res) => {
    try {
      const validatedData = insertSubphaseSchema.parse(req.body);
      const subphase = await storage.createSubphase(validatedData);
      res.status(201).json(subphase);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid subphase data", errors: error.errors });
      }
      console.error("Error creating subphase:", error);
      res.status(500).json({ message: "Failed to create subphase" });
    }
  });

  // Update subphase
  app.patch("/api/subphases/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = updateSubphaseSchema.parse(req.body);
      const subphase = await storage.updateSubphase(parseInt(id), validatedData);
      if (!subphase) {
        return res.status(404).json({ message: "Subphase not found" });
      }
      res.json(subphase);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid subphase data", errors: error.errors });
      }
      console.error("Error updating subphase:", error);
      res.status(500).json({ message: "Failed to update subphase" });
    }
  });

  // Delete subphase
  app.delete("/api/subphases/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteSubphase(parseInt(id));
      if (!success) {
        return res.status(404).json({ message: "Subphase not found" });
      }
      res.json({ message: "Subphase deleted successfully" });
    } catch (error) {
      console.error("Error deleting subphase:", error);
      // Return specific error message if available
      if (error instanceof Error && error.message.includes("Cannot delete")) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete subphase" });
    }
  });

  // ===== PROJECT SUBPHASES ROUTES =====

  // Get subphases for a project phase
  app.get("/api/project-phases/:projectPhaseId/subphases", async (req, res) => {
    try {
      const { projectPhaseId } = req.params;
      const projectSubphases = await storage.getProjectSubphases(parseInt(projectPhaseId));
      res.json(projectSubphases);
    } catch (error) {
      console.error("Error fetching project subphases:", error);
      res.status(500).json({ message: "Failed to fetch project subphases" });
    }
  });

  // Link appointment to project subphase
  app.post("/api/appointments/:appointmentId/link-subphase", async (req, res) => {
    try {
      const { appointmentId } = req.params;
      const { projectSubphaseId } = req.body;

      console.log(`🔗 Linking appointment ${appointmentId} to subphase ${projectSubphaseId}`);

      // Update the appointment with the subphase link
      const appointment = await storage.updateAppointment(appointmentId, {
        projectSubphaseId: projectSubphaseId,
        allowOverlap: false
      });

      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      console.log(`✅ Appointment ${appointmentId} linked to subphase ${projectSubphaseId}`);
      res.json({ message: "Appointment linked to subphase successfully", appointment });
    } catch (error) {
      console.error("Error linking appointment to subphase:", error);
      res.status(500).json({ message: "Failed to link appointment to subphase" });
    }
  });

  // Recalculate progress for a project (manual trigger)
  app.post("/api/projects/:projectId/recalculate-progress", async (req, res) => {
    try {
      const { projectId } = req.params;

      console.log(`📊 Manually recalculating progress for project ${projectId}`);

      // Use the database function to recalculate all progress
      await db.execute(`SELECT recalculate_project_progress(${parseInt(projectId)})` as any);

      console.log(`✅ Progress recalculated for project ${projectId}`);
      res.json({ message: "Project progress recalculated successfully" });
    } catch (error) {
      console.error("Error recalculating project progress:", error);
      res.status(500).json({ message: "Failed to recalculate project progress" });
    }
  });

  // Get single project subphase
  app.get("/api/project-subphases/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const projectSubphase = await storage.getProjectSubphase(parseInt(id));
      if (!projectSubphase) {
        return res.status(404).json({ message: "Project subphase not found" });
      }
      res.json(projectSubphase);
    } catch (error) {
      console.error("Error fetching project subphase:", error);
      res.status(500).json({ message: "Failed to fetch project subphase" });
    }
  });

  // Add subphase to project phase
  app.post("/api/project-phases/:projectPhaseId/subphases", async (req, res) => {
    try {
      const { projectPhaseId } = req.params;
      const validatedData = insertProjectSubphaseSchema.parse({
        ...req.body,
        projectPhaseId: parseInt(projectPhaseId)
      });
      const projectSubphase = await storage.createProjectSubphase(validatedData);

      // Update phase progress after adding subphase
      await storage.updatePhaseProgress(parseInt(projectPhaseId));

      res.status(201).json(projectSubphase);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project subphase data", errors: error.errors });
      }
      console.error("Error creating project subphase:", error);
      res.status(500).json({ message: "Failed to create project subphase" });
    }
  });

  // Update project subphase
  app.patch("/api/project-subphases/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = updateProjectSubphaseSchema.parse(req.body);
      const projectSubphase = await storage.updateProjectSubphase(parseInt(id), validatedData);
      if (!projectSubphase) {
        return res.status(404).json({ message: "Project subphase not found" });
      }

      // Update phase progress after updating subphase
      await storage.updatePhaseProgress(projectSubphase.project_phase_id);

      // Sync project timeline if dates were updated
      if (validatedData.startDate || validatedData.endDate) {
        const projectPhase = await db.execute(sql`SELECT project_id FROM project_phases WHERE id = ${projectSubphase.project_phase_id}`);
        const projectId = (projectPhase as any).rows[0]?.project_id;
        if (projectId) {
          await storage.syncProjectTimeline(projectId);
        }
      }

      res.json(projectSubphase);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project subphase data", errors: error.errors });
      }
      console.error("Error updating project subphase:", error);
      res.status(500).json({ message: "Failed to update project subphase" });
    }
  });

  // Delete project subphase
  app.delete("/api/project-subphases/:id", async (req, res) => {
    try {
      const { id } = req.params;

      // Get project phase ID before deletion for progress update
      const projectSubphase = await storage.getProjectSubphase(parseInt(id));
      if (!projectSubphase) {
        return res.status(404).json({ message: "Project subphase not found" });
      }

      const success = await storage.deleteProjectSubphase(parseInt(id));
      if (!success) {
        return res.status(404).json({ message: "Project subphase not found" });
      }

      // Update phase progress after removing subphase
      await storage.updatePhaseProgress(projectSubphase.project_phase_id);

      res.json({ message: "Project subphase deleted successfully" });
    } catch (error) {
      console.error("Error deleting project subphase:", error);
      res.status(500).json({ message: "Failed to delete project subphase" });
    }
  });

  // Sync project timeline
  app.post("/api/projects/:projectId/sync-timeline", async (req, res) => {
    try {
      const { projectId } = req.params;
      await storage.syncProjectTimeline(parseInt(projectId));
      res.json({ message: "Project timeline synchronized successfully" });
    } catch (error) {
      console.error("Error syncing project timeline:", error);
      res.status(500).json({ message: "Failed to sync project timeline" });
    }
  });

  // BI Stages endpoints
  app.get("/api/bi/stages", async (req, res) => {
    try {
      const stages = await storage.getBiStages();
      res.json(stages);
    } catch (error) {
      console.error("Error fetching BI stages:", error);
      res.status(500).json({ message: "Failed to fetch BI stages" });
    }
  });

  app.get("/api/bi/stages/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const stage = await storage.getBiStage(parseInt(id));
      if (!stage) {
        return res.status(404).json({ message: "BI stage not found" });
      }
      res.json(stage);
    } catch (error) {
      console.error("Error fetching BI stage:", error);
      res.status(500).json({ message: "Failed to fetch BI stage" });
    }
  });

  // BI Project Templates endpoints
  app.get("/api/bi/templates", async (req, res) => {
    try {
      const templates = await storage.getBiProjectTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching BI templates:", error);
      res.status(500).json({ message: "Failed to fetch BI templates" });
    }
  });

  app.get("/api/bi/templates/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const template = await storage.getBiProjectTemplate(parseInt(id));
      if (!template) {
        return res.status(404).json({ message: "BI template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching BI template:", error);
      res.status(500).json({ message: "Failed to fetch BI template" });
    }
  });

  app.post("/api/bi/templates", async (req, res) => {
    try {
      const template = await storage.createBiProjectTemplate(req.body);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating BI template:", error);
      res.status(500).json({ message: "Failed to create BI template" });
    }
  });

  app.put("/api/bi/templates/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const template = await storage.updateBiProjectTemplate(parseInt(id), req.body);
      if (!template) {
        return res.status(404).json({ message: "BI template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error updating BI template:", error);
      res.status(500).json({ message: "Failed to update BI template" });
    }
  });

  app.delete("/api/bi/templates/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteBiProjectTemplate(parseInt(id));
      if (!success) {
        return res.status(404).json({ message: "BI template not found" });
      }
      res.json({ message: "BI template deleted successfully" });
    } catch (error) {
      console.error("Error deleting BI template:", error);
      res.status(500).json({ message: "Failed to delete BI template" });
    }
  });

  // BI Template Stages endpoints
  app.get("/api/bi/templates/:id/stages", async (req, res) => {
    try {
      const { id } = req.params;
      const stages = await storage.getTemplateStages(parseInt(id));
      res.json(stages);
    } catch (error) {
      console.error("Error fetching template stages:", error);
      res.status(500).json({ message: "Failed to fetch template stages" });
    }
  });

  app.post("/api/bi/templates/:templateId/stages/:stageId", async (req, res) => {
    try {
      const { templateId, stageId } = req.params;
      const { orderIndex, isOptional, customDurationDays } = req.body;
      const templateStage = await storage.addStageToTemplate(
        parseInt(templateId),
        parseInt(stageId),
        orderIndex,
        isOptional,
        customDurationDays
      );
      res.status(201).json(templateStage);
    } catch (error) {
      console.error("Error adding stage to template:", error);
      res.status(500).json({ message: "Failed to add stage to template" });
    }
  });

  app.put("/api/bi/templates/:templateId/stages/:stageId", async (req, res) => {
    try {
      const { templateId, stageId } = req.params;
      const templateStage = await storage.updateTemplateStage(
        parseInt(templateId),
        parseInt(stageId),
        req.body
      );
      if (!templateStage) {
        return res.status(404).json({ message: "Template stage not found" });
      }
      res.json(templateStage);
    } catch (error) {
      console.error("Error updating template stage:", error);
      res.status(500).json({ message: "Failed to update template stage" });
    }
  });

  app.delete("/api/bi/templates/:templateId/stages/:stageId", async (req, res) => {
    try {
      const { templateId, stageId } = req.params;
      const success = await storage.removeStageFromTemplate(
        parseInt(templateId),
        parseInt(stageId)
      );
      if (!success) {
        return res.status(404).json({ message: "Template stage not found" });
      }
      res.json({ message: "Stage removed from template successfully" });
    } catch (error) {
      console.error("Error removing stage from template:", error);
      res.status(500).json({ message: "Failed to remove stage from template" });
    }
  });

  // Get BI templates with detailed information for project creation
  app.get("/api/bi/templates/detailed", async (req, res) => {
    try {
      const templates = await storage.getBiProjectTemplates();

      // Enhance each template with stage information
      const detailedTemplates = await Promise.all(
        templates.map(async (template) => {
          const stages = await storage.getTemplateStages(template.id);
          const stageCount = stages.length;

          return {
            ...template,
            stageCount,
            stages: stages.map(stage => ({
              id: stage.stage_id,
              name: stage.stage_name,
              description: stage.stage_description,
              color: stage.stage_color,
              orderIndex: stage.order_index,
              isOptional: stage.is_optional,
              customDurationDays: stage.custom_duration_days
            }))
          };
        })
      );

      res.json(detailedTemplates);
    } catch (error) {
      console.error("Error fetching detailed BI templates:", error);
      res.status(500).json({ message: "Failed to fetch detailed BI templates" });
    }
  });

  // BI Main Tasks endpoints
  app.get("/api/bi/main-tasks", async (req, res) => {
    try {
      const { stageId } = req.query;
      const tasks = await storage.getBiMainTasks(stageId ? parseInt(stageId as string) : undefined);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching BI main tasks:", error);
      res.status(500).json({ message: "Failed to fetch BI main tasks" });
    }
  });

  app.get("/api/bi/main-tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const task = await storage.getBiMainTask(parseInt(id));
      if (!task) {
        return res.status(404).json({ message: "BI main task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error fetching BI main task:", error);
      res.status(500).json({ message: "Failed to fetch BI main task" });
    }
  });

  app.post("/api/bi/main-tasks", async (req, res) => {
    try {
      const task = await storage.createBiMainTask(req.body);
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating BI main task:", error);
      res.status(500).json({ message: "Failed to create BI main task" });
    }
  });

  app.put("/api/bi/main-tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const task = await storage.updateBiMainTask(parseInt(id), req.body);
      if (!task) {
        return res.status(404).json({ message: "BI main task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error updating BI main task:", error);
      res.status(500).json({ message: "Failed to update BI main task" });
    }
  });

  app.delete("/api/bi/main-tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteBiMainTask(parseInt(id));
      if (!success) {
        return res.status(404).json({ message: "BI main task not found" });
      }
      res.json({ message: "BI main task deleted successfully" });
    } catch (error) {
      console.error("Error deleting BI main task:", error);
      res.status(500).json({ message: "Failed to delete BI main task" });
    }
  });

  // BI Subtasks endpoints
  app.get("/api/bi/subtasks", async (req, res) => {
    try {
      const { mainTaskId } = req.query;
      const subtasks = await storage.getBiSubtasks(mainTaskId ? parseInt(mainTaskId as string) : undefined);
      res.json(subtasks);
    } catch (error) {
      console.error("Error fetching BI subtasks:", error);
      res.status(500).json({ message: "Failed to fetch BI subtasks" });
    }
  });

  app.get("/api/bi/subtasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const subtask = await storage.getBiSubtask(parseInt(id));
      if (!subtask) {
        return res.status(404).json({ message: "BI subtask not found" });
      }
      res.json(subtask);
    } catch (error) {
      console.error("Error fetching BI subtask:", error);
      res.status(500).json({ message: "Failed to fetch BI subtask" });
    }
  });

  app.post("/api/bi/subtasks", async (req, res) => {
    try {
      const subtask = await storage.createBiSubtask(req.body);
      res.status(201).json(subtask);
    } catch (error) {
      console.error("Error creating BI subtask:", error);
      res.status(500).json({ message: "Failed to create BI subtask" });
    }
  });

  app.put("/api/bi/subtasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const subtask = await storage.updateBiSubtask(parseInt(id), req.body);
      if (!subtask) {
        return res.status(404).json({ message: "BI subtask not found" });
      }
      res.json(subtask);
    } catch (error) {
      console.error("Error updating BI subtask:", error);
      res.status(500).json({ message: "Failed to update BI subtask" });
    }
  });

  app.delete("/api/bi/subtasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteBiSubtask(parseInt(id));
      if (!success) {
        return res.status(404).json({ message: "BI subtask not found" });
      }
      res.json({ message: "BI subtask deleted successfully" });
    } catch (error) {
      console.error("Error deleting BI subtask:", error);
      res.status(500).json({ message: "Failed to delete BI subtask" });
    }
  });

  // Project Roadmap endpoints
  app.get("/api/projects/:projectId/roadmap", async (req, res) => {
    try {
      const { projectId } = req.params;
      const roadmap = await storage.getProjectRoadmap(parseInt(projectId));
      res.json(roadmap);
    } catch (error) {
      console.error("Error fetching project roadmap:", error);
      res.status(500).json({ message: "Failed to fetch project roadmap" });
    }
  });

  app.post("/api/projects/:projectId/roadmap/generate", async (req, res) => {
    try {
      const { projectId } = req.params;
      const { templateId, startDate } = req.body;

      if (!templateId || !startDate) {
        return res.status(400).json({ message: "Template ID and start date are required" });
      }

      const roadmap = await storage.generateProjectRoadmap(
        parseInt(projectId),
        parseInt(templateId),
        startDate
      );
      res.status(201).json(roadmap);
    } catch (error) {
      console.error("Error generating project roadmap:", error);
      res.status(500).json({ message: "Failed to generate project roadmap" });
    }
  });

  app.post("/api/roadmap", async (req, res) => {
    try {
      const item = await storage.createRoadmapItem(req.body);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating roadmap item:", error);
      res.status(500).json({ message: "Failed to create roadmap item" });
    }
  });

  app.put("/api/roadmap/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const item = await storage.updateRoadmapItem(parseInt(id), req.body);
      if (!item) {
        return res.status(404).json({ message: "Roadmap item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error updating roadmap item:", error);
      res.status(500).json({ message: "Failed to update roadmap item" });
    }
  });

  app.delete("/api/roadmap/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteRoadmapItem(parseInt(id));
      if (!success) {
        return res.status(404).json({ message: "Roadmap item not found" });
      }
      res.json({ message: "Roadmap item deleted successfully" });
    } catch (error) {
      console.error("Error deleting roadmap item:", error);
      res.status(500).json({ message: "Failed to delete roadmap item" });
    }
  });

  // Get project BI status and progress
  app.get("/api/projects/:projectId/bi-status", async (req, res) => {
    try {
      const { projectId } = req.params;
      const project = await storage.getProject(parseInt(projectId));

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      let biStatus = {
        project,
        isBiProject: !!project.templateId,
        template: null,
        currentStage: null,
        roadmap: [],
        progress: {
          overallPercentage: project.progressPercentage || 0,
          completedStages: 0,
          totalStages: 0,
          completedTasks: 0,
          totalTasks: 0
        }
      };

      // If it's a BI project, get additional details
      if (project.templateId) {
        // Get template information
        biStatus.template = await storage.getBiProjectTemplate(project.templateId);

        // Get current stage information
        if (project.currentStageId) {
          biStatus.currentStage = await storage.getBiStage(project.currentStageId);
        }

        // Get roadmap
        const roadmapData = await storage.getProjectRoadmap(parseInt(projectId));
        (biStatus as any).roadmap = roadmapData;

        // Calculate progress
        const roadmapItems = biStatus.roadmap;
        const stageItems = roadmapItems.filter((item: any) => item.stage_id && !item.main_task_id);
        const taskItems = roadmapItems.filter((item: any) => item.main_task_id);

        biStatus.progress.totalStages = stageItems.length;
        biStatus.progress.completedStages = stageItems.filter((item: any) => item.status === 'completed').length;
        biStatus.progress.totalTasks = taskItems.length;
        biStatus.progress.completedTasks = taskItems.filter((item: any) => item.status === 'completed').length;

        // Calculate overall percentage if not set
        if (!biStatus.progress.overallPercentage && roadmapItems.length > 0) {
          const completedItems = roadmapItems.filter((item: any) => item.status === 'completed').length;
          biStatus.progress.overallPercentage = Math.round((completedItems / roadmapItems.length) * 100);
        }
      }

      res.json(biStatus);
    } catch (error) {
      console.error("Error fetching project BI status:", error);
      res.status(500).json({ message: "Failed to fetch project BI status" });
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
      console.log(`🔍 ROTA - Recebendo requisição para criar agendamento:`, req.body);

      // VALIDAÇÃO CORRIGIDA DE FINAL DE SEMANA NA ROTA
      if (req.body.date) {
        // Usar uma abordagem que evita problemas de fuso horário
        const dateStr = req.body.date;
        const [year, month, day] = dateStr.split('-').map(Number);
        const appointmentDate = new Date(year, month - 1, day); // month - 1 porque JavaScript usa 0-11
        const dayOfWeek = appointmentDate.getDay();

        console.log(`🔍 ROTA - Validando data: ${dateStr} = dia da semana ${dayOfWeek}`);
        console.log(`🔍 ROTA - Data criada: ${appointmentDate.toDateString()}`);

        if (dayOfWeek === 6) {
          console.log(`❌ ROTA - DETECTADO SÁBADO - Verificando se é encaixe`);
          console.log(`🎯 ROTA - allowWeekendOverride recebido:`, req.body.allowWeekendOverride);
          console.log(`🎯 ROTA - req.body completo:`, req.body);
          // Verificar se o usuário explicitamente permitiu encaixe
          if (!req.body.allowWeekendOverride) {
            return res.status(422).json({
              message: "Sábado não é um dia útil. Deseja fazer um ENCAIXE mesmo assim?",
              code: "WEEKEND_CONFIRMATION_NEEDED",
              dayType: "SÁBADO"
            });
          }
          console.log(`✅ ROTA - ENCAIXE AUTORIZADO para SÁBADO`);
        }

        if (dayOfWeek === 0) {
          console.log(`❌ ROTA - DETECTADO DOMINGO - Verificando se é encaixe`);
          console.log(`🎯 ROTA - allowWeekendOverride recebido:`, req.body.allowWeekendOverride);
          console.log(`🎯 ROTA - req.body completo:`, req.body);
          // Verificar se o usuário explicitamente permitiu encaixe
          if (!req.body.allowWeekendOverride) {
            return res.status(422).json({
              message: "Domingo não é um dia útil. Deseja fazer um ENCAIXE mesmo assim?",
              code: "WEEKEND_CONFIRMATION_NEEDED",
              dayType: "DOMINGO"
            });
          }
          console.log(`✅ ROTA - ENCAIXE AUTORIZADO para DOMINGO`);
        }

        console.log(`✅ ROTA - Dia útil aprovado: ${dayOfWeek}`);
      }

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

  // Create optional Pomodoro break
  app.post("/api/appointments/:id/pomodoro", async (req, res) => {
    try {
      const { id } = req.params;

      // Get the main appointment
      const mainAppointment = await storage.getAppointment(id);
      if (!mainAppointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      // Create Pomodoro break
      const pomodoroData = {
        title: "Pomodoro",
        description: "Pausa de 5 minutos",
        date: mainAppointment.date,
        startTime: mainAppointment.endTime,
        durationMinutes: 5,
        allowOverlap: false,
        allowWeekendOverride: false,
        isPomodoro: true,
        // Copy assignment fields from main appointment
        projectId: mainAppointment.projectId,
        companyId: mainAppointment.companyId,
        assignedUserId: mainAppointment.assignedUserId,
        phaseId: mainAppointment.phaseId,
        // Copy work schedule compliance
        isWithinWorkHours: mainAppointment.isWithinWorkHours,
        isOvertime: mainAppointment.isOvertime,
        workScheduleViolation: mainAppointment.workScheduleViolation,
      };

      const pomodoro = await storage.createAppointment(pomodoroData);
      res.status(201).json(pomodoro);
    } catch (error) {
      console.error("Error creating Pomodoro:", error);
      res.status(500).json({ message: "Failed to create Pomodoro break" });
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
          const timeToAdd = (appointment.actualTimeMinutes || 0) > 0
            ? appointment.actualTimeMinutes
            : appointment.durationMinutes;

          console.log(`⏱️ Adding ${timeToAdd} minutes to project progress (${(appointment.actualTimeMinutes || 0) > 0 ? 'actual' : 'estimated'} time)`);

          // Get all appointments for this project
          const projectAppointments = await db
            .select()
            .from(appointments)
            .where(eq(appointments.projectId, appointment.projectId));

          // Calculate total time: actual time where available, estimated time for manually completed tasks
          const totalMinutes = projectAppointments.reduce((total, apt) => {
            if (apt.id === parseInt(id)) {
              // Use the time we calculated above for the current appointment
              return total + (timeToAdd || 0);
            }
            // For other appointments, use actual time if available, otherwise use estimated time for completed tasks
            if (apt.status === 'completed') {
              return total + ((apt.actualTimeMinutes || 0) > 0 ? (apt.actualTimeMinutes || 0) : apt.durationMinutes);
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

  // Debug endpoint to check which phases are in use
  app.get("/api/debug/phases-in-use", async (req, res) => {
    try {
      console.log("🔍 DEBUG: Checking which phases are in use...");

      // Get all project phases
      const projectPhases = await storage.getAllProjectPhases();
      console.log(`Found ${projectPhases.length} project-phase associations`);

      // Get all appointments with phases
      const appointmentsWithPhases = await storage.getAppointmentsWithPhases();
      console.log(`Found ${appointmentsWithPhases.length} appointments with phases`);

      // Extract unique phase IDs
      const phaseIdsInProjects = Array.from(new Set(projectPhases.map(pp => pp.phaseId)));
      const phaseIdsInAppointments = Array.from(new Set(appointmentsWithPhases.map(a => a.phaseId).filter(id => id !== null)));
      const allPhaseIdsInUse = Array.from(new Set([...phaseIdsInProjects, ...phaseIdsInAppointments]));

      res.json({
        success: true,
        data: {
          projectPhases: projectPhases.length,
          appointmentsWithPhases: appointmentsWithPhases.length,
          phaseIdsInProjects,
          phaseIdsInAppointments,
          allPhaseIdsInUse,
          summary: {
            totalPhasesInUse: allPhaseIdsInUse.length,
            phasesInProjects: phaseIdsInProjects.length,
            phasesInAppointments: phaseIdsInAppointments.length
          }
        }
      });
    } catch (error) {
      console.error("Error in debug phases-in-use:", error);
      res.status(500).json({ message: "Debug endpoint failed", error: (error as Error).message });
    }
  });

  // Remove phase from project
  app.delete("/api/projects/:projectId/phases/:phaseId", async (req, res) => {
    try {
      const { projectId, phaseId } = req.params;
      console.log(`🗑️ Removing phase ${phaseId} from project ${projectId}`);

      const success = await storage.removePhaseFromProject(parseInt(projectId), parseInt(phaseId));
      if (!success) {
        return res.status(404).json({ message: "Project phase association not found" });
      }

      res.json({ message: "Phase removed from project successfully" });
    } catch (error) {
      console.error("Error removing phase from project:", error);
      res.status(500).json({ message: "Failed to remove phase from project" });
    }
  });

  // Clear phase from all appointments
  app.post("/api/phases/:phaseId/clear-appointments", async (req, res) => {
    try {
      const { phaseId } = req.params;
      console.log(`🧹 Clearing phase ${phaseId} from all appointments`);

      const count = await storage.clearPhaseFromAppointments(parseInt(phaseId));

      res.json({
        message: `Phase cleared from ${count} appointments successfully`,
        clearedCount: count
      });
    } catch (error) {
      console.error("Error clearing phase from appointments:", error);
      res.status(500).json({ message: "Failed to clear phase from appointments" });
    }
  });

  // Complete cleanup of phases - removes all associations and then deletes the phases
  app.post("/api/phases/complete-cleanup", async (req, res) => {
    try {
      console.log(`🧹 Starting complete phase cleanup...`);

      const result = await storage.completePhaseCleanup();

      res.json({
        message: "Complete phase cleanup completed successfully",
        result
      });
    } catch (error) {
      console.error("Error in complete phase cleanup:", error);
      res.status(500).json({ message: "Failed to complete phase cleanup" });
    }
  });

  // Nuclear option - direct SQL deletion of specific phases
  app.post("/api/phases/nuclear-delete", async (req, res) => {
    try {
      const { phaseIds } = req.body;
      console.log(`💥 NUCLEAR DELETE requested for phases: ${phaseIds.join(', ')}`);

      const result = await storage.nuclearDeletePhases(phaseIds);

      res.json({
        message: "Nuclear deletion completed successfully",
        result
      });
    } catch (error) {
      console.error("Error in nuclear deletion:", error);
      res.status(500).json({ message: "Failed to perform nuclear deletion" });
    }
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
          // Validate required fields
          if (!pomodoro.startTime || !pomodoro.durationMinutes) {
            console.log(`⚠️ Skipping Pomodoro "${pomodoro.title}" - missing startTime or durationMinutes`);
            continue;
          }

          // Parse start time and calculate end time with error handling
          const timeParts = pomodoro.startTime.split(':');
          if (timeParts.length !== 2) {
            console.log(`⚠️ Skipping Pomodoro "${pomodoro.title}" - invalid time format: ${pomodoro.startTime}`);
            continue;
          }

          const [startHours, startMinutes] = timeParts.map(Number);
          if (isNaN(startHours) || isNaN(startMinutes) || startHours < 0 || startHours > 23 || startMinutes < 0 || startMinutes > 59) {
            console.log(`⚠️ Skipping Pomodoro "${pomodoro.title}" - invalid time values: ${pomodoro.startTime}`);
            continue;
          }

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
      for (const [projectId, completedPomodoros] of Array.from(projectUpdates)) {
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
              return total + ((apt.actualTimeMinutes || 0) > 0 ? (apt.actualTimeMinutes || 0) : apt.durationMinutes);
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
              minutes = (appointment.actualTimeMinutes || 0) > 0 ? (appointment.actualTimeMinutes || 0) : appointment.durationMinutes;
              console.log(`  - Appointment ${appointment.id} (${appointment.title}): ${minutes} minutes (${(appointment.actualTimeMinutes || 0) > 0 ? 'actual' : 'estimated'})`);
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
        allowOverlap: false,
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
        allowOverlap: false,
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
        allowOverlap: false,
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
        allowOverlap: false,
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
      res.status(500).json({ error: "Migration failed", details: (error as Error).message });
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
        allowOverlap: false,
      });

      res.json({ success: true, message: "Timer reset successfully" });
    } catch (error) {
      console.error("Timer reset error:", error);
      res.status(500).json({ error: "Timer reset failed", details: (error as Error).message });
    }
  });

  // Reset project hours migration (temporary route)
  app.post("/api/migrate-project-hours", async (req, res) => {
    try {
      console.log("🔄 Resetting project hours to use minutes-based storage...");

      // First, update any null values specifically using raw SQL
      const nullUpdateResult = await db.execute(sql`UPDATE projects SET actual_hours = 0 WHERE actual_hours IS NULL`);
      console.log(`📝 Updated ${(nullUpdateResult as any).rowsAffected || 0} projects with null actual_hours`);

      // Then reset all project actualHours to 0 to ensure consistency
      const allUpdateResult = await db.update(projects).set({ actualHours: 0 });
      console.log(`📝 Reset all project actual_hours to 0`);

      console.log("✅ Project hours reset completed!");
      res.json({
        success: true,
        message: "Project hours reset successfully",
        nullUpdated: (nullUpdateResult as any).rowsAffected || 0
      });
    } catch (error) {
      console.error("Project hours migration error:", error);
      res.status(500).json({ error: "Project hours migration failed", details: (error as Error).message });
    }
  });

  // ===== WORK SCHEDULE ROUTES =====

  // Get all work schedules
  app.get("/api/work-schedules", async (req, res) => {
    try {
      const workSchedules = await storage.getWorkSchedules();
      res.json(workSchedules);
    } catch (error) {
      console.error("Error fetching work schedules:", error);
      res.status(500).json({ message: "Failed to fetch work schedules" });
    }
  });

  // Get user's work schedule with rules
  app.get("/api/users/:userId/work-schedule", async (req, res) => {
    try {
      const { userId } = req.params;
      const workSchedule = await storage.getUserWorkSchedule(parseInt(userId));
      if (!workSchedule) {
        return res.status(404).json({ message: "Work schedule not found" });
      }
      res.json(workSchedule);
    } catch (error) {
      console.error("Error fetching user work schedule:", error);
      res.status(500).json({ message: "Failed to fetch work schedule" });
    }
  });

  // Create work schedule
  app.post("/api/work-schedules", async (req, res) => {
    try {
      const { insertWorkScheduleSchema } = await import('../shared/schema.js');
      const validatedData = insertWorkScheduleSchema.parse(req.body);
      const workSchedule = await storage.createWorkSchedule(validatedData);
      res.status(201).json(workSchedule);
    } catch (error) {
      console.error("Error creating work schedule:", error);
      res.status(500).json({ message: "Failed to create work schedule" });
    }
  });

  // Update work schedule
  app.patch("/api/work-schedules/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { updateWorkScheduleSchema } = await import('../shared/schema.js');
      const validatedData = updateWorkScheduleSchema.parse(req.body);
      const workSchedule = await storage.updateWorkSchedule(parseInt(id), validatedData);
      if (!workSchedule) {
        return res.status(404).json({ message: "Work schedule not found" });
      }
      res.json(workSchedule);
    } catch (error) {
      console.error("Error updating work schedule:", error);
      res.status(500).json({ message: "Failed to update work schedule" });
    }
  });

  // Delete work schedule
  app.delete("/api/work-schedules/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteWorkSchedule(parseInt(id));
      if (!success) {
        return res.status(404).json({ message: "Work schedule not found" });
      }
      res.json({ message: "Work schedule deleted successfully" });
    } catch (error) {
      console.error("Error deleting work schedule:", error);
      res.status(500).json({ message: "Failed to delete work schedule" });
    }
  });

  // Get work schedule rules
  app.get("/api/work-schedules/:id/rules", async (req, res) => {
    try {
      const { id } = req.params;
      const rules = await storage.getWorkScheduleRules(parseInt(id));
      res.json(rules);
    } catch (error) {
      console.error("Error fetching work schedule rules:", error);
      res.status(500).json({ message: "Failed to fetch work schedule rules" });
    }
  });

  // Create work schedule rule
  app.post("/api/work-schedule-rules", async (req, res) => {
    try {
      const { insertWorkScheduleRuleSchema } = await import('../shared/schema.js');
      const validatedData = insertWorkScheduleRuleSchema.parse(req.body);
      const rule = await storage.createWorkScheduleRule(validatedData);
      res.status(201).json(rule);
    } catch (error) {
      console.error("Error creating work schedule rule:", error);
      res.status(500).json({ message: "Failed to create work schedule rule" });
    }
  });

  // Update work schedule rule
  app.patch("/api/work-schedule-rules/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { updateWorkScheduleRuleSchema } = await import('../shared/schema.js');
      const validatedData = updateWorkScheduleRuleSchema.parse(req.body);
      const rule = await storage.updateWorkScheduleRule(parseInt(id), validatedData);
      if (!rule) {
        return res.status(404).json({ message: "Work schedule rule not found" });
      }
      res.json(rule);
    } catch (error) {
      console.error("Error updating work schedule rule:", error);
      res.status(500).json({ message: "Failed to update work schedule rule" });
    }
  });

  // Delete work schedule rule
  app.delete("/api/work-schedule-rules/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteWorkScheduleRule(parseInt(id));
      if (!success) {
        return res.status(404).json({ message: "Work schedule rule not found" });
      }
      res.json({ message: "Work schedule rule deleted successfully" });
    } catch (error) {
      console.error("Error deleting work schedule rule:", error);
      res.status(500).json({ message: "Failed to delete work schedule rule" });
    }
  });

  // Validate appointment time against work schedule
  app.post("/api/work-schedules/validate-time", async (req, res) => {
    try {
      const { date, startTime, durationMinutes, userId } = req.body;

      if (!date || !startTime || !durationMinutes) {
        return res.status(400).json({ message: "Missing required fields: date, startTime, durationMinutes" });
      }

      const { workScheduleService } = await import('./services/work-schedule-service.js');
      const validation = await workScheduleService.validateAppointmentTime(date, startTime, durationMinutes, userId);

      res.json(validation);
    } catch (error) {
      console.error("Error validating appointment time:", error);
      res.status(500).json({ message: "Failed to validate appointment time" });
    }
  });

  // Get available time slots for a date
  app.get("/api/work-schedules/available-slots", async (req, res) => {
    try {
      const { date, userId } = req.query;

      if (!date) {
        return res.status(400).json({ message: "Missing required parameter: date" });
      }

      const { workScheduleService } = await import('./services/work-schedule-service.js');
      const slots = await workScheduleService.getAvailableTimeSlots(date as string, userId ? parseInt(userId as string) : undefined);

      res.json(slots);
    } catch (error) {
      console.error("Error fetching available time slots:", error);
      res.status(500).json({ message: "Failed to fetch available time slots" });
    }
  });

  // ===== EMAIL SETTINGS ROUTES =====

  // Get email settings
  app.get("/api/email-settings", async (req, res) => {
    try {
      const { emailService } = await import('./services/email-service.js');
      const settings = await emailService.getSettings();

      if (!settings) {
        return res.status(404).json({ message: "Email settings not found" });
      }

      // Don't send password in response
      const { smtpPassword, ...safeSettings } = settings;
      res.json(safeSettings);
    } catch (error) {
      console.error("Error fetching email settings:", error);
      res.status(500).json({ message: "Failed to fetch email settings" });
    }
  });

  // Update email settings
  app.put("/api/email-settings", async (req, res) => {
    try {
      const { emailService } = await import('./services/email-service.js');
      await emailService.updateSettings(req.body);
      res.json({ message: "Email settings updated successfully" });
    } catch (error) {
      console.error("Error updating email settings:", error);
      res.status(500).json({ message: "Failed to update email settings" });
    }
  });

  // Test email connection
  app.post("/api/email-settings/test-connection", async (req, res) => {
    try {
      const { emailService } = await import('./services/email-service.js');
      const result = await emailService.testConnection();
      res.json(result);
    } catch (error) {
      console.error("Error testing email connection:", error);
      res.status(500).json({
        success: false,
        error: "Failed to test email connection"
      });
    }
  });

  // Send test email
  app.post("/api/email-settings/send-test", async (req, res) => {
    try {
      const { to } = req.body;
      if (!to) {
        return res.status(400).json({ message: "Email address is required" });
      }

      const { emailService } = await import('./services/email-service.js');
      const result = await emailService.sendTestEmail(to);
      res.json(result);
    } catch (error) {
      console.error("Error sending test email:", error);
      res.status(500).json({
        success: false,
        error: "Failed to send test email"
      });
    }
  });

  // ===== FOLLOW-UP SETTINGS ROUTES =====

  // Get follow-up settings for a company
  app.get("/api/follow-up-settings/:companyId", async (req, res) => {
    try {
      const { companyId } = req.params;
      const settings = await storage.getFollowUpSettings(parseInt(companyId));

      if (!settings) {
        return res.status(404).json({ message: "Follow-up settings not found" });
      }

      res.json(settings);
    } catch (error) {
      console.error("Error fetching follow-up settings:", error);
      res.status(500).json({ message: "Failed to fetch follow-up settings" });
    }
  });

  // Update follow-up settings for a company
  app.put("/api/follow-up-settings/:companyId", async (req, res) => {
    try {
      const { companyId } = req.params;
      const settings = await storage.updateFollowUpSettings(parseInt(companyId), req.body);
      res.json(settings);
    } catch (error) {
      console.error("Error updating follow-up settings:", error);
      res.status(500).json({ message: "Failed to update follow-up settings" });
    }
  });

  // Get all companies with follow-up settings
  app.get("/api/follow-up-settings", async (req, res) => {
    try {
      const settings = await storage.getAllFollowUpSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching all follow-up settings:", error);
      res.status(500).json({ message: "Failed to fetch follow-up settings" });
    }
  });

  // ===== FOLLOW-UP REPORTS ROUTES =====

  // Generate follow-up report for a company
  app.post("/api/follow-up-reports/generate/:companyId", async (req, res) => {
    try {
      const { companyId } = req.params;
      const filters = req.body;

      const { followUpReportService } = await import('./services/follow-up-report-service.js');
      const result = await followUpReportService.generateReport(parseInt(companyId), filters);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json({ message: result.error });
      }
    } catch (error) {
      console.error("Error generating follow-up report:", error);
      res.status(500).json({ message: "Failed to generate follow-up report" });
    }
  });

  // Get follow-up reports for a company
  app.get("/api/follow-up-reports/:companyId", async (req, res) => {
    try {
      const { companyId } = req.params;
      const { limit = 10 } = req.query;

      const reports = await storage.getFollowUpReports(parseInt(companyId), parseInt(limit as string));
      res.json(reports);
    } catch (error) {
      console.error("Error fetching follow-up reports:", error);
      res.status(500).json({ message: "Failed to fetch follow-up reports" });
    }
  });

  // Get all follow-up reports
  app.get("/api/follow-up-reports", async (req, res) => {
    try {
      const { limit = 20 } = req.query;
      const reports = await storage.getFollowUpReports(undefined, parseInt(limit as string));
      res.json(reports);
    } catch (error) {
      console.error("Error fetching all follow-up reports:", error);
      res.status(500).json({ message: "Failed to fetch follow-up reports" });
    }
  });

  // Generate and send follow-up report via email
  app.post("/api/follow-up-reports/send/:companyId", async (req, res) => {
    try {
      const { companyId } = req.params;
      const filters = req.body;

      // Generate report
      const { followUpReportService } = await import('./services/follow-up-report-service.js');
      const reportResult = await followUpReportService.generateReport(parseInt(companyId), filters);

      if (!reportResult.success || !reportResult.reportData) {
        return res.status(400).json({ message: reportResult.error });
      }

      // Generate email HTML
      const { emailTemplateService } = await import('./services/email-template-service.js');
      const emailHtml = emailTemplateService.generateFollowUpReport(reportResult.reportData);

      // Get company follow-up settings
      const settings = await storage.getFollowUpSettings(parseInt(companyId));
      if (!settings || !settings.recipientEmails) {
        return res.status(400).json({ message: "No email recipients configured for this company" });
      }

      // Send email
      const { emailService } = await import('./services/email-service.js');
      const recipients = JSON.parse(settings.recipientEmails);

      const emailResult = await emailService.sendEmail({
        to: recipients,
        subject: `Relatório de Acompanhamento - ${reportResult.reportData.companyName}`,
        html: emailHtml,
        reportId: reportResult.reportId
      });

      if (emailResult.success) {
        // Update report as sent
        await storage.updateFollowUpReport(reportResult.reportId!, {
          emailSent: true,
          sentAt: new Date().toISOString()
        });

        res.json({
          success: true,
          reportId: reportResult.reportId,
          emailResult
        });
      } else {
        res.status(500).json({
          success: false,
          error: emailResult.error
        });
      }

    } catch (error) {
      console.error("Error sending follow-up report:", error);
      res.status(500).json({ message: "Failed to send follow-up report" });
    }
  });

  // ===== FOLLOW-UP SCHEDULER ROUTES =====

  // Get scheduler status
  app.get("/api/follow-up-scheduler/status", async (req, res) => {
    try {
      const { followUpScheduler } = await import('./services/follow-up-scheduler.js');
      const status = followUpScheduler.getStatus();
      res.json(status);
    } catch (error) {
      console.error("Error getting scheduler status:", error);
      res.status(500).json({ message: "Failed to get scheduler status" });
    }
  });

  // Reload scheduler jobs
  app.post("/api/follow-up-scheduler/reload", async (req, res) => {
    try {
      const { followUpScheduler } = await import('./services/follow-up-scheduler.js');
      await followUpScheduler.reloadJobs();
      res.json({ message: "Scheduler jobs reloaded successfully" });
    } catch (error) {
      console.error("Error reloading scheduler jobs:", error);
      res.status(500).json({ message: "Failed to reload scheduler jobs" });
    }
  });

  // Manually trigger follow-up job for a company
  app.post("/api/follow-up-scheduler/trigger/:companyId", async (req, res) => {
    try {
      const { companyId } = req.params;
      const { followUpScheduler } = await import('./services/follow-up-scheduler.js');

      const result = await followUpScheduler.triggerManualJob(parseInt(companyId));

      if (result.success) {
        res.json({ message: "Follow-up job triggered successfully" });
      } else {
        res.status(400).json({ message: result.error });
      }
    } catch (error) {
      console.error("Error triggering manual follow-up job:", error);
      res.status(500).json({ message: "Failed to trigger follow-up job" });
    }
  });

  // Toggle company job (enable/disable)
  app.post("/api/follow-up-scheduler/toggle/:companyId", async (req, res) => {
    try {
      const { companyId } = req.params;
      const { enabled } = req.body;

      const { followUpScheduler } = await import('./services/follow-up-scheduler.js');
      await followUpScheduler.toggleCompanyJob(parseInt(companyId), enabled);

      res.json({ message: `Company job ${enabled ? 'enabled' : 'disabled'} successfully` });
    } catch (error) {
      console.error("Error toggling company job:", error);
      res.status(500).json({ message: "Failed to toggle company job" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
