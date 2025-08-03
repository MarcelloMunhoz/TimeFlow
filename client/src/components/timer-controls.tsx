import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Play, Pause, CheckCircle, Timer } from "lucide-react";

interface TimerStatus {
  timerState: 'stopped' | 'running' | 'paused';
  estimatedMinutes: number;
  actualTimeMinutes: number;
  accumulatedTimeMinutes: number;
  timerStartedAt?: string;
  timerPausedAt?: string;
  status: string;
  completedAt?: string;
}

interface TimerControlsProps {
  appointmentId: number;
  className?: string;
  compact?: boolean;
}

export default function TimerControls({ 
  appointmentId, 
  className,
  compact = false 
}: TimerControlsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: timerStatus, isLoading } = useQuery<TimerStatus>({
    queryKey: [`/api/appointments/${appointmentId}/timer/status`],
    refetchInterval: 5000,
    staleTime: 0, // Always refetch to get fresh data
    gcTime: 0, // Don't cache the results
  });

  console.log(`Timer ${appointmentId} - Status:`, timerStatus);

  const startTimerMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/appointments/${appointmentId}/timer/start`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/appointments/${appointmentId}/timer/status`] });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      toast({
        title: "Cronômetro iniciado",
        description: "O cronômetro foi iniciado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao iniciar cronômetro",
        description: error.message || "Não foi possível iniciar o cronômetro.",
        variant: "destructive",
      });
    },
  });

  const pauseTimerMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/appointments/${appointmentId}/timer/pause`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/appointments/${appointmentId}/timer/status`] });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      toast({
        title: "Cronômetro pausado",
        description: "O cronômetro foi pausado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao pausar cronômetro",
        description: error.message || "Não foi possível pausar o cronômetro.",
        variant: "destructive",
      });
    },
  });

  const resumeTimerMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/appointments/${appointmentId}/timer/resume`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/appointments/${appointmentId}/timer/status`] });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      toast({
        title: "Cronômetro retomado",
        description: "O cronômetro foi retomado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao retomar cronômetro",
        description: error.message || "Não foi possível retomar o cronômetro.",
        variant: "destructive",
      });
    },
  });

  const completeTimerMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/appointments/${appointmentId}/timer/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/appointments/${appointmentId}/timer/status`] });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/productivity'] });
      toast({
        title: "Tarefa concluída",
        description: "A tarefa foi marcada como concluída com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao concluir tarefa",
        description: error.message || "Não foi possível concluir a tarefa.",
        variant: "destructive",
      });
    },
  });

  if (isLoading || !timerStatus) {
    return (
      <div className={cn("flex items-center space-x-2 bg-gray-100 p-1 rounded", className)}>
        <span className="text-xs">Carregando...</span>
      </div>
    );
  }

  const { timerState, estimatedMinutes, actualTimeMinutes, status } = (timerStatus as any) || {};
  const isCompleted = status === 'completed';

  return (
    <div className={cn("flex items-center space-x-2 bg-blue-50 p-1 rounded", className)}>
      <div className="flex items-center space-x-1 text-xs">
        <Timer className="w-3 h-3" />
        <span className="font-mono">
          {Math.floor(actualTimeMinutes / 60)}h {actualTimeMinutes % 60}m
        </span>
        <span className="text-gray-400">
          / {Math.floor(estimatedMinutes / 60)}h {estimatedMinutes % 60}m
        </span>
      </div>
      
      <Badge variant="outline" className="text-xs">
        {isCompleted ? 'Concluída' :
         timerState === 'running' ? 'Rodando' :
         timerState === 'paused' ? 'Pausado' : 'Parado'}
      </Badge>
      
      {!isCompleted && (
        <div className="flex space-x-1">
          {timerState === 'stopped' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => startTimerMutation.mutate()}
              disabled={startTimerMutation.isPending}
              className="h-6 w-6 p-0"
            >
              <Play className="w-3 h-3" />
            </Button>
          )}
          
          {timerState === 'running' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => pauseTimerMutation.mutate()}
              disabled={pauseTimerMutation.isPending}
              className="h-6 w-6 p-0"
            >
              <Pause className="w-3 h-3" />
            </Button>
          )}
          
          {timerState === 'paused' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => resumeTimerMutation.mutate()}
              disabled={resumeTimerMutation.isPending}
              className="h-6 w-6 p-0"
            >
              <Play className="w-3 h-3" />
            </Button>
          )}
          
          {(timerState === 'running' || timerState === 'paused') && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => completeTimerMutation.mutate()}
              disabled={completeTimerMutation.isPending}
              className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
            >
              <CheckCircle className="w-3 h-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
