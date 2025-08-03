// @ts-nocheck
import {
  type Appointment, type InsertAppointment, type UpdateAppointment, appointments,
  type Company, type InsertCompany, type UpdateCompany, companies,
  type Project, type InsertProject, type UpdateProject, projects,
  type User, type InsertUser, type UpdateUser, users,
  type Phase, type InsertPhase, type UpdatePhase, phases,
  type ProjectPhase, type InsertProjectPhase, type UpdateProjectPhase, projectPhases,
  type Subphase, type InsertSubphase, type UpdateSubphase, subphases,
  type ProjectSubphase, type InsertProjectSubphase, type UpdateProjectSubphase, projectSubphases,
  type CreateRecurringAppointment,
  type WorkSchedule, type InsertWorkSchedule, type UpdateWorkSchedule, workSchedules,
  type WorkScheduleRule, type InsertWorkScheduleRule, type UpdateWorkScheduleRule, workScheduleRules,
  projectTasks, projectRoadmap
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, gte, lte, desc, isNotNull, sql } from "drizzle-orm";
import {
  generateRecurringInstances,
  validateRecurringTask,
  generateRecurringTaskId
} from "./utils/recurring-tasks";
import { workScheduleService } from "./services/work-schedule-service.js";

// Helper function for raw SQL queries with parameters
async function executeRawSQL(query: string, params: any[] = []): Promise<any> {
  // For now, use a simple approach that works with the current setup
  // This is a temporary fix to resolve TypeScript errors
  return await (db as any).execute(query, params);
}

export interface IStorage {
  // Companies
  getCompanies(): Promise<Company[]>;
  getCompany(id: number): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, company: UpdateCompany): Promise<Company | undefined>;
  deleteCompany(id: number): Promise<boolean>;

  // Projects
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  getProjectsByCompany(companyId: number): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: UpdateProject): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  forceDeleteProject(id: number): Promise<boolean>;

  // Users
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUsersByCompany(companyId: number): Promise<User[]>;
  getUsersByType(type: 'internal' | 'external'): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: UpdateUser): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;

  // Phases
  getPhases(): Promise<Phase[]>;
  getPhase(id: number): Promise<Phase | undefined>;
  createPhase(phase: InsertPhase): Promise<Phase>;
  updatePhase(id: number, phase: UpdatePhase): Promise<Phase | undefined>;
  deletePhase(id: number): Promise<boolean>;

  // Project Phases
  getProjectPhases(projectId: number): Promise<(ProjectPhase & { phase: Phase })[]>;
  addPhaseToProject(projectPhase: InsertProjectPhase): Promise<ProjectPhase>;
  updateProjectPhase(projectId: number, phaseId: number, updates: UpdateProjectPhase): Promise<ProjectPhase | undefined>;
  removePhaseFromProject(projectId: number, phaseId: number): Promise<boolean>;
  getPhasesByProject(projectId: number): Promise<Phase[]>;

  // Appointments
  getAppointments(): Promise<Appointment[]>;
  getAppointment(id: string): Promise<Appointment | undefined>;
  getAppointmentsByDate(date: string): Promise<Appointment[]>;
  getAppointmentsByDateRange(startDate: string, endDate: string): Promise<Appointment[]>;
  getAppointmentsByProject(projectId: number): Promise<Appointment[]>;
  getAppointmentsByUser(userId: number): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, appointment: UpdateAppointment): Promise<Appointment | undefined>;
  deleteAppointment(id: string): Promise<boolean>;

  // Recurring Appointments
  createRecurringAppointment(appointment: CreateRecurringAppointment): Promise<{ template: Appointment; instances: Appointment[] }>;
  getRecurringTaskInstances(recurringTaskId: number): Promise<Appointment[]>;
  updateRecurringTaskSeries(recurringTaskId: number, updates: UpdateAppointment): Promise<Appointment[]>;
  deleteRecurringTaskSeries(recurringTaskId: number): Promise<boolean>;
  deleteRecurringTaskInstance(id: string, deleteAll?: boolean): Promise<boolean>;

  // Work Schedules
  getWorkSchedules(): Promise<WorkSchedule[]>;
  getUserWorkSchedule(userId: number): Promise<(WorkSchedule & { rules: WorkScheduleRule[] }) | undefined>;
  createWorkSchedule(workSchedule: InsertWorkSchedule): Promise<WorkSchedule>;
  updateWorkSchedule(id: number, workSchedule: UpdateWorkSchedule): Promise<WorkSchedule | undefined>;
  deleteWorkSchedule(id: number): Promise<boolean>;

  // Work Schedule Rules
  getWorkScheduleRules(workScheduleId: number): Promise<WorkScheduleRule[]>;
  createWorkScheduleRule(rule: InsertWorkScheduleRule): Promise<WorkScheduleRule>;
  updateWorkScheduleRule(id: number, rule: UpdateWorkScheduleRule): Promise<WorkScheduleRule | undefined>;
  deleteWorkScheduleRule(id: number): Promise<boolean>;

  // Analytics
  getProductivityStats(): Promise<{
    todayCompleted: number;
    scheduledHoursToday: number;
    slaExpired: number;
    slaCompliance: number;
    rescheduled: number;
    pomodorosToday: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  private calculateEndTime(startTime: string, durationMinutes: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    startDate.setMinutes(startDate.getMinutes() + durationMinutes);
    return `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`;
  }

  // Companies methods
  async getCompanies(): Promise<Company[]> {
    return await db.select().from(companies).orderBy(companies.name);
  }

  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company || undefined;
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [newCompany] = await db.insert(companies).values(company).returning();
    return newCompany;
  }

  async updateCompany(id: number, company: UpdateCompany): Promise<Company | undefined> {
    const [updatedCompany] = await db.update(companies)
      .set(company)
      .where(eq(companies.id, id))
      .returning();
    return updatedCompany || undefined;
  }

  async deleteCompany(id: number): Promise<boolean> {
    try {
      console.log(`Attempting to delete company with ID: ${id}`);

      // Check if company has related records
      const relatedProjects = await db.select().from(projects).where(eq(projects.companyId, id));
      const relatedUsers = await db.select().from(users).where(eq(users.companyId, id));
      const relatedAppointments = await db.select().from(appointments).where(eq(appointments.companyId, id));

      console.log(`Related records - Projects: ${relatedProjects.length}, Users: ${relatedUsers.length}, Appointments: ${relatedAppointments.length}`);

      if (relatedProjects.length > 0 || relatedUsers.length > 0 || relatedAppointments.length > 0) {
        const errorMsg = `Cannot delete company: has ${relatedProjects.length} projects, ${relatedUsers.length} users, and ${relatedAppointments.length} appointments`;
        console.log(`Blocking deletion: ${errorMsg}`);
        throw new Error(errorMsg);
      }

      console.log('No related records found, proceeding with deletion');
      const result = await db.delete(companies).where(eq(companies.id, id));
      console.log(`Delete result: ${result.rowCount || 0} rows affected`);
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Error deleting company:', error);
      throw error;
    }
  }

  // Projects methods
  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects).orderBy(projects.name);
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async getProjectsByCompany(companyId: number): Promise<Project[]> {
    return await db.select().from(projects)
      .where(eq(projects.companyId, companyId))
      .orderBy(projects.name);
  }

  async createProject(project: InsertProject): Promise<Project> {
    try {
      console.log("🚀 Creating project with auto-assignment of phases and subphases");

      // Create the project first
      const [newProject] = await db.insert(projects).values(project).returning();
      console.log(`✅ Project created with ID: ${newProject.id}`);

      // Auto-assign all phases and required subphases
      await this.autoAssignPhasesAndSubphases(newProject.id);

      return newProject;
    } catch (error) {
      console.error("💥 Error creating project with auto-assignment:", error);
      throw error;
    }
  }

  async updateProject(id: number, project: UpdateProject): Promise<Project | undefined> {
    try {
      console.log(`🔄 Storage: Updating project ${id} with:`, JSON.stringify(project, null, 2));

      const [updatedProject] = await db.update(projects)
        .set(project)
        .where(eq(projects.id, id))
        .returning();

      console.log(`✅ Storage: Project ${id} updated successfully:`, updatedProject ? 'Found' : 'Not found');
      return updatedProject || undefined;
    } catch (error) {
      console.error(`❌ Storage: Error updating project ${id}:`, error);
      throw error;
    }
  }

  async deleteProject(id: number): Promise<boolean> {
    try {
      console.log(`🗑️ Storage: Attempting to delete project with ID: ${id}`);

      // Check if project exists first
      const existingProject = await this.getProject(id);
      if (!existingProject) {
        console.log(`❌ Storage: Project with ID ${id} not found`);
        return false;
      }

      console.log(`📋 Storage: Found project: "${existingProject.name}" (ID: ${id})`);

      // Check if project has related appointments
      const relatedAppointments = await db.select().from(appointments).where(eq(appointments.projectId, id));

      console.log(`📊 Storage: Project ${id} has ${relatedAppointments.length} related appointments`);

      if (relatedAppointments.length > 0) {
        const appointmentTitles = relatedAppointments.slice(0, 3).map(a => a.title).join(', ');
        const moreText = relatedAppointments.length > 3 ? ` e mais ${relatedAppointments.length - 3}` : '';
        const errorMsg = `Cannot delete project: has ${relatedAppointments.length} appointments assigned (${appointmentTitles}${moreText})`;
        console.log(`❌ Storage: Blocking deletion: ${errorMsg}`);
        throw new Error(errorMsg);
      }

      console.log('✅ Storage: No related appointments found, proceeding with deletion');
      const result = await db.delete(projects).where(eq(projects.id, id));
      const rowsAffected = result.rowCount || 0;

      console.log(`📊 Storage: Delete operation affected ${rowsAffected} rows`);

      if (rowsAffected > 0) {
        console.log(`✅ Storage: Project ${id} deleted successfully`);
        return true;
      } else {
        console.log(`❌ Storage: No rows affected during deletion of project ${id}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Storage: Error deleting project ${id}:`, error);
      throw error;
    }
  }

  async forceDeleteProject(id: number): Promise<boolean> {
    try {
      console.log(`🗑️ Storage: FORCE deleting project with ID: ${id}`);

      // Check if project exists first
      const existingProject = await this.getProject(id);
      if (!existingProject) {
        console.log(`❌ Storage: Project with ID ${id} not found`);
        return false;
      }

      console.log(`📋 Storage: Found project: "${existingProject.name}" (ID: ${id})`);
      console.log(`⚠️ Storage: FORCE DELETE - Will remove ALL dependencies`);

      // Step 1: Delete all appointments linked to this project
      const appointmentsResult = await db.delete(appointments).where(eq(appointments.projectId, id));
      const deletedAppointments = appointmentsResult.rowCount || 0;
      console.log(`🗑️ Storage: Deleted ${deletedAppointments} appointments`);

      // Step 2: Delete project subphases (via project phases)
      const projectPhasesResult = await db.select().from(projectPhases).where(eq(projectPhases.projectId, id));
      let deletedSubphases = 0;

      for (const projectPhase of projectPhasesResult) {
        const subphasesResult = await db.delete(projectSubphases).where(eq(projectSubphases.projectPhaseId, projectPhase.id));
        deletedSubphases += subphasesResult.rowCount || 0;
      }
      console.log(`🗑️ Storage: Deleted ${deletedSubphases} project subphases`);

      // Step 3: Delete project phases
      const phasesResult = await db.delete(projectPhases).where(eq(projectPhases.projectId, id));
      const deletedPhases = phasesResult.rowCount || 0;
      console.log(`🗑️ Storage: Deleted ${deletedPhases} project phases`);

      // Step 4: Delete project tasks
      const tasksResult = await db.delete(projectTasks).where(eq(projectTasks.projectId, id));
      const deletedTasks = tasksResult.rowCount || 0;
      console.log(`🗑️ Storage: Deleted ${deletedTasks} project tasks`);

      // Step 5: Delete project roadmap entries
      const roadmapResult = await db.delete(projectRoadmap).where(eq(projectRoadmap.projectId, id));
      const deletedRoadmap = roadmapResult.rowCount || 0;
      console.log(`🗑️ Storage: Deleted ${deletedRoadmap} roadmap entries`);

      // Step 6: Finally delete the project itself
      const projectResult = await db.delete(projects).where(eq(projects.id, id));
      const deletedProject = projectResult.rowCount || 0;

      console.log(`📊 Storage: FORCE DELETE Summary for project ${id}:`);
      console.log(`   - Appointments: ${deletedAppointments}`);
      console.log(`   - Project Subphases: ${deletedSubphases}`);
      console.log(`   - Project Phases: ${deletedPhases}`);
      console.log(`   - Project Tasks: ${deletedTasks}`);
      console.log(`   - Roadmap Entries: ${deletedRoadmap}`);
      console.log(`   - Project: ${deletedProject}`);

      if (deletedProject > 0) {
        console.log(`✅ Storage: Project ${id} FORCE deleted successfully`);
        return true;
      } else {
        console.log(`❌ Storage: Failed to delete project ${id}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Storage: Error force deleting project ${id}:`, error);
      throw error;
    }
  }

  // Auto-assign all phases and required subphases to a new project
  async autoAssignPhasesAndSubphases(projectId: number): Promise<void> {
    try {
      console.log(`🔄 Auto-assigning phases and subphases to project ${projectId}`);

      // Get all phases ordered by orderIndex
      const allPhases = await db.select().from(phases)
        .where(eq(phases.isActive, true))
        .orderBy(phases.orderIndex, phases.name);

      console.log(`📋 Found ${allPhases.length} active phases to assign`);

      for (const phase of allPhases) {
        console.log(`📝 Assigning phase: ${phase.name} (ID: ${phase.id})`);

        // Create project phase
        const [projectPhase] = await db.insert(projectPhases).values({
          projectId,
          phaseId: phase.id,
          status: 'not_started',
          progressPercentage: 0
        }).returning();

        console.log(`✅ Project phase created with ID: ${projectPhase.id}`);

        // Get all required subphases for this phase
        const requiredSubphases = await db.select().from(subphases)
          .where(and(
            eq(subphases.phaseId, phase.id),
            eq(subphases.isRequired, true),
            eq(subphases.isActive, true)
          ))
          .orderBy(subphases.orderIndex, subphases.name);

        console.log(`📋 Found ${requiredSubphases.length} required subphases for phase ${phase.name}`);

        // Create project subphases for all required subphases
        for (const subphase of requiredSubphases) {
          console.log(`📝 Assigning required subphase: ${subphase.name} (ID: ${subphase.id})`);

          await db.insert(projectSubphases).values({
            projectPhaseId: projectPhase.id,
            subphaseId: subphase.id,
            status: 'not_started',
            progressPercentage: 0,
            priority: 'medium'
          });

          console.log(`✅ Required subphase assigned: ${subphase.name}`);
        }
      }

      console.log(`🎉 Auto-assignment completed for project ${projectId}`);
    } catch (error) {
      console.error(`💥 Error auto-assigning phases and subphases to project ${projectId}:`, error);
      throw error;
    }
  }

  // Calculate project progress based on phases and subphases completion
  async calculateProjectProgress(projectId: number): Promise<number> {
    try {
      console.log(`📊 Calculating progress for project ${projectId}`);

      // Get all project phases
      const projectPhasesData = await db.select({
        id: projectPhases.id,
        status: projectPhases.status,
        progressPercentage: projectPhases.progressPercentage
      }).from(projectPhases)
        .where(eq(projectPhases.projectId, projectId));

      if (projectPhasesData.length === 0) {
        console.log(`📊 No phases found for project ${projectId}, progress = 0%`);
        return 0;
      }

      // Get all project subphases
      const projectSubphasesData = await db.select({
        id: projectSubphases.id,
        status: projectSubphases.status,
        progressPercentage: projectSubphases.progressPercentage,
        projectPhaseId: projectSubphases.projectPhaseId
      }).from(projectSubphases)
        .innerJoin(projectPhases, eq(projectSubphases.projectPhaseId, projectPhases.id))
        .where(eq(projectPhases.projectId, projectId));

      console.log(`📊 Found ${projectPhasesData.length} phases and ${projectSubphasesData.length} subphases`);

      // Calculate total completion points
      let totalItems = projectPhasesData.length + projectSubphasesData.length;
      let completedItems = 0;

      // Count completed phases
      for (const phase of projectPhasesData) {
        if (phase.status === 'completed') {
          completedItems += 1;
        } else if (phase.progressPercentage && phase.progressPercentage > 0) {
          completedItems += phase.progressPercentage / 100;
        }
      }

      // Count completed subphases
      for (const subphase of projectSubphasesData) {
        if (subphase.status === 'completed') {
          completedItems += 1;
        } else if (subphase.progressPercentage && subphase.progressPercentage > 0) {
          completedItems += subphase.progressPercentage / 100;
        }
      }

      const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

      console.log(`📊 Project ${projectId} progress: ${completedItems}/${totalItems} = ${progressPercentage}%`);

      return progressPercentage;
    } catch (error) {
      console.error(`💥 Error calculating progress for project ${projectId}:`, error);
      return 0;
    }
  }

  // Update project progress and save to database
  async updateProjectProgress(projectId: number): Promise<void> {
    try {
      const progressPercentage = await this.calculateProjectProgress(projectId);

      await db.update(projects)
        .set({ progressPercentage })
        .where(eq(projects.id, projectId));

      console.log(`✅ Updated project ${projectId} progress to ${progressPercentage}%`);
    } catch (error) {
      console.error(`💥 Error updating project ${projectId} progress:`, error);
      throw error;
    }
  }

  // Calculate project deadline status and performance indicators
  async calculateProjectDeadlineStatus(projectId: number): Promise<{
    status: 'on_track' | 'at_risk' | 'overdue';
    daysRemaining: number;
    progressPercentage: number;
    projectedEndDate: string | null;
    isOnSchedule: boolean;
    riskLevel: 'low' | 'medium' | 'high';
  }> {
    try {
      console.log(`📅 Calculating deadline status for project ${projectId}`);

      // Get project details
      const [project] = await db.select().from(projects).where(eq(projects.id, projectId));

      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      const currentDate = new Date();
      const startDate = project.startDate ? new Date(project.startDate) : null;
      const endDate = project.endDate ? new Date(project.endDate) : null;

      // Calculate progress
      const progressPercentage = await this.calculateProjectProgress(projectId);

      let status: 'on_track' | 'at_risk' | 'overdue' = 'on_track';
      let daysRemaining = 0;
      let projectedEndDate: string | null = null;
      let isOnSchedule = true;
      let riskLevel: 'low' | 'medium' | 'high' = 'low';

      if (endDate) {
        // Calculate days remaining
        const timeDiff = endDate.getTime() - currentDate.getTime();
        daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

        // Calculate project duration and elapsed time
        if (startDate) {
          const totalDuration = endDate.getTime() - startDate.getTime();
          const elapsedTime = currentDate.getTime() - startDate.getTime();
          const timeProgressPercentage = Math.max(0, Math.min(100, (elapsedTime / totalDuration) * 100));

          // Calculate projected end date based on current progress rate
          if (progressPercentage > 0 && timeProgressPercentage > 0) {
            const progressRate = progressPercentage / timeProgressPercentage;
            const remainingWork = 100 - progressPercentage;
            const remainingTimeNeeded = remainingWork / (progressPercentage / timeProgressPercentage);
            const projectedEndTime = currentDate.getTime() + (remainingTimeNeeded * (1000 * 3600 * 24));
            projectedEndDate = new Date(projectedEndTime).toISOString().split('T')[0];
          }

          // Determine status based on progress vs time elapsed
          if (daysRemaining < 0) {
            status = 'overdue';
            riskLevel = 'high';
            isOnSchedule = false;
          } else if (progressPercentage < timeProgressPercentage - 10) {
            status = 'at_risk';
            riskLevel = daysRemaining <= 7 ? 'high' : 'medium';
            isOnSchedule = false;
          } else if (progressPercentage < timeProgressPercentage - 5) {
            status = 'at_risk';
            riskLevel = 'medium';
            isOnSchedule = false;
          } else {
            status = 'on_track';
            riskLevel = daysRemaining <= 3 ? 'medium' : 'low';
            isOnSchedule = true;
          }
        }
      }

      const result = {
        status,
        daysRemaining,
        progressPercentage,
        projectedEndDate,
        isOnSchedule,
        riskLevel
      };

      console.log(`📅 Project ${projectId} deadline status:`, result);

      return result;
    } catch (error) {
      console.error(`💥 Error calculating deadline status for project ${projectId}:`, error);
      throw error;
    }
  }

  // Calculate KPIs for project management dashboard
  async calculateProjectKPIs(filters?: {
    startDate?: string;
    endDate?: string;
    companyId?: number;
    status?: string;
  }): Promise<{
    totalProjects: number;
    completedProjects: number;
    onTimeCompletionRate: number;
    averageExecutionTime: number;
    projectsAtRisk: number;
    averageProgressPercentage: number;
    phaseEfficiency: Array<{ phaseName: string; averageDuration: number; plannedDuration: number }>;
    monthlyTrend: Array<{ month: string; completed: number; started: number }>;
  }> {
    try {
      console.log("📊 Calculating project KPIs with filters:", filters);

      // Build where conditions using Drizzle ORM
      let whereConditions: any[] = [];

      if (filters?.startDate) {
        whereConditions.push(gte(projects.startDate, filters.startDate));
      }

      if (filters?.endDate) {
        whereConditions.push(lte(projects.startDate, filters.endDate));
      }

      if (filters?.companyId) {
        whereConditions.push(eq(projects.companyId, filters.companyId));
      }

      if (filters?.status) {
        whereConditions.push(eq(projects.status, filters.status));
      }

      // Get all projects with filters
      const allProjects = whereConditions.length > 0
        ? await db.select().from(projects).where(and(...whereConditions))
        : await db.select().from(projects);

      const totalProjects = allProjects.length;

      // Get completed projects
      const completedProjects = allProjects.filter(p => p.status === 'completed').length;

      // Calculate on-time completion rate
      const completedProjectsWithDates = allProjects.filter(p =>
        p.status === 'completed' && p.actualEndDate && p.endDate
      );
      const onTimeCompleted = completedProjectsWithDates.filter(p =>
        new Date(p.actualEndDate!) <= new Date(p.endDate!)
      ).length;
      const onTimeCompletionRate = completedProjectsWithDates.length > 0 ?
        (onTimeCompleted / completedProjectsWithDates.length) * 100 : 0;

      // Calculate average execution time (in days)
      const projectsWithExecutionTime = allProjects.filter(p =>
        p.status === 'completed' && p.actualStartDate && p.actualEndDate
      );
      const totalExecutionDays = projectsWithExecutionTime.reduce((total, p) => {
        const startDate = new Date(p.actualStartDate!);
        const endDate = new Date(p.actualEndDate!);
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return total + diffDays;
      }, 0);
      const averageExecutionTime = projectsWithExecutionTime.length > 0 ?
        totalExecutionDays / projectsWithExecutionTime.length : 0;

      // Get projects at risk (active projects with high risk or overdue)
      const activeProjects = allProjects.filter(p => p.status === 'active');
      const projectsAtRisk = activeProjects.filter(p => {
        // Consider a project at risk if it's overdue or has high risk level
        const isOverdue = p.endDate && new Date(p.endDate) < new Date();
        const isHighRisk = p.riskLevel === 'high' || p.riskLevel === 'medium';
        return isOverdue || isHighRisk;
      }).length;

      // Calculate average progress percentage for active projects
      const activeProjectsWithProgress = activeProjects.filter(p => p.progressPercentage !== null);
      const totalProgress = activeProjectsWithProgress.reduce((total, p) => total + (p.progressPercentage || 0), 0);
      const averageProgressPercentage = activeProjectsWithProgress.length > 0 ?
        totalProgress / activeProjectsWithProgress.length : 0;

      // Get phase efficiency data from project phases with phase names
      const allPhasesWithNames = await db
        .select({
          projectPhase: projectPhases,
          phaseName: phases.name
        })
        .from(projectPhases)
        .innerJoin(phases, eq(projectPhases.phaseId, phases.id));

      const phaseGroups = allPhasesWithNames.reduce((groups: any, item) => {
        const phaseName = item.phaseName;
        if (!groups[phaseName]) {
          groups[phaseName] = [];
        }
        groups[phaseName].push(item.projectPhase);
        return groups;
      }, {});

      const phaseEfficiency = Object.keys(phaseGroups).map(phaseName => {
        const phases = phaseGroups[phaseName];
        const completedPhases = phases.filter((p: any) => p.status === 'completed');

        // Calculate average duration for completed phases
        const totalDuration = completedPhases.reduce((total: number, phase: any) => {
          if (phase.actualStartDate && phase.actualEndDate) {
            const startDate = new Date(phase.actualStartDate);
            const endDate = new Date(phase.actualEndDate);
            const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return total + diffDays;
          }
          return total;
        }, 0);

        const averageDuration = completedPhases.length > 0 ? totalDuration / completedPhases.length : 0;

        // Estimate planned duration based on phase type
        const plannedDuration = phaseName.toLowerCase().includes('planejamento') ? 7 :
                               phaseName.toLowerCase().includes('desenvolvimento') ? 21 :
                               phaseName.toLowerCase().includes('teste') ? 10 : 14;

        return {
          phaseName,
          averageDuration: Math.round(averageDuration * 100) / 100,
          plannedDuration
        };
      });

      // Generate monthly trend data
      const currentDate = new Date();
      const monthlyTrend = [];
      for (let i = 2; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthStr = date.toISOString().slice(0, 7);

        const monthProjects = allProjects.filter(p => {
          const projectDate = p.startDate ? new Date(p.startDate) : null;
          return projectDate && projectDate.toISOString().slice(0, 7) === monthStr;
        });

        const completed = monthProjects.filter(p => p.status === 'completed').length;
        const started = monthProjects.length;

        monthlyTrend.push({
          month: monthStr,
          completed,
          started
        });
      }

      const kpis = {
        totalProjects,
        completedProjects,
        onTimeCompletionRate: Math.round(onTimeCompletionRate * 100) / 100,
        averageExecutionTime: Math.round(averageExecutionTime * 100) / 100,
        projectsAtRisk,
        averageProgressPercentage: Math.round(averageProgressPercentage * 100) / 100,
        phaseEfficiency,
        monthlyTrend
      };

      console.log("📊 Calculated KPIs:", kpis);

      return kpis;
    } catch (error) {
      console.error("💥 Error calculating project KPIs:", error);
      throw error;
    }
  }

  // Users methods
  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.name);
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUsersByCompany(companyId: number): Promise<User[]> {
    return await db.select().from(users)
      .where(eq(users.companyId, companyId))
      .orderBy(users.name);
  }

  async getUsersByType(type: 'internal' | 'external'): Promise<User[]> {
    return await db.select().from(users)
      .where(eq(users.type, type))
      .orderBy(users.name);
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, user: UpdateUser): Promise<User | undefined> {
    const [updatedUser] = await db.update(users)
      .set(user)
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      console.log(`🗑️ Storage: Attempting to delete user with ID: ${id}`);

      // Check if user exists first
      const existingUser = await this.getUser(id);
      if (!existingUser) {
        console.log(`❌ Storage: User with ID ${id} not found`);
        return false;
      }

      console.log(`📋 Storage: Found user: "${existingUser.name}" (ID: ${id})`);

      // Check if user has related appointments
      const relatedAppointments = await db.select().from(appointments).where(eq(appointments.assignedUserId, id));

      console.log(`📊 Storage: User ${id} has ${relatedAppointments.length} related appointments`);

      if (relatedAppointments.length > 0) {
        const appointmentTitles = relatedAppointments.slice(0, 3).map(a => a.title).join(', ');
        const moreText = relatedAppointments.length > 3 ? ` e mais ${relatedAppointments.length - 3}` : '';
        const errorMsg = `Cannot delete user: has ${relatedAppointments.length} appointments assigned (${appointmentTitles}${moreText})`;
        console.log(`❌ Storage: Blocking deletion: ${errorMsg}`);
        throw new Error(errorMsg);
      }

      console.log('✅ Storage: No related appointments found, proceeding with deletion');
      const result = await db.delete(users).where(eq(users.id, id));
      const rowsAffected = result.rowCount || 0;

      console.log(`📊 Storage: Delete operation affected ${rowsAffected} rows`);

      if (rowsAffected > 0) {
        console.log(`✅ Storage: User ${id} deleted successfully`);
        return true;
      } else {
        console.log(`❌ Storage: No rows affected during deletion of user ${id}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Storage: Error deleting user ${id}:`, error);
      throw error;
    }
  }

  async getAppointments(): Promise<Appointment[]> {
    return await db.select().from(appointments).orderBy(appointments.date, appointments.startTime);
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, parseInt(id)));
    return appointment || undefined;
  }

  async getAppointmentsByDate(date: string): Promise<Appointment[]> {
    return await db.select().from(appointments)
      .where(eq(appointments.date, date))
      .orderBy(appointments.startTime);
  }

  async getAppointmentsByDateRange(startDate: string, endDate: string): Promise<Appointment[]> {
    return await db.select().from(appointments)
      .where(and(gte(appointments.date, startDate), lte(appointments.date, endDate)))
      .orderBy(appointments.date, appointments.startTime);
  }

  async getAppointmentsByProject(projectId: number): Promise<Appointment[]> {
    return await db.select().from(appointments)
      .where(eq(appointments.projectId, projectId))
      .orderBy(appointments.date, appointments.startTime);
  }

  async getAppointmentsByUser(userId: number): Promise<Appointment[]> {
    return await db.select().from(appointments)
      .where(eq(appointments.assignedUserId, userId))
      .orderBy(appointments.date, appointments.startTime);
  }

  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    // VALIDAÇÃO CORRIGIDA DE FINAIS DE SEMANA - SEM PROBLEMAS DE FUSO HORÁRIO
    const dateStr = insertAppointment.date;
    const [year, month, day] = dateStr.split('-').map(Number);
    const appointmentDate = new Date(year, month - 1, day); // month - 1 porque JavaScript usa 0-11
    const dayOfWeek = appointmentDate.getDay();

    console.log(`🔍 STORAGE - Validando data: ${dateStr} = dia da semana ${dayOfWeek}`);
    console.log(`🔍 STORAGE - Data criada: ${appointmentDate.toDateString()}`);

    // VERIFICAR SE É ENCAIXE AUTORIZADO - SE SIM, PULAR TODAS AS VALIDAÇÕES
    const isEncaixeAuthorized = insertAppointment.allowWeekendOverride || insertAppointment.allowOverlap;

    if (isEncaixeAuthorized) {
      console.log(`✅ STORAGE - ENCAIXE AUTORIZADO - PULANDO TODAS AS VALIDAÇÕES`);
    } else {
      // SÁBADO = 6, DOMINGO = 0 - BLOQUEAR APENAS SE NÃO FOR ENCAIXE
      if (dayOfWeek === 6) {
        console.log(`❌ STORAGE - BLOQUEANDO SÁBADO (sem autorização de encaixe)`);
        throw new Error(`SÁBADO NÃO É PERMITIDO! Escolha segunda a sexta.`);
      }

      if (dayOfWeek === 0) {
        console.log(`❌ STORAGE - BLOQUEANDO DOMINGO (sem autorização de encaixe)`);
        throw new Error(`DOMINGO NÃO É PERMITIDO! Escolha segunda a sexta.`);
      }
    }

    console.log(`✅ STORAGE - Dia útil aprovado: ${dayOfWeek}`);

    const endTime = this.calculateEndTime(insertAppointment.startTime, insertAppointment.durationMinutes);

    // Calculate time values that will be used throughout the function
    const startMinutes = this.timeToMinutes(insertAppointment.startTime);
    const endMinutes = startMinutes + insertAppointment.durationMinutes;

    // Block lunch break (12:00-13:00) - APENAS SE NÃO FOR ENCAIXE
    if (!isEncaixeAuthorized) {
      const lunchStart = this.timeToMinutes('12:00');
      const lunchEnd = this.timeToMinutes('13:00');

      console.log(`🔍 VALIDAÇÃO ALMOÇO - Horário: ${insertAppointment.startTime} (${startMinutes}min) até ${endMinutes}min`);

      if ((startMinutes >= lunchStart && startMinutes < lunchEnd) ||
          (endMinutes > lunchStart && endMinutes <= lunchEnd) ||
          (startMinutes < lunchStart && endMinutes > lunchEnd)) {
        console.log(`❌ BLOQUEANDO HORÁRIO DE ALMOÇO`);
        throw new Error("Agendamentos não são permitidos durante o horário de almoço (12:00-13:00).");
      }

      console.log(`✅ HORÁRIO DE ALMOÇO OK`);
    } else {
      console.log(`✅ ENCAIXE - PULANDO VALIDAÇÃO DE HORÁRIO DE ALMOÇO`);
    }

    // Check for time conflicts - APENAS SE NÃO FOR ENCAIXE
    if (!isEncaixeAuthorized && !insertAppointment.isPomodoro) {
      console.log(`🔍 VERIFICANDO CONFLITOS DE HORÁRIO`);
      const hasConflict = await this.checkTimeConflict(insertAppointment.date, insertAppointment.startTime, endTime);
      if (hasConflict) {
        console.log(`❌ CONFLITO DE HORÁRIO DETECTADO`);
        throw new Error("Conflito de horário detectado. Já existe um agendamento neste período.");
      }
      console.log(`✅ NENHUM CONFLITO DE HORÁRIO`);
    } else {
      console.log(`✅ ENCAIXE - PULANDO VALIDAÇÃO DE CONFLITOS DE HORÁRIO`);
    }


    // Determine work schedule compliance
    const isAfterHours = startMinutes >= this.timeToMinutes('18:00');
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isWithinWorkHours = !isAfterHours && !isWeekend &&
      ((startMinutes >= this.timeToMinutes('08:00') && endMinutes <= this.timeToMinutes('12:00')) ||
       (startMinutes >= this.timeToMinutes('13:00') && endMinutes <= this.timeToMinutes('18:00')));

    // Determine final allowOverlap value
    const finalAllowOverlap = insertAppointment.allowOverlap || insertAppointment.allowWeekendOverride || false;

    console.log(`🔍 STORAGE - allowOverlap: ${insertAppointment.allowOverlap}`);
    console.log(`🔍 STORAGE - allowWeekendOverride: ${insertAppointment.allowWeekendOverride}`);
    console.log(`🔍 STORAGE - finalAllowOverlap: ${finalAllowOverlap}`);

    // Remove allowOverlap and allowWeekendOverride from appointmentData as they're handled separately
    const { allowOverlap, allowWeekendOverride, ...appointmentData } = {
      ...insertAppointment,
      endTime,
      status: "scheduled" as const,
      completedAt: null,
      // Set work schedule compliance fields
      isWithinWorkHours: isWithinWorkHours,
      isOvertime: isAfterHours || isWeekend, // Mark weekend appointments as overtime/encaixe
      workScheduleViolation: isWeekend ? (dayOfWeek === 0 ? 'weekend_sunday' : 'weekend_saturday') : null,
      allowOverlap: finalAllowOverlap,
    };

    console.log("🎯 STORAGE - About to insert appointment with data:", appointmentData);

    try {
      const [appointment] = await db.insert(appointments).values(appointmentData).returning();
      console.log("✅ STORAGE - Appointment created successfully:", appointment);
      return appointment;
    } catch (dbError) {
      console.error("❌ STORAGE - Database error during appointment creation:", dbError);
      console.error("❌ STORAGE - Failed appointment data:", appointmentData);
      throw dbError;
    }

    // Note: Pomodoro creation is now handled by frontend confirmation dialog
    console.log("✅ STORAGE - Appointment creation completed, returning appointment");
  }

  async updateAppointment(id: string, updateData: UpdateAppointment): Promise<Appointment | undefined> {
    const existing = await this.getAppointment(id);
    if (!existing) return undefined;

    // Check for time conflicts if updating schedule (unless allowOverlap is true)
    if ((updateData.startTime || updateData.durationMinutes || updateData.date) && !existing.isPomodoro && !updateData.allowOverlap) {
      const newStartTime = updateData.startTime || existing.startTime;
      const newDurationMinutes = updateData.durationMinutes || existing.durationMinutes;
      const newDate = updateData.date || existing.date;
      const newEndTime = this.calculateEndTime(newStartTime, newDurationMinutes);

      const hasConflict = await this.checkTimeConflict(newDate, newStartTime, newEndTime, parseInt(id));
      if (hasConflict) {
        throw new Error("Conflito de horário detectado. Já existe um agendamento neste período.");
      }
    }

    // Increment reschedule count if it's a reschedule operation
    const isReschedule = updateData.startTime || updateData.date;
    if (isReschedule && !existing.isPomodoro) {
      updateData.rescheduleCount = (existing.rescheduleCount || 0) + 1;
    }

    // Recalculate end time if start time or duration changed
    if (updateData.startTime || updateData.durationMinutes) {
      updateData.endTime = this.calculateEndTime(
        updateData.startTime || existing.startTime,
        updateData.durationMinutes || existing.durationMinutes
      );
    }

    // Remove allowOverlap from updateData as it's not a database field
    const { allowOverlap, ...dataToUpdate } = updateData;

    const [updated] = await db.update(appointments)
      .set(dataToUpdate)
      .where(eq(appointments.id, parseInt(id)))
      .returning();

    // Update associated Pomodoro if this is not a Pomodoro and schedule changed
    if (updated && !updated.isPomodoro && (updateData.startTime || updateData.durationMinutes || updateData.date)) {
      await this.updateAssociatedPomodoro(updated);
    }

    return updated || undefined;
  }

  async deleteAppointment(id: string): Promise<boolean> {
    try {
      console.log(`🗑️ Storage: Attempting to delete appointment ${id}`);

      const appointmentId = parseInt(id);
      if (isNaN(appointmentId)) {
        console.log(`❌ Storage: Invalid appointment ID format: ${id}`);
        throw new Error(`Invalid appointment ID format: ${id}`);
      }

      // Check if appointment exists first
      const existingAppointment = await this.getAppointment(id);
      if (!existingAppointment) {
        console.log(`❌ Storage: Appointment ${id} not found for deletion`);
        return false;
      }

      console.log(`📋 Storage: Found appointment to delete: "${existingAppointment.title}" (ID: ${id})`);

      // Perform the deletion
      const result = await db.delete(appointments).where(eq(appointments.id, appointmentId));
      const rowsAffected = result.rowCount || 0;

      console.log(`📊 Storage: Delete operation affected ${rowsAffected} rows`);

      if (rowsAffected > 0) {
        console.log(`✅ Storage: Appointment ${id} deleted successfully`);
        return true;
      } else {
        console.log(`❌ Storage: No rows affected during deletion of appointment ${id}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Storage: Error deleting appointment ${id}:`, error);
      throw error;
    }
  }

  async getProductivityStats(): Promise<{
    todayCompleted: number;
    scheduledHoursToday: number;
    slaExpired: number;
    slaCompliance: number;
    rescheduled: number;
    pomodorosToday: number;
    nextTask?: string;
  }> {
    const today = new Date().toISOString().split('T')[0];
    const allAppointments = await db.select().from(appointments);
    
    const todayAppointments = allAppointments.filter(apt => apt.date === today);
    const completedToday = todayAppointments.filter(apt => apt.status === 'completed');
    const pomodorosToday = todayAppointments.filter(apt => apt.isPomodoro);
    
    // Count rescheduled appointments based on updated_at field
    // For now, we'll approximate by checking for multiple appointments with same title
    const rescheduledCount = this.calculateRescheduledCount(allAppointments);
    
    // Calculate scheduled hours today
    const scheduledMinutesToday = todayAppointments
      .filter(apt => !apt.isPomodoro)
      .reduce((total, apt) => total + apt.durationMinutes, 0);
    
    // Calculate SLA metrics
    const appointmentsWithSLA = allAppointments.filter(apt => apt.slaMinutes && !apt.isPomodoro);
    const slaExpired = appointmentsWithSLA.filter(apt => {
      if (apt.status === 'completed' && apt.completedAt) {
        const completedDate = new Date(apt.completedAt);
        const scheduledDate = new Date(`${apt.date}T${apt.startTime}`);
        const timeTaken = (completedDate.getTime() - scheduledDate.getTime()) / (1000 * 60);
        return timeTaken > (apt.slaMinutes || 0);
      }
      if (apt.status === 'scheduled') {
        const now = new Date();
        const scheduledDate = new Date(`${apt.date}T${apt.startTime}`);
        const timePassed = (now.getTime() - scheduledDate.getTime()) / (1000 * 60);
        return timePassed > (apt.slaMinutes || 0);
      }
      return false;
    });

    const slaCompliance = appointmentsWithSLA.length > 0 
      ? Math.round(((appointmentsWithSLA.length - slaExpired.length) / appointmentsWithSLA.length) * 100)
      : 100;

    // Find next task
    const nextTask = this.findNextTask(allAppointments);

    return {
      todayCompleted: completedToday.length,
      scheduledHoursToday: Math.round((scheduledMinutesToday / 60) * 10) / 10,
      slaExpired: slaExpired.length,
      slaCompliance,
      rescheduled: rescheduledCount,
      pomodorosToday: pomodorosToday.length,
      nextTask,
    };
  }

  private calculateRescheduledCount(appointments: any[]): number {
    // Count total reschedules across all appointments
    return appointments.reduce((total, apt) => total + (apt.rescheduleCount || 0), 0);
  }

  private findNextTask(appointments: any[]): string {
    const now = new Date();
    
    const upcomingTasks = appointments
      .filter(apt => {
        const taskDateTime = new Date(`${apt.date}T${apt.startTime}`);
        return taskDateTime > now && apt.status === 'scheduled' && !apt.isPomodoro;
      })
      .sort((a, b) => {
        const timeA = new Date(`${a.date}T${a.startTime}`).getTime();
        const timeB = new Date(`${b.date}T${b.startTime}`).getTime();
        return timeA - timeB;
      });
    
    return upcomingTasks.length > 0 ? upcomingTasks[0].startTime : "--:--";
  }

  private async checkTimeConflict(date: string, startTime: string, endTime: string, excludeId?: number): Promise<boolean> {
    const existingAppointments = await db.select().from(appointments)
      .where(eq(appointments.date, date));

    for (const appointment of existingAppointments) {
      if (excludeId && appointment.id === excludeId) continue;

      // Skip cancelled appointments
      if (appointment.status === 'cancelled') continue;

      // Check if times overlap
      const existingStart = appointment.startTime;
      const existingEnd = appointment.endTime;

      // Convert times to minutes for comparison (handle midnight crossings)
      const startMinutes = this.timeToMinutesWithMidnightHandling(startTime, false);
      const endMinutes = this.timeToMinutesWithMidnightHandling(endTime, true);
      const existingStartMinutes = this.timeToMinutesWithMidnightHandling(existingStart, false);
      const existingEndMinutes = this.timeToMinutesWithMidnightHandling(existingEnd, true);

      // Check for overlap
      if (startMinutes < existingEndMinutes && endMinutes > existingStartMinutes) {
        return true;
      }
    }

    return false;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private timeToMinutesWithMidnightHandling(time: string, isEndTime: boolean = false): number {
    const [hours, minutes] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;

    // If it's an end time and it's 00:00, treat it as 24:00 (1440 minutes)
    if (isEndTime && hours === 0 && minutes === 0) {
      return 1440; // 24:00 in minutes
    }

    return totalMinutes;
  }

  private async updateAssociatedPomodoro(updatedAppointment: Appointment): Promise<void> {
    // Find the Pomodoro that was created after this appointment
    const allAppointments = await db.select().from(appointments)
      .where(and(
        eq(appointments.date, updatedAppointment.date),
        eq(appointments.isPomodoro, true)
      ));

    // Look for a Pomodoro that would have been created right after the original appointment
    for (const pomodoro of allAppointments) {
      // Check if this Pomodoro was likely created for this appointment
      // We'll update the one that comes closest after the updated appointment
      const newPomodoroStartTime = updatedAppointment.endTime;
      const newPomodoroEndTime = this.calculateEndTime(newPomodoroStartTime, 5);

      await db.update(appointments)
        .set({
          date: updatedAppointment.date,
          startTime: newPomodoroStartTime,
          endTime: newPomodoroEndTime
        })
        .where(eq(appointments.id, pomodoro.id));
      
      // Update only the first Pomodoro for now (can be improved later)
      break;
    }
  }

  // Recurring Appointments Methods
  async createRecurringAppointment(appointmentData: any): Promise<{ template: Appointment; instances: Appointment[] }> {
    console.log('🔄 Creating recurring appointment:', appointmentData.title);

    // Validate recurring task data
    const validationErrors = validateRecurringTask(appointmentData);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }

    const recurringTaskId = generateRecurringTaskId();

    // Create the template appointment with all fields
    const templateData = {
      ...appointmentData,
      isRecurring: true,
      isRecurringTemplate: true,
      recurringTaskId: recurringTaskId,
      parentTaskId: null,
      originalDate: null,
      wasRescheduledFromWeekend: false,
    };

    // Use raw insert for template to include all fields
    const [template] = await db.insert(appointments).values({
      ...templateData,
      endTime: this.calculateEndTime(templateData.startTime, templateData.durationMinutes),
      status: 'scheduled'
    }).returning();
    console.log(`✅ Created recurring template with ID: ${template.id}`);

    // Generate and create all instances
    const instances: Appointment[] = [];
    if (appointmentData.isRecurring) {
      const instancesData = await generateRecurringInstances(appointmentData, recurringTaskId);
      console.log(`📋 Generated ${instancesData.length} recurring instances`);

      for (const instanceData of instancesData) {
        try {
          // Use raw insert for instances to include all fields
          const [instance] = await db.insert(appointments).values({
            ...instanceData,
            parentTaskId: template.id,
            endTime: this.calculateEndTime(instanceData.startTime, instanceData.durationMinutes),
            status: 'scheduled'
          }).returning();
          instances.push(instance);
        } catch (error) {
          console.warn(`⚠️ Failed to create instance for date ${instanceData.date}:`, error);
          // Continue creating other instances even if one fails
        }
      }
    }

    console.log(`🎉 Created recurring task with ${instances.length} instances`);
    return { template, instances };
  }

  async getRecurringTaskInstances(recurringTaskId: number): Promise<Appointment[]> {
    return await db.select().from(appointments)
      .where(eq(appointments.recurringTaskId, recurringTaskId))
      .orderBy(appointments.date, appointments.startTime);
  }

  async updateRecurringTaskSeries(recurringTaskId: number, updates: UpdateAppointment): Promise<Appointment[]> {
    console.log(`🔄 Updating recurring task series ${recurringTaskId}`);

    // Get all instances of the recurring task
    const instances = await this.getRecurringTaskInstances(recurringTaskId);
    const updatedInstances: Appointment[] = [];

    for (const instance of instances) {
      try {
        const updated = await this.updateAppointment(instance.id.toString(), updates);
        if (updated) {
          updatedInstances.push(updated);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to update instance ${instance.id}:`, error);
      }
    }

    console.log(`✅ Updated ${updatedInstances.length} instances in recurring series`);
    return updatedInstances;
  }

  async deleteRecurringTaskSeries(recurringTaskId: number): Promise<boolean> {
    console.log(`🗑️ Deleting recurring task series ${recurringTaskId}`);

    try {
      const result = await db.delete(appointments)
        .where(eq(appointments.recurringTaskId, recurringTaskId));

      const deletedCount = result.rowCount || 0;
      console.log(`✅ Deleted ${deletedCount} appointments from recurring series`);
      return deletedCount > 0;
    } catch (error) {
      console.error(`❌ Error deleting recurring task series ${recurringTaskId}:`, error);
      throw error;
    }
  }

  async deleteRecurringTaskInstance(id: string, deleteAll: boolean = false): Promise<boolean> {
    console.log(`🗑️ Deleting recurring task instance ${id}, deleteAll: ${deleteAll}`);

    if (deleteAll) {
      // Get the recurring task ID and delete the entire series
      const appointment = await this.getAppointment(id);
      if (appointment && appointment.recurringTaskId) {
        return await this.deleteRecurringTaskSeries(appointment.recurringTaskId);
      }
    }

    // Delete just this instance
    return await this.deleteAppointment(id);
  }

  // Phase methods
  async getPhases(): Promise<Phase[]> {
    return await db.select().from(phases).orderBy(phases.orderIndex, phases.name);
  }

  async getPhase(id: number): Promise<Phase | undefined> {
    const [phase] = await db.select().from(phases).where(eq(phases.id, id));
    return phase;
  }

  async createPhase(insertPhase: InsertPhase): Promise<Phase> {
    // If no orderIndex provided, assign the next available order
    if (insertPhase.orderIndex === undefined || insertPhase.orderIndex === null) {
      const maxOrderResult = await db.select({ maxOrder: sql<number>`COALESCE(MAX(${phases.orderIndex}), 0)` }).from(phases);
      const nextOrder = (maxOrderResult[0]?.maxOrder || 0) + 1;
      insertPhase.orderIndex = nextOrder;
    }

    const [phase] = await db.insert(phases).values(insertPhase).returning();
    return phase;
  }

  async updatePhase(id: number, updateData: UpdatePhase): Promise<Phase | undefined> {
    const [updated] = await db.update(phases)
      .set(updateData)
      .where(eq(phases.id, id))
      .returning();
    return updated;
  }

  async reorderPhases(phaseOrders: { id: number; orderIndex: number }[]): Promise<void> {
    try {
      console.log("🔄 Reordering phases:", phaseOrders);

      // Update each phase's order index
      for (const { id, orderIndex } of phaseOrders) {
        console.log(`📝 Updating phase ${id} to order ${orderIndex}`);
        await db.update(phases)
          .set({ orderIndex })
          .where(eq(phases.id, id));
      }

      console.log("✅ Phases reordered successfully");
    } catch (error) {
      console.error("💥 Error reordering phases:", error);
      throw error;
    }
  }

  async deletePhase(id: number): Promise<boolean> {
    // First, check if the phase exists
    const existing = await db.select().from(phases).where(eq(phases.id, id));
    if (existing.length === 0) {
      return false;
    }

    // Check if phase has subphases
    const [subphase] = await db.select().from(subphases).where(eq(subphases.phaseId, id)).limit(1);
    if (subphase) {
      throw new Error("Cannot delete phase that has subphases. Delete all subphases first.");
    }

    // Check if phase is in use by any projects
    const [projectPhase] = await db.select().from(projectPhases).where(eq(projectPhases.phaseId, id)).limit(1);
    if (projectPhase) {
      throw new Error("Cannot delete phase that is assigned to projects");
    }

    // Check if phase is in use by any appointments
    const [appointment] = await db.select().from(appointments).where(eq(appointments.phaseId, id)).limit(1);
    if (appointment) {
      throw new Error("Cannot delete phase that is assigned to appointments");
    }

    // Delete the phase
    await db.delete(phases).where(eq(phases.id, id));

    // Verify deletion by checking if the phase still exists
    const afterDelete = await db.select().from(phases).where(eq(phases.id, id));
    return afterDelete.length === 0;
  }

  async forceDeletePhase(id: number): Promise<boolean> {
    console.log(`🗑️ FORCE DELETING phase ${id}...`);

    // First, check if the phase exists
    const existing = await db.select().from(phases).where(eq(phases.id, id));
    if (existing.length === 0) {
      console.log(`❌ Phase ${id} does not exist`);
      return false;
    }

    console.log(`✅ Phase ${id} exists, proceeding with force deletion...`);

    // Step 1: Remove all subphases for this phase
    console.log(`🧹 Removing subphases for phase ${id}...`);
    const subphasesResult = await db.delete(subphases).where(eq(subphases.phaseId, id));
    console.log(`✅ Removed ${(subphasesResult as any).rowCount || 0} subphases`);

    // Step 2: Remove all project-phase associations
    console.log(`🧹 Removing project-phase associations for phase ${id}...`);
    const projectPhasesResult = await db.delete(projectPhases).where(eq(projectPhases.phaseId, id));
    console.log(`✅ Removed ${(projectPhasesResult as any).rowCount || 0} project-phase associations`);

    // Step 3: Clear phase from all appointments
    console.log(`🧹 Clearing phase ${id} from appointments...`);
    const appointmentsResult = await db.update(appointments)
      .set({ phaseId: null })
      .where(eq(appointments.phaseId, id));
    console.log(`✅ Cleared phase from ${(appointmentsResult as any).rowCount || 0} appointments`);

    // Step 4: Delete the phase itself
    console.log(`🗑️ Deleting phase ${id}...`);
    const phaseResult = await db.delete(phases).where(eq(phases.id, id));
    console.log(`✅ Phase deletion result: ${(phaseResult as any).rowCount || 0} rows affected`);

    // Verify deletion
    const afterDelete = await db.select().from(phases).where(eq(phases.id, id));
    const success = afterDelete.length === 0;

    if (success) {
      console.log(`🎉 Phase ${id} successfully force deleted!`);
    } else {
      console.log(`❌ Phase ${id} still exists after deletion attempt`);
    }

    return success;
  }

  // Project Phase methods
  async getProjectPhases(projectId: number): Promise<any[]> {
    try {
      console.log(`🔍 Getting project phases for project ${projectId}`);

      // Use Drizzle ORM instead of raw SQL
      const result = await db
        .select()
        .from(projectPhases)
        .innerJoin(phases, eq(projectPhases.phaseId, phases.id))
        .where(eq(projectPhases.projectId, projectId))
        .orderBy(phases.orderIndex, projectPhases.createdAt);

      console.log(`✅ Found ${result.length} project phases`);



      return result.map((row: any) => {
        // Extract project phase data
        const projectPhase = row.project_phases;

        const projectPhaseData = {
          id: projectPhase.id,
          projectId: projectPhase.projectId,
          phaseId: projectPhase.phaseId,
          deadline: projectPhase.endDate, // Use endDate as deadline for backward compatibility
          startDate: projectPhase.startDate,
          endDate: projectPhase.endDate,
          actualStartDate: projectPhase.actualStartDate,
          actualEndDate: projectPhase.actualEndDate,
          status: projectPhase.status,
          progressPercentage: projectPhase.progressPercentage,
          notes: projectPhase.notes,
          createdAt: projectPhase.createdAt,
          phase: {
            id: row.phases.id,
            name: row.phases.name,
            description: row.phases.description,
            color: row.phases.color,
            orderIndex: row.phases.orderIndex,
            estimatedDurationDays: row.phases.estimatedDurationDays,
            isActive: row.phases.isActive,
            createdAt: row.phases.createdAt
          }
        };



        return projectPhaseData;
      });
    } catch (error) {
      console.error("Error in getProjectPhases:", error);
      return [];
    }
  }

  async addPhaseToProject(insertProjectPhase: InsertProjectPhase): Promise<ProjectPhase> {
    // Ensure deadline field is synced with endDate for backward compatibility
    if (insertProjectPhase.endDate) {
      // Use raw SQL to insert with both fields
      const result = await db.execute(sql`
        INSERT INTO project_phases (project_id, phase_id, end_date, deadline, created_at)
        VALUES (${insertProjectPhase.projectId}, ${insertProjectPhase.phaseId}, ${insertProjectPhase.endDate}, ${insertProjectPhase.endDate}, now()::text)
        RETURNING *
      `);

      return (result as any).rows[0];
    }

    // For inserts without endDate, use normal Drizzle insert
    const [projectPhase] = await db.insert(projectPhases).values(insertProjectPhase).returning();
    return projectPhase;
  }

  async updateProjectPhase(projectId: number, phaseId: number, updates: UpdateProjectPhase): Promise<ProjectPhase | undefined> {
    // Ensure deadline field is synced with endDate for backward compatibility
    const updatesWithSync = { ...updates };
    if (updates.endDate !== undefined) {
      // Use raw SQL to update both fields since deadline is not in the Drizzle schema
      const result = await db.execute(sql`
        UPDATE project_phases
        SET end_date = ${updates.endDate}, deadline = ${updates.endDate}
        WHERE project_id = ${projectId} AND phase_id = ${phaseId}
        RETURNING *
      `);

      const updated = (result as any).rows[0];

      // Update project progress after phase update
      if (updated) {
        await this.updateProjectProgress(projectId);
      }

      return updated;
    }

    // For other updates, use the normal Drizzle update
    const [updated] = await db.update(projectPhases)
      .set(updatesWithSync)
      .where(and(eq(projectPhases.projectId, projectId), eq(projectPhases.phaseId, phaseId)))
      .returning();

    // Update project progress after phase update
    if (updated) {
      await this.updateProjectProgress(projectId);
    }

    return updated;
  }



  async getPhasesByProject(projectId: number): Promise<Phase[]> {
    const result = await db
      .select({ phase: phases })
      .from(projectPhases)
      .innerJoin(phases, eq(projectPhases.phaseId, phases.id))
      .where(eq(projectPhases.projectId, projectId));

    return result.map(r => r.phase);
  }

  async getAllProjectPhases(): Promise<ProjectPhase[]> {
    return await db.select().from(projectPhases);
  }

  async getAppointmentsWithPhases(): Promise<Appointment[]> {
    return await db.select().from(appointments).where(isNotNull(appointments.phaseId));
  }

  async removePhaseFromProject(projectId: number, phaseId: number): Promise<boolean> {
    try {
      // Check if the association exists
      const existing = await db.select().from(projectPhases)
        .where(and(eq(projectPhases.projectId, projectId), eq(projectPhases.phaseId, phaseId)));

      if (existing.length === 0) {
        return false;
      }

      // Remove the association
      await db.delete(projectPhases)
        .where(and(eq(projectPhases.projectId, projectId), eq(projectPhases.phaseId, phaseId)));

      // Verify deletion
      const afterDelete = await db.select().from(projectPhases)
        .where(and(eq(projectPhases.projectId, projectId), eq(projectPhases.phaseId, phaseId)));

      return afterDelete.length === 0;
    } catch (error) {
      console.error("Error removing phase from project:", error);
      throw error;
    }
  }

  async clearPhaseFromAppointments(phaseId: number): Promise<number> {
    try {
      // First, count how many appointments have this phase
      const appointmentsWithPhase = await db.select().from(appointments)
        .where(eq(appointments.phaseId, phaseId));

      const count = appointmentsWithPhase.length;

      if (count > 0) {
        // Clear the phase_id from all appointments that have this phase
        await db.update(appointments)
          .set({ phaseId: null })
          .where(eq(appointments.phaseId, phaseId));
      }

      return count;
    } catch (error) {
      console.error("Error clearing phase from appointments:", error);
      throw error;
    }
  }

  async completePhaseCleanup(): Promise<any> {
    try {
      console.log("🧹 Starting complete phase cleanup...");

      // Step 1: Get all phases that are in use
      const allProjectPhases = await this.getAllProjectPhases();
      const appointmentsWithPhases = await this.getAppointmentsWithPhases();

      const phaseIdsInProjects = Array.from(new Set(allProjectPhases.map(pp => pp.phaseId)));
      const phaseIdsInAppointments = Array.from(new Set(appointmentsWithPhases.map(a => a.phaseId).filter(id => id !== null)));
      const allPhaseIdsInUse = Array.from(new Set([...phaseIdsInProjects, ...phaseIdsInAppointments]));

      console.log(`Found ${allPhaseIdsInUse.length} phases in use: ${allPhaseIdsInUse.join(', ')}`);

      let clearedProjectPhases = 0;
      let clearedAppointments = 0;
      let deletedPhases = 0;

      // Step 2: Clear all project-phase associations
      for (const phaseId of phaseIdsInProjects) {
        console.log(`Clearing phase ${phaseId} from all projects...`);
        const result = await db.delete(projectPhases).where(eq(projectPhases.phaseId, phaseId));
        clearedProjectPhases += (result as any).rowCount || 0;
      }

      // Step 3: Clear all appointments with phases
      for (const phaseId of phaseIdsInAppointments) {
        console.log(`Clearing phase ${phaseId} from all appointments...`);
        const count = await this.clearPhaseFromAppointments(phaseId);
        clearedAppointments += count;
      }

      // Step 4: Delete the phases themselves
      for (const phaseId of allPhaseIdsInUse) {
        try {
          console.log(`Deleting phase ${phaseId}...`);
          const result = await db.delete(phases).where(eq(phases.id, phaseId));
          if ((result as any).rowCount > 0) {
            deletedPhases++;
            console.log(`✅ Phase ${phaseId} deleted successfully`);
          }
        } catch (error) {
          console.log(`❌ Failed to delete phase ${phaseId}:`, error.message);
        }
      }

      const summary = {
        clearedProjectPhases,
        clearedAppointments,
        deletedPhases,
        processedPhases: allPhaseIdsInUse
      };

      console.log("🎉 Complete phase cleanup finished:", summary);
      return summary;

    } catch (error) {
      console.error("Error in complete phase cleanup:", error);
      throw error;
    }
  }

  async nuclearDeletePhases(phaseIds: number[]): Promise<any> {
    console.log(`💥 NUCLEAR DELETE: Starting complete removal of phases ${phaseIds.join(', ')}`);

    const results = {
      deletedSubphases: 0,
      deletedProjectPhases: 0,
      clearedAppointments: 0,
      deletedPhases: 0,
      errors: []
    };

    try {
      // Step 1: Delete all subphases for these phases (direct SQL)
      console.log(`🗑️ Step 1: Deleting subphases for phases ${phaseIds.join(', ')}`);
      for (const phaseId of phaseIds) {
        try {
          const subphasesResult = await db.execute(`DELETE FROM subphases WHERE phase_id = ${phaseId}`);
          const deletedCount = (subphasesResult as any).rowCount || 0;
          results.deletedSubphases += deletedCount;
          console.log(`✅ Deleted ${deletedCount} subphases for phase ${phaseId}`);
        } catch (error) {
          console.log(`❌ Error deleting subphases for phase ${phaseId}:`, error.message);
          results.errors.push(`Subphases for phase ${phaseId}: ${error.message}`);
        }
      }

      // Step 2: Delete all project-phase associations (direct SQL)
      console.log(`🗑️ Step 2: Deleting project-phase associations for phases ${phaseIds.join(', ')}`);
      for (const phaseId of phaseIds) {
        try {
          const projectPhasesResult = await db.execute(`DELETE FROM project_phases WHERE phase_id = ${phaseId}`);
          const deletedCount = (projectPhasesResult as any).rowCount || 0;
          results.deletedProjectPhases += deletedCount;
          console.log(`✅ Deleted ${deletedCount} project-phase associations for phase ${phaseId}`);
        } catch (error) {
          console.log(`❌ Error deleting project-phase associations for phase ${phaseId}:`, error.message);
          results.errors.push(`Project phases for phase ${phaseId}: ${error.message}`);
        }
      }

      // Step 3: Clear phase references from appointments (direct SQL)
      console.log(`🗑️ Step 3: Clearing phase references from appointments for phases ${phaseIds.join(', ')}`);
      for (const phaseId of phaseIds) {
        try {
          const appointmentsResult = await db.execute(`UPDATE appointments SET phase_id = NULL WHERE phase_id = ${phaseId}`);
          const updatedCount = (appointmentsResult as any).rowCount || 0;
          results.clearedAppointments += updatedCount;
          console.log(`✅ Cleared ${updatedCount} appointments for phase ${phaseId}`);
        } catch (error) {
          console.log(`❌ Error clearing appointments for phase ${phaseId}:`, error.message);
          results.errors.push(`Appointments for phase ${phaseId}: ${error.message}`);
        }
      }

      // Step 4: Delete the phases themselves (direct SQL)
      console.log(`🗑️ Step 4: Deleting phases ${phaseIds.join(', ')}`);
      for (const phaseId of phaseIds) {
        try {
          const phaseResult = await db.execute(`DELETE FROM phases WHERE id = ${phaseId}`);
          const deletedCount = (phaseResult as any).rowCount || 0;
          results.deletedPhases += deletedCount;
          if (deletedCount > 0) {
            console.log(`✅ Successfully deleted phase ${phaseId}`);
          } else {
            console.log(`⚠️ Phase ${phaseId} was not found or already deleted`);
          }
        } catch (error) {
          console.log(`❌ Error deleting phase ${phaseId}:`, error.message);
          results.errors.push(`Phase ${phaseId}: ${error.message}`);
        }
      }

      // Step 5: Verify deletion
      console.log(`🔍 Step 5: Verifying deletion...`);
      for (const phaseId of phaseIds) {
        try {
          const checkResult = await db.execute(`SELECT id FROM phases WHERE id = ${phaseId}`);
          const stillExists = (checkResult as any).rows && (checkResult as any).rows.length > 0;
          if (stillExists) {
            console.log(`❌ Phase ${phaseId} still exists after deletion attempt`);
            results.errors.push(`Phase ${phaseId} still exists after deletion`);
          } else {
            console.log(`✅ Phase ${phaseId} successfully removed from database`);
          }
        } catch (error) {
          console.log(`⚠️ Error verifying deletion of phase ${phaseId}:`, error.message);
        }
      }

      console.log(`💥 NUCLEAR DELETE completed:`, results);
      return results;

    } catch (error) {
      console.error("💥 NUCLEAR DELETE failed:", error);
      results.errors.push(`General error: ${error.message}`);
      throw error;
    }
  }

  // BI Stages methods
  async getBiStages(): Promise<any[]> {
    return await db.execute(`SELECT * FROM bi_stages ORDER BY order_index` as any).then((result: any) => result.rows);
  }

  async getBiStage(id: number): Promise<any | undefined> {
    const result = await executeRawSQL(`SELECT * FROM bi_stages WHERE id = ?`, [id]);
    return (result as any).rows[0] || undefined;
  }

  // BI Project Templates methods
  async getBiProjectTemplates(): Promise<any[]> {
    return await db.execute(`SELECT * FROM bi_project_templates WHERE is_active = true ORDER BY name` as any).then((result: any) => result.rows);
  }

  async getBiProjectTemplate(id: number): Promise<any | undefined> {
    const result = await db.execute(`SELECT * FROM bi_project_templates WHERE id = ?` as any, [id]);
    return (result as any).rows[0] || undefined;
  }

  async createBiProjectTemplate(template: any): Promise<any> {
    const result = await db.execute(`
      INSERT INTO bi_project_templates (name, description, category, complexity, estimated_duration_weeks, required_skills, recommended_team_size, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    ` as any, [
      template.name,
      template.description,
      template.category,
      template.complexity || 'medium',
      template.estimatedDurationWeeks,
      template.requiredSkills ? JSON.stringify(template.requiredSkills) : null,
      template.recommendedTeamSize || 1,
      template.isActive !== undefined ? template.isActive : true
    ]);
    return (result as any).rows[0];
  }

  async updateBiProjectTemplate(id: number, updates: any): Promise<any | undefined> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      fields.push(`name = ?`);
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push(`description = ?`);
      values.push(updates.description);
    }
    if (updates.category !== undefined) {
      fields.push(`category = ?`);
      values.push(updates.category);
    }
    if (updates.complexity !== undefined) {
      fields.push(`complexity = ?`);
      values.push(updates.complexity);
    }
    if (updates.estimatedDurationWeeks !== undefined) {
      fields.push(`estimated_duration_weeks = ?`);
      values.push(updates.estimatedDurationWeeks);
    }
    if (updates.requiredSkills !== undefined) {
      fields.push(`required_skills = ?`);
      values.push(updates.requiredSkills ? JSON.stringify(updates.requiredSkills) : null);
    }
    if (updates.recommendedTeamSize !== undefined) {
      fields.push(`recommended_team_size = ?`);
      values.push(updates.recommendedTeamSize);
    }
    if (updates.isActive !== undefined) {
      fields.push(`is_active = ?`);
      values.push(updates.isActive);
    }

    if (fields.length === 0) {
      return await this.getBiProjectTemplate(id);
    }

    values.push(id);
    const result = await db.execute(`
      UPDATE bi_project_templates
      SET ${fields.join(', ')}
      WHERE id = ?
      RETURNING *
    ` as any, values);

    return (result as any).rows[0] || undefined;
  }

  async deleteBiProjectTemplate(id: number): Promise<boolean> {
    const result = await db.execute(`DELETE FROM bi_project_templates WHERE id = ?` as any, [id]);
    return (result as any).rowCount > 0;
  }

  // BI Template Stages methods
  async getTemplateStages(templateId: number): Promise<any[]> {
    try {
      const result = await db.execute(`SELECT * FROM bi_template_stages WHERE template_id = ?` as any, [templateId]);
      return (result as any).rows || [];
    } catch (error) {
      console.error("Error in getTemplateStages:", error);
      return [];
    }
  }

  async addStageToTemplate(templateId: number, stageId: number, orderIndex: number, isOptional: boolean = false, customDurationDays?: number): Promise<any> {
    const result = await db.execute(`
      INSERT INTO bi_template_stages (template_id, stage_id, order_index, is_optional, custom_duration_days)
      VALUES (?, ?, ?, ?, ?)
      RETURNING *
    ` as any, [templateId, stageId, orderIndex, isOptional, customDurationDays]);
    return (result as any).rows[0];
  }

  async removeStageFromTemplate(templateId: number, stageId: number): Promise<boolean> {
    const result = await db.execute(`
      DELETE FROM bi_template_stages
      WHERE template_id = ? AND stage_id = ?
    ` as any, [templateId, stageId]);
    return (result as any).rowCount > 0;
  }

  async updateTemplateStage(templateId: number, stageId: number, updates: any): Promise<any | undefined> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.orderIndex !== undefined) {
      fields.push(`order_index = ?`);
      values.push(updates.orderIndex);
    }
    if (updates.isOptional !== undefined) {
      fields.push(`is_optional = ?`);
      values.push(updates.isOptional);
    }
    if (updates.customDurationDays !== undefined) {
      fields.push(`custom_duration_days = ?`);
      values.push(updates.customDurationDays);
    }

    if (fields.length === 0) {
      return undefined;
    }

    values.push(templateId, stageId);
    const result = await db.execute(`
      UPDATE bi_template_stages
      SET ${fields.join(', ')}
      WHERE template_id = ? AND stage_id = ?
      RETURNING *
    ` as any, values);

    return (result as any).rows[0] || undefined;
  }

  // BI Main Tasks methods
  async getBiMainTasks(stageId?: number): Promise<any[]> {
    try {
      let query = `SELECT * FROM bi_main_tasks`;
      let params: any[] = [];

      if (stageId) {
        query += ` WHERE stage_id = ?`;
        params.push(stageId);
      }

      const result = await db.execute(query as any, params);
      return (result as any).rows || [];
    } catch (error) {
      console.error("Error in getBiMainTasks:", error);
      return [];
    }
  }

  async getBiMainTask(id: number): Promise<any | undefined> {
    try {
      const result = await db.execute(`SELECT * FROM bi_main_tasks WHERE id = ?` as any, [id]);
      return (result as any).rows[0] || undefined;
    } catch (error) {
      console.error("Error in getBiMainTask:", error);
      return undefined;
    }
  }

  async createBiMainTask(task: any): Promise<any> {
    try {
      const result = await db.execute(`INSERT INTO bi_main_tasks (stage_id, name, description, order_index, estimated_hours, is_required, prerequisites, best_practices, deliverables) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *` as any, [
        task.stageId,
        task.name,
        task.description,
        task.orderIndex,
        task.estimatedHours,
        task.isRequired !== undefined ? task.isRequired : true,
        task.prerequisites ? JSON.stringify(task.prerequisites) : null,
        task.bestPractices ? JSON.stringify(task.bestPractices) : null,
        task.deliverables ? JSON.stringify(task.deliverables) : null
      ]);
      return (result as any).rows[0];
    } catch (error) {
      console.error("Error in createBiMainTask:", error);
      throw error;
    }
  }

  async updateBiMainTask(id: number, updates: any): Promise<any | undefined> {
    try {
      const fields = [];
      const values = [];

      if (updates.stageId !== undefined) {
        fields.push(`stage_id = ?`);
        values.push(updates.stageId);
      }
      if (updates.name !== undefined) {
        fields.push(`name = ?`);
        values.push(updates.name);
      }
      if (updates.description !== undefined) {
        fields.push(`description = ?`);
        values.push(updates.description);
      }
      if (updates.orderIndex !== undefined) {
        fields.push(`order_index = ?`);
        values.push(updates.orderIndex);
      }
      if (updates.estimatedHours !== undefined) {
        fields.push(`estimated_hours = ?`);
        values.push(updates.estimatedHours);
      }
      if (updates.isRequired !== undefined) {
        fields.push(`is_required = ?`);
        values.push(updates.isRequired);
      }
      if (updates.prerequisites !== undefined) {
        fields.push(`prerequisites = ?`);
        values.push(updates.prerequisites ? JSON.stringify(updates.prerequisites) : null);
      }
      if (updates.bestPractices !== undefined) {
        fields.push(`best_practices = ?`);
        values.push(updates.bestPractices ? JSON.stringify(updates.bestPractices) : null);
      }
      if (updates.deliverables !== undefined) {
        fields.push(`deliverables = ?`);
        values.push(updates.deliverables ? JSON.stringify(updates.deliverables) : null);
      }

      if (fields.length === 0) {
        return await this.getBiMainTask(id);
      }

      values.push(id);
      const result = await db.execute(`
        UPDATE bi_main_tasks
        SET ${fields.join(', ')}
        WHERE id = ?
        RETURNING *
      ` as any, values);

      return (result as any).rows[0] || undefined;
    } catch (error) {
      console.error("Error in updateBiMainTask:", error);
      throw error;
    }
  }

  async deleteBiMainTask(id: number): Promise<boolean> {
    try {
      const result = await db.execute(`DELETE FROM bi_main_tasks WHERE id = ?` as any, [id]);
      return (result as any).rowCount > 0;
    } catch (error) {
      console.error("Error in deleteBiMainTask:", error);
      return false;
    }
  }

  // BI Subtasks methods
  async getBiSubtasks(mainTaskId?: number): Promise<any[]> {
    try {
      let query = `SELECT * FROM bi_subtasks`;
      let params: any[] = [];

      if (mainTaskId) {
        query += ` WHERE main_task_id = ?`;
        params.push(mainTaskId);
      }

      const result = await db.execute(query as any, params);
      return (result as any).rows || [];
    } catch (error) {
      console.error("Error in getBiSubtasks:", error);
      return [];
    }
  }

  async getBiSubtask(id: number): Promise<any | undefined> {
    try {
      const result = await db.execute(`SELECT * FROM bi_subtasks WHERE id = ?` as any, [id]);
      return (result as any).rows[0] || undefined;
    } catch (error) {
      console.error("Error in getBiSubtask:", error);
      return undefined;
    }
  }

  async createBiSubtask(subtask: any): Promise<any> {
    try {
      const result = await db.execute(`INSERT INTO bi_subtasks (main_task_id, name, description, order_index, estimated_minutes, is_required, skill_level, tools, best_practices) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *` as any, [
        subtask.mainTaskId,
        subtask.name,
        subtask.description,
        subtask.orderIndex,
        subtask.estimatedMinutes,
        subtask.isRequired !== undefined ? subtask.isRequired : true,
        subtask.skillLevel || 'intermediate',
        subtask.tools ? JSON.stringify(subtask.tools) : null,
        subtask.bestPractices ? JSON.stringify(subtask.bestPractices) : null
      ]);
      return (result as any).rows[0];
    } catch (error) {
      console.error("Error in createBiSubtask:", error);
      throw error;
    }
  }

  async updateBiSubtask(id: number, updates: any): Promise<any | undefined> {
    try {
      const fields = [];
      const values = [];

      if (updates.mainTaskId !== undefined) {
        fields.push(`main_task_id = ?`);
        values.push(updates.mainTaskId);
      }
      if (updates.name !== undefined) {
        fields.push(`name = ?`);
        values.push(updates.name);
      }
      if (updates.description !== undefined) {
        fields.push(`description = ?`);
        values.push(updates.description);
      }
      if (updates.orderIndex !== undefined) {
        fields.push(`order_index = ?`);
        values.push(updates.orderIndex);
      }
      if (updates.estimatedMinutes !== undefined) {
        fields.push(`estimated_minutes = ?`);
        values.push(updates.estimatedMinutes);
      }
      if (updates.isRequired !== undefined) {
        fields.push(`is_required = ?`);
        values.push(updates.isRequired);
      }
      if (updates.skillLevel !== undefined) {
        fields.push(`skill_level = ?`);
        values.push(updates.skillLevel);
      }
      if (updates.tools !== undefined) {
        fields.push(`tools = ?`);
        values.push(updates.tools ? JSON.stringify(updates.tools) : null);
      }
      if (updates.bestPractices !== undefined) {
        fields.push(`best_practices = ?`);
        values.push(updates.bestPractices ? JSON.stringify(updates.bestPractices) : null);
      }

      if (fields.length === 0) {
        return await this.getBiSubtask(id);
      }

      values.push(id);
      const result = await db.execute(`
        UPDATE bi_subtasks
        SET ${fields.join(', ')}
        WHERE id = ?
        RETURNING *
      ` as any, values);

      return (result as any).rows[0] || undefined;
    } catch (error) {
      console.error("Error in updateBiSubtask:", error);
      throw error;
    }
  }

  async deleteBiSubtask(id: number): Promise<boolean> {
    try {
      const result = await db.execute(`DELETE FROM bi_subtasks WHERE id = ?` as any, [id]);
      return (result as any).rowCount > 0;
    } catch (error) {
      console.error("Error in deleteBiSubtask:", error);
      return false;
    }
  }

  // Project Roadmap methods
  async getProjectRoadmap(projectId: number): Promise<any[]> {
    try {
      const result = await db.execute(`SELECT * FROM project_roadmap WHERE project_id = ?` as any, [projectId]);
      return (result as any).rows || [];
    } catch (error) {
      console.error("Error in getProjectRoadmap:", error);
      return [];
    }
  }

  async createRoadmapItem(item: any): Promise<any> {
    try {
      const result = await db.execute(`INSERT INTO project_roadmap (project_id, stage_id, main_task_id, subtask_id, stage_order, task_order, estimated_start_date, estimated_end_date, actual_start_date, actual_end_date, status, dependencies, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *` as any, [
        item.projectId,
        item.stageId,
        item.mainTaskId || null,
        item.subtaskId || null,
        item.stageOrder,
        item.taskOrder,
        item.estimatedStartDate,
        item.estimatedEndDate,
        item.actualStartDate || null,
        item.actualEndDate || null,
        item.status || 'not_started',
        item.dependencies ? JSON.stringify(item.dependencies) : null,
        item.notes || null
      ]);
      return (result as any).rows[0];
    } catch (error) {
      console.error("Error in createRoadmapItem:", error);
      throw error;
    }
  }

  async updateRoadmapItem(id: number, updates: any): Promise<any | undefined> {
    try {
      const fields = [];
      const values = [];

      if (updates.estimatedStartDate !== undefined) {
        fields.push(`estimated_start_date = ?`);
        values.push(updates.estimatedStartDate);
      }
      if (updates.estimatedEndDate !== undefined) {
        fields.push(`estimated_end_date = ?`);
        values.push(updates.estimatedEndDate);
      }
      if (updates.actualStartDate !== undefined) {
        fields.push(`actual_start_date = ?`);
        values.push(updates.actualStartDate);
      }
      if (updates.actualEndDate !== undefined) {
        fields.push(`actual_end_date = ?`);
        values.push(updates.actualEndDate);
      }
      if (updates.status !== undefined) {
        fields.push(`status = ?`);
        values.push(updates.status);
      }
      if (updates.dependencies !== undefined) {
        fields.push(`dependencies = ?`);
        values.push(updates.dependencies ? JSON.stringify(updates.dependencies) : null);
      }
      if (updates.notes !== undefined) {
        fields.push(`notes = ?`);
        values.push(updates.notes);
      }

      if (fields.length === 0) {
        const result = await db.execute(`SELECT * FROM project_roadmap WHERE id = ?` as any, [id]);
        return (result as any).rows[0] || undefined;
      }

      values.push(id);
      const result = await db.execute(`UPDATE project_roadmap SET ${fields.join(', ')} WHERE id = ? RETURNING *` as any, values);

      return (result as any).rows[0] || undefined;
    } catch (error) {
      console.error("Error in updateRoadmapItem:", error);
      throw error;
    }
  }

  async deleteRoadmapItem(id: number): Promise<boolean> {
    try {
      const result = await db.execute(`DELETE FROM project_roadmap WHERE id = ?` as any, [id]);
      return (result as any).rowCount > 0;
    } catch (error) {
      console.error("Error in deleteRoadmapItem:", error);
      return false;
    }
  }

  async generateProjectRoadmap(projectId: number, templateId: number, startDate: string): Promise<any[]> {
    try {
      // First, clear any existing roadmap for this project
      await db.execute(`DELETE FROM project_roadmap WHERE project_id = ?` as any, [projectId]);

      // Get template stages
      const templateStages = await this.getTemplateStages(templateId);

      // Get all stages for ordering
      const allStages = await this.getBiStages();
      const stageMap = new Map(allStages.map(stage => [stage.id, stage]));

      const roadmapItems = [];
      let currentDate = new Date(startDate);
      let stageOrder = 1;

      for (const templateStage of templateStages.sort((a, b) => a.order_index - b.order_index)) {
        const stage = stageMap.get(templateStage.stage_id);
        if (!stage) continue;

        const stageDuration = templateStage.custom_duration_days || stage.estimated_duration_days || 7;
        const stageEndDate = new Date(currentDate);
        stageEndDate.setDate(stageEndDate.getDate() + stageDuration);

        // Create stage-level roadmap item
        const stageItem = await this.createRoadmapItem({
          projectId,
          stageId: stage.id,
          stageOrder,
          taskOrder: 0,
          estimatedStartDate: currentDate.toISOString().split('T')[0],
          estimatedEndDate: stageEndDate.toISOString().split('T')[0],
          status: stageOrder === 1 ? 'in_progress' : 'not_started'
        });
        roadmapItems.push(stageItem);

        // Get main tasks for this stage
        const mainTasks = await this.getBiMainTasks(stage.id);
        let taskOrder = 1;
        let taskCurrentDate = new Date(currentDate);

        for (const mainTask of mainTasks.sort((a, b) => a.order_index - b.order_index)) {
          const taskDurationDays = Math.ceil((mainTask.estimated_hours || 8) / 8); // Convert hours to days
          const taskEndDate = new Date(taskCurrentDate);
          taskEndDate.setDate(taskEndDate.getDate() + taskDurationDays);

          const taskItem = await this.createRoadmapItem({
            projectId,
            stageId: stage.id,
            mainTaskId: mainTask.id,
            stageOrder,
            taskOrder,
            estimatedStartDate: taskCurrentDate.toISOString().split('T')[0],
            estimatedEndDate: taskEndDate.toISOString().split('T')[0],
            status: 'not_started'
          });
          roadmapItems.push(taskItem);

          taskCurrentDate = new Date(taskEndDate);
          taskOrder++;
        }

        currentDate = new Date(stageEndDate);
        stageOrder++;
      }

      return roadmapItems;
    } catch (error) {
      console.error("Error in generateProjectRoadmap:", error);
      throw error;
    }
  }

  // Subphases methods
  async getSubphases(phaseId?: number): Promise<any[]> {
    try {
      let whereConditions = [eq(subphases.isActive, true)];

      if (phaseId) {
        whereConditions.push(eq(subphases.phaseId, phaseId));
      }

      const result = await db
        .select()
        .from(subphases)
        .where(and(...whereConditions))
        .orderBy(subphases.orderIndex, subphases.name);

      return result || [];
    } catch (error) {
      console.error("Error in getSubphases:", error);
      return [];
    }
  }

  async getSubphase(id: number): Promise<any | undefined> {
    try {
      const result = await db.select().from(subphases).where(eq(subphases.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error("Error in getSubphase:", error);
      return undefined;
    }
  }

  async createSubphase(subphase: any): Promise<any> {
    try {
      console.log("Creating subphase with data:", JSON.stringify(subphase, null, 2));

      // Use Drizzle ORM instead of raw SQL
      const result = await db.insert(subphases).values({
        phaseId: subphase.phaseId,
        name: subphase.name,
        description: subphase.description || null,
        color: subphase.color || null,
        orderIndex: subphase.orderIndex || 0,
        estimatedDurationDays: subphase.estimatedDurationDays || null,
        isRequired: subphase.isRequired !== undefined ? subphase.isRequired : true,
        prerequisites: subphase.prerequisites ? JSON.stringify(subphase.prerequisites) : null,
        deliverables: subphase.deliverables ? JSON.stringify(subphase.deliverables) : null,
        isActive: subphase.isActive !== undefined ? subphase.isActive : true
      }).returning();

      console.log("Subphase created successfully:", result[0]);
      return result[0];
    } catch (error) {
      console.error("Error in createSubphase:", error);
      throw error;
    }
  }

  async updateSubphase(id: number, updates: any): Promise<any | undefined> {
    try {
      // If no updates provided, return current subphase
      if (!updates || Object.keys(updates).length === 0) {
        return await this.getSubphase(id);
      }

      // Use Drizzle ORM for the update operation
      const [updated] = await db.update(subphases)
        .set(updates)
        .where(eq(subphases.id, id))
        .returning();

      return updated;
    } catch (error) {
      console.error("Error in updateSubphase:", error);
      throw error;
    }
  }

  async deleteSubphase(id: number): Promise<boolean> {
    try {
      // First, check if the subphase exists
      const existing = await db.select().from(subphases).where(eq(subphases.id, id));
      if (existing.length === 0) {
        return false;
      }

      // Check if subphase is in use by any project subphases
      const [projectSubphase] = await db.select().from(projectSubphases).where(eq(projectSubphases.subphaseId, id)).limit(1);
      if (projectSubphase) {
        throw new Error("Cannot delete subphase that is assigned to projects");
      }

      // Delete the subphase using Drizzle ORM
      await db.delete(subphases).where(eq(subphases.id, id));

      // Verify deletion by checking if the subphase still exists
      const afterDelete = await db.select().from(subphases).where(eq(subphases.id, id));
      return afterDelete.length === 0;
    } catch (error) {
      console.error("Error in deleteSubphase:", error);
      throw error;
    }
  }

  // Project Subphases methods
  async getProjectSubphases(projectPhaseId: number): Promise<any[]> {
    try {
      const result = await db.execute(`
        SELECT ps.*, s.name as subphase_name, s.description as subphase_description,
               s.color as subphase_color, s.estimated_duration_days as default_duration,
               u.name as assigned_user_name
        FROM project_subphases ps
        JOIN subphases s ON ps.subphase_id = s.id
        LEFT JOIN users u ON ps.assigned_user_id = u.id
        WHERE ps.project_phase_id = ?
        ORDER BY s.order_index, s.name
      ` as any, [projectPhaseId]);
      return (result as any).rows || [];
    } catch (error) {
      console.error("Error in getProjectSubphases:", error);
      return [];
    }
  }

  async getProjectSubphase(id: number): Promise<any | undefined> {
    try {
      const result = await db.execute(`
        SELECT ps.*, s.name as subphase_name, s.description as subphase_description,
               s.color as subphase_color, s.estimated_duration_days as default_duration,
               u.name as assigned_user_name
        FROM project_subphases ps
        JOIN subphases s ON ps.subphase_id = s.id
        LEFT JOIN users u ON ps.assigned_user_id = u.id
        WHERE ps.id = ?
      ` as any, [id]);
      return (result as any).rows[0] || undefined;
    } catch (error) {
      console.error("Error in getProjectSubphase:", error);
      return undefined;
    }
  }

  async createProjectSubphase(projectSubphase: any): Promise<any> {
    try {
      const result = await db.execute(`INSERT INTO project_subphases (project_phase_id, subphase_id, start_date, end_date, actual_start_date, actual_end_date, status, progress_percentage, assigned_user_id, priority, estimated_hours, actual_hours, quality_score, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *` as any, [
        projectSubphase.projectPhaseId,
        projectSubphase.subphaseId,
        projectSubphase.startDate,
        projectSubphase.endDate,
        projectSubphase.actualStartDate,
        projectSubphase.actualEndDate,
        projectSubphase.status || 'not_started',
        projectSubphase.progressPercentage || 0,
        projectSubphase.assignedUserId,
        projectSubphase.priority || 'medium',
        projectSubphase.estimatedHours,
        projectSubphase.actualHours || 0,
        projectSubphase.qualityScore,
        projectSubphase.notes
      ]);
      return (result as any).rows[0];
    } catch (error) {
      console.error("Error in createProjectSubphase:", error);
      throw error;
    }
  }

  async updateProjectSubphase(id: number, updates: any): Promise<any | undefined> {
    try {
      const fields = [];
      const values = [];

      if (updates.startDate !== undefined) {
        fields.push(`start_date = ?`);
        values.push(updates.startDate);
      }
      if (updates.endDate !== undefined) {
        fields.push(`end_date = ?`);
        values.push(updates.endDate);
      }
      if (updates.actualStartDate !== undefined) {
        fields.push(`actual_start_date = ?`);
        values.push(updates.actualStartDate);
      }
      if (updates.actualEndDate !== undefined) {
        fields.push(`actual_end_date = ?`);
        values.push(updates.actualEndDate);
      }
      if (updates.status !== undefined) {
        fields.push(`status = ?`);
        values.push(updates.status);
      }
      if (updates.progressPercentage !== undefined) {
        fields.push(`progress_percentage = ?`);
        values.push(updates.progressPercentage);
      }
      if (updates.assignedUserId !== undefined) {
        fields.push(`assigned_user_id = ?`);
        values.push(updates.assignedUserId);
      }
      if (updates.priority !== undefined) {
        fields.push(`priority = ?`);
        values.push(updates.priority);
      }
      if (updates.estimatedHours !== undefined) {
        fields.push(`estimated_hours = ?`);
        values.push(updates.estimatedHours);
      }
      if (updates.actualHours !== undefined) {
        fields.push(`actual_hours = ?`);
        values.push(updates.actualHours);
      }
      if (updates.qualityScore !== undefined) {
        fields.push(`quality_score = ?`);
        values.push(updates.qualityScore);
      }
      if (updates.notes !== undefined) {
        fields.push(`notes = ?`);
        values.push(updates.notes);
      }

      if (fields.length === 0) {
        return await this.getProjectSubphase(id);
      }

      values.push(id);
      const result = await db.execute(`UPDATE project_subphases SET ${fields.join(', ')} WHERE id = ? RETURNING *` as any, values);

      const updatedSubphase = (result as any).rows[0];

      // Update project progress after subphase update
      if (updatedSubphase) {
        // Get the project ID from the subphase
        const projectPhaseResult = await db.execute(`SELECT project_id FROM project_phases WHERE id = ?` as any, [updatedSubphase.project_phase_id]);
        const projectPhase = (projectPhaseResult as any).rows[0];

        if (projectPhase) {
          await this.updateProjectProgress(projectPhase.project_id);
        }
      }

      return updatedSubphase || undefined;
    } catch (error) {
      console.error("Error in updateProjectSubphase:", error);
      throw error;
    }
  }

  async deleteProjectSubphase(id: number): Promise<boolean> {
    try {
      const result = await db.execute(`DELETE FROM project_subphases WHERE id = ?` as any, [id]);
      return (result as any).rowCount > 0;
    } catch (error) {
      console.error("Error in deleteProjectSubphase:", error);
      return false;
    }
  }

  // Project Timeline Synchronization methods
  async syncProjectTimeline(projectId: number): Promise<void> {
    try {
      console.log(`🔄 Syncing timeline for project ${projectId}`);

      // Get all project phases with their subphases
      const projectPhases = await db.execute(`
        SELECT pp.*, p.name as phase_name
        FROM project_phases pp
        JOIN phases p ON pp.phase_id = p.id
        WHERE pp.project_id = ?
        ORDER BY p.order_index
      ` as any, [projectId]);

      const phases = (projectPhases as any).rows || [];

      if (phases.length === 0) {
        console.log("No phases found for project");
        return;
      }

      let projectStartDate: string | null = null;
      let projectEndDate: string | null = null;

      // Calculate project timeline based on phases
      for (const phase of phases) {
        const subphases = await this.getProjectSubphases(phase.id);

        // Calculate phase timeline based on subphases
        if (subphases.length > 0) {
          const phaseStartDate = subphases
            .filter(sp => sp.start_date)
            .map(sp => sp.start_date)
            .sort()[0];

          const phaseEndDate = subphases
            .filter(sp => sp.end_date)
            .map(sp => sp.end_date)
            .sort()
            .reverse()[0];

          // Update phase dates if calculated from subphases
          if (phaseStartDate && phaseEndDate) {
            await db.execute(`
              UPDATE project_phases
              SET start_date = ?, end_date = ?
              WHERE id = ?
            ` as any, [phaseStartDate, phaseEndDate, phase.id]);
          }

          // Update project timeline
          if (phaseStartDate && (!projectStartDate || phaseStartDate < projectStartDate)) {
            projectStartDate = phaseStartDate;
          }
          if (phaseEndDate && (!projectEndDate || phaseEndDate > projectEndDate)) {
            projectEndDate = phaseEndDate;
          }
        } else {
          // Use phase dates directly if no subphases
          if (phase.start_date && (!projectStartDate || phase.start_date < projectStartDate)) {
            projectStartDate = phase.start_date;
          }
          if (phase.end_date && (!projectEndDate || phase.end_date > projectEndDate)) {
            projectEndDate = phase.end_date;
          }
        }
      }

      // Update project dates
      if (projectStartDate && projectEndDate) {
        await db.execute(`
          UPDATE projects
          SET start_date = ?, end_date = ?
          WHERE id = ?
        ` as any, [projectStartDate, projectEndDate, projectId]);

        console.log(`✅ Project timeline updated: ${projectStartDate} to ${projectEndDate}`);
      }

    } catch (error) {
      console.error("Error in syncProjectTimeline:", error);
      throw error;
    }
  }

  async calculatePhaseProgress(projectPhaseId: number): Promise<number> {
    try {
      const subphases = await this.getProjectSubphases(projectPhaseId);

      if (subphases.length === 0) {
        return 0;
      }

      const totalProgress = subphases.reduce((sum, subphase) => {
        return sum + (subphase.progress_percentage || 0);
      }, 0);

      return Math.round(totalProgress / subphases.length);
    } catch (error) {
      console.error("Error in calculatePhaseProgress:", error);
      return 0;
    }
  }

  async updatePhaseProgress(projectPhaseId: number): Promise<void> {
    try {
      const progress = await this.calculatePhaseProgress(projectPhaseId);

      await db.execute(`
        UPDATE project_phases
        SET progress_percentage = ?
        WHERE id = ?
      ` as any, [progress, projectPhaseId]);

      console.log(`✅ Phase ${projectPhaseId} progress updated to ${progress}%`);

      // Get the project ID to update project progress
      const phaseResult = await db.execute(`
        SELECT project_id FROM project_phases WHERE id = ?
      ` as any, [projectPhaseId]);

      const phase = (phaseResult as any).rows[0];
      if (phase) {
        // Update project progress
        await this.updateProjectProgress(phase.project_id);
      }
    } catch (error) {
      console.error("Error in updatePhaseProgress:", error);
      throw error;
    }
  }

  // Calculate subphase progress based on completed appointments/tasks
  async calculateSubphaseProgress(projectSubphaseId: number): Promise<number> {
    try {
      console.log(`📊 Calculating progress for project subphase ${projectSubphaseId}`);

      // Get all appointments linked to this project subphase
      const subphaseAppointments = await db
        .select()
        .from(appointments)
        .where(eq(appointments.projectSubphaseId, projectSubphaseId));

      if (subphaseAppointments.length === 0) {
        console.log(`📊 No appointments found for subphase ${projectSubphaseId}, progress = 0%`);
        return 0;
      }

      // Calculate progress based on completed vs total appointments
      const completedAppointments = subphaseAppointments.filter(apt => apt.status === 'completed');
      const progressPercentage = Math.round((completedAppointments.length / subphaseAppointments.length) * 100);

      console.log(`📊 Subphase ${projectSubphaseId}: ${completedAppointments.length}/${subphaseAppointments.length} appointments completed = ${progressPercentage}%`);

      return progressPercentage;
    } catch (error) {
      console.error("Error in calculateSubphaseProgress:", error);
      return 0;
    }
  }

  // Update subphase progress and cascade to phase and project
  async updateSubphaseProgress(projectSubphaseId: number): Promise<void> {
    try {
      const progress = await this.calculateSubphaseProgress(projectSubphaseId);

      // Update the project subphase progress
      await db.execute(`
        UPDATE project_subphases
        SET progress_percentage = ?
        WHERE id = ?
      ` as any, [progress, projectSubphaseId]);

      console.log(`✅ Subphase ${projectSubphaseId} progress updated to ${progress}%`);

      // Get the project phase ID to update phase progress
      const subphaseResult = await db.execute(`
        SELECT project_phase_id FROM project_subphases WHERE id = ?
      ` as any, [projectSubphaseId]);

      const subphase = (subphaseResult as any).rows[0];
      if (subphase) {
        // Update phase progress (which will cascade to project)
        await this.updatePhaseProgress(subphase.project_phase_id);
      }
    } catch (error) {
      console.error("Error in updateSubphaseProgress:", error);
      throw error;
    }
  }

  // Work Schedule methods
  async getWorkSchedules(): Promise<WorkSchedule[]> {
    return await db.select().from(workSchedules).orderBy(workSchedules.createdAt);
  }

  async getUserWorkSchedule(userId: number): Promise<(WorkSchedule & { rules: WorkScheduleRule[] }) | undefined> {
    const schedule = await db
      .select()
      .from(workSchedules)
      .where(and(eq(workSchedules.userId, userId), eq(workSchedules.isActive, true)))
      .limit(1);

    if (schedule.length === 0) {
      return undefined;
    }

    const rules = await db
      .select()
      .from(workScheduleRules)
      .where(eq(workScheduleRules.workScheduleId, schedule[0].id))
      .orderBy(workScheduleRules.dayOfWeek, workScheduleRules.startTime);

    return {
      ...schedule[0],
      rules
    };
  }

  async createWorkSchedule(workSchedule: InsertWorkSchedule): Promise<WorkSchedule> {
    const [created] = await db.insert(workSchedules).values(workSchedule).returning();
    return created;
  }

  async updateWorkSchedule(id: number, workSchedule: UpdateWorkSchedule): Promise<WorkSchedule | undefined> {
    const [updated] = await db
      .update(workSchedules)
      .set({ ...workSchedule, updatedAt: new Date().toISOString() })
      .where(eq(workSchedules.id, id))
      .returning();
    return updated;
  }

  async deleteWorkSchedule(id: number): Promise<boolean> {
    const existing = await db.select().from(workSchedules).where(eq(workSchedules.id, id));
    if (existing.length === 0) {
      return false;
    }

    await db.delete(workSchedules).where(eq(workSchedules.id, id));

    const afterDelete = await db.select().from(workSchedules).where(eq(workSchedules.id, id));
    return afterDelete.length === 0;
  }

  async getWorkScheduleRules(workScheduleId: number): Promise<WorkScheduleRule[]> {
    return await db
      .select()
      .from(workScheduleRules)
      .where(eq(workScheduleRules.workScheduleId, workScheduleId))
      .orderBy(workScheduleRules.dayOfWeek, workScheduleRules.startTime);
  }

  async createWorkScheduleRule(rule: InsertWorkScheduleRule): Promise<WorkScheduleRule> {
    const [created] = await db.insert(workScheduleRules).values(rule).returning();
    return created;
  }

  async updateWorkScheduleRule(id: number, rule: UpdateWorkScheduleRule): Promise<WorkScheduleRule | undefined> {
    const [updated] = await db
      .update(workScheduleRules)
      .set(rule)
      .where(eq(workScheduleRules.id, id))
      .returning();
    return updated;
  }

  async deleteWorkScheduleRule(id: number): Promise<boolean> {
    const existing = await db.select().from(workScheduleRules).where(eq(workScheduleRules.id, id));
    if (existing.length === 0) {
      return false;
    }

    await db.delete(workScheduleRules).where(eq(workScheduleRules.id, id));

    const afterDelete = await db.select().from(workScheduleRules).where(eq(workScheduleRules.id, id));
    return afterDelete.length === 0;
  }

  async migrateTimerFields(): Promise<void> {
    try {
      console.log("🔄 Starting timer fields migration...");

      // Add timer-related columns to appointments table
      const migrationQueries = [
        `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS timer_state VARCHAR(20) DEFAULT 'stopped'`,
        `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS timer_started_at TIMESTAMP`,
        `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS timer_paused_at TIMESTAMP`,
        `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS accumulated_time_minutes INTEGER DEFAULT 0`,
        `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS actual_time_minutes INTEGER DEFAULT 0`,
        `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP`
      ];

      for (const query of migrationQueries) {
        console.log(`📝 Executing: ${query}`);
        await db.execute(query as any);
        console.log(`✅ Query executed successfully`);
      }

      console.log("🎉 Timer fields migration completed successfully!");
    } catch (error) {
      console.error("❌ Timer fields migration failed:", error);
      throw error;
    }
  }

  async migrateBiProjectManagement(): Promise<void> {
    try {
      console.log("🔄 Starting BI Project Management migration...");

      // Create BI Stages table
      console.log("📝 Creating BI Stages table...");
      await db.execute(`
        CREATE TABLE IF NOT EXISTS bi_stages (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          color TEXT DEFAULT '#8B5CF6',
          order_index INTEGER NOT NULL,
          estimated_duration_days INTEGER,
          is_required BOOLEAN DEFAULT true,
          best_practices TEXT,
          deliverables TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      ` as any);
      console.log("✅ BI Stages table created successfully");

      // Create BI Main Tasks table
      console.log("📝 Creating BI Main Tasks table...");
      await db.execute(`
        CREATE TABLE IF NOT EXISTS bi_main_tasks (
          id SERIAL PRIMARY KEY,
          stage_id INTEGER NOT NULL REFERENCES bi_stages(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          description TEXT,
          order_index INTEGER NOT NULL,
          estimated_hours INTEGER,
          is_required BOOLEAN DEFAULT true,
          prerequisites TEXT,
          best_practices TEXT,
          deliverables TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      ` as any);
      console.log("✅ BI Main Tasks table created successfully");

      // Create BI Subtasks table
      console.log("📝 Creating BI Subtasks table...");
      await db.execute(`
        CREATE TABLE IF NOT EXISTS bi_subtasks (
          id SERIAL PRIMARY KEY,
          main_task_id INTEGER NOT NULL REFERENCES bi_main_tasks(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          description TEXT,
          order_index INTEGER NOT NULL,
          estimated_minutes INTEGER,
          is_required BOOLEAN DEFAULT true,
          skill_level TEXT DEFAULT 'intermediate',
          tools TEXT,
          best_practices TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      ` as any);
      console.log("✅ BI Subtasks table created successfully");

      // Create BI Project Templates table
      console.log("📝 Creating BI Project Templates table...");
      await db.execute(`
        CREATE TABLE IF NOT EXISTS bi_project_templates (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          category TEXT NOT NULL,
          complexity TEXT NOT NULL DEFAULT 'medium',
          estimated_duration_weeks INTEGER,
          required_skills TEXT,
          recommended_team_size INTEGER DEFAULT 1,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW()
        )
      ` as any);
      console.log("✅ BI Project Templates table created successfully");

      // Create BI Template Stages junction table
      console.log("📝 Creating BI Template Stages junction table...");
      await db.execute(`
        CREATE TABLE IF NOT EXISTS bi_template_stages (
          id SERIAL PRIMARY KEY,
          template_id INTEGER NOT NULL REFERENCES bi_project_templates(id) ON DELETE CASCADE,
          stage_id INTEGER NOT NULL REFERENCES bi_stages(id) ON DELETE CASCADE,
          order_index INTEGER NOT NULL,
          is_optional BOOLEAN DEFAULT false,
          custom_duration_days INTEGER,
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(template_id, stage_id)
        )
      ` as any);
      console.log("✅ BI Template Stages junction table created successfully");

      // Add new columns to existing projects table
      console.log("📝 Adding BI columns to projects table...");
      const projectMigrationQueries = [
        `ALTER TABLE projects ADD COLUMN IF NOT EXISTS template_id INTEGER REFERENCES bi_project_templates(id)`,
        `ALTER TABLE projects ADD COLUMN IF NOT EXISTS bi_category TEXT`,
        `ALTER TABLE projects ADD COLUMN IF NOT EXISTS current_stage_id INTEGER REFERENCES bi_stages(id)`,
        `ALTER TABLE projects ADD COLUMN IF NOT EXISTS actual_start_date TEXT`,
        `ALTER TABLE projects ADD COLUMN IF NOT EXISTS actual_end_date TEXT`,
        `ALTER TABLE projects ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0`,
        `ALTER TABLE projects ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'low'`,
        `ALTER TABLE projects ADD COLUMN IF NOT EXISTS stakeholders TEXT`,
        `ALTER TABLE projects ADD COLUMN IF NOT EXISTS business_value TEXT`,
        `ALTER TABLE projects ADD COLUMN IF NOT EXISTS technical_requirements TEXT`
      ];

      for (const query of projectMigrationQueries) {
        console.log(`📝 Executing: ${query}`);
        await db.execute(query as any);
        console.log(`✅ Query executed successfully`);
      }

      // Create Project Roadmap table
      console.log("📝 Creating Project Roadmap table...");
      await db.execute(`
        CREATE TABLE IF NOT EXISTS project_roadmap (
          id SERIAL PRIMARY KEY,
          project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          stage_id INTEGER NOT NULL REFERENCES bi_stages(id) ON DELETE CASCADE,
          order_index INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'not_started',
          planned_start_date TEXT,
          planned_end_date TEXT,
          actual_start_date TEXT,
          actual_end_date TEXT,
          progress_percentage INTEGER DEFAULT 0,
          blockers TEXT,
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(project_id, stage_id)
        )
      ` as any);
      console.log("✅ Project Roadmap table created successfully");

      // Create Project Tasks table
      console.log("📝 Creating Project Tasks table...");
      await db.execute(`
        CREATE TABLE IF NOT EXISTS project_tasks (
          id SERIAL PRIMARY KEY,
          project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          roadmap_id INTEGER NOT NULL REFERENCES project_roadmap(id) ON DELETE CASCADE,
          main_task_id INTEGER NOT NULL REFERENCES bi_main_tasks(id) ON DELETE CASCADE,
          assigned_user_id INTEGER REFERENCES users(id),
          status TEXT NOT NULL DEFAULT 'not_started',
          priority TEXT NOT NULL DEFAULT 'medium',
          planned_start_date TEXT,
          planned_end_date TEXT,
          actual_start_date TEXT,
          actual_end_date TEXT,
          estimated_hours INTEGER,
          actual_hours INTEGER DEFAULT 0,
          progress_percentage INTEGER DEFAULT 0,
          quality_score INTEGER,
          review_status TEXT DEFAULT 'pending',
          deliverables TEXT,
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      ` as any);
      console.log("✅ Project Tasks table created successfully");

      // Create Project Subtasks table
      console.log("📝 Creating Project Subtasks table...");
      await db.execute(`
        CREATE TABLE IF NOT EXISTS project_subtasks (
          id SERIAL PRIMARY KEY,
          project_task_id INTEGER NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
          subtask_id INTEGER NOT NULL REFERENCES bi_subtasks(id) ON DELETE CASCADE,
          assigned_user_id INTEGER REFERENCES users(id),
          status TEXT NOT NULL DEFAULT 'not_started',
          planned_duration_minutes INTEGER,
          actual_duration_minutes INTEGER DEFAULT 0,
          completed_at TEXT,
          quality_notes TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      ` as any);
      console.log("✅ Project Subtasks table created successfully");

      // Create indexes for better performance
      console.log("📝 Creating indexes...");
      const indexQueries = [
        `CREATE INDEX IF NOT EXISTS idx_bi_main_tasks_stage_id ON bi_main_tasks(stage_id)`,
        `CREATE INDEX IF NOT EXISTS idx_bi_subtasks_main_task_id ON bi_subtasks(main_task_id)`,
        `CREATE INDEX IF NOT EXISTS idx_bi_template_stages_template_id ON bi_template_stages(template_id)`,
        `CREATE INDEX IF NOT EXISTS idx_bi_template_stages_stage_id ON bi_template_stages(stage_id)`,
        `CREATE INDEX IF NOT EXISTS idx_project_roadmap_project_id ON project_roadmap(project_id)`,
        `CREATE INDEX IF NOT EXISTS idx_project_roadmap_stage_id ON project_roadmap(stage_id)`,
        `CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON project_tasks(project_id)`,
        `CREATE INDEX IF NOT EXISTS idx_project_tasks_roadmap_id ON project_tasks(roadmap_id)`,
        `CREATE INDEX IF NOT EXISTS idx_project_tasks_main_task_id ON project_tasks(main_task_id)`,
        `CREATE INDEX IF NOT EXISTS idx_project_subtasks_project_task_id ON project_subtasks(project_task_id)`,
        `CREATE INDEX IF NOT EXISTS idx_project_subtasks_subtask_id ON project_subtasks(subtask_id)`
      ];

      for (const query of indexQueries) {
        await db.execute(query as any);
      }
      console.log("✅ Indexes created successfully");

      console.log("🎉 BI Project Management migration completed successfully!");
    } catch (error) {
      console.error("❌ BI Project Management migration failed:", error);
      throw error;
    }
  }

  async migrateSubphases(): Promise<void> {
    try {
      console.log("🔄 Starting Subphases migration...");

      // Enhance phases table with new columns
      console.log("📝 Enhancing phases table...");
      const phaseEnhancementQueries = [
        `ALTER TABLE phases ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0`,
        `ALTER TABLE phases ADD COLUMN IF NOT EXISTS estimated_duration_days INTEGER`,
        `ALTER TABLE phases ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`
      ];

      for (const query of phaseEnhancementQueries) {
        console.log(`📝 Executing: ${query}`);
        await db.execute(query as any);
        console.log("✅ Query executed successfully");
      }

      // Create subphases table
      console.log("📝 Creating subphases table...");
      await db.execute(`
        CREATE TABLE IF NOT EXISTS subphases (
          id SERIAL PRIMARY KEY,
          phase_id INTEGER NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          description TEXT,
          color TEXT,
          order_index INTEGER DEFAULT 0,
          estimated_duration_days INTEGER,
          is_required BOOLEAN DEFAULT true,
          prerequisites TEXT,
          deliverables TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      ` as any);
      console.log("✅ Subphases table created successfully");

      // Enhance project_phases table with new columns
      console.log("📝 Enhancing project_phases table...");
      const projectPhaseEnhancementQueries = [
        `ALTER TABLE project_phases ADD COLUMN IF NOT EXISTS start_date TEXT`,
        `ALTER TABLE project_phases ADD COLUMN IF NOT EXISTS end_date TEXT`,
        `ALTER TABLE project_phases ADD COLUMN IF NOT EXISTS actual_start_date TEXT`,
        `ALTER TABLE project_phases ADD COLUMN IF NOT EXISTS actual_end_date TEXT`,
        `ALTER TABLE project_phases ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'not_started'`,
        `ALTER TABLE project_phases ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0`,
        `ALTER TABLE project_phases ADD COLUMN IF NOT EXISTS notes TEXT`
      ];

      for (const query of projectPhaseEnhancementQueries) {
        console.log(`📝 Executing: ${query}`);
        await db.execute(query as any);
        console.log("✅ Query executed successfully");
      }

      // Create project_subphases table
      console.log("📝 Creating project_subphases table...");
      await db.execute(`
        CREATE TABLE IF NOT EXISTS project_subphases (
          id SERIAL PRIMARY KEY,
          project_phase_id INTEGER NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
          subphase_id INTEGER NOT NULL REFERENCES subphases(id) ON DELETE CASCADE,
          start_date DATE,
          end_date DATE,
          actual_start_date DATE,
          actual_end_date DATE,
          status TEXT NOT NULL DEFAULT 'not_started',
          progress_percentage INTEGER DEFAULT 0,
          assigned_user_id INTEGER REFERENCES users(id),
          priority TEXT DEFAULT 'medium',
          estimated_hours INTEGER,
          actual_hours INTEGER DEFAULT 0,
          quality_score INTEGER,
          notes TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      ` as any);
      console.log("✅ Project subphases table created successfully");

      // Create indexes for better performance
      console.log("📝 Creating indexes...");
      const indexQueries = [
        `CREATE INDEX IF NOT EXISTS idx_subphases_phase_id ON subphases(phase_id)`,
        `CREATE INDEX IF NOT EXISTS idx_subphases_order ON subphases(phase_id, order_index)`,
        `CREATE INDEX IF NOT EXISTS idx_project_subphases_project_phase ON project_subphases(project_phase_id)`,
        `CREATE INDEX IF NOT EXISTS idx_project_subphases_subphase ON project_subphases(subphase_id)`,
        `CREATE INDEX IF NOT EXISTS idx_project_subphases_assigned_user ON project_subphases(assigned_user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_project_subphases_status ON project_subphases(status)`,
        `CREATE INDEX IF NOT EXISTS idx_project_phases_status ON project_phases(status)`,
        `CREATE INDEX IF NOT EXISTS idx_phases_order ON phases(order_index)`
      ];

      for (const query of indexQueries) {
        console.log(`📝 Executing: ${query}`);
        await db.execute(query as any);
        console.log("✅ Index created successfully");
      }

      console.log("🎉 Subphases migration completed successfully!");
    } catch (error) {
      console.error("❌ Subphases migration failed:", error);
      throw error;
    }
  }

  async migrateProgressCalculation(): Promise<void> {
    try {
      console.log("🔄 Starting progress calculation migration...");

      // Add project_subphase_id column to appointments if not exists
      console.log("📝 Adding project_subphase_id column to appointments...");
      await db.execute(`
        ALTER TABLE appointments
        ADD COLUMN IF NOT EXISTS project_subphase_id INTEGER
        REFERENCES project_subphases(id) ON DELETE SET NULL
      ` as any);
      console.log("✅ project_subphase_id column added");

      // Create index for better performance
      console.log("📝 Creating index for project_subphase_id...");
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_appointments_project_subphase_id
        ON appointments(project_subphase_id)
      ` as any);
      console.log("✅ Index created");

      // Create progress calculation triggers
      console.log("📝 Creating progress calculation triggers...");

      // Function to update subphase progress when appointments change
      await db.execute(`
        CREATE OR REPLACE FUNCTION update_subphase_progress_trigger()
        RETURNS TRIGGER AS $$
        DECLARE
            subphase_id INTEGER;
            total_appointments INTEGER;
            completed_appointments INTEGER;
            progress_percentage INTEGER;
            phase_id INTEGER;
            project_id INTEGER;
        BEGIN
            -- Get the project_subphase_id from the appointment
            IF TG_OP = 'UPDATE' THEN
                subphase_id := NEW.project_subphase_id;
            ELSIF TG_OP = 'DELETE' THEN
                subphase_id := OLD.project_subphase_id;
            END IF;

            -- Only proceed if appointment is linked to a subphase
            IF subphase_id IS NOT NULL THEN
                -- Calculate subphase progress
                SELECT COUNT(*) INTO total_appointments
                FROM appointments
                WHERE project_subphase_id = subphase_id;

                SELECT COUNT(*) INTO completed_appointments
                FROM appointments
                WHERE project_subphase_id = subphase_id
                AND status = 'completed';

                -- Calculate progress percentage
                IF total_appointments > 0 THEN
                    progress_percentage := ROUND((completed_appointments::DECIMAL / total_appointments) * 100);
                ELSE
                    progress_percentage := 0;
                END IF;

                -- Update project subphase progress
                UPDATE project_subphases
                SET progress_percentage = progress_percentage,
                    actual_hours = (
                        SELECT COALESCE(SUM(COALESCE(actual_time_minutes, duration_minutes)), 0) / 60.0
                        FROM appointments
                        WHERE project_subphase_id = subphase_id
                        AND status = 'completed'
                    )
                WHERE id = subphase_id;

                -- Get phase and project IDs for cascading updates
                SELECT ps.project_phase_id, pp.project_id
                INTO phase_id, project_id
                FROM project_subphases ps
                JOIN project_phases pp ON ps.project_phase_id = pp.id
                WHERE ps.id = subphase_id;

                -- Update phase progress (average of all subphases in the phase)
                IF phase_id IS NOT NULL THEN
                    UPDATE project_phases
                    SET progress_percentage = (
                        SELECT COALESCE(ROUND(AVG(progress_percentage)), 0)
                        FROM project_subphases
                        WHERE project_phase_id = phase_id
                    )
                    WHERE id = phase_id;

                    -- Update project progress (average of all phases in the project)
                    IF project_id IS NOT NULL THEN
                        UPDATE projects
                        SET progress_percentage = (
                            SELECT COALESCE(ROUND(AVG(progress_percentage)), 0)
                            FROM project_phases
                            WHERE project_id = project_id
                        )
                        WHERE id = project_id;
                    END IF;
                END IF;
            END IF;

            IF TG_OP = 'DELETE' THEN
                RETURN OLD;
            ELSE
                RETURN NEW;
            END IF;
        END;
        $$ LANGUAGE plpgsql;
      ` as any);
      console.log("✅ Progress trigger function created");

      // Create triggers for appointment changes
      await db.execute(`
        DROP TRIGGER IF EXISTS trigger_update_subphase_progress_on_appointment_update ON appointments;
        DROP TRIGGER IF EXISTS trigger_update_subphase_progress_on_appointment_delete ON appointments;
      ` as any);

      await db.execute(`
        CREATE TRIGGER trigger_update_subphase_progress_on_appointment_update
            AFTER UPDATE OF status, project_subphase_id, actual_time_minutes ON appointments
            FOR EACH ROW
            EXECUTE FUNCTION update_subphase_progress_trigger();
      ` as any);

      await db.execute(`
        CREATE TRIGGER trigger_update_subphase_progress_on_appointment_delete
            AFTER DELETE ON appointments
            FOR EACH ROW
            EXECUTE FUNCTION update_subphase_progress_trigger();
      ` as any);
      console.log("✅ Progress triggers created");

      console.log("🎉 Progress calculation migration completed successfully!");
    } catch (error) {
      console.error("❌ Progress calculation migration failed:", error);
      throw error;
    }
  }

  async seedSubphases(): Promise<void> {
    try {
      console.log("🌱 Starting subphases seeding...");

      // Check if subphases already exist
      const existingSubphases = await db.execute(`SELECT COUNT(*) as count FROM subphases` as any);
      const subphaseCount = (existingSubphases as any).rows[0]?.count || 0;

      if (subphaseCount > 0) {
        console.log("📋 Subphases already exist, skipping seeding");
        return;
      }

      // Get existing phases to create subphases for
      const phases = await this.getPhases();

      if (phases.length === 0) {
        console.log("⚠️ No phases found, creating sample phases first");

        // Create sample phases
        await db.execute(`
          INSERT INTO phases (name, description, color, order_index, estimated_duration_days, is_active) VALUES
          ('Planejamento', 'Fase de planejamento e definição do escopo', '#3B82F6', 1, 14, true),
          ('Desenvolvimento', 'Fase de desenvolvimento e implementação', '#10B981', 2, 30, true),
          ('Testes', 'Fase de testes e validação', '#F59E0B', 3, 10, true),
          ('Implantação', 'Fase de implantação e go-live', '#EF4444', 4, 7, true),
          ('Monitoramento', 'Fase de monitoramento e suporte', '#8B5CF6', 5, 30, true)
        ` as any);
        console.log("✅ Sample phases created");
      }

      // Create subphases for each phase
      console.log("📝 Creating subphases...");

      // Planejamento subphases
      await db.execute(`
        INSERT INTO subphases (phase_id, name, description, color, order_index, estimated_duration_days, is_required, prerequisites, deliverables, is_active) VALUES
        (1, 'Levantamento de Requisitos', 'Coleta e documentação dos requisitos do projeto', '#3B82F6', 1, 5, true, '[]', '["Documento de Requisitos", "Matriz de Rastreabilidade"]', true),
        (1, 'Análise de Viabilidade', 'Análise técnica e financeira da viabilidade do projeto', '#3B82F6', 2, 3, true, '[1]', '["Relatório de Viabilidade", "Estimativas de Custo"]', true),
        (1, 'Definição do Escopo', 'Definição detalhada do escopo e cronograma', '#3B82F6', 3, 4, true, '[1,2]', '["Escopo Detalhado", "Cronograma Preliminar"]', true),
        (1, 'Aprovação do Projeto', 'Aprovação formal do projeto pelos stakeholders', '#3B82F6', 4, 2, true, '[3]', '["Termo de Abertura", "Aprovação Formal"]', true)
      ` as any);

      // Desenvolvimento subphases
      await db.execute(`
        INSERT INTO subphases (phase_id, name, description, color, order_index, estimated_duration_days, is_required, prerequisites, deliverables, is_active) VALUES
        (2, 'Arquitetura do Sistema', 'Definição da arquitetura técnica do sistema', '#10B981', 1, 7, true, '[]', '["Documento de Arquitetura", "Diagramas Técnicos"]', true),
        (2, 'Desenvolvimento Backend', 'Implementação da lógica de negócio e APIs', '#10B981', 2, 12, true, '[5]', '["APIs Implementadas", "Documentação Técnica"]', true),
        (2, 'Desenvolvimento Frontend', 'Implementação da interface do usuário', '#10B981', 3, 10, true, '[5]', '["Interface Implementada", "Guia do Usuário"]', true),
        (2, 'Integração de Sistemas', 'Integração com sistemas externos', '#10B981', 4, 5, false, '[6,7]', '["Integrações Funcionais", "Testes de Integração"]', true)
      ` as any);

      // Testes subphases
      await db.execute(`
        INSERT INTO subphases (phase_id, name, description, color, order_index, estimated_duration_days, is_required, prerequisites, deliverables, is_active) VALUES
        (3, 'Testes Unitários', 'Execução de testes unitários automatizados', '#F59E0B', 1, 3, true, '[]', '["Relatório de Testes Unitários", "Cobertura de Código"]', true),
        (3, 'Testes de Integração', 'Testes de integração entre componentes', '#F59E0B', 2, 3, true, '[9]', '["Relatório de Testes de Integração"]', true),
        (3, 'Testes de Aceitação', 'Testes de aceitação com usuários finais', '#F59E0B', 3, 4, true, '[10]', '["Relatório de Testes de Aceitação", "Sign-off dos Usuários"]', true)
      ` as any);

      // Implantação subphases
      await db.execute(`
        INSERT INTO subphases (phase_id, name, description, color, order_index, estimated_duration_days, is_required, prerequisites, deliverables, is_active) VALUES
        (4, 'Preparação do Ambiente', 'Configuração do ambiente de produção', '#EF4444', 1, 2, true, '[]', '["Ambiente Configurado", "Checklist de Deploy"]', true),
        (4, 'Deploy em Produção', 'Implantação do sistema em produção', '#EF4444', 2, 1, true, '[12]', '["Sistema em Produção", "Logs de Deploy"]', true),
        (4, 'Treinamento dos Usuários', 'Treinamento dos usuários finais', '#EF4444', 3, 3, true, '[13]', '["Usuários Treinados", "Material de Treinamento"]', true),
        (4, 'Go-Live', 'Ativação oficial do sistema', '#EF4444', 4, 1, true, '[14]', '["Sistema Ativo", "Comunicação de Go-Live"]', true)
      ` as any);

      // Monitoramento subphases
      await db.execute(`
        INSERT INTO subphases (phase_id, name, description, color, order_index, estimated_duration_days, is_required, prerequisites, deliverables, is_active) VALUES
        (5, 'Monitoramento Inicial', 'Monitoramento intensivo pós go-live', '#8B5CF6', 1, 7, true, '[]', '["Relatórios de Monitoramento", "Métricas de Performance"]', true),
        (5, 'Correções e Ajustes', 'Correção de problemas identificados', '#8B5CF6', 2, 10, false, '[16]', '["Problemas Corrigidos", "Melhorias Implementadas"]', true),
        (5, 'Documentação Final', 'Finalização da documentação do projeto', '#8B5CF6', 3, 5, true, '[17]', '["Documentação Completa", "Manual do Sistema"]', true),
        (5, 'Encerramento do Projeto', 'Encerramento formal do projeto', '#8B5CF6', 4, 3, true, '[18]', '["Termo de Encerramento", "Lições Aprendidas"]', true)
      ` as any);

      console.log("✅ Subphases seeded successfully");
      console.log("🎉 Subphases seeding completed successfully!");
    } catch (error) {
      console.error("❌ Subphases seeding failed:", error);
      throw error;
    }
  }

  async seedBiMethodology(): Promise<void> {
    try {
      console.log("🌱 Starting BI Methodology seeding...");

      // Check if data already exists
      const existingStages = await db.execute(`SELECT COUNT(*) as count FROM bi_stages` as any);
      const stageCount = (existingStages as any).rows[0]?.count || 0;

      const existingTemplates = await db.execute(`SELECT COUNT(*) as count FROM bi_project_templates` as any);
      const templateCount = (existingTemplates as any).rows[0]?.count || 0;

      const existingMainTasks = await db.execute(`SELECT COUNT(*) as count FROM bi_main_tasks` as any);
      const mainTaskCount = (existingMainTasks as any).rows[0]?.count || 0;

      if (stageCount > 0 && templateCount > 0 && mainTaskCount > 0) {
        console.log("📋 BI Methodology data already exists, skipping seeding");
        return;
      }

      // Insert BI Stages only if they don't exist
      if (stageCount === 0) {
        console.log("📝 Inserting BI Stages...");
        await db.execute(`
          INSERT INTO bi_stages (name, description, color, order_index, estimated_duration_days, is_required, best_practices, deliverables) VALUES
          ('Business Analysis & Requirements', 'Understanding business needs, defining requirements, and establishing project scope', '#3B82F6', 1, 10, true, '["Conduct stakeholder interviews", "Document current state processes", "Define success metrics", "Validate requirements with business users"]', '["Business Requirements Document", "Stakeholder Analysis", "Success Criteria", "Project Charter"]'),
          ('Data Discovery & Assessment', 'Analyzing existing data sources, quality assessment, and data mapping', '#10B981', 2, 7, true, '["Profile all data sources", "Document data lineage", "Assess data quality issues", "Identify data gaps"]', '["Data Inventory", "Data Quality Report", "Source-to-Target Mapping", "Data Governance Plan"]'),
          ('Architecture & Design', 'Designing the technical architecture, data models, and solution blueprint', '#F59E0B', 3, 14, true, '["Follow dimensional modeling principles", "Design for scalability", "Consider security requirements", "Plan for data governance"]', '["Technical Architecture Document", "Data Model", "ETL Design", "Security Plan"]'),
          ('Development & Implementation', 'Building ETL processes, data warehouse, and BI solutions', '#EF4444', 4, 21, true, '["Use version control", "Implement automated testing", "Follow coding standards", "Document all processes"]', '["ETL Processes", "Data Warehouse", "BI Reports/Dashboards", "Technical Documentation"]'),
          ('Testing & Quality Assurance', 'Comprehensive testing of data accuracy, performance, and user acceptance', '#8B5CF6', 5, 10, true, '["Test data accuracy end-to-end", "Validate business rules", "Performance testing", "User acceptance testing"]', '["Test Plans", "Test Results", "Performance Reports", "UAT Sign-off"]'),
          ('Deployment & Go-Live', 'Production deployment, user training, and go-live activities', '#06B6D4', 6, 5, true, '["Plan deployment carefully", "Provide comprehensive training", "Monitor closely post-deployment", "Have rollback plan ready"]', '["Deployment Guide", "Training Materials", "Go-Live Checklist", "Support Documentation"]'),
          ('Monitoring & Optimization', 'Post-deployment monitoring, performance optimization, and continuous improvement', '#6B7280', 7, 30, false, '["Monitor system performance", "Track usage metrics", "Gather user feedback", "Plan iterative improvements"]', '["Monitoring Dashboard", "Performance Reports", "User Feedback Analysis", "Improvement Roadmap"]')
        ` as any);
        console.log("✅ BI Stages inserted successfully");
      }

      // Insert BI Project Templates only if they don't exist
      if (templateCount === 0) {
        console.log("📝 Inserting BI Project Templates...");
        await db.execute(`
          INSERT INTO bi_project_templates (name, description, category, complexity, estimated_duration_weeks, required_skills, recommended_team_size, is_active) VALUES
          ('Standard Data Warehouse Project', 'Complete data warehouse implementation with ETL processes and reporting', 'data_warehouse', 'complex', 16, '["SQL", "ETL Tools", "Data Modeling", "Business Analysis", "Data Visualization"]', 4, true),
          ('Business Intelligence Dashboard', 'Interactive dashboard development with data integration', 'reporting', 'medium', 8, '["SQL", "BI Tools", "Data Visualization", "Business Analysis"]', 2, true),
          ('Data Analytics Platform', 'Advanced analytics platform with machine learning capabilities', 'analytics', 'complex', 20, '["Python/R", "Machine Learning", "SQL", "Data Engineering", "Statistics"]', 5, true),
          ('ETL Process Implementation', 'Focused ETL development for data integration', 'etl', 'medium', 6, '["SQL", "ETL Tools", "Data Integration", "Data Quality"]', 2, true),
          ('Quick Reporting Solution', 'Rapid development of basic reports and dashboards', 'reporting', 'simple', 4, '["SQL", "Reporting Tools", "Data Visualization"]', 1, true)
        ` as any);
        console.log("✅ BI Project Templates inserted successfully");
      }

      // Link templates to stages only if templates were just created
      if (templateCount === 0) {
        console.log("📝 Linking templates to stages...");
        await db.execute(`
          INSERT INTO bi_template_stages (template_id, stage_id, order_index, is_optional, custom_duration_days) VALUES
          (1, 1, 1, false, 10), (1, 2, 2, false, 7), (1, 3, 3, false, 14), (1, 4, 4, false, 21), (1, 5, 5, false, 10), (1, 6, 6, false, 5), (1, 7, 7, true, 30),
          (2, 1, 1, false, 5), (2, 2, 2, false, 3), (2, 3, 3, false, 7), (2, 4, 4, false, 10), (2, 5, 5, false, 5), (2, 6, 6, false, 3), (2, 7, 7, true, 15),
          (3, 1, 1, false, 12), (3, 2, 2, false, 10), (3, 3, 3, false, 18), (3, 4, 4, false, 28), (3, 5, 5, false, 14), (3, 6, 6, false, 7), (3, 7, 7, false, 45)
        ` as any);
        console.log("✅ Template-stage relationships created successfully");
      }

      // Insert sample BI Main Tasks only if they don't exist
      if (mainTaskCount === 0) {
        console.log("📝 Inserting sample BI Main Tasks...");
        await db.execute(`
          INSERT INTO bi_main_tasks (stage_id, name, description, order_index, estimated_hours, is_required, prerequisites, best_practices, deliverables) VALUES
          (1, 'Stakeholder Analysis & Interviews', 'Identify and interview key stakeholders to understand business needs', 1, 16, true, '[]', '["Prepare structured interview questions", "Include both business and technical stakeholders", "Document all requirements clearly"]', '["Stakeholder Matrix", "Interview Notes", "Initial Requirements List"]'),
          (1, 'Current State Analysis', 'Analyze existing processes, systems, and reporting capabilities', 2, 12, true, '[1]', '["Map current data flows", "Identify pain points", "Document existing reports", "Assess current tools"]', '["Current State Documentation", "Process Maps", "Gap Analysis"]'),
          (1, 'Requirements Definition', 'Define detailed functional and non-functional requirements', 3, 20, true, '[1,2]', '["Use clear, measurable language", "Prioritize requirements", "Include data quality requirements", "Define acceptance criteria"]', '["Business Requirements Document", "Functional Specifications", "Non-functional Requirements"]')
        ` as any);
        console.log("✅ BI Main Tasks inserted successfully");

        // Insert sample BI Subtasks for the first main task
        console.log("📝 Inserting sample BI Subtasks...");
        await db.execute(`
          INSERT INTO bi_subtasks (main_task_id, name, description, order_index, estimated_minutes, is_required, skill_level, tools, best_practices) VALUES
          (1, 'Prepare Stakeholder Interview Questions', 'Create structured questions for different stakeholder types', 1, 60, true, 'intermediate', '["Microsoft Word", "Google Docs", "Interview Templates"]', '["Tailor questions to stakeholder role", "Include both open and closed questions", "Prepare follow-up questions"]'),
          (1, 'Schedule Stakeholder Interviews', 'Coordinate and schedule interviews with all key stakeholders', 2, 45, true, 'beginner', '["Outlook", "Google Calendar", "Calendly"]', '["Allow sufficient time for each interview", "Send agenda in advance", "Confirm attendance"]'),
          (1, 'Conduct Stakeholder Interviews', 'Execute interviews and document findings', 3, 240, true, 'intermediate', '["Teams", "Zoom", "Recording Software", "Note-taking Apps"]', '["Record sessions with permission", "Take detailed notes", "Ask clarifying questions", "Summarize key points"]'),
          (1, 'Analyze Interview Results', 'Synthesize interview findings and identify common themes', 4, 120, true, 'intermediate', '["Excel", "Miro", "Confluence", "Analysis Tools"]', '["Look for patterns and themes", "Identify conflicting requirements", "Prioritize findings", "Validate understanding"]')
        ` as any);
        console.log("✅ BI Subtasks inserted successfully");
      }

      console.log("🎉 BI Methodology seeding completed successfully!");
    } catch (error) {
      console.error("❌ BI Methodology seeding failed:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
