// @ts-nocheck
import { CreateRecurringAppointment, InsertAppointment } from '../../shared/schema.js';
import { workScheduleService } from '../services/work-schedule-service.js';

/**
 * Check if a date falls on a weekend (Saturday or Sunday)
 */
export function isWeekend(date: Date): boolean {
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
}

/**
 * Move a date to the next Monday if it falls on a weekend
 */
export function moveToNextBusinessDay(date: Date): { adjustedDate: Date; wasAdjusted: boolean } {
  const adjustedDate = new Date(date);
  let wasAdjusted = false;
  
  if (isWeekend(date)) {
    wasAdjusted = true;
    const dayOfWeek = date.getDay();
    
    if (dayOfWeek === 0) { // Sunday
      adjustedDate.setDate(date.getDate() + 1); // Move to Monday
    } else if (dayOfWeek === 6) { // Saturday
      adjustedDate.setDate(date.getDate() + 2); // Move to Monday
    }
  }
  
  return { adjustedDate, wasAdjusted };
}

/**
 * Format date as YYYY-MM-DD string
 */
export function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parse date string (YYYY-MM-DD) to Date object
 */
export function parseDateString(dateString: string): Date {
  return new Date(dateString + 'T00:00:00.000Z');
}

/**
 * Calculate the next occurrence date based on recurrence pattern
 */
export function calculateNextOccurrence(
  currentDate: Date,
  pattern: string,
  interval: number = 1
): Date {
  const nextDate = new Date(currentDate);
  
  switch (pattern) {
    case 'daily':
      nextDate.setDate(currentDate.getDate() + interval);
      break;
    case 'weekly':
      nextDate.setDate(currentDate.getDate() + (7 * interval));
      break;
    case 'monthly':
      nextDate.setMonth(currentDate.getMonth() + interval);
      break;
    case 'yearly':
      nextDate.setFullYear(currentDate.getFullYear() + interval);
      break;
    default:
      throw new Error(`Unsupported recurrence pattern: ${pattern}`);
  }
  
  return nextDate;
}

/**
 * Generate all recurring appointment instances
 */
export async function generateRecurringInstances(
  templateData: any,
  recurringTaskId: number
): Promise<any[]> {
  if (!templateData.isRecurring || !templateData.recurrencePattern) {
    return [];
  }

  const instances: any[] = [];
  const startDate = parseDateString(templateData.date);
  const interval = templateData.recurrenceInterval || 1;

  let currentDate = new Date(startDate);
  let createdInstances = 0;
  const maxInstances = templateData.recurrenceEndCount || 1000; // Safety limit
  let iterations = 0;
  const maxIterations = maxInstances * 3; // Safety limit to prevent infinite loops

  // Determine end condition
  const endDate = templateData.recurrenceEndDate
    ? parseDateString(templateData.recurrenceEndDate)
    : null;

  while (createdInstances < maxInstances && iterations < maxIterations) {
    iterations++;

    // Check if we've reached the end date
    if (endDate && currentDate > endDate) {
      break;
    }

    // VERIFICAR SE É FINAL DE SEMANA: Sábado (6) e Domingo (0)
    const dayOfWeek = currentDate.getDay();
    const originalDateString = formatDateString(currentDate);

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Pular final de semana - ir para próximo dia sem criar instância
      currentDate = calculateNextOccurrence(currentDate, templateData.recurrencePattern, interval);
      continue; // Pular esta iteração, não criar instância
    }

    // Determine work schedule compliance for the current date
    const startMinutes = timeToMinutes(templateData.startTime);
    const endMinutes = startMinutes + templateData.durationMinutes;

    const isAfterHours = startMinutes >= timeToMinutes('18:00');
    const isWithinWorkHours = !isAfterHours &&
      ((startMinutes >= timeToMinutes('08:00') && endMinutes <= timeToMinutes('12:00')) ||
       (startMinutes >= timeToMinutes('13:00') && endMinutes <= timeToMinutes('18:00')));

    const finalValidation = {
      isWithinWorkHours: isWithinWorkHours,
      isOvertime: isAfterHours,
      violation: null,
      allowOverlap: templateData.allowOverlap || false
    };

    // Create appointment instance
    const instance: InsertAppointment = {
      title: templateData.title,
      description: templateData.description,
      date: originalDateString,
      startTime: templateData.startTime,
      durationMinutes: templateData.durationMinutes,
      peopleWith: templateData.peopleWith,
      project: templateData.project,
      company: templateData.company,
      projectId: templateData.projectId,
      companyId: templateData.companyId,
      assignedUserId: templateData.assignedUserId,
      priority: templateData.priority,
      category: templateData.category,
      tags: templateData.tags,
      pomodoroSessions: templateData.pomodoroSessions,
      notes: templateData.notes,
      location: templateData.location,
      meetingUrl: templateData.meetingUrl,
      slaMinutes: templateData.slaMinutes,
      isPomodoro: templateData.isPomodoro,
      rescheduleCount: 0,
      actualTimeMinutes: 0,
      timerState: 'stopped',
      timerStartedAt: null,
      timerPausedAt: null,
      accumulatedTimeMinutes: 0,
      // Recurring task specific fields
      isRecurring: false, // Individual instances are not recurring
      recurrencePattern: null,
      recurrenceInterval: null,
      recurrenceEndDate: null,
      recurrenceEndCount: null,
      parentTaskId: null, // Will be set to the template ID after creation
      recurringTaskId: recurringTaskId,
      isRecurringTemplate: false,
      originalDate: null, // No rescheduling needed since we skip weekends
      wasRescheduledFromWeekend: false,
      // Work schedule compliance fields
      isWithinWorkHours: finalValidation.isWithinWorkHours,
      isOvertime: finalValidation.isOvertime,
      workScheduleViolation: finalValidation.violation || null,
      allowOverlap: templateData.allowOverlap || finalValidation.allowOverlap,
      updatedAt: null,
    };

    instances.push(instance);
    createdInstances++;

    // Calculate next occurrence
    currentDate = calculateNextOccurrence(currentDate, templateData.recurrencePattern, interval);
  }

  return instances;
}

/**
 * Validate recurring task data
 */
export function validateRecurringTask(data: any): string[] {
  const errors: string[] = [];

  if (data.isRecurring) {
    if (!data.recurrencePattern) {
      errors.push('Recurrence pattern is required for recurring tasks');
    }

    if (!data.recurrenceEndDate && !data.recurrenceEndCount) {
      errors.push('Either end date or occurrence count must be specified for recurring tasks');
    }

    if (data.recurrenceEndDate && data.recurrenceEndCount) {
      errors.push('Cannot specify both end date and occurrence count');
    }

    if (data.recurrenceInterval && (data.recurrenceInterval < 1 || data.recurrenceInterval > 365)) {
      errors.push('Recurrence interval must be between 1 and 365');
    }

    if (data.recurrenceEndCount && (data.recurrenceEndCount < 1 || data.recurrenceEndCount > 1000)) {
      errors.push('Occurrence count must be between 1 and 1000');
    }

    // Validate end date is in the future
    if (data.recurrenceEndDate) {
      const endDate = parseDateString(data.recurrenceEndDate);
      const startDate = parseDateString(data.date);
      
      if (endDate <= startDate) {
        errors.push('End date must be after the start date');
      }
    }
  }

  return errors;
}

/**
 * Generate a unique recurring task ID
 * Using a smaller number to fit in PostgreSQL integer range (max 2,147,483,647)
 */
export function generateRecurringTaskId(): number {
  // Use last 6 digits of timestamp + random 3 digits to stay well within integer range
  const timestamp = Date.now();
  const shortTimestamp = parseInt(timestamp.toString().slice(-6));
  const random = Math.floor(Math.random() * 1000);
  const id = shortTimestamp * 1000 + random;

  // Ensure it's within PostgreSQL integer range
  return Math.min(id, 2147483647);
}

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}
