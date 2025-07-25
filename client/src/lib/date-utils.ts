import { format, addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday } from 'date-fns';

export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function formatTime(date: Date): string {
  return format(date, 'HH:mm');
}

export function formatDisplayDate(dateString: string): string {
  // Ensure we handle the date string as local time to avoid timezone issues
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return format(date, 'dd/MM/yyyy');
}

export function formatDisplayTime(timeString: string): string {
  return timeString;
}

export function getTodayString(): string {
  return formatDate(new Date());
}

export function getCalendarDays(date: Date) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  return eachDayOfInterval({ start: calendarStart, end: calendarEnd }).map(day => ({
    date: day,
    dateString: formatDate(day),
    dayNumber: format(day, 'd'),
    isCurrentMonth: isSameMonth(day, date),
    isToday: isToday(day),
  }));
}

export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const startDate = new Date();
  startDate.setHours(hours, minutes, 0, 0);
  startDate.setMinutes(startDate.getMinutes() + durationMinutes);
  return formatTime(startDate);
}

export function isSLAExpired(appointment: any): boolean {
  if (!appointment.slaMinutes) return false;
  
  if (appointment.status === 'completed' && appointment.completedAt) {
    const completedDate = new Date(appointment.completedAt);
    const scheduledDate = new Date(`${appointment.date}T${appointment.startTime}`);
    const timeTaken = (completedDate.getTime() - scheduledDate.getTime()) / (1000 * 60);
    return timeTaken > appointment.slaMinutes;
  }
  
  if (appointment.status === 'scheduled') {
    const now = new Date();
    const scheduledDate = new Date(`${appointment.date}T${appointment.startTime}`);
    const timePassed = (now.getTime() - scheduledDate.getTime()) / (1000 * 60);
    return timePassed > appointment.slaMinutes;
  }
  
  return false;
}

export function getAppointmentStatus(appointment: any): 'completed' | 'delayed' | 'future' | 'pomodoro' {
  if (appointment.isPomodoro) return 'pomodoro';
  if (appointment.status === 'completed') return 'completed';
  if (isSLAExpired(appointment)) return 'delayed';
  return 'future';
}
