import { type Appointment, type InsertAppointment, type UpdateAppointment, appointments } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, gte, lte } from "drizzle-orm";

export interface IStorage {
  // Appointments
  getAppointments(): Promise<Appointment[]>;
  getAppointment(id: string): Promise<Appointment | undefined>;
  getAppointmentsByDate(date: string): Promise<Appointment[]>;
  getAppointmentsByDateRange(startDate: string, endDate: string): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, appointment: UpdateAppointment): Promise<Appointment | undefined>;
  deleteAppointment(id: string): Promise<boolean>;
  
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

  async getAppointments(): Promise<Appointment[]> {
    return await db.select().from(appointments).orderBy(appointments.date, appointments.startTime);
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
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

      const hasConflict = await this.checkTimeConflict(newDate, newStartTime, newEndTime, id);
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
      .where(eq(appointments.id, id))
      .returning();

    // Update associated Pomodoro if this is not a Pomodoro and schedule changed
    if (updated && !updated.isPomodoro && (updateData.startTime || updateData.durationMinutes || updateData.date)) {
      await this.updateAssociatedPomodoro(updated);
    }

    return updated || undefined;
  }

  async deleteAppointment(id: string): Promise<boolean> {
    const result = await db.delete(appointments).where(eq(appointments.id, id));
    return (result.rowCount || 0) > 0;
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

  private async checkTimeConflict(date: string, startTime: string, endTime: string, excludeId?: string): Promise<boolean> {
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
}

export const storage = new DatabaseStorage();
