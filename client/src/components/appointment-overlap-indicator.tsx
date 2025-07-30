import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Layers, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateEndTime } from '@/lib/date-utils';

interface AppointmentOverlapIndicatorProps {
  appointment: any;
  overlappingAppointments: any[];
  className?: string;
}

export default function AppointmentOverlapIndicator({
  appointment,
  overlappingAppointments,
  className
}: AppointmentOverlapIndicatorProps) {
  if (overlappingAppointments.length === 0) {
    return null;
  }

  const endTime = calculateEndTime(appointment.startTime, appointment.durationMinutes);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="secondary" 
            className={cn(
              "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200 cursor-help",
              className
            )}
          >
            <Layers className="w-3 h-3 mr-1" />
            Encaixe ({overlappingAppointments.length})
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <div className="space-y-2">
            <div className="font-medium text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Agendamentos Sobrepostos
            </div>
            
            <div className="text-xs text-gray-600 mb-2">
              Este agendamento se sobrepõe com {overlappingAppointments.length} outro(s):
            </div>
            
            <div className="space-y-1">
              {overlappingAppointments.slice(0, 3).map((overlapping, index) => {
                const overlappingEndTime = calculateEndTime(overlapping.startTime, overlapping.durationMinutes);
                
                return (
                  <div key={overlapping.id || index} className="bg-gray-50 rounded p-2 text-xs">
                    <div className="font-medium text-gray-800 mb-1">
                      {overlapping.title}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-3 h-3" />
                      <span>{overlapping.startTime} - {overlappingEndTime}</span>
                      <span>({overlapping.durationMinutes}min)</span>
                    </div>
                  </div>
                );
              })}
              
              {overlappingAppointments.length > 3 && (
                <div className="text-xs text-gray-500 text-center py-1">
                  +{overlappingAppointments.length - 3} mais...
                </div>
              )}
            </div>
            
            <div className="text-xs text-amber-700 bg-amber-50 rounded p-2 mt-2">
              💡 Dica: Verifique se ambos os agendamentos podem ser cumpridos no mesmo período.
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Hook to detect overlapping appointments
export function useAppointmentOverlaps(appointments: any[]) {
  const getOverlappingAppointments = (targetAppointment: any): any[] => {
    const targetStart = timeToMinutes(targetAppointment.startTime);
    const targetEnd = targetStart + targetAppointment.durationMinutes;

    return appointments.filter(apt => {
      // Don't compare with itself
      if (apt.id === targetAppointment.id) return false;
      
      // Only check appointments on the same date
      if (apt.date !== targetAppointment.date) return false;
      
      // Don't consider cancelled appointments
      if (apt.status === 'cancelled') return false;

      const aptStart = timeToMinutes(apt.startTime);
      const aptEnd = aptStart + apt.durationMinutes;

      // Check for overlap: appointments overlap if one starts before the other ends
      return (targetStart < aptEnd && targetEnd > aptStart);
    });
  };

  const appointmentsWithOverlaps = appointments.map(appointment => ({
    ...appointment,
    overlappingAppointments: getOverlappingAppointments(appointment)
  }));

  return {
    appointmentsWithOverlaps,
    getOverlappingAppointments,
    hasAnyOverlaps: appointmentsWithOverlaps.some(apt => apt.overlappingAppointments.length > 0)
  };
}

// Helper function to convert time string to minutes since midnight
function timeToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}
