import {
  type Appointment, type InsertAppointment, type UpdateAppointment, appointments,
  type Company, type InsertCompany, type UpdateCompany, companies,
  type Project, type InsertProject, type UpdateProject, projects,
  type User, type InsertUser, type UpdateUser, users,
  type CreateRecurringAppointment
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import {
  generateRecurringInstances,
  validateRecurringTask,
  generateRecurringTaskId
} from "./utils/recurring-tasks";

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

  // Users
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUsersByCompany(companyId: number): Promise<User[]>;
  getUsersByType(type: 'internal' | 'external'): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: UpdateUser): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;

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
      console.log(`Delete result: ${result.rowCount} rows affected`);
      return result.rowCount > 0;
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
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
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
    const endTime = this.calculateEndTime(insertAppointment.startTime, insertAppointment.durationMinutes);
    
    // Check for time conflicts if not a Pomodoro
    if (!insertAppointment.isPomodoro) {
      const hasConflict = await this.checkTimeConflict(insertAppointment.date, insertAppointment.startTime, endTime);
      if (hasConflict) {
        throw new Error("Conflito de horário detectado. Já existe um agendamento neste período.");
      }
    }
    
    const appointmentData = {
      ...insertAppointment,
      endTime,
      status: "scheduled" as const,
      completedAt: null,
    };

    const [appointment] = await db.insert(appointments).values(appointmentData).returning();

    // Auto-create Pomodoro if not already a Pomodoro
    if (!appointment.isPomodoro) {
      const pomodoroStartTime = appointment.endTime;
      const pomodoroEndTime = this.calculateEndTime(pomodoroStartTime, 5);
      
      await db.insert(appointments).values({
        title: "Pomodoro",
        description: "Pausa automática",
        date: appointment.date,
        startTime: pomodoroStartTime,
        durationMinutes: 5,
        endTime: pomodoroEndTime,
        peopleWith: null,
        project: null,
        company: null,
        slaMinutes: null,
        status: "scheduled",
        isPomodoro: true,
        completedAt: null,
      });
    }

    return appointment;
  }

  async updateAppointment(id: string, updateData: UpdateAppointment): Promise<Appointment | undefined> {
    const existing = await this.getAppointment(id);
    if (!existing) return undefined;

    // Check for time conflicts if updating schedule
    if ((updateData.startTime || updateData.durationMinutes || updateData.date) && !existing.isPomodoro) {
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

    const [updated] = await db.update(appointments)
      .set(updateData)
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

      // Check if times overlap
      const existingStart = appointment.startTime;
      const existingEnd = appointment.endTime;

      // Convert times to minutes for comparison
      const startMinutes = this.timeToMinutes(startTime);
      const endMinutes = this.timeToMinutes(endTime);
      const existingStartMinutes = this.timeToMinutes(existingStart);
      const existingEndMinutes = this.timeToMinutes(existingEnd);

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
  async createRecurringAppointment(appointmentData: CreateRecurringAppointment): Promise<{ template: Appointment; instances: Appointment[] }> {
    console.log('🔄 Creating recurring appointment:', appointmentData.title);

    // Validate recurring task data
    const validationErrors = validateRecurringTask(appointmentData);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }

    const recurringTaskId = generateRecurringTaskId();

    // Create the template appointment
    const templateData: InsertAppointment = {
      ...appointmentData,
      isRecurring: true,
      isRecurringTemplate: true,
      recurringTaskId: recurringTaskId,
      parentTaskId: null,
      originalDate: null,
      wasRescheduledFromWeekend: false,
    };

    const template = await this.createAppointment(templateData);
    console.log(`✅ Created recurring template with ID: ${template.id}`);

    // Generate and create all instances
    const instances: Appointment[] = [];
    if (appointmentData.isRecurring) {
      const instancesData = generateRecurringInstances(appointmentData, recurringTaskId);
      console.log(`📋 Generated ${instancesData.length} recurring instances`);

      for (const instanceData of instancesData) {
        // Set parent task ID to the template
        instanceData.parentTaskId = template.id;

        try {
          const instance = await this.createAppointment(instanceData);
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
}

export const storage = new DatabaseStorage();
