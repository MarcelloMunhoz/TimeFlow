import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";

interface ProjectNotification {
  id: number;
  projectName: string;
  type: 'deadline_risk' | 'overdue' | 'phase_delayed' | 'progress_slow';
  severity: 'low' | 'medium' | 'high';
  message: string;
  daysRemaining?: number;
  progressPercentage?: number;
  riskLevel?: string;
}

interface NotificationSettings {
  enabled: boolean;
  checkIntervalMinutes: number;
  showToastNotifications: boolean;
  onNotificationsReceived?: (notifications: ProjectNotification[]) => void;
}

export function useProjectNotifications(settings: NotificationSettings = {
  enabled: true,
  checkIntervalMinutes: 30,
  showToastNotifications: true
}) {
  const [notifications, setNotifications] = useState<ProjectNotification[]>([]);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const { toast } = useToast();

  // Fetch all active projects
  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/projects");
      return response.json();
    },
    enabled: settings.enabled,
    refetchInterval: settings.checkIntervalMinutes * 60 * 1000, // Convert to milliseconds
  });

  // Check for project notifications
  const checkProjectNotifications = async () => {
    if (!settings.enabled || projects.length === 0) return;

    console.log("🔔 Checking project notifications...");
    const newNotifications: ProjectNotification[] = [];

    for (const project of projects) {
      if (project.status !== 'active') continue;

      try {
        // Get deadline status for each active project
        const response = await apiRequest("GET", `/api/projects/${project.id}/deadline-status`);
        const deadlineStatus = await response.json();

        // Check for deadline risks
        if (deadlineStatus.status === 'overdue') {
          newNotifications.push({
            id: project.id,
            projectName: project.name,
            type: 'overdue',
            severity: 'high',
            message: `Projeto "${project.name}" está atrasado! ${Math.abs(deadlineStatus.daysRemaining)} dias além do prazo.`,
            daysRemaining: deadlineStatus.daysRemaining,
            progressPercentage: deadlineStatus.progressPercentage,
            riskLevel: deadlineStatus.riskLevel
          });
        } else if (deadlineStatus.status === 'at_risk') {
          const severity = deadlineStatus.daysRemaining <= 3 ? 'high' : 
                          deadlineStatus.daysRemaining <= 7 ? 'medium' : 'low';
          
          newNotifications.push({
            id: project.id,
            projectName: project.name,
            type: 'deadline_risk',
            severity,
            message: `Projeto "${project.name}" em risco de atraso! ${deadlineStatus.daysRemaining} dias restantes.`,
            daysRemaining: deadlineStatus.daysRemaining,
            progressPercentage: deadlineStatus.progressPercentage,
            riskLevel: deadlineStatus.riskLevel
          });
        }

        // Check for slow progress
        if (deadlineStatus.progressPercentage < 30 && deadlineStatus.daysRemaining <= 14) {
          newNotifications.push({
            id: project.id,
            projectName: project.name,
            type: 'progress_slow',
            severity: 'medium',
            message: `Projeto "${project.name}" com progresso lento: ${deadlineStatus.progressPercentage.toFixed(1)}% concluído.`,
            daysRemaining: deadlineStatus.daysRemaining,
            progressPercentage: deadlineStatus.progressPercentage,
            riskLevel: deadlineStatus.riskLevel
          });
        }

      } catch (error) {
        console.error(`Error checking notifications for project ${project.id}:`, error);
      }
    }

    // Update notifications state
    setNotifications(newNotifications);
    setLastCheck(new Date());

    // Show toast notifications for high severity issues
    if (settings.showToastNotifications) {
      const highSeverityNotifications = newNotifications.filter(n => n.severity === 'high');
      
      for (const notification of highSeverityNotifications) {
        toast({
          title: "⚠️ Alerta de Projeto",
          description: notification.message,
          variant: "destructive",
        });
      }

      const mediumSeverityNotifications = newNotifications.filter(n => n.severity === 'medium');
      
      if (mediumSeverityNotifications.length > 0) {
        toast({
          title: "📋 Atenção aos Projetos",
          description: `${mediumSeverityNotifications.length} projeto(s) requerem atenção.`,
          variant: "default",
        });
      }
    }

    // Call callback if provided
    if (settings.onNotificationsReceived) {
      settings.onNotificationsReceived(newNotifications);
    }

    console.log(`🔔 Found ${newNotifications.length} project notifications`);
  };

  // Effect to check notifications periodically
  useEffect(() => {
    if (!settings.enabled) return;

    // Initial check
    checkProjectNotifications();

    // Set up interval for periodic checks
    const interval = setInterval(
      checkProjectNotifications,
      settings.checkIntervalMinutes * 60 * 1000
    );

    return () => clearInterval(interval);
  }, [projects, settings.enabled, settings.checkIntervalMinutes]);

  // Manual check function
  const manualCheck = async () => {
    await checkProjectNotifications();
  };

  // Get notifications by severity
  const getNotificationsBySeverity = (severity: 'low' | 'medium' | 'high') => {
    return notifications.filter(n => n.severity === severity);
  };

  // Get notifications by type
  const getNotificationsByType = (type: ProjectNotification['type']) => {
    return notifications.filter(n => n.type === type);
  };

  // Clear all notifications
  const clearNotifications = () => {
    setNotifications([]);
  };

  // Clear specific notification
  const clearNotification = (projectId: number) => {
    setNotifications(prev => prev.filter(n => n.id !== projectId));
  };

  return {
    notifications,
    lastCheck,
    manualCheck,
    getNotificationsBySeverity,
    getNotificationsByType,
    clearNotifications,
    clearNotification,
    hasHighSeverityNotifications: notifications.some(n => n.severity === 'high'),
    hasMediumSeverityNotifications: notifications.some(n => n.severity === 'medium'),
    totalNotifications: notifications.length,
  };
}
