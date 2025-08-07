import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Clock, AlertTriangle, List, Calendar, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusFilter = 'all' | 'open' | 'completed';
export type TimeFilter = 'day' | 'week' | 'month';

interface AppointmentStatusFilterProps {
  statusFilter: StatusFilter;
  timeFilter: TimeFilter;
  onStatusFilterChange: (filter: StatusFilter) => void;
  onTimeFilterChange: (filter: TimeFilter) => void;
  appointmentCounts?: {
    all: number;
    open: number;
    completed: number;
  };
  className?: string;
}

const STATUS_FILTER_CONFIG = {
  all: {
    label: 'Todos',
    icon: List,
    color: 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600',
    activeColor: 'bg-gray-600 text-white',
    description: 'Todos os agendamentos'
  },
  open: {
    label: 'Pendentes',
    icon: Clock,
    color: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
    activeColor: 'bg-blue-600 text-white',
    description: 'Agendamentos não concluídos'
  },
  completed: {
    label: 'Concluídos',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-700 hover:bg-green-200',
    activeColor: 'bg-green-600 text-white',
    description: 'Agendamentos finalizados'
  }
};

const TIME_FILTER_CONFIG = {
  day: {
    label: 'Dia',
    description: 'Agendamentos do dia atual'
  },
  week: {
    label: 'Semana',
    description: 'Agendamentos da semana atual'
  },
  month: {
    label: 'Mês',
    description: 'Agendamentos do mês atual'
  }
};

export default function AppointmentStatusFilter({
  statusFilter,
  timeFilter,
  onStatusFilterChange,
  onTimeFilterChange,
  appointmentCounts,
  className
}: AppointmentStatusFilterProps) {
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Desktop Filter Controls */}
      <div className="hidden md:flex items-center justify-between">
        {/* Status Filter Buttons */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Status:</span>
          {Object.entries(STATUS_FILTER_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            const isActive = statusFilter === key;
            const count = appointmentCounts?.[key as keyof typeof appointmentCounts] || 0;
            
            return (
              <Button
                key={key}
                variant="outline"
                size="sm"
                onClick={() => onStatusFilterChange(key as StatusFilter)}
                className={cn(
                  "transition-all duration-200",
                  isActive ? config.activeColor : config.color
                )}
                title={config.description}
              >
                <Icon className="w-4 h-4 mr-2" />
                {config.label}
                {appointmentCounts && (
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "ml-2 text-xs",
                      isActive ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300"
                    )}
                  >
                    {count}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>

        {/* Time Period Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Período:</span>
          <Select value={timeFilter} onValueChange={onTimeFilterChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TIME_FILTER_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    {config.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Mobile Filter Controls */}
      <div className="md:hidden">
        <Button
          variant="outline"
          onClick={() => setShowMobileFilter(!showMobileFilter)}
          className="w-full justify-between"
        >
          <div className="flex items-center">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </div>
          <Badge variant="secondary" className="ml-2">
            {STATUS_FILTER_CONFIG[statusFilter].label} • {TIME_FILTER_CONFIG[timeFilter].label}
          </Badge>
        </Button>

        {showMobileFilter && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
            {/* Mobile Status Filter */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Status</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(STATUS_FILTER_CONFIG).map(([key, config]) => {
                  const Icon = config.icon;
                  const isActive = statusFilter === key;
                  const count = appointmentCounts?.[key as keyof typeof appointmentCounts] || 0;
                  
                  return (
                    <Button
                      key={key}
                      variant="outline"
                      size="sm"
                      onClick={() => onStatusFilterChange(key as StatusFilter)}
                      className={cn(
                        "flex-col h-auto py-3 transition-all duration-200",
                        isActive ? config.activeColor : config.color
                      )}
                    >
                      <Icon className="w-4 h-4 mb-1" />
                      <span className="text-xs">{config.label}</span>
                      {appointmentCounts && (
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            "mt-1 text-xs",
                            isActive ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300"
                          )}
                        >
                          {count}
                        </Badge>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Mobile Time Filter */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Período</label>
              <Select value={timeFilter} onValueChange={onTimeFilterChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIME_FILTER_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Filter Summary */}
      {appointmentCounts && (
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 px-4 py-2 rounded-lg">
          <span>
            Mostrando <strong>{appointmentCounts[statusFilter]}</strong> agendamentos 
            {statusFilter !== 'all' && ` ${STATUS_FILTER_CONFIG[statusFilter].label.toLowerCase()}`}
            {' '}para {TIME_FILTER_CONFIG[timeFilter].label.toLowerCase()}
          </span>
          {statusFilter === 'open' && appointmentCounts.open > 0 && (
            <div className="flex items-center text-amber-600">
              <AlertTriangle className="w-4 h-4 mr-1" />
              <span className="text-xs font-medium">
                {appointmentCounts.open} pendente{appointmentCounts.open !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
