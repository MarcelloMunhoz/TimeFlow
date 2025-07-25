import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Check, Clock, Edit, Trash2, AlertTriangle } from "lucide-react";
import { formatDisplayDate, getAppointmentStatus, isSLAExpired } from "@/lib/date-utils";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import AppointmentForm from "./appointment-form";

interface TaskListProps {
  selectedDate: string;
  filters?: any;
}

const STATUS_CONFIG = {
  completed: {
    color: 'bg-green-50 border-green-200',
    dotColor: 'bg-green-500',
    badgeColor: 'bg-green-100 text-green-700',
    icon: Check,
    label: 'Concluído'
  },
  delayed: {
    color: 'bg-red-50 border-red-200',
    dotColor: 'bg-red-500',
    badgeColor: 'bg-red-100 text-red-700',
    icon: AlertTriangle,
    label: 'SLA Vencido'
  },
  future: {
    color: 'bg-white border-gray-200',
    dotColor: 'bg-blue-500',
    badgeColor: 'bg-blue-100 text-blue-700',
    icon: Clock,
    label: 'Agendado'
  },
  pomodoro: {
    color: 'bg-gray-50 border-gray-200',
    dotColor: 'bg-gray-400',
    badgeColor: 'bg-gray-100 text-gray-600',
    icon: Clock,
    label: 'Pomodoro'
  }
};

export default function TaskList({ selectedDate, filters = {} }: TaskListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");

  const { data: allAppointments = [], isLoading } = useQuery({
    queryKey: ['/api/appointments/date', selectedDate],
  });

  // Apply filters to appointments
  const appointments = allAppointments.filter((appointment: any) => {
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
      return apiRequest('DELETE', `/api/appointments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments/date', selectedDate] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/productivity'] });
      toast({ title: "Tarefa excluída com sucesso!" });
    },
    onError: (error: any) => {
      console.error("Erro ao excluir tarefa:", error);
      toast({ title: "Erro ao excluir tarefa", variant: "destructive" });
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
      <Card>
        <CardHeader>
          <CardTitle>Carregando...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">
          Agendamentos de {formatDisplayDate(selectedDate)}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {appointments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nenhum agendamento para esta data
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
                  "flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50",
                  config.color
                )}
              >
                <div className="flex-shrink-0 mt-1">
                  <div className={cn("w-3 h-3 rounded-full", config.dotColor)} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {appointment.title}
                          {appointment.company && ` - ${appointment.company}`}
                        </p>
                        <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-1 rounded ml-2">
                          ID: {appointment.id}
                        </span>
                      </div>
                      {appointment.project && (
                        <p className="text-xs text-gray-500 mt-1">
                          Projeto: {appointment.project}
                        </p>
                      )}
                      {appointment.peopleWith && (
                        <p className="text-xs text-gray-500">
                          Com: {appointment.peopleWith}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      {appointment.slaMinutes && (
                        <Badge variant="outline" className={slaExpired ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}>
                          {slaExpired ? 'SLA Vencido' : `SLA: ${Math.round(appointment.slaMinutes / 60)}h`}
                        </Badge>
                      )}
                      
                      <div className="flex space-x-1">
                        {appointment.status !== 'completed' && !appointment.isPomodoro && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="p-1 h-6 w-6"
                            onClick={() => {
                              console.log("Marcando como concluído:", appointment.id);
                              completeTaskMutation.mutate(appointment.id);
                            }}
                            disabled={completeTaskMutation.isPending}
                            title="Marcar como concluído"
                          >
                            <Check className="w-3 h-3 text-green-600" />
                          </Button>
                        )}
                        
                        {appointment.status === 'scheduled' && !appointment.isPomodoro && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="p-1 h-6 w-6"
                            onClick={() => handleReschedule(appointment)}
                            disabled={rescheduleTaskMutation.isPending}
                            title="Reagendar"
                          >
                            <Clock className="w-3 h-3 text-gray-600" />
                          </Button>
                        )}
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          className="p-1 h-6 w-6"
                          onClick={() => handleEdit(appointment)}
                          title="Editar"
                        >
                          <Edit className="w-3 h-3 text-gray-600" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          className="p-1 h-6 w-6"
                          onClick={() => {
                            console.log("Excluindo:", appointment.id);
                            deleteTaskMutation.mutate(appointment.id);
                          }}
                          disabled={deleteTaskMutation.isPending}
                          title="Excluir"
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    <span>
                      <Clock className="w-3 h-3 inline mr-1" />
                      {appointment.startTime} - {appointment.endTime}
                    </span>
                    <span>
                      ⏱️ {Math.round(appointment.durationMinutes / 60 * 10) / 10}h
                    </span>
                    <Badge variant={status === 'completed' ? 'default' : 'secondary'} className={config.badgeColor}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {config.label}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
      
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
