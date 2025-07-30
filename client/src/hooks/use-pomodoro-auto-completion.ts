import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { 
  pomodoroAutoCompletionService, 
  formatAutoCompletionMessage,
  type AutoCompletionResult 
} from '@/services/pomodoro-auto-completion';

interface UsePomodoroAutoCompletionOptions {
  enabled?: boolean;
  checkIntervalMinutes?: number;
  showToastNotifications?: boolean;
  onTasksCompleted?: (result: AutoCompletionResult) => void;
}

export function usePomodoroAutoCompletion(options: UsePomodoroAutoCompletionOptions = {}) {
  const {
    enabled = true,
    checkIntervalMinutes = 5,
    showToastNotifications = true,
    onTasksCompleted
  } = options;

  const [isRunning, setIsRunning] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [totalAutoCompleted, setTotalAutoCompleted] = useState(0);
  const [isManualCheckLoading, setIsManualCheckLoading] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Handle auto-completion results
  const handleTasksCompleted = useCallback((result: AutoCompletionResult) => {
    console.log('🍅 Auto-completion result received:', result);
    
    setLastCheck(new Date());
    setTotalAutoCompleted(prev => prev + result.autoCompletedTasks.length);

    // Invalidate relevant queries to refresh the UI
    queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
    queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    queryClient.invalidateQueries({ queryKey: ['/api/stats/productivity'] });

    // Show toast notification if enabled
    if (showToastNotifications && result.autoCompletedTasks.length > 0) {
      toast({
        title: "Tarefas Pomodoro Concluídas",
        description: formatAutoCompletionMessage(result),
        duration: 5000,
      });
    }

    // Call custom callback if provided
    if (onTasksCompleted) {
      onTasksCompleted(result);
    }
  }, [queryClient, toast, showToastNotifications, onTasksCompleted]);

  // Handle errors
  const handleError = useCallback((error: Error) => {
    console.error('🍅 Auto-completion error:', error);
    
    if (showToastNotifications) {
      toast({
        title: "Erro na Auto-Conclusão",
        description: "Erro ao verificar tarefas Pomodoro atrasadas",
        variant: "destructive",
        duration: 3000,
      });
    }
  }, [toast, showToastNotifications]);

  // Start the service
  const startService = useCallback(() => {
    if (isRunning) return;

    console.log('🍅 Starting Pomodoro auto-completion service from hook');
    
    pomodoroAutoCompletionService.start({
      checkIntervalMinutes,
      onTasksCompleted: handleTasksCompleted,
      onError: handleError
    });
    
    setIsRunning(true);
  }, [checkIntervalMinutes, handleTasksCompleted, handleError, isRunning]);

  // Stop the service
  const stopService = useCallback(() => {
    if (!isRunning) return;

    console.log('🍅 Stopping Pomodoro auto-completion service from hook');
    
    pomodoroAutoCompletionService.stop();
    setIsRunning(false);
  }, [isRunning]);

  // Manual check
  const manualCheck = useCallback(async () => {
    if (isManualCheckLoading) return null;

    setIsManualCheckLoading(true);
    
    try {
      console.log('🍅 Triggering manual Pomodoro check from hook');
      
      const result = await pomodoroAutoCompletionService.manualCheck();
      
      if (result) {
        handleTasksCompleted(result);
        
        if (showToastNotifications) {
          toast({
            title: "Verificação Manual Concluída",
            description: formatAutoCompletionMessage(result),
            duration: 3000,
          });
        }
      }
      
      return result;
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Unknown error'));
      return null;
    } finally {
      setIsManualCheckLoading(false);
    }
  }, [isManualCheckLoading, handleTasksCompleted, handleError, showToastNotifications, toast]);

  // Effect to start/stop service based on enabled flag
  useEffect(() => {
    if (enabled && !isRunning) {
      startService();
    } else if (!enabled && isRunning) {
      stopService();
    }

    // Cleanup on unmount
    return () => {
      if (isRunning) {
        stopService();
      }
    };
  }, [enabled, isRunning, startService, stopService]);

  // Get service status
  const getStatus = useCallback(() => {
    return {
      ...pomodoroAutoCompletionService.getStatus(),
      lastCheck,
      totalAutoCompleted,
      isManualCheckLoading
    };
  }, [lastCheck, totalAutoCompleted, isManualCheckLoading]);

  return {
    // State
    isRunning,
    lastCheck,
    totalAutoCompleted,
    isManualCheckLoading,
    
    // Actions
    startService,
    stopService,
    manualCheck,
    getStatus,
    
    // Service instance (for advanced usage)
    service: pomodoroAutoCompletionService
  };
}

// Hook for components that just want to know about auto-completion status
export function usePomodoroAutoCompletionStatus() {
  const [status, setStatus] = useState(pomodoroAutoCompletionService.getStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(pomodoroAutoCompletionService.getStatus());
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, []);

  return status;
}

// Hook for manual control without automatic service management
export function usePomodoroManualCheck() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<AutoCompletionResult | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const manualCheck = useCallback(async (showToast = true) => {
    if (isLoading) return lastResult;

    setIsLoading(true);
    
    try {
      const result = await pomodoroAutoCompletionService.manualCheck();
      
      if (result) {
        setLastResult(result);
        
        // Refresh UI
        queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
        queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
        queryClient.invalidateQueries({ queryKey: ['/api/stats/productivity'] });
        
        if (showToast) {
          toast({
            title: "Verificação Concluída",
            description: formatAutoCompletionMessage(result),
            duration: 3000,
          });
        }
      }
      
      return result;
    } catch (error) {
      console.error('Manual check error:', error);
      
      if (showToast) {
        toast({
          title: "Erro na Verificação",
          description: "Erro ao verificar tarefas Pomodoro",
          variant: "destructive",
          duration: 3000,
        });
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, lastResult, queryClient, toast]);

  return {
    manualCheck,
    isLoading,
    lastResult
  };
}
