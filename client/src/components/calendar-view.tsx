import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, Clock, User, Building } from "lucide-react";
import { getCalendarDays, formatDate, getTodayString } from "@/lib/date-utils";
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { ptBR } from "date-fns/locale";

interface CalendarViewProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  viewMode: "week" | "day";
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
      default:
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
        return eachDayOfInterval({ start: weekStart, end: weekEnd });
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
        default:
          return direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1);
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
      default:
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
        return `${format(weekStart, 'dd MMM', { locale: ptBR })} - ${format(weekEnd, 'dd MMM yyyy', { locale: ptBR })}`;
    }
  };



  const renderWeekView = () => {
    return (
      <div className="space-y-6">
        {/* Week Header */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {daysToShow.slice(1, 6).map((day) => { // Monday to Friday
            const dayString = format(day, 'yyyy-MM-dd');
            const dayAppointments = getAppointmentsForDate(dayString);
            const isSelected = selectedDate === dayString;
            const isToday = dayString === today;

            return (
              <div key={dayString} className="space-y-3">
                {/* Day Header */}
                <div className="text-center">
                  <div className={cn("text-sm font-medium text-gray-500 uppercase tracking-wide")}>
                    {format(day, 'EEEE', { locale: ptBR })}
                  </div>
                  <div
                    className={cn(
                      "text-2xl font-bold mt-1 cursor-pointer hover:text-blue-600 transition-colors",
                      {
                        "text-blue-600": isSelected,
                        "text-blue-700 bg-blue-100 rounded-full w-10 h-10 flex items-center justify-center mx-auto": isToday,
                      }
                    )}
                    onClick={() => onDateSelect(dayString)}
                  >
                    {format(day, 'dd')}
                  </div>
                </div>

                {/* Time Slots */}
                <div className="space-y-2 min-h-[500px] md:min-h-[700px]">
                  {/* Morning Slot (08:00 - 12:00) */}
                  <div className="bg-gray-50 rounded-lg p-3 min-h-[120px] md:min-h-[180px]">
                    <div className="text-xs text-gray-500 font-medium mb-2">08:00</div>
                    {dayAppointments
                      .filter((apt: any) => {
                        const hour = parseInt(apt.startTime.split(':')[0]);
                        return hour >= 8 && hour < 12;
                      })
                      .map((apt: any) => {
                        const status = getStatusForAppointment(apt);
                        return (
                          <div
                            key={apt.id}
                            className={cn(
                              "mb-2 p-2 rounded-lg border-l-4 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer",
                              {
                                "border-l-green-500": status === 'completed',
                                "border-l-red-500": status === 'delayed',
                                "border-l-blue-500": status === 'future',
                                "border-l-gray-400": status === 'pomodoro',
                              }
                            )}
                            title={`${apt.startTime} - ${apt.title}`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Clock className="w-3 h-3 text-gray-500" />
                              <div className="text-xs font-medium text-gray-600">
                                {apt.startTime}
                              </div>
                              {apt.isPomodoro && (
                                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                              )}
                            </div>
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {apt.title}
                            </div>
                            {apt.description && (
                              <div className="text-xs text-gray-500 truncate mt-1">
                                {apt.description}
                              </div>
                            )}
                            {apt.company && (
                              <div className="flex items-center gap-1 mt-1">
                                <Building className="w-3 h-3 text-gray-500" />
                                <div className="text-xs text-gray-600 truncate">
                                  {apt.company}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                  </div>

                  {/* Lunch Break (12:00 - 13:00) */}
                  <div className="bg-orange-50 rounded-lg p-3 min-h-[40px] md:min-h-[60px] border border-orange-200">
                    <div className="text-xs text-orange-600 font-medium mb-1">12:00</div>
                    <div className="text-xs text-orange-500 italic">Almoço</div>
                  </div>

                  {/* Afternoon Slot (13:00 - 18:00) */}
                  <div className="bg-gray-50 rounded-lg p-3 min-h-[150px] md:min-h-[250px]">
                    <div className="text-xs text-gray-500 font-medium mb-2">13:00</div>
                    {dayAppointments
                      .filter((apt: any) => {
                        const hour = parseInt(apt.startTime.split(':')[0]);
                        return hour >= 13 && hour < 18;
                      })
                      .map((apt: any) => {
                        const status = getStatusForAppointment(apt);
                        return (
                          <div
                            key={apt.id}
                            className={cn(
                              "mb-2 p-2 rounded-lg border-l-4 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer",
                              {
                                "border-l-green-500": status === 'completed',
                                "border-l-red-500": status === 'delayed',
                                "border-l-blue-500": status === 'future',
                                "border-l-gray-400": status === 'pomodoro',
                              }
                            )}
                            title={`${apt.startTime} - ${apt.title}`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Clock className="w-3 h-3 text-gray-500" />
                              <div className="text-xs font-medium text-gray-600">
                                {apt.startTime}
                              </div>
                              {apt.isPomodoro && (
                                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                              )}
                            </div>
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {apt.title}
                            </div>
                            {apt.description && (
                              <div className="text-xs text-gray-500 truncate mt-1">
                                {apt.description}
                              </div>
                            )}
                            {apt.company && (
                              <div className="flex items-center gap-1 mt-1">
                                <Building className="w-3 h-3 text-gray-500" />
                                <div className="text-xs text-gray-600 truncate">
                                  {apt.company}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                  </div>

                  {/* After Hours Slot (18:00+) */}
                  <div className="bg-purple-50 rounded-lg p-3 min-h-[80px] md:min-h-[120px] border border-purple-200">
                    <div className="text-xs text-purple-600 font-medium mb-2">18:00+</div>
                    {dayAppointments
                      .filter((apt: any) => {
                        const hour = parseInt(apt.startTime.split(':')[0]);
                        return hour >= 18;
                      })
                      .map((apt: any) => {
                        const status = getStatusForAppointment(apt);
                        return (
                          <div
                            key={apt.id}
                            className={cn(
                              "mb-2 p-2 rounded-lg border-l-4 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer",
                              {
                                "border-l-green-500": status === 'completed',
                                "border-l-red-500": status === 'delayed',
                                "border-l-blue-500": status === 'future',
                                "border-l-gray-400": status === 'pomodoro',
                              }
                            )}
                            title={`${apt.startTime} - ${apt.title} (Encaixe)`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Clock className="w-3 h-3 text-purple-500" />
                              <div className="text-xs font-medium text-purple-600">
                                {apt.startTime}
                              </div>
                              <div className="text-xs text-purple-500 bg-purple-100 px-1 rounded">
                                Encaixe
                              </div>
                            </div>
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {apt.title}
                            </div>
                            {apt.description && (
                              <div className="text-xs text-gray-500 truncate mt-1">
                                {apt.description}
                              </div>
                            )}
                          </div>
                        );
                      })}

                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
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
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'day' && renderDayView()}
      </CardContent>
    </Card>
  );
}
