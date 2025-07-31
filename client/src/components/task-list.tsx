import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Check, Clock, Edit, Trash2, AlertTriangle, Building2, FolderOpen, User, Repeat, Link, Play, Pause } from "lucide-react";
import { formatDisplayDate, getAppointmentStatus, isSLAExpired } from "@/lib/date-utils";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import AppointmentForm from "./appointment-form";
import TimerControls from "./timer-controls";
import AppointmentStatusFilter, { StatusFilter, TimeFilter } from "@/components/appointment-status-filter";
import { useAppointmentFilters } from "@/hooks/use-appointment-filters";
import AppointmentOverlapIndicator, { useAppointmentOverlaps } from "@/components/appointment-overlap-indicator";
import {
  SectionTitle,
  EnhancedCard,
  Animated,
  LoadingSkeleton
} from "@/components/ui/design-system";

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
    color: 'bg-gradient-to-r from-green-50 to-green-100/50 border-green-200/50',
    dotColor: 'bg-green-500',
    badgeColor: 'bg-green-100 text-green-700 border border-green-200',
    icon: Check,
    label: 'Concluído',
    iconColor: 'text-green-600'
  },
  delayed: {
    color: 'bg-gradient-to-r from-red-50 to-red-100/50 border-red-200/50',
    dotColor: 'bg-red-500',
    badgeColor: 'bg-red-100 text-red-700 border border-red-200',
    icon: AlertTriangle,
    label: 'SLA Vencido',
    iconColor: 'text-red-600'
  },
  future: {
    color: 'bg-gradient-to-r from-blue-50 to-blue-100/50 border-blue-200/50',
    dotColor: 'bg-blue-500',
    badgeColor: 'bg-blue-100 text-blue-700 border border-blue-200',
    icon: Clock,
    label: 'Agendado',
    iconColor: 'text-blue-600'
  },
  pomodoro: {
    color: 'bg-gradient-to-r from-purple-50 to-purple-100/50 border-purple-200/50',
    dotColor: 'bg-purple-500',
    badgeColor: 'bg-purple-100 text-purple-700 border border-purple-200',
    icon: Clock,
    label: 'Pomodoro',
    iconColor: 'text-purple-600'
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
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [forceRender, setForceRender] = useState(0);

  // Force re-render when selectedDate changes
  useEffect(() => {
    console.log('TaskList - useEffect triggered, selectedDate changed to:', selectedDate);
    setForceRender(prev => prev + 1);
  }, [selectedDate]);

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

  // Helper functions to get related data
  const getCompanyName = (appointment: any) => {
    console.log('getCompanyName - appointment:', appointment.id, 'companyId:', appointment.companyId, 'company:', appointment.company);
    if (appointment.companyId) {
      const company = companies.find((c: any) => c.id === appointment.companyId);
      console.log('Found company:', company);
      return company?.name;
    }
    return appointment.company; // fallback to legacy field
  };

  const getProjectName = (appointment: any) => {
    console.log('getProjectName - appointment:', appointment.id, 'projectId:', appointment.projectId, 'project:', appointment.project);
    if (appointment.projectId) {
      const project = projects.find((p: any) => p.id === appointment.projectId);
      console.log('Found project:', project);
      return project?.name;
    }
    return appointment.project; // fallback to legacy field
  };

  const getAssignedUserName = (appointment: any) => {
    console.log('getAssignedUserName - appointment:', appointment.id, 'assignedUserId:', appointment.assignedUserId);
    if (appointment.assignedUserId) {
      const user = users.find((u: any) => u.id === appointment.assignedUserId);
      console.log('Found user:', user);
      return user?.name;
    }
    return null;
  };

  // Use the appointment filters hook
  const {
    filteredAppointments,
    appointmentCounts,
    statusFilter,
    timeFilter,
    setStatusFilter,
    setTimeFilter
  } = useAppointmentFilters({
    appointments: allAppointments,
    selectedDate
  });

  // Use external filter controls if provided, otherwise use internal ones
  const currentStatusFilter = externalStatusFilter || statusFilter;
  const currentTimeFilter = externalTimeFilter || timeFilter;
  const handleStatusFilterChange = externalOnStatusFilterChange || setStatusFilter;
  const handleTimeFilterChange = externalOnTimeFilterChange || setTimeFilter;

  // Detect overlapping appointments
  const { appointmentsWithOverlaps, getOverlappingAppointments } = useAppointmentOverlaps(allAppointments);

  // Apply legacy filters to the already filtered appointments
  const appointments = filteredAppointments.filter((appointment: any) => {
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

  const handleReschedule = (appointment: any) => {
    setSelectedAppointment(appointment);
    setRescheduleDate(appointment.date);
    setRescheduleTime(appointment.startTime);
    setShowRescheduleModal(true);
  };

  const confirmReschedule = () => {
    if (!selectedAppointment || !rescheduleDate || !rescheduleTime) return;
    
    rescheduleTaskMutation.mutate({
      id: selectedAppointment.id,
      date: rescheduleDate,
      startTime: rescheduleTime
    });
  };

  const handleEdit = (appointment: any) => {
    setSelectedAppointment(appointment);
    setShowEditModal(true);
  };

  if (isLoading) {
    return (
      <EnhancedCard variant="elevated">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <LoadingSkeleton className="h-6 w-32" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <LoadingSkeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </div>
      </EnhancedCard>
    );
  }

  return (
    <EnhancedCard
      key={`task-list-${selectedDate}-${forceRender}`}
      variant="elevated"
      className="overflow-hidden"
    >
      {/* Enhanced Header */}
      <div className="px-6 py-4 border-b border-border/50 bg-muted/20">
        <div className="flex items-center justify-between">
          <SectionTitle className="text-lg">
            Agendamentos
          </SectionTitle>
          <Badge variant="outline" className="bg-background">
            {appointments.length} {appointments.length === 1 ? 'item' : 'itens'}
          </Badge>
        </div>
      </div>

      {showStatusFilter && (
        <div className="px-6 py-4 bg-muted/10 border-b border-border/50">
          <AppointmentStatusFilter
            statusFilter={currentStatusFilter}
            timeFilter={currentTimeFilter}
            onStatusFilterChange={handleStatusFilterChange}
            onTimeFilterChange={handleTimeFilterChange}
            appointmentCounts={appointmentCounts}
          />
        </div>
      )}

      <div className="p-6 space-y-4">
        {appointments.length === 0 ? (
          <Animated animation="fade">
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                <Clock className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                {currentStatusFilter === 'all' && 'Nenhum agendamento encontrado'}
                {currentStatusFilter === 'open' && 'Nenhum agendamento pendente'}
                {currentStatusFilter === 'completed' && 'Nenhum agendamento concluído'}
              </h3>
              <p className="text-muted-foreground">
                {currentTimeFilter === 'day' && 'para este período'}
                {currentTimeFilter === 'week' && 'para esta semana'}
                {currentTimeFilter === 'month' && 'para este mês'}
                {!currentTimeFilter && 'para a data selecionada'}
              </p>
            </div>
          </Animated>
        ) : (
          appointments.map((appointment: any) => {
            const status = getAppointmentStatus(appointment);
            const config = STATUS_CONFIG[status];
            const StatusIcon = config.icon;
            const slaExpired = isSLAExpired(appointment);

            return (
              <Animated key={appointment.id} animation="slide">
                <EnhancedCard
                  variant="interactive"
                  className={cn(
                    "group transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
                    config.color
                  )}
                  padding="md"
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 mt-1">
                      <div className={cn(
                        "w-4 h-4 rounded-full shadow-sm border-2 border-white",
                        config.dotColor
                      )} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <h4 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                                {appointment.title}
                              </h4>
                              {appointment.isRecurring && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  <Repeat className="w-3 h-3 mr-1" />
                                  {appointment.recurrencePattern === 'daily' && 'Diário'}
                                  {appointment.recurrencePattern === 'weekly' && 'Semanal'}
                                  {appointment.recurrencePattern === 'monthly' && 'Mensal'}
                                  {appointment.recurrencePattern === 'yearly' && 'Anual'}
                                </Badge>
                              )}
                              {appointment.recurringTaskId && !appointment.isRecurringTemplate && (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  <Link className="w-3 h-3 mr-1" />
                                  Instância
                                </Badge>
                              )}
                              {appointment.wasRescheduledFromWeekend && (
                                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                  Reagendado
                                </Badge>
                              )}
                            </div>
                            <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border/50 font-mono text-xs">
                              ID: {appointment.id}
                            </Badge>
                          </div>

                          {/* Enhanced Assignment Information */}
                          <div className="flex flex-wrap gap-2">
                            {getCompanyName(appointment) && (
                              <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs">
                                <Building2 className="w-3 h-3" />
                                <span>{getCompanyName(appointment)}</span>
                              </div>
                            )}
                            {getProjectName(appointment) && (
                              <div className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-md text-xs">
                                <FolderOpen className="w-3 h-3" />
                                <span>{getProjectName(appointment)}</span>
                              </div>
                            )}
                            {getAssignedUserName(appointment) && (
                              <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-xs">
                                <User className="w-3 h-3" />
                                <span>{getAssignedUserName(appointment)}</span>
                              </div>
                            )}
                          </div>

                          {appointment.peopleWith && (
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium">Com:</span> {appointment.peopleWith}
                            </p>
                          )}
                      </div>
                    </div>

                        <div className="flex flex-col items-end space-y-3">
                          {/* SLA Badge */}
                          {appointment.slaMinutes && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "transition-colors",
                                slaExpired
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              )}
                            >
                              {slaExpired ? (
                                <>
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  SLA Vencido
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3 mr-1" />
                                  SLA: {Math.round(appointment.slaMinutes / 60)}h
                                </>
                              )}
                            </Badge>
                          )}

                          {/* Enhanced Action Buttons */}
                          <div className="flex items-center gap-1">
                            {appointment.status !== 'completed' && !appointment.isPomodoro && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 hover:bg-green-50 hover:text-green-600 transition-colors"
                                onClick={() => {
                                  console.log("Marcando como concluído:", appointment.id);
                                  completeTaskMutation.mutate(appointment.id);
                                }}
                                disabled={completeTaskMutation.isPending}
                                title="Marcar como concluído"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            )}

                            {appointment.status === 'scheduled' && !appointment.isPomodoro && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                onClick={() => handleReschedule(appointment)}
                                disabled={rescheduleTaskMutation.isPending}
                                title="Reagendar"
                              >
                                <Clock className="w-4 h-4" />
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                              onClick={() => handleEdit(appointment)}
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 transition-colors"
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
                              <Trash2 className={cn(
                                "w-4 h-4 transition-colors",
                                deleteTaskMutation.isPending ? 'text-muted-foreground' : ''
                              )} />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Enhanced Footer Section */}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span className="font-medium">{appointment.startTime} - {appointment.endTime}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>⏱️</span>
                            <span className="font-medium">
                              {Math.round((appointment.actualTimeMinutes || 0) / 60 * 10) / 10}h
                            </span>
                            <span className="text-muted-foreground/60">
                              / {Math.round(appointment.durationMinutes / 60 * 10) / 10}h
                            </span>
                          </div>

                          {/* Status Badge */}
                          <Badge
                            variant={status === 'completed' ? 'default' : 'secondary'}
                            className={cn("transition-colors", config.badgeColor)}
                          >
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {config.label}
                          </Badge>

                          {/* Overlap Indicator */}
                          <AppointmentOverlapIndicator
                            appointment={appointment}
                            overlappingAppointments={getOverlappingAppointments(appointment)}
                          />
                        </div>

                        {/* Timer Controls */}
                        <div className="flex items-center gap-2">
                          <TimerControls
                            appointmentId={appointment.id}
                            compact={true}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </div>
                      </div>
                    </div>
                  </EnhancedCard>
                </Animated>
            );
          })
        )}
      </div>
    </EnhancedCard>
      
      {/* Reschedule Modal */}
      <Dialog open={showRescheduleModal} onOpenChange={setShowRescheduleModal}>
        <DialogContent>
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
              />
            </div>
            <div>
              <Label htmlFor="reschedule-time">Nova Hora</Label>
              <Input
                id="reschedule-time"
                type="time"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
              />
            </div>
            <div className="flex space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowRescheduleModal(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={confirmReschedule}
                disabled={rescheduleTaskMutation.isPending || !rescheduleDate || !rescheduleTime}
              >
                {rescheduleTaskMutation.isPending ? "Reagendando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      {selectedAppointment && (
        <AppointmentForm
          open={showEditModal}
          onOpenChange={setShowEditModal}
          defaultDate={selectedAppointment.date}
          editingAppointment={selectedAppointment}
        />
      )}
    </Card>
  );
}
