import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Bell, BellRing, AlertTriangle, Clock, TrendingDown, X, 
  RefreshCw, CheckCircle, AlertCircle, Info
} from "lucide-react";
import { useProjectNotifications } from "@/hooks/use-project-notifications";
import { cn } from "@/lib/utils";

interface ProjectNotificationsProps {
  className?: string;
  showHeader?: boolean;
  maxHeight?: string;
}

export default function ProjectNotifications({ 
  className, 
  showHeader = true, 
  maxHeight = "400px" 
}: ProjectNotificationsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const {
    notifications,
    lastCheck,
    manualCheck,
    getNotificationsBySeverity,
    clearNotifications,
    clearNotification,
    hasHighSeverityNotifications,
    hasMediumSeverityNotifications,
    totalNotifications,
  } = useProjectNotifications({
    enabled: true,
    checkIntervalMinutes: 15, // Check every 15 minutes
    showToastNotifications: true,
  });

  const getNotificationIcon = (type: string, severity: string) => {
    switch (type) {
      case 'overdue':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'deadline_risk':
        return <Clock className="w-4 h-4 text-orange-600" />;
      case 'progress_slow':
        return <TrendingDown className="w-4 h-4 text-yellow-600" />;
      case 'phase_delayed':
        return <AlertCircle className="w-4 h-4 text-blue-600" />;
      default:
        return <Info className="w-4 h-4 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'Alta';
      case 'medium':
        return 'Média';
      case 'low':
        return 'Baixa';
      default:
        return 'Desconhecida';
    }
  };

  const formatLastCheck = (date: Date | null) => {
    if (!date) return 'Nunca';
    
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Agora mesmo';
    if (diffMinutes < 60) return `${diffMinutes} min atrás`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} dia(s) atrás`;
  };

  const highSeverityNotifications = getNotificationsBySeverity('high');
  const mediumSeverityNotifications = getNotificationsBySeverity('medium');
  const lowSeverityNotifications = getNotificationsBySeverity('low');

  return (
    <Card className={cn("w-full", className)}>
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {totalNotifications > 0 ? (
                <BellRing className="w-5 h-5 text-orange-600" />
              ) : (
                <Bell className="w-5 h-5 text-gray-400" />
              )}
              <CardTitle className="text-lg">Notificações de Projetos</CardTitle>
              {totalNotifications > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {totalNotifications}
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={manualCheck}
                className="text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Atualizar
              </Button>
              {totalNotifications > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearNotifications}
                  className="text-xs"
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Limpar Todas
                </Button>
              )}
            </div>
          </div>
          <CardDescription>
            {totalNotifications > 0 ? (
              <div className="flex items-center space-x-4 text-sm">
                {getNotificationsBySeverity('high').length > 0 && (
                  <span className="text-red-600 font-medium">
                    🚨 {getNotificationsBySeverity('high').length} urgente{getNotificationsBySeverity('high').length > 1 ? 's' : ''}
                  </span>
                )}
                {getNotificationsBySeverity('medium').length > 0 && (
                  <span className="text-orange-600 font-medium">
                    ⚠️ {getNotificationsBySeverity('medium').length} média{getNotificationsBySeverity('medium').length > 1 ? 's' : ''}
                  </span>
                )}
                {getNotificationsBySeverity('low').length > 0 && (
                  <span className="text-blue-600 font-medium">
                    ℹ️ {getNotificationsBySeverity('low').length} baixa{getNotificationsBySeverity('low').length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            ) : (
              `Última verificação: ${formatLastCheck(lastCheck)}`
            )}
          </CardDescription>
        </CardHeader>
      )}
      
      <CardContent>
        {totalNotifications === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              Tudo em ordem!
            </h3>
            <p className="text-gray-500">
              Nenhum projeto requer atenção no momento.
            </p>
          </div>
        ) : (
          <ScrollArea className="w-full" style={{ maxHeight }}>
            <div className="space-y-4">
              {/* High Severity Notifications */}
              {highSeverityNotifications.length > 0 && (
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <h4 className="font-medium text-red-900">Urgente</h4>
                    <Badge variant="destructive" className="text-xs">
                      {highSeverityNotifications.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {highSeverityNotifications.map((notification) => (
                      <div
                        key={`${notification.id}-${notification.type}`}
                        className="flex items-start space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg"
                      >
                        {getNotificationIcon(notification.type, notification.severity)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-red-900">
                            {notification.projectName}
                          </p>
                          <p className="text-xs text-red-700 mt-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge variant={getSeverityColor(notification.severity)} className="text-xs">
                              {getSeverityText(notification.severity)}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {notification.type === 'overdue' && '🚨 Atrasado'}
                              {notification.type === 'deadline_risk' && '⚠️ Risco de Atraso'}
                              {notification.type === 'progress_slow' && '📉 Progresso Lento'}
                              {notification.type === 'phase_delayed' && '⏰ Fase Atrasada'}
                            </Badge>
                            {notification.daysRemaining !== undefined && (
                              <span className="text-xs text-red-600 font-medium">
                                {notification.daysRemaining > 0
                                  ? `${notification.daysRemaining} dias restantes`
                                  : `${Math.abs(notification.daysRemaining)} dias atrasado`
                                }
                              </span>
                            )}
                            {notification.progressPercentage !== undefined && (
                              <span className="text-xs text-red-600">
                                {notification.progressPercentage.toFixed(1)}% concluído
                              </span>
                            )}
                          </div>
                          {/* Action suggestions */}
                          <div className="mt-2 text-xs text-red-600">
                            {notification.type === 'overdue' && '💡 Sugestão: Revisar cronograma e realocar recursos'}
                            {notification.type === 'deadline_risk' && '💡 Sugestão: Acelerar atividades críticas'}
                            {notification.type === 'progress_slow' && '💡 Sugestão: Verificar bloqueios e aumentar dedicação'}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => clearNotification(notification.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Medium Severity Notifications */}
              {mediumSeverityNotifications.length > 0 && (
                <>
                  {highSeverityNotifications.length > 0 && <Separator />}
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                      <h4 className="font-medium text-orange-900">Atenção</h4>
                      <Badge variant="secondary" className="text-xs">
                        {mediumSeverityNotifications.length}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {mediumSeverityNotifications.map((notification) => (
                        <div
                          key={`${notification.id}-${notification.type}`}
                          className="flex items-start space-x-3 p-3 bg-orange-50 border border-orange-200 rounded-lg"
                        >
                          {getNotificationIcon(notification.type, notification.severity)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-orange-900">
                              {notification.projectName}
                            </p>
                            <p className="text-xs text-orange-700 mt-1">
                              {notification.message}
                            </p>
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge variant={getSeverityColor(notification.severity)} className="text-xs">
                                {getSeverityText(notification.severity)}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {notification.type === 'overdue' && '🚨 Atrasado'}
                                {notification.type === 'deadline_risk' && '⚠️ Risco de Atraso'}
                                {notification.type === 'progress_slow' && '📉 Progresso Lento'}
                                {notification.type === 'phase_delayed' && '⏰ Fase Atrasada'}
                              </Badge>
                              {notification.daysRemaining !== undefined && (
                                <span className="text-xs text-orange-600 font-medium">
                                  {notification.daysRemaining > 0
                                    ? `${notification.daysRemaining} dias restantes`
                                    : `${Math.abs(notification.daysRemaining)} dias atrasado`
                                  }
                                </span>
                              )}
                              {notification.progressPercentage !== undefined && (
                                <span className="text-xs text-orange-600">
                                  {notification.progressPercentage.toFixed(1)}% concluído
                                </span>
                              )}
                            </div>
                            {/* Action suggestions */}
                            <div className="mt-2 text-xs text-orange-600">
                              {notification.type === 'overdue' && '💡 Sugestão: Revisar cronograma e realocar recursos'}
                              {notification.type === 'deadline_risk' && '💡 Sugestão: Acelerar atividades críticas'}
                              {notification.type === 'progress_slow' && '💡 Sugestão: Verificar bloqueios e aumentar dedicação'}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => clearNotification(notification.id)}
                            className="text-orange-600 hover:text-orange-800"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Low Severity Notifications */}
              {lowSeverityNotifications.length > 0 && (
                <>
                  {(highSeverityNotifications.length > 0 || mediumSeverityNotifications.length > 0) && <Separator />}
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <Info className="w-4 h-4 text-blue-600" />
                      <h4 className="font-medium text-blue-900">Informativo</h4>
                      <Badge variant="outline" className="text-xs">
                        {lowSeverityNotifications.length}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {lowSeverityNotifications.map((notification) => (
                        <div
                          key={`${notification.id}-${notification.type}`}
                          className="flex items-start space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg"
                        >
                          {getNotificationIcon(notification.type, notification.severity)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-blue-900">
                              {notification.projectName}
                            </p>
                            <p className="text-xs text-blue-700 mt-1">
                              {notification.message}
                            </p>
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge variant={getSeverityColor(notification.severity)} className="text-xs">
                                {getSeverityText(notification.severity)}
                              </Badge>
                              {notification.daysRemaining !== undefined && (
                                <span className="text-xs text-blue-600">
                                  {notification.daysRemaining} dias restantes
                                </span>
                              )}
                              {notification.progressPercentage !== undefined && (
                                <span className="text-xs text-blue-600">
                                  {notification.progressPercentage.toFixed(1)}% concluído
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => clearNotification(notification.id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
