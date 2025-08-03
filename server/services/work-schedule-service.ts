import { db } from '../db.js';
import { workSchedules, workScheduleRules, users } from '../../shared/schema.js';
import { eq, and } from 'drizzle-orm';

export interface WorkScheduleValidation {
  isValid: boolean;
  isWithinWorkHours: boolean;
  isOvertime: boolean;
  violation?: string;
  allowOverlap: boolean;
  suggestedTime?: string;
  message?: string;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  ruleType: string;
  isWorkingTime: boolean;
  allowOverlap: boolean;
  description?: string;
}

export class WorkScheduleService {
  
  /**
   * Get user's active work schedule with rules
   */
  async getUserWorkSchedule(userId: number) {
    const schedule = await db
      .select()
      .from(workSchedules)
      .where(and(eq(workSchedules.userId, userId), eq(workSchedules.isActive, true)))
      .limit(1);

    if (schedule.length === 0) {
      return null;
    }

    const rules = await db
      .select()
      .from(workScheduleRules)
      .where(eq(workScheduleRules.workScheduleId, schedule[0].id));

    return {
      schedule: schedule[0],
      rules: rules
    };
  }

  /**
   * Get the default user (for single-user system)
   */
  async getDefaultUser() {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.isActive, true))
      .limit(1);

    return user[0] || null;
  }

  /**
   * Validate if an appointment time is within work schedule
   */
  async validateAppointmentTime(
    date: string, 
    startTime: string, 
    durationMinutes: number,
    userId?: number
  ): Promise<WorkScheduleValidation> {
    
    // Get user (default to first active user if not specified)
    const user = userId ? 
      await db.select().from(users).where(eq(users.id, userId)).limit(1).then(u => u[0]) :
      await this.getDefaultUser();

    if (!user) {
      return {
        isValid: true,
        isWithinWorkHours: true,
        isOvertime: false,
        allowOverlap: false,
        message: "No user found, allowing appointment"
      };
    }

    const workSchedule = await this.getUserWorkSchedule(user.id);
    
    if (!workSchedule) {
      return {
        isValid: true,
        isWithinWorkHours: true,
        isOvertime: false,
        allowOverlap: false,
        message: "No work schedule defined, allowing appointment"
      };
    }

    const appointmentDate = new Date(date);
    const dayOfWeek = appointmentDate.getDay();
    
    // Get rules for this day of week
    const dayRules = workSchedule.rules.filter(rule => rule.dayOfWeek === dayOfWeek);
    
    if (dayRules.length === 0) {
      return {
        isValid: false,
        isWithinWorkHours: false,
        isOvertime: false,
        violation: "no_schedule",
        allowOverlap: false,
        message: "No work schedule defined for this day"
      };
    }

    // Check if it's a weekend
    const weekendRule = dayRules.find(rule => rule.ruleType === 'unavailable');
    if (weekendRule) {
      return {
        isValid: false,
        isWithinWorkHours: false,
        isOvertime: false,
        violation: "weekend",
        allowOverlap: false,
        message: "Appointments not allowed on weekends",
        suggestedTime: this.getNextBusinessDay(date)
      };
    }

    // Convert times to minutes for easier comparison
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = startMinutes + durationMinutes;
    const endTime = this.minutesToTime(endMinutes);

    // Check against each rule
    for (const rule of dayRules) {
      const ruleStartMinutes = this.timeToMinutes(rule.startTime);
      const ruleEndMinutes = this.timeToMinutes(rule.endTime);

      // Check if appointment overlaps with this rule
      if (startMinutes < ruleEndMinutes && endMinutes > ruleStartMinutes) {
        
        // Lunch break - not allowed
        if (rule.ruleType === 'lunch' && !rule.isWorkingTime) {
          return {
            isValid: false,
            isWithinWorkHours: false,
            isOvertime: false,
            violation: "lunch_break",
            allowOverlap: false,
            message: "Appointments not allowed during lunch break (12:00-13:00)",
            suggestedTime: "13:00"
          };
        }

        // After hours - overtime/encaixe
        if (rule.ruleType === 'work' && !rule.isWorkingTime && rule.allowOverlap) {
          return {
            isValid: true,
            isWithinWorkHours: false,
            isOvertime: true,
            violation: "after_hours",
            allowOverlap: true,
            message: "Appointment scheduled during after hours (overtime/encaixe)"
          };
        }

        // Regular work hours
        if (rule.ruleType === 'work' && rule.isWorkingTime) {
          return {
            isValid: true,
            isWithinWorkHours: true,
            isOvertime: false,
            allowOverlap: false,
            message: "Appointment within regular work hours"
          };
        }
      }
    }

    // If no rules matched, it's outside defined hours
    return {
      isValid: false,
      isWithinWorkHours: false,
      isOvertime: false,
      violation: "outside_hours",
      allowOverlap: false,
      message: "Appointment outside defined work hours"
    };
  }

  /**
   * Get available time slots for a specific date
   */
  async getAvailableTimeSlots(date: string, userId?: number): Promise<TimeSlot[]> {
    const user = userId ? 
      await db.select().from(users).where(eq(users.id, userId)).limit(1).then(u => u[0]) :
      await this.getDefaultUser();

    if (!user) return [];

    const workSchedule = await this.getUserWorkSchedule(user.id);
    if (!workSchedule) return [];

    const appointmentDate = new Date(date);
    const dayOfWeek = appointmentDate.getDay();
    
    const dayRules = workSchedule.rules
      .filter(rule => rule.dayOfWeek === dayOfWeek)
      .sort((a, b) => this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime));

    return dayRules.map(rule => ({
      startTime: rule.startTime,
      endTime: rule.endTime,
      ruleType: rule.ruleType,
      isWorkingTime: rule.isWorkingTime || false,
      allowOverlap: rule.allowOverlap || false,
      description: rule.description || ''
    }));
  }

  /**
   * Get next business day from a given date
   */
  getNextBusinessDay(dateString: string): string {
    const date = new Date(dateString);
    let nextDay = new Date(date);
    
    do {
      nextDay.setDate(nextDay.getDate() + 1);
    } while (nextDay.getDay() === 0 || nextDay.getDay() === 6); // Skip weekends
    
    return nextDay.toISOString().split('T')[0];
  }

  /**
   * Convert time string (HH:MM) to minutes since midnight
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Convert minutes since midnight to time string (HH:MM)
   */
  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Check if a date is a weekend
   */
  isWeekend(date: string): boolean {
    const d = new Date(date);
    return d.getDay() === 0 || d.getDay() === 6;
  }

  /**
   * Check if a time is during lunch break
   */
  isLunchBreak(time: string): boolean {
    const minutes = this.timeToMinutes(time);
    const lunchStart = this.timeToMinutes('12:00');
    const lunchEnd = this.timeToMinutes('13:00');
    return minutes >= lunchStart && minutes < lunchEnd;
  }

  /**
   * Check if a time is after hours (overtime)
   */
  isAfterHours(time: string): boolean {
    const minutes = this.timeToMinutes(time);
    const afterHoursStart = this.timeToMinutes('18:00');
    return minutes >= afterHoursStart;
  }
}

export const workScheduleService = new WorkScheduleService();
