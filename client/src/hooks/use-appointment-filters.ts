import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { StatusFilter, TimeFilter } from '@/components/appointment-status-filter';
import { getAppointmentStatus } from '@/lib/date-utils';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, isWithinInterval, parseISO } from 'date-fns';

interface UseAppointmentFiltersProps {
  appointments: any[];
  selectedDate: string;
}

interface FilteredResults {
  filteredAppointments: any[];
  appointmentCounts: {
    all: number;
    open: number;
    completed: number;
  };
  statusFilter: StatusFilter;
  timeFilter: TimeFilter;
  setStatusFilter: (filter: StatusFilter) => void;
  setTimeFilter: (filter: TimeFilter) => void;
}

export function useAppointmentFilters({ 
  appointments, 
  selectedDate 
}: UseAppointmentFiltersProps): FilteredResults {
  const [location, setLocation] = useLocation();
  
  // Parse URL parameters for initial state
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const initialStatusFilter = (urlParams.get('status') as StatusFilter) || 'open';
  const initialTimeFilter = (urlParams.get('period') as TimeFilter) || 'day';
  
  const [statusFilter, setStatusFilterState] = useState<StatusFilter>(initialStatusFilter);
  const [timeFilter, setTimeFilterState] = useState<TimeFilter>(initialTimeFilter);

  // Update URL when filters change
  const updateURL = (status: StatusFilter, time: TimeFilter) => {
    const params = new URLSearchParams();
    if (status !== 'open') params.set('status', status);
    if (time !== 'day') params.set('period', time);
    
    const queryString = params.toString();
    const newPath = location.split('?')[0] + (queryString ? `?${queryString}` : '');
    
    // Only update if the path actually changed to avoid unnecessary navigation
    if (newPath !== location) {
      setLocation(newPath);
    }
  };

  const setStatusFilter = (filter: StatusFilter) => {
    setStatusFilterState(filter);
    updateURL(filter, timeFilter);
  };

  const setTimeFilter = (filter: TimeFilter) => {
    setTimeFilterState(filter);
    updateURL(statusFilter, filter);
  };

  // Get date range based on time filter
  const getDateRange = useMemo(() => {
    const baseDate = parseISO(selectedDate);
    
    switch (timeFilter) {
      case 'week': {
        const weekStart = startOfWeek(baseDate, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(baseDate, { weekStartsOn: 0 });
        return { start: weekStart, end: weekEnd };
      }
      case 'month': {
        const monthStart = startOfMonth(baseDate);
        const monthEnd = endOfMonth(baseDate);
        return { start: monthStart, end: monthEnd };
      }
      case 'day':
      default: {
        return { start: baseDate, end: baseDate };
      }
    }
  }, [selectedDate, timeFilter]);

  // Filter appointments by time period
  const timeFilteredAppointments = useMemo(() => {
    return appointments.filter((appointment: any) => {
      const appointmentDate = parseISO(appointment.date);
      
      if (timeFilter === 'day') {
        return appointment.date === selectedDate;
      }
      
      return isWithinInterval(appointmentDate, getDateRange);
    });
  }, [appointments, selectedDate, timeFilter, getDateRange]);

  // Calculate appointment counts
  const appointmentCounts = useMemo(() => {
    const all = timeFilteredAppointments.length;
    
    const statusCounts = timeFilteredAppointments.reduce((counts, appointment) => {
      const status = getAppointmentStatus(appointment);
      const appointmentStatus = appointment.status;
      
      // Count as "open" if not completed
      if (appointmentStatus !== 'completed') {
        counts.open++;
      } else {
        counts.completed++;
      }
      
      return counts;
    }, { open: 0, completed: 0 });

    return {
      all,
      open: statusCounts.open,
      completed: statusCounts.completed
    };
  }, [timeFilteredAppointments]);

  // Filter appointments by status
  const filteredAppointments = useMemo(() => {
    if (statusFilter === 'all') {
      return timeFilteredAppointments;
    }

    return timeFilteredAppointments.filter((appointment: any) => {
      const appointmentStatus = appointment.status;
      
      if (statusFilter === 'open') {
        // Open/Pending includes: scheduled, delayed, rescheduled
        return appointmentStatus !== 'completed';
      }
      
      if (statusFilter === 'completed') {
        return appointmentStatus === 'completed';
      }
      
      return true;
    });
  }, [timeFilteredAppointments, statusFilter]);

  // Sort appointments by time and status priority
  const sortedFilteredAppointments = useMemo(() => {
    return [...filteredAppointments].sort((a, b) => {
      // First sort by date
      const dateComparison = a.date.localeCompare(b.date);
      if (dateComparison !== 0) return dateComparison;
      
      // Then by start time
      const timeComparison = a.startTime.localeCompare(b.startTime);
      if (timeComparison !== 0) return timeComparison;
      
      // Finally by status priority (open tasks first when showing all)
      if (statusFilter === 'all') {
        const aStatus = a.status;
        const bStatus = b.status;
        
        // Completed tasks go to the end
        if (aStatus === 'completed' && bStatus !== 'completed') return 1;
        if (bStatus === 'completed' && aStatus !== 'completed') return -1;
        
        // Among non-completed, delayed tasks come first
        const aDelayed = getAppointmentStatus(a) === 'delayed';
        const bDelayed = getAppointmentStatus(b) === 'delayed';
        
        if (aDelayed && !bDelayed) return -1;
        if (bDelayed && !aDelayed) return 1;
      }
      
      return 0;
    });
  }, [filteredAppointments, statusFilter]);

  return {
    filteredAppointments: sortedFilteredAppointments,
    appointmentCounts,
    statusFilter,
    timeFilter,
    setStatusFilter,
    setTimeFilter
  };
}
