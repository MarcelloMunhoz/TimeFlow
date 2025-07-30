import { apiRequest } from '@/lib/queryClient';

interface AutoCompletedTask {
  id: number;
  title: string;
  startTime: string;
  durationMinutes: number;
  projectId?: number;
  completedAt: string;
}

interface ProjectProgressUpdate {
  projectId: number;
  totalMinutes: number;
  totalHours: number;
  autoCompletedTasks: number;
}

interface AutoCompletionResult {
  success: boolean;
  autoCompletedTasks: AutoCompletedTask[];
  projectProgressUpdates: ProjectProgressUpdate[];
  message: string;
}

class PomodoroAutoCompletionService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private checkIntervalMinutes = 5; // Check every 5 minutes
  private onTasksCompleted?: (result: AutoCompletionResult) => void;
  private onError?: (error: Error) => void;

  constructor() {
    console.log('🍅 PomodoroAutoCompletionService initialized');
  }

  /**
   * Start the auto-completion service
   */
  start(options?: {
    checkIntervalMinutes?: number;
    onTasksCompleted?: (result: AutoCompletionResult) => void;
    onError?: (error: Error) => void;
  }) {
    if (this.isRunning) {
      console.log('🍅 Auto-completion service is already running');
      return;
    }

    if (options?.checkIntervalMinutes) {
      this.checkIntervalMinutes = options.checkIntervalMinutes;
    }
    
    this.onTasksCompleted = options?.onTasksCompleted;
    this.onError = options?.onError;

    console.log(`🍅 Starting Pomodoro auto-completion service (checking every ${this.checkIntervalMinutes} minutes)`);
    
    // Run initial check
    this.checkAndAutoComplete();
    
    // Set up periodic checks
    this.intervalId = setInterval(() => {
      this.checkAndAutoComplete();
    }, this.checkIntervalMinutes * 60 * 1000); // Convert minutes to milliseconds

    this.isRunning = true;
  }

  /**
   * Stop the auto-completion service
   */
  stop() {
    if (!this.isRunning) {
      console.log('🍅 Auto-completion service is not running');
      return;
    }

    console.log('🍅 Stopping Pomodoro auto-completion service');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
  }

  /**
   * Check for overdue Pomodoro tasks and auto-complete them
   */
  private async checkAndAutoComplete() {
    try {
      const now = new Date();
      console.log(`🍅 Checking for overdue Pomodoro tasks at ${now.toLocaleTimeString()}`);

      const response = await apiRequest('POST', '/api/appointments/auto-complete-pomodoros');
      const result: AutoCompletionResult = await response.json();

      if (result.success && result.autoCompletedTasks.length > 0) {
        console.log(`🎉 Auto-completed ${result.autoCompletedTasks.length} overdue Pomodoro tasks:`);
        result.autoCompletedTasks.forEach(task => {
          console.log(`  ✅ "${task.title}" (${task.durationMinutes} minutes)`);
        });

        if (result.projectProgressUpdates.length > 0) {
          console.log(`📊 Updated progress for ${result.projectProgressUpdates.length} projects:`);
          result.projectProgressUpdates.forEach(update => {
            console.log(`  📈 Project ${update.projectId}: ${update.totalHours}h (${update.autoCompletedTasks} auto-completed tasks)`);
          });
        }

        // Notify callback if provided
        if (this.onTasksCompleted) {
          this.onTasksCompleted(result);
        }
      } else if (result.success) {
        console.log('🍅 No overdue Pomodoro tasks found');
      }
    } catch (error) {
      console.error('❌ Error checking for overdue Pomodoro tasks:', error);
      
      if (this.onError) {
        this.onError(error instanceof Error ? error : new Error('Unknown error'));
      }
    }
  }

  /**
   * Manually trigger a check for overdue Pomodoro tasks
   */
  async manualCheck(): Promise<AutoCompletionResult | null> {
    try {
      console.log('🍅 Manual check for overdue Pomodoro tasks triggered');
      
      const response = await apiRequest('POST', '/api/appointments/auto-complete-pomodoros');
      const result: AutoCompletionResult = await response.json();

      if (result.success && result.autoCompletedTasks.length > 0) {
        console.log(`🎉 Manual check: Auto-completed ${result.autoCompletedTasks.length} overdue Pomodoro tasks`);
      } else if (result.success) {
        console.log('🍅 Manual check: No overdue Pomodoro tasks found');
      }

      return result;
    } catch (error) {
      console.error('❌ Error in manual check for overdue Pomodoro tasks:', error);
      throw error;
    }
  }

  /**
   * Get the current status of the service
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkIntervalMinutes: this.checkIntervalMinutes,
      nextCheckIn: this.intervalId ? this.checkIntervalMinutes : null
    };
  }

  /**
   * Update the check interval (requires restart to take effect)
   */
  setCheckInterval(minutes: number) {
    this.checkIntervalMinutes = minutes;
    console.log(`🍅 Check interval updated to ${minutes} minutes (restart required to take effect)`);
  }
}

// Create a singleton instance
export const pomodoroAutoCompletionService = new PomodoroAutoCompletionService();

// Export the class for testing or custom instances
export { PomodoroAutoCompletionService };

// Export types for use in other components
export type { AutoCompletedTask, ProjectProgressUpdate, AutoCompletionResult };

// Utility function to format auto-completion results for display
export function formatAutoCompletionMessage(result: AutoCompletionResult): string {
  if (!result.success) {
    return 'Erro ao verificar tarefas Pomodoro';
  }

  if (result.autoCompletedTasks.length === 0) {
    return 'Nenhuma tarefa Pomodoro atrasada encontrada';
  }

  const taskCount = result.autoCompletedTasks.length;
  const projectCount = result.projectProgressUpdates.length;
  
  let message = `${taskCount} tarefa${taskCount > 1 ? 's' : ''} Pomodoro concluída${taskCount > 1 ? 's' : ''} automaticamente`;
  
  if (projectCount > 0) {
    message += ` e progresso de ${projectCount} projeto${projectCount > 1 ? 's' : ''} atualizado`;
  }

  return message;
}

// Utility function to check if a Pomodoro task should be auto-completed
export function shouldAutoCompletePomodoro(appointment: any): boolean {
  if (!appointment.isPomodoro || appointment.status === 'completed' || appointment.status === 'cancelled') {
    return false;
  }

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  // Only auto-complete tasks scheduled for today
  if (appointment.date !== today) {
    return false;
  }

  // Calculate if the task's scheduled end time has passed
  const [startHours, startMinutes] = appointment.startTime.split(':').map(Number);
  const startTimeMinutes = startHours * 60 + startMinutes;
  const endTimeMinutes = startTimeMinutes + appointment.durationMinutes;
  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

  return currentTimeMinutes > endTimeMinutes;
}
