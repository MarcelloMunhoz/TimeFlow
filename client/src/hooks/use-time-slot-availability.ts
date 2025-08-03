import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

interface TimeSlot {
  time: string;
  available: boolean;
  conflictingAppointments: any[];
  reason?: string;
}

interface UseTimeSlotAvailabilityProps {
  selectedDate: string;
  durationMinutes: number;
  excludeAppointmentId?: number; // For editing existing appointments
  workingHours?: {
    start: string;
    end: string;
  };
}

interface ConflictDetails {
  hasConflicts: boolean;
  conflictingAppointments: any[];
  canProceedWithOverlap: boolean;
}

export function useTimeSlotAvailability({
  selectedDate,
  durationMinutes,
  excludeAppointmentId,
  workingHours = { start: '08:00', end: '18:00' }
}: UseTimeSlotAvailabilityProps) {
  
  // Fetch all appointments for the selected date
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['/api/appointments'],
    enabled: !!selectedDate,
  });

  // Filter appointments for the selected date (excluding the one being edited)
  const dayAppointments = useMemo(() => {
    return (appointments as any[]).filter((apt: any) =>
      apt.date === selectedDate && 
      apt.id !== excludeAppointmentId &&
      apt.status !== 'cancelled' // Don't consider cancelled appointments
    );
  }, [appointments, selectedDate, excludeAppointmentId]);

  // Generate time slots (every 15 minutes)
  const timeSlots = useMemo((): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const startHour = parseInt(workingHours.start.split(':')[0]);
    const startMinute = parseInt(workingHours.start.split(':')[1]);
    const endHour = parseInt(workingHours.end.split(':')[0]);
    const endMinute = parseInt(workingHours.end.split(':')[1]);

    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;

    for (let minutes = startTotalMinutes; minutes < endTotalMinutes; minutes += 15) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const timeString = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      
      // Check if this time slot would create conflicts
      const conflicts = checkTimeSlotConflicts(timeString, durationMinutes, dayAppointments);
      
      slots.push({
        time: timeString,
        available: conflicts.length === 0,
        conflictingAppointments: conflicts,
        reason: conflicts.length > 0 ? `Conflito com ${conflicts.length} agendamento(s)` : undefined
      });
    }

    return slots;
  }, [workingHours, durationMinutes, dayAppointments]);

  // Get available time slots only
  const availableTimeSlots = useMemo(() => {
    return timeSlots.filter(slot => slot.available);
  }, [timeSlots]);

  // Function to check conflicts for a specific time
  const checkConflicts = (startTime: string): ConflictDetails => {
    if (!startTime || !durationMinutes) {
      return {
        hasConflicts: false,
        conflictingAppointments: [],
        canProceedWithOverlap: false
      };
    }

    const conflicts = checkTimeSlotConflicts(startTime, durationMinutes, dayAppointments);
    
    return {
      hasConflicts: conflicts.length > 0,
      conflictingAppointments: conflicts,
      canProceedWithOverlap: true // Always allow user to proceed with overlap if they choose
    };
  };

  // Get next available time slot
  const getNextAvailableSlot = (afterTime?: string): string | null => {
    const availableSlots = timeSlots.filter(slot => slot.available);
    
    if (!afterTime) {
      return availableSlots.length > 0 ? availableSlots[0].time : null;
    }

    const laterSlots = availableSlots.filter(slot => slot.time > afterTime);
    return laterSlots.length > 0 ? laterSlots[0].time : null;
  };

  // Get suggested alternative times
  const getSuggestedTimes = (requestedTime: string, count: number = 3): string[] => {
    const availableSlots = timeSlots.filter(slot => slot.available);
    
    // Find slots closest to the requested time
    const requestedMinutes = timeToMinutes(requestedTime);
    const sortedByDistance = availableSlots
      .map(slot => ({
        ...slot,
        distance: Math.abs(timeToMinutes(slot.time) - requestedMinutes)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, count);

    return sortedByDistance.map(slot => slot.time);
  };

  return {
    timeSlots,
    availableTimeSlots,
    dayAppointments,
    isLoading,
    checkConflicts,
    getNextAvailableSlot,
    getSuggestedTimes,
    hasAnyAvailableSlots: availableTimeSlots.length > 0
  };
}

// Helper function to check if a time slot conflicts with existing appointments
function checkTimeSlotConflicts(startTime: string, durationMinutes: number, appointments: any[]): any[] {
  const newStart = timeToMinutes(startTime);
  const newEnd = newStart + durationMinutes;

  return appointments.filter(apt => {
    const existingStart = timeToMinutes(apt.startTime);
    const existingEnd = existingStart + apt.durationMinutes;

    // Check for overlap: new appointment overlaps if it starts before existing ends and ends after existing starts
    return (newStart < existingEnd && newEnd > existingStart);
  });
}

// Helper function to convert time string to minutes since midnight
function timeToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

// Helper function to convert minutes since midnight to time string
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Hook for checking specific time conflicts (used in forms)
export function useConflictCheck(selectedDate: string, startTime: string, durationMinutes: number, excludeAppointmentId?: number) {
  const { checkConflicts } = useTimeSlotAvailability({
    selectedDate,
    durationMinutes,
    excludeAppointmentId
  });

  return useMemo(() => {
    return checkConflicts(startTime);
  }, [checkConflicts, startTime]);
}
