import { useState, useCallback, useMemo } from "react";
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

  // Memoize status filter buttons to prevent re-renders
  const statusFilterButtons = useMemo(() => {
    return Object.entries(STATUS_FILTER_CONFIG).map(([key, config]) => {
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
            "transition-all duration-200 status-filter-stable",
            isActive ? config.activeColor : config.color
          )}
          title={config.description}
        >
          <Icon className="w-4 h-4 mr-2 icon-stable" />
          {config.label}
          {appointmentCounts && (
            <Badge 
              variant="secondary" 
              className="ml-2 bg-white/80 text-gray-700 dark:bg-gray-800/80 dark:text-gray-300 status-badge-stable"
            >
              {count}
            </Badge>
          )}
        </Button>
      );
    });
  }, [statusFilter, appointmentCounts, onStatusFilterChange]);

  // Memoize time filter options to prevent re-renders
  const timeFilterOptions = useMemo(() => {
    return Object.entries(TIME_FILTER_CONFIG).map(([key, config]) => (
      <SelectItem key={key} value={key}>
        {config.label}
      </SelectItem>
    ));
  }, []);

  // Memoize mobile filter toggle to prevent re-renders
  const toggleMobileFilter = useCallback(() => {
    setShowMobileFilter(prev => !prev);
  }, []);

  return (
    <div className={cn("space-y-4 status-filter-stable", className)}>
      {/* Desktop Filter Controls */}
      <div className="hidden md:flex items-center justify-between">
        {/* Status Filter Buttons */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Status:</span>
          {statusFilterButtons}
        </div>

        {/* Time Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Período:</span>
          <Select value={timeFilter} onValueChange={onTimeFilterChange}>
            <SelectTrigger className="w-24 dropdown-stable">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="dropdown-stable">
              {timeFilterOptions}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Mobile Filter Toggle */}
      <div className="md:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleMobileFilter}
          className="w-full flex items-center justify-center space-x-2 action-button-stable"
        >
          <Filter className="w-4 h-4 icon-stable" />
          <span>Filtros</span>
          {appointmentCounts && (
            <Badge variant="secondary" className="ml-auto status-badge-stable">
              {appointmentCounts.all}
            </Badge>
          )}
        </Button>
      </div>

      {/* Mobile Filter Panel */}
      {showMobileFilter && (
        <div className="md:hidden space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg status-filter-stable">
          {/* Status Filters */}
          <div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Status:</span>
            <div className="grid grid-cols-1 gap-2">
              {statusFilterButtons}
            </div>
          </div>

          {/* Time Filter */}
          <div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Período:</span>
            <Select value={timeFilter} onValueChange={onTimeFilterChange}>
              <SelectTrigger className="w-full dropdown-stable">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dropdown-stable">
                {timeFilterOptions}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Summary Text */}
      {appointmentCounts && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {(() => {
            const { all, open, completed } = appointmentCounts;
            const statusText = statusFilter === 'all' ? 'todos' : 
                              statusFilter === 'open' ? 'pendentes' : 'concluídos';
            const timeText = timeFilter === 'day' ? 'dia' : 
                           timeFilter === 'week' ? 'semana' : 'mês';
            
            return `Mostrando ${statusFilter === 'all' ? all : statusFilter === 'open' ? open : completed} agendamentos ${statusText} para ${timeText}`;
          })()}
        </div>
      )}
    </div>
  );
}
