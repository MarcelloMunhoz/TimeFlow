import { useState, useEffect, useCallback, useMemo } from "react";
// Removed ModernCard imports - using direct CSS classes like personalization tab
// Removed Button import - using pattern-aware buttons
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Check, Clock, Edit, Trash2, AlertTriangle, Building2, FolderOpen, User, Repeat, Link, X } from "lucide-react";
import { formatDisplayDate, getAppointmentStatus, isSLAExpired } from "@/lib/date-utils";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import AppointmentForm from "./appointment-form";
import TimerControls from "./timer-controls";
import AppointmentStatusFilter, { StatusFilter, TimeFilter } from "@/components/appointment-status-filter";
import { useAppointmentFilters } from "@/hooks/use-appointment-filters";
import AppointmentOverlapIndicator, { useAppointmentOverlaps } from "@/components/appointment-overlap-indicator";
import { useTheme } from "@/hooks/use-theme";

interface TaskListProps {
  selectedDate: string;
  filters?: any;
  showStatusFilter?: boolean;
  statusFilter?: StatusFilter;
  timeFilter?: TimeFilter;
  onStatusFilterChange?: (filter: StatusFilter) => void;
  onTimeFilterChange?: (filter: TimeFilter) => void;
}

const STATUS_CONFIG = {
  completed: {
    color: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700/50',
    dotColor: 'bg-green-500',
    badgeColor: 'bg-green-100 text-green-700 dark:bg-green-800/30 dark:text-green-300',
    icon: Check,
    label: 'Concluído'
  },
  delayed: {
    color: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700/50',
    dotColor: 'bg-red-500',
    badgeColor: 'bg-red-100 text-red-700 dark:bg-red-800/30 dark:text-red-300',
    icon: AlertTriangle,
    label: 'SLA Vencido'
  },
  future: {
    color: 'bg-white border-gray-200 dark:bg-gray-800/50 dark:border-gray-600/50',
    dotColor: 'bg-blue-500',
    badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-800/30 dark:text-blue-300',
    icon: Clock,
    label: 'Agendado'
  },
  pomodoro: {
    color: 'bg-gray-50 border-gray-200 dark:bg-gray-800/30 dark:border-gray-600/50',
    dotColor: 'bg-gray-400',
    badgeColor: 'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-300',
    icon: Clock,
    label: 'Pomodoro'
  }
};

export default function TaskList({
  selectedDate,
  filters = {},
  showStatusFilter = true,
  statusFilter: externalStatusFilter,
  timeFilter: externalTimeFilter,
  onStatusFilterChange: externalOnStatusFilterChange,
  onTimeFilterChange: externalOnTimeFilterChange
}: TaskListProps) {
  console.log('TaskList - selectedDate:', selectedDate);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // Usar o mesmo padrão exato da aba de personalização
  const { designPattern, getButtonClasses } = useTheme();
  
  // Memoize card classes to prevent re-renders
  const getCardClasses = useCallback(() => {
    if (designPattern === 'neomorphism') {
      return 'neo-card';
    }
    if (designPattern === 'glassmorphism') {
      return 'glass-card';
    }
    return 'bg-theme-secondary border border-gray-200 shadow-sm';
  }, [designPattern]);

  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  
  // Remove forceRender and isEditModalTransitioning to prevent unnecessary re-renders
  // const [forceRender, setForceRender] = useState(0);
  // const [isEditModalTransitioning, setIsEditModalTransitioning] = useState(false);

  // Remove useEffect that was causing re-renders
  // useEffect(() => {
  //   console.log('TaskList - useEffect triggered, selectedDate changed to:', selectedDate);
  //   setForceRender(prev => prev + 1);
  // }, [selectedDate]);

  const { data: allAppointments = [], isLoading } = useQuery({
    queryKey: ['/api/appointments'],
  });

  // Fetch related data for displaying assignment information
  const { data: companies = [] } = useQuery({
    queryKey: ['/api/companies'],
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['/api/projects'],
  });

  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
  });

  // Memoize helper functions to prevent re-creation on every render
  const getCompanyName = useCallback((appointment: any) => {
    console.log('getCompanyName - appointment:', appointment.id, 'companyId:', appointment.companyId, 'company:', appointment.company);
    if (appointment.companyId) {
      const company = (companies as any[]).find((c: any) => c.id === appointment.companyId);
      console.log('Found company:', company);
      return company?.name;
    }
    return appointment.company; // fallback to legacy field
  }, [companies]);

  const getProjectName = useCallback((appointment: any) => {
    console.log('getProjectName - appointment:', appointment.id, 'projectId:', appointment.projectId, 'project:', appointment.project);
    if (appointment.projectId) {
      const project = (projects as any[]).find((p: any) => p.id === appointment.projectId);
      console.log('Found project:', project);
      return project?.name;
    }
    return appointment.project; // fallback to legacy field
  }, [projects]);

  const getAssignedUserName = useCallback((appointment: any) => {
    console.log('getAssignedUserName - appointment:', appointment.id, 'assignedUserId:', appointment.assignedUserId);
    if (appointment.assignedUserId) {
      const user = (users as any[]).find((u: any) => u.id === appointment.assignedUserId);
      console.log('Found user:', user);
      return user?.name;
    }
    return null;
  }, [users]);

  // Use the appointment filters hook
  const {
    filteredAppointments,
    appointmentCounts,
    statusFilter,
    timeFilter,
    setStatusFilter,
    setTimeFilter
  } = useAppointmentFilters({
    appointments: allAppointments as any[],
    selectedDate
  });

  // Use external filter controls if provided, otherwise use internal ones
  const currentStatusFilter = externalStatusFilter || statusFilter;
  const currentTimeFilter = externalTimeFilter || timeFilter;
  const handleStatusFilterChange = externalOnStatusFilterChange || setStatusFilter;
  const handleTimeFilterChange = externalOnTimeFilterChange || setTimeFilter;

  // Detect overlapping appointments
  const { appointmentsWithOverlaps, getOverlappingAppointments } = useAppointmentOverlaps(allAppointments as any[]);

  // Memoize filtered appointments to prevent unnecessary re-filtering
  const appointments = useMemo(() => {
    return filteredAppointments.filter((appointment: any) => {
      // Project filter
      if (filters.project && filters.project !== 'all' && appointment.project !== filters.project) {
        return false;
      }

      // Company filter
      if (filters.company && filters.company !== 'all' && appointment.company !== filters.company) {
        return false;
      }

      // SLA Status filter
      if (filters.slaStatus && filters.slaStatus !== 'all') {
        const slaExpired = isSLAExpired(appointment);
        if (filters.slaStatus === 'within' && (slaExpired || !appointment.slaMinutes)) {
          return false;
        }
        if (filters.slaStatus === 'expired' && !slaExpired) {
          return false;
        }
        if (filters.slaStatus === 'none' && appointment.slaMinutes) {
          return false;
        }
      }

      return true;
    });
  }, [filteredAppointments, filters.project, filters.company, filters.slaStatus]);

  const completeTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('PATCH', `/api/appointments/${id}`, {
        status: 'completed',
        completedAt: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments/date', selectedDate] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/productivity'] });
      toast({ title: "Tarefa concluída com sucesso!" });
    },
    onError: (error: any) => {
      console.error("Erro ao concluir tarefa:", error);
      toast({ title: "Erro ao concluir tarefa", variant: "destructive" });
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log(`🗑️ Frontend: Starting deletion of appointment ${id}`);
      try {
        const response = await apiRequest('DELETE', `/api/appointments/${id}`);
        console.log(`✅ Frontend: Appointment ${id} deleted successfully`);
        return response;
      } catch (error) {
        console.error(`❌ Frontend: Error deleting appointment ${id}:`, error);
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      console.log(`🔄 Frontend: Invalidating queries after deleting appointment ${variables}`);
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments/date', selectedDate] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/productivity'] });
      toast({
        title: "Tarefa excluída com sucesso!",
        description: `A tarefa foi removida permanentemente.`
      });
    },
    onError: (error: any, variables) => {
      console.error(`❌ Frontend: Failed to delete appointment ${variables}:`, error);

      let errorMessage = "Erro ao excluir tarefa";
      let errorDescription = "Ocorreu um erro inesperado. Tente novamente.";

      if (error?.response?.status === 404) {
        errorMessage = "Tarefa não encontrada";
        errorDescription = "A tarefa pode já ter sido excluída.";
      } else if (error?.response?.status === 400) {
        errorMessage = "Dados inválidos";
        errorDescription = "ID da tarefa é inválido.";
      } else if (error?.response?.data?.details) {
        errorDescription = error.response.data.details;
      }

      toast({
        title: errorMessage,
        description: errorDescription,
        variant: "destructive"
      });
    }
  });

  const rescheduleTaskMutation = useMutation({
    mutationFn: async ({ id, date, startTime }: { id: string, date: string, startTime: string }) => {
      return apiRequest('PATCH', `/api/appointments/${id}`, {
        date,
        startTime,
        status: 'scheduled'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments/date', selectedDate] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/productivity'] });
      toast({ title: "Tarefa reagendada com sucesso!" });
      setShowRescheduleModal(false);
      setSelectedAppointment(null);
      setRescheduleDate("");
      setRescheduleTime("");
    },
    onError: (error: any) => {
      console.error("Erro ao reagendar tarefa:", error);
      const message = error?.response?.data?.message || "Erro ao reagendar tarefa";
      toast({ title: message, variant: "destructive" });
    }
  });

  const handleReschedule = useCallback((appointment: any) => {
    setSelectedAppointment(appointment);
    setRescheduleDate(appointment.date);
    setRescheduleTime(appointment.startTime);
    setShowRescheduleModal(true);
  }, []);

  const confirmReschedule = useCallback(() => {
    if (!selectedAppointment || !rescheduleDate || !rescheduleTime) return;
    
    rescheduleTaskMutation.mutate({
      id: selectedAppointment.id,
      date: rescheduleDate,
      startTime: rescheduleTime
    });
  }, [selectedAppointment, rescheduleDate, rescheduleTime, rescheduleTaskMutation]);

  const handleEdit = useCallback((appointment: any) => {
    // Simplified edit handling without transition states
    setSelectedAppointment(appointment);
    setShowEditModal(true);
  }, []);

  const handleEditModalClose = useCallback((open: boolean) => {
    if (!open) {
      setShowEditModal(false);
      // Clear selected appointment after modal closes to prevent stale data
      setTimeout(() => {
        setSelectedAppointment(null);
      }, 100);
    }
  }, []);

  if (isLoading) {
    return (
      <div className={`${getCardClasses()} p-6 rounded-lg`}>
        <div className="text-lg font-semibold text-theme-primary">Carregando...</div>
      </div>
    );
  }

  return (
    <div className={`${getCardClasses()} rounded-lg task-list-stable hover:shadow-lg hover:-translate-y-1`}>
      <div className="p-6 border-b border-theme-muted">
        <h3 className="text-lg font-semibold text-theme-primary">
          Agendamentos
        </h3>
      </div>

      {showStatusFilter && (
        <div className="px-6 pb-4 status-filter-stable">
          <AppointmentStatusFilter
            statusFilter={currentStatusFilter}
            timeFilter={currentTimeFilter}
            onStatusFilterChange={handleStatusFilterChange}
            onTimeFilterChange={handleTimeFilterChange}
            appointmentCounts={appointmentCounts}
          />
        </div>
      )}

      <div className="p-6 space-y-3">
        {appointments.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {currentStatusFilter === 'all' && 'Nenhum agendamento encontrado'}
            {currentStatusFilter === 'open' && 'Nenhum agendamento pendente'}
            {currentStatusFilter === 'completed' && 'Nenhum agendamento concluído'}
            {currentTimeFilter === 'day' && ' para este período'}
            {currentTimeFilter === 'week' && ' para esta semana'}
            {currentTimeFilter === 'month' && ' para este mês'}
          </div>
        ) : (
          appointments.map((appointment: any) => {
            const status = getAppointmentStatus(appointment);
            const config = STATUS_CONFIG[status];
            const StatusIcon = config.icon;
            const slaExpired = isSLAExpired(appointment);

            return (
              <div
                key={appointment.id}
                className={cn(
                  "flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 task-list-stable",
                  config.color
                )}
              >
                <div className="flex-shrink-0 mt-1">
                  <div className={cn("w-3 h-3 rounded-full icon-stable", config.dotColor)} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {appointment.title}
                          </p>
                          {appointment.isRecurring && (
                            <div className="flex items-center gap-1">
                              <Repeat className="w-3 h-3 text-blue-500 icon-stable" />
                              <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                                {appointment.recurrencePattern === 'daily' && 'Diário'}
                                {appointment.recurrencePattern === 'weekly' && 'Semanal'}
                                {appointment.recurrencePattern === 'monthly' && 'Mensal'}
                                {appointment.recurrencePattern === 'yearly' && 'Anual'}
                              </span>
                            </div>
                          )}
                          {appointment.recurringTaskId && !appointment.isRecurringTemplate && (
                            <div className="flex items-center gap-1">
                              <Link className="w-3 h-3 text-green-500 icon-stable" />
                              <span className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded">
                                Instância
                              </span>
                            </div>
                          )}
                          {appointment.wasRescheduledFromWeekend && (
                            <span className="text-xs text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 rounded" title="Reagendado do fim de semana">
                              Reagendado
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded ml-2">
                          ID: {appointment.id}
                        </span>
                      </div>

                      {/* Assignment Information */}
                      <div className="mt-2 space-y-1">
                        {getCompanyName(appointment) && (
                          <div className="flex items-center text-xs text-gray-600 dark:text-gray-300">
                            <Building2 className="w-3 h-3 mr-1 text-blue-500 icon-stable" />
                            <span>{getCompanyName(appointment)}</span>
                          </div>
                        )}
                        {getProjectName(appointment) && (
                          <div className="flex items-center text-xs text-gray-600 dark:text-gray-300">
                            <FolderOpen className="w-3 h-3 mr-1 text-green-500 icon-stable" />
                            <span>{getProjectName(appointment)}</span>
                          </div>
                        )}
                        {getAssignedUserName(appointment) && (
                          <div className="flex items-center text-xs text-gray-600 dark:text-gray-300">
                            <User className="w-3 h-3 mr-1 text-purple-500 icon-stable" />
                            <span>{getAssignedUserName(appointment)}</span>
                          </div>
                        )}
                        {appointment.peopleWith && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Com: {appointment.peopleWith}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      {appointment.slaMinutes && (
                        <Badge variant="outline" className={cn(slaExpired ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700', 'status-badge-stable')}>
                          {slaExpired ? 'SLA Vencido' : `SLA: ${Math.round(appointment.slaMinutes / 60)}h`}
                        </Badge>
                      )}
                      
                      <div className="flex space-x-1">
                        {appointment.status !== 'completed' && !appointment.isPomodoro && (
                          <button
                            className={`${getButtonClasses('secondary')} p-1 h-6 w-6 flex items-center justify-center action-button-stable`}
                            onClick={() => {
                              console.log("Marcando como concluído:", appointment.id);
                              completeTaskMutation.mutate(appointment.id);
                            }}
                            disabled={completeTaskMutation.isPending}
                            title="Marcar como concluído"
                          >
                            <Check className="w-3 h-3 text-green-600 icon-stable" />
                          </button>
                        )}

                        {appointment.status === 'scheduled' && !appointment.isPomodoro && (
                          <button
                            className={`${getButtonClasses('secondary')} p-1 h-6 w-6 flex items-center justify-center action-button-stable`}
                            onClick={() => handleReschedule(appointment)}
                            disabled={rescheduleTaskMutation.isPending}
                            title="Reagendar"
                          >
                            <Clock className="w-3 h-3 text-theme-secondary icon-stable" />
                          </button>
                        )}

                        <button
                          className={`${getButtonClasses('secondary')} p-1 h-6 w-6 flex items-center justify-center action-button-stable`}
                          onClick={() => handleEdit(appointment)}
                          title="Editar"
                        >
                          <Edit className="w-3 h-3 text-theme-secondary icon-stable" />
                        </button>
                        
                        <button
                          className={`${getButtonClasses('secondary')} p-1 h-6 w-6 flex items-center justify-center action-button-stable`}
                          onClick={() => {
                            console.log(`🗑️ User clicked delete for appointment: ${appointment.id} - "${appointment.title}"`);

                            // Handle recurring task deletion
                            if (appointment.recurringTaskId && !appointment.isRecurringTemplate) {
                              // This is a recurring task instance
                              const choice = window.confirm(
                                `Esta é uma instância de tarefa recorrente "${appointment.title}".\n\n` +
                                `Clique OK para excluir apenas esta instância, ou Cancelar para escolher outras opções.`
                              );

                              if (choice) {
                                console.log(`✅ User confirmed deletion of single instance ${appointment.id}`);
                                deleteTaskMutation.mutate(appointment.id);
                              } else {
                                // Show options for recurring task deletion
                                const deleteAll = window.confirm(
                                  `Deseja excluir TODAS as instâncias desta tarefa recorrente?\n\n` +
                                  `OK = Excluir todas as instâncias\n` +
                                  `Cancelar = Não excluir nada`
                                );

                                if (deleteAll) {
                                  console.log(`✅ User confirmed deletion of all recurring instances for ${appointment.id}`);
                                  // Use the recurring deletion endpoint
                                  deleteTaskMutation.mutate(`${appointment.id}?deleteAll=true`);
                                } else {
                                  console.log(`❌ User cancelled deletion of appointment ${appointment.id}`);
                                }
                              }
                            } else {
                              // Regular task or recurring template
                              let confirmMessage = `Tem certeza que deseja excluir a tarefa "${appointment.title}"?\n\nEsta ação não pode ser desfeita.`;

                              if (appointment.isRecurring) {
                                confirmMessage = `Esta é uma tarefa recorrente "${appointment.title}".\n\n` +
                                               `Excluir irá remover TODAS as instâncias desta tarefa recorrente.\n\n` +
                                               `Esta ação não pode ser desfeita.`;
                              }

                              const confirmed = window.confirm(confirmMessage);

                              if (confirmed) {
                                console.log(`✅ User confirmed deletion of appointment ${appointment.id}`);
                                deleteTaskMutation.mutate(appointment.id);
                              } else {
                                console.log(`❌ User cancelled deletion of appointment ${appointment.id}`);
                              }
                            }
                          }}
                          disabled={deleteTaskMutation.isPending}
                          title="Excluir tarefa"
                        >
                          <Trash2 className={`w-3 h-3 ${deleteTaskMutation.isPending ? 'text-gray-400' : 'text-red-500'} icon-stable`} />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>
                        <Clock className="w-3 h-3 inline mr-1 icon-stable" />
                        {appointment.startTime} - {appointment.endTime}
                      </span>
                      <span>
                        ⏱️ {Math.round((appointment.actualTimeMinutes || 0) / 60 * 10) / 10}h
                        <span className="text-gray-400 dark:text-gray-500 text-xs ml-1">
                          / {Math.round(appointment.durationMinutes / 60 * 10) / 10}h
                        </span>
                      </span>
                      <Badge variant={status === 'completed' ? 'default' : 'secondary'} className={cn(config.badgeColor, 'status-badge-stable')}>
                        <StatusIcon className="w-3 h-3 mr-1 icon-stable" />
                        {config.label}
                      </Badge>

                      {/* Show overlap indicator if appointment has overlaps */}
                      <AppointmentOverlapIndicator
                        appointment={appointment}
                        overlappingAppointments={getOverlappingAppointments(appointment)}
                      />
                    </div>

                    {/* Timer Controls */}
                    <div className="ml-auto bg-red-100 dark:bg-red-900/20 p-1 rounded text-xs text-red-700 dark:text-red-300">
                      Timer ID: {appointment.id}
                    </div>
                    <TimerControls
                      appointmentId={appointment.id}
                      compact={true}
                      className="ml-auto timer-controls-stable"
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {/* Reschedule Modal */}
      <Dialog open={showRescheduleModal} onOpenChange={setShowRescheduleModal}>
        <DialogContent className="modal-stable">
          <DialogHeader>
            <DialogTitle>Reagendar Tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reschedule-date">Nova Data</Label>
              <Input
                id="reschedule-date"
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="form-field-stable"
              />
            </div>
            <div>
              <Label htmlFor="reschedule-time">Nova Hora</Label>
              <Input
                id="reschedule-time"
                type="time"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
                className="form-field-stable"
              />
            </div>
            <div className="flex space-x-2 pt-4">
              <button
                className={`${getButtonClasses('outline')} flex items-center justify-center action-button-stable`}
                onClick={() => setShowRescheduleModal(false)}
              >
                Cancelar
              </button>
              <button
                className={`${getButtonClasses('primary')} flex items-center justify-center action-button-stable`}
                onClick={confirmReschedule}
                disabled={rescheduleTaskMutation.isPending || !rescheduleDate || !rescheduleTime}
              >
                {rescheduleTaskMutation.isPending ? "Reagendando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal - ORIGINAL AppointmentForm */}
      {selectedAppointment && (
        <AppointmentForm
          open={showEditModal}
          onOpenChange={handleEditModalClose}
          defaultDate={selectedAppointment.date}
          editingAppointment={selectedAppointment}
        />
      )}
    </div>
  );
}
