import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, AlertTriangle, CheckCircle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConflictCheck, useTimeSlotAvailability } from '@/hooks/use-time-slot-availability';

interface SmartTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  selectedDate: string;
  durationMinutes: number;
  excludeAppointmentId?: number;
  disabled?: boolean;
  className?: string;
  showAvailabilityHints?: boolean;
}

export default function SmartTimePicker({
  value,
  onChange,
  selectedDate,
  durationMinutes,
  excludeAppointmentId,
  disabled = false,
  className,
  showAvailabilityHints = true
}: SmartTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [manualInput, setManualInput] = useState(value);

  // Use the optimized conflict check hook directly
  const currentConflicts = useConflictCheck(selectedDate, value, durationMinutes, excludeAppointmentId);

  // Update manual input when value changes externally
  useEffect(() => {
    setManualInput(value);
  }, [value]);

  // Vou usar o hook useTimeSlotAvailability que já existe e funciona corretamente
  const { timeSlots, availableTimeSlots, isLoading, hasAnyAvailableSlots } = useTimeSlotAvailability({
    selectedDate,
    durationMinutes,
    excludeAppointmentId,
    workingHours: { start: '08:00', end: '18:00' }
  });

  const handleTimeSelect = (time: string) => {
    onChange(time);
    setManualInput(time);
    setIsOpen(false);
  };

  const handleManualInputChange = (inputValue: string) => {
    setManualInput(inputValue);
    // Validate time format and update parent
    if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(inputValue)) {
      onChange(inputValue);
    }
  };

  const handleManualInputBlur = () => {
    // If manual input is invalid, revert to last valid value
    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(manualInput)) {
      setManualInput(value);
    }
  };

  const getTimeSlotIcon = (slot: any) => {
    if (slot.available) {
      return <CheckCircle className="w-3 h-3 text-green-500" />;
    } else {
      return <AlertTriangle className="w-3 h-3 text-red-500" />;
    }
  };

  const getInputIcon = () => {
    if (isLoading) {
      return <Clock className="w-4 h-4 text-gray-400 animate-pulse" />;
    }
    
    if (currentConflicts.hasConflicts) {
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
    }
    
    if (value && !currentConflicts.hasConflicts) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    
    return <Clock className="w-4 h-4 text-gray-400" />;
  };

  // Simple suggested times - next 3 available slots
  const suggestedTimes = useMemo(() => {
    if (!value || !currentConflicts.hasConflicts) return [];

    const currentHour = parseInt(value.split(':')[0]);
    const currentMinute = parseInt(value.split(':')[1]);
    const currentTotalMinutes = currentHour * 60 + currentMinute;

    const suggestions = [];
    for (let i = 30; i <= 120; i += 30) { // Try 30min, 1h, 1.5h, 2h later
      const newTotalMinutes = currentTotalMinutes + i;
      const newHour = Math.floor(newTotalMinutes / 60);
      const newMinute = newTotalMinutes % 60;

      if (newHour < 18) { // Within working hours
        const newTime = `${newHour.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`;
        suggestions.push(newTime);
        if (suggestions.length >= 3) break;
      }
    }
    return suggestions;
  }, [value, currentConflicts.hasConflicts]);

  return (
    <div className={cn("relative", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              type="time"
              value={manualInput}
              onChange={(e) => handleManualInputChange(e.target.value)}
              onBlur={handleManualInputBlur}
              disabled={disabled}
              className={cn(
                "pr-10",
                currentConflicts.hasConflicts && "border-red-300 focus:border-red-500",
                value && !currentConflicts.hasConflicts && "border-green-300 focus:border-green-500"
              )}
              placeholder="Selecionar horário"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              {getInputIcon()}
            </div>
            {showAvailabilityHints && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-8 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled}
              >
                <Zap className="w-3 h-3" />
              </Button>
            )}
          </div>
        </PopoverTrigger>
        
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-4 border-b">
            <h4 className="font-medium text-sm mb-2">Horários Disponíveis</h4>
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span>Disponível</span>
              </div>
              <div className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-red-500" />
                <span>Conflito</span>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
              <Clock className="w-4 h-4 mx-auto mb-2 animate-pulse" />
              Carregando horários...
            </div>
          ) : !hasAnyAvailableSlots ? (
            <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
              <AlertTriangle className="w-4 h-4 mx-auto mb-2 text-amber-500" />
              Nenhum horário disponível para esta data
            </div>
          ) : (
            <ScrollArea className="h-64">
              <div className="p-2">
                {/* Show suggested times first if there are conflicts */}
                {suggestedTimes.length > 0 && (
                  <div className="mb-4">
                    <div className="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded mb-2">
                      Horários Sugeridos
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {suggestedTimes.map((time) => (
                        <Button
                          key={time}
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs border-blue-200 dark:border-blue-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          onClick={() => handleTimeSelect(time)}
                        >
                          {time}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Show all available time slots */}
                <div className="grid grid-cols-4 gap-1">
                  {timeSlots.map((slot) => (
                    <Button
                      key={slot.time}
                      variant={slot.available ? "outline" : "ghost"}
                      size="sm"
                      className={cn(
                        "h-8 text-xs justify-start",
                        slot.available
                          ? "hover:bg-green-50 dark:hover:bg-green-900/20 border-green-200 dark:border-green-700/50"
                          : "opacity-50 cursor-not-allowed text-gray-400 dark:text-gray-600",
                        value === slot.time && "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600"
                      )}
                      onClick={() => slot.available && handleTimeSelect(slot.time)}
                      disabled={!slot.available}
                      title={slot.reason}
                    >
                      <div className="flex items-center gap-1 w-full">
                        {getTimeSlotIcon(slot)}
                        <span className="flex-1">{slot.time}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </ScrollArea>
          )}

          {/* Show conflict details if any */}
          {currentConflicts.hasConflicts && (
            <div className="p-4 border-t bg-red-50">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800 mb-1">
                    Conflito Detectado
                  </p>
                  <p className="text-xs text-red-600 mb-2">
                    {currentConflicts.conflictingAppointments.length} agendamento(s) conflitante(s):
                  </p>
                  <div className="space-y-1">
                    {currentConflicts.conflictingAppointments.slice(0, 2).map((apt, index) => (
                      <div key={index} className="text-xs bg-white dark:bg-gray-800/50 rounded px-2 py-1 border border-red-200 dark:border-red-700/50">
                        <div className="font-medium text-gray-900 dark:text-gray-100">{apt.title}</div>
                        <div className="text-gray-600 dark:text-gray-300">
                          {apt.startTime} - {apt.durationMinutes}min
                        </div>
                      </div>
                    ))}
                    {currentConflicts.conflictingAppointments.length > 2 && (
                      <div className="text-xs text-red-600">
                        +{currentConflicts.conflictingAppointments.length - 2} mais...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Status indicators below the input */}
      {showAvailabilityHints && !isOpen && (
        <div className="mt-1 flex items-center gap-2">
          {currentConflicts.hasConflicts ? (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Conflito
            </Badge>
          ) : value ? (
            <Badge variant="secondary" className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
              <CheckCircle className="w-3 h-3 mr-1" />
              Disponível
            </Badge>
          ) : null}
          
          {availableTimeSlots.length > 0 && (
            <span className="text-xs text-gray-500">
              {availableTimeSlots.length} horários disponíveis
            </span>
          )}
        </div>
      )}
    </div>
  );
}
