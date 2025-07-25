import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { getCalendarDays, formatDate, getTodayString } from "@/lib/date-utils";
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { ptBR } from "date-fns/locale";

interface CalendarViewProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  viewMode: "month" | "week" | "day";
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const STATUS_COLORS = {
  completed: 'bg-green-500',
  delayed: 'bg-red-500',
  future: 'bg-blue-500',
  pomodoro: 'bg-gray-400'
};

export default function CalendarView({ selectedDate, onDateSelect, viewMode }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const { data: appointments = [] } = useQuery({
    queryKey: ['/api/appointments'],
  });

  const today = getTodayString();

  // Get days based on view mode
  const getDaysToShow = () => {
    switch (viewMode) {
      case 'day':
        return [currentDate];
      case 'week':
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
        return eachDayOfInterval({ start: weekStart, end: weekEnd });
      case 'month':
      default:
        return getCalendarDays(currentDate).map(day => new Date(day.dateString));
    }
  };

  const daysToShow = getDaysToShow();

  const getAppointmentsForDate = (dateString: string) => {
    return (appointments as any[]).filter((apt: any) => apt.date === dateString);
  };

  const getStatusForAppointment = (appointment: any) => {
    if (appointment.isPomodoro) return 'pomodoro';
    if (appointment.status === 'completed') return 'completed';
    
    // Check if SLA expired
    if (appointment.slaMinutes && appointment.status === 'scheduled') {
      const now = new Date();
      const scheduledDate = new Date(`${appointment.date}T${appointment.startTime}`);
      const timePassed = (now.getTime() - scheduledDate.getTime()) / (1000 * 60);
      if (timePassed > appointment.slaMinutes) return 'delayed';
    }
    
    return 'future';
  };

  const navigate = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      switch (viewMode) {
        case 'day':
          return direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1);
        case 'week':
          return direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1);
        case 'month':
        default:
          return direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1);
      }
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    onDateSelect(today);
  };

  const getTitle = () => {
    switch (viewMode) {
      case 'day':
        return format(currentDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
      case 'week':
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
        return `${format(weekStart, 'dd MMM', { locale: ptBR })} - ${format(weekEnd, 'dd MMM yyyy', { locale: ptBR })}`;
      case 'month':
      default:
        return format(currentDate, 'MMMM yyyy', { locale: ptBR });
    }
  };

  const renderMonthView = () => {
    const calendarDays = getCalendarDays(currentDate);
    
    return (
      <>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS.map((day) => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day) => {
            const dayAppointments = getAppointmentsForDate(day.dateString);
            const isSelected = selectedDate === day.dateString;
            
            return (
              <div
                key={day.dateString}
                className={cn(
                  "min-h-24 p-2 border border-gray-100 hover:bg-gray-50 cursor-pointer relative",
                  {
                    "bg-blue-50 border-blue-300": isSelected,
                    "text-gray-400": !day.isCurrentMonth,
                    "font-bold text-blue-600": day.isToday,
                  }
                )}
                onClick={() => onDateSelect(day.dateString)}
              >
                <span className={cn("text-sm", {
                  "font-semibold": day.isCurrentMonth,
                  "text-blue-600": day.isToday
                })}>
                  {day.dayNumber}
                </span>
                
                {dayAppointments.length > 0 && (
                  <div className="mt-1 space-y-1">
                    {dayAppointments.slice(0, 3).map((apt: any) => {
                      const status = getStatusForAppointment(apt);
                      return (
                        <div
                          key={apt.id}
                          className={cn("w-full h-1.5 rounded", STATUS_COLORS[status])}
                          title={`${apt.title} - ${status}`}
                        />
                      );
                    })}
                    {dayAppointments.length > 3 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{dayAppointments.length - 3} mais
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </>
    );
  };

  const renderWeekView = () => {
    return (
      <>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS.map((day) => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {daysToShow.map((day) => {
            const dayString = format(day, 'yyyy-MM-dd');
            const dayAppointments = getAppointmentsForDate(dayString);
            const isSelected = selectedDate === dayString;
            const isToday = dayString === today;
            
            return (
              <div
                key={dayString}
                className={cn(
                  "min-h-32 p-2 border border-gray-100 hover:bg-gray-50 cursor-pointer",
                  {
                    "bg-blue-50 border-blue-300": isSelected,
                    "font-bold text-blue-600": isToday,
                  }
                )}
                onClick={() => onDateSelect(dayString)}
              >
                <span className={cn("text-sm font-semibold", {
                  "text-blue-600": isToday
                })}>
                  {format(day, 'dd')}
                </span>
                
                {dayAppointments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {dayAppointments.map((apt: any) => {
                      const status = getStatusForAppointment(apt);
                      return (
                        <div
                          key={apt.id}
                          className={cn("text-xs p-1 rounded text-white truncate", STATUS_COLORS[status])}
                          title={`ID: ${apt.id} - ${apt.startTime} - ${apt.title}`}
                        >
                          {apt.startTime} {apt.title}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </>
    );
  };

  const renderDayView = () => {
    const dayString = format(currentDate, 'yyyy-MM-dd');
    const dayAppointments = getAppointmentsForDate(dayString);
    
    return (
      <div className="space-y-4">
        <div className="text-center text-lg font-semibold text-gray-900 py-4">
          {format(currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </div>
        
        {dayAppointments.length > 0 ? (
          <div className="space-y-2">
            {dayAppointments.map((apt: any) => {
              const status = getStatusForAppointment(apt);
              return (
                <div
                  key={apt.id}
                  className={cn("p-4 rounded-lg border-l-4", {
                    "border-l-green-500 bg-green-50": status === 'completed',
                    "border-l-red-500 bg-red-50": status === 'delayed',
                    "border-l-blue-500 bg-blue-50": status === 'future',
                    "border-l-gray-400 bg-gray-50": status === 'pomodoro',
                  })}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900">{apt.title}</h3>
                        <span className="text-xs text-gray-400 font-mono bg-gray-200 px-2 py-1 rounded">
                          ID: {apt.id}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{apt.startTime} - {apt.endTime}</p>
                      {apt.description && (
                        <p className="text-sm text-gray-500 mt-1">{apt.description}</p>
                      )}
                      {apt.project && (
                        <p className="text-xs text-gray-500 mt-1">Projeto: {apt.project}</p>
                      )}
                      {apt.company && (
                        <p className="text-xs text-gray-500">Empresa: {apt.company}</p>
                      )}
                    </div>
                    <div className={cn("px-2 py-1 rounded-full text-xs text-white ml-4", STATUS_COLORS[status])}>
                      {status === 'completed' && 'Concluído'}
                      {status === 'delayed' && 'Atrasado'}
                      {status === 'future' && 'Agendado'}
                      {status === 'pomodoro' && 'Pomodoro'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Nenhum agendamento para este dia
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="mb-6">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('prev')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-semibold text-gray-900">
            {getTitle()}
          </h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('next')}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button variant="ghost" onClick={goToToday}>
          <Calendar className="w-4 h-4 mr-2" />
          Hoje
        </Button>
      </div>

      <CardContent className="p-4">
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'day' && renderDayView()}
      </CardContent>
    </Card>
  );
}
