import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export interface TimerStatus {
  timerState: 'stopped' | 'running' | 'paused';
  estimatedMinutes: number;
  actualTimeMinutes: number;
  accumulatedTimeMinutes: number;
  timerStartedAt?: string;
  timerPausedAt?: string;
  status: string;
  completedAt?: string;
}

export function useTimer(appointmentId: number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(0);

  // Fetch timer status
  const { data: timerStatus, isLoading } = useQuery<TimerStatus>({
    queryKey: [`/api/appointments/${appointmentId}/timer/status`],
    refetchInterval: (data) => {
      // Refetch every second if timer is running
      return data?.timerState === 'running' ? 1000 : false;
    },
  });

  // Update current time display when timer is running
  useEffect(() => {
    if (timerStatus?.timerState === 'running' && timerStatus.timerStartedAt) {
      const interval = setInterval(() => {
        const startTime = new Date(timerStatus.timerStartedAt!);
        const now = new Date();
        const elapsedMinutes = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));
        setCurrentTime((timerStatus.accumulatedTimeMinutes || 0) + elapsedMinutes);
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setCurrentTime(timerStatus?.actualTimeMinutes || 0);
    }
  }, [timerStatus]);

  // Start timer mutation
  const startTimerMutation = useMutation({
    mutationFn: () => apiRequest(`/api/appointments/${appointmentId}/timer/start`, {
      method: 'POST',
    }),
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

  // Pause timer mutation
  const pauseTimerMutation = useMutation({
    mutationFn: () => apiRequest(`/api/appointments/${appointmentId}/timer/pause`, {
      method: 'POST',
    }),
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

  // Resume timer mutation
  const resumeTimerMutation = useMutation({
    mutationFn: () => apiRequest(`/api/appointments/${appointmentId}/timer/resume`, {
      method: 'POST',
    }),
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

  // Complete appointment mutation
  const completeTimerMutation = useMutation({
    mutationFn: () => apiRequest(`/api/appointments/${appointmentId}/timer/complete`, {
      method: 'POST',
    }),
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

  // Helper functions
  const formatTime = useCallback((minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }, []);

  const formatTimeDetailed = useCallback((minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const secs = Math.floor((minutes % 1) * 60);
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const getProgressPercentage = useCallback((): number => {
    if (!timerStatus?.estimatedMinutes) return 0;
    return Math.min((currentTime / timerStatus.estimatedMinutes) * 100, 100);
  }, [currentTime, timerStatus?.estimatedMinutes]);

  const isOvertime = useCallback((): boolean => {
    if (!timerStatus?.estimatedMinutes) return false;
    return currentTime > timerStatus.estimatedMinutes;
  }, [currentTime, timerStatus?.estimatedMinutes]);

  return {
    timerStatus,
    currentTime,
    isLoading,
    startTimer: startTimerMutation.mutate,
    pauseTimer: pauseTimerMutation.mutate,
    resumeTimer: resumeTimerMutation.mutate,
    completeTimer: completeTimerMutation.mutate,
    isStarting: startTimerMutation.isPending,
    isPausing: pauseTimerMutation.isPending,
    isResuming: resumeTimerMutation.isPending,
    isCompleting: completeTimerMutation.isPending,
    formatTime,
    formatTimeDetailed,
    getProgressPercentage,
    isOvertime,
  };
}
