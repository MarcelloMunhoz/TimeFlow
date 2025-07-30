import { CreateRecurringAppointment, InsertAppointment } from '../../shared/schema.js';

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
export function generateRecurringInstances(
  templateData: CreateRecurringAppointment,
  recurringTaskId: number
): InsertAppointment[] {
  if (!templateData.isRecurring || !templateData.recurrencePattern) {
    return [];
  }

  const instances: InsertAppointment[] = [];
  const startDate = parseDateString(templateData.date);
  const interval = templateData.recurrenceInterval || 1;
  
  let currentDate = new Date(startDate);
  let occurrenceCount = 0;
  const maxOccurrences = templateData.recurrenceEndCount || 1000; // Safety limit
  
  // Determine end condition
  const endDate = templateData.recurrenceEndDate 
    ? parseDateString(templateData.recurrenceEndDate)
    : null;

  while (occurrenceCount < maxOccurrences) {
    // Check if we've reached the end date
    if (endDate && currentDate > endDate) {
      break;
    }
    
    // Check if we've reached the occurrence count limit
    if (templateData.recurrenceEndCount && occurrenceCount >= templateData.recurrenceEndCount) {
      break;
    }

    // Move to next business day if it falls on weekend
    const originalDateString = formatDateString(currentDate);
    const { adjustedDate, wasAdjusted } = moveToNextBusinessDay(currentDate);
    const finalDateString = formatDateString(adjustedDate);

    // Create appointment instance
    const instance: InsertAppointment = {
      title: templateData.title,
      description: templateData.description,
      date: finalDateString,
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
      originalDate: wasAdjusted ? originalDateString : null,
      wasRescheduledFromWeekend: wasAdjusted,
      updatedAt: null,
    };

    instances.push(instance);
    occurrenceCount++;

    // Calculate next occurrence
    currentDate = calculateNextOccurrence(currentDate, templateData.recurrencePattern, interval);
  }

  return instances;
}

/**
 * Validate recurring task data
 */
export function validateRecurringTask(data: CreateRecurringAppointment): string[] {
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
