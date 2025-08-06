import { useState } from "react";
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from "@/components/ui/modern-card";
import { ModernButton } from "@/components/ui/modern-button";
import { useQuery } from "@tanstack/react-query";
import { Clock, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Timer, ArrowLeft, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { useTheme } from "@/hooks/use-theme";

interface TimeAnalysisData {
  taskId: number;
  title: string;
  estimatedMinutes: number;
  actualMinutes: number;
  difference: number;
  differencePercentage: number;
  status: string;
  completedAt: string;
  company?: string;
  project?: string;
  date: string;
}

interface TimeAnalysisSummary {
  totalTasks: number;
  totalEstimated: number;
  totalActual: number;
  totalDifference: number;
  averageAccuracy: number;
  tasksOverEstimate: number;
  tasksUnderEstimate: number;
  tasksOnTime: number;
}

export default function TimeAnalysisPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("today");
  const [, setLocation] = useLocation();
  const { getThemeClasses, isGlassmorphism, designPattern } = useTheme();

  // Usar o mesmo padrão exato da aba de personalização
  const getCardClasses = () => {
    if (designPattern === 'neomorphism') {
      return 'neo-card';
    } else if (designPattern === 'glassmorphism') {
      return 'glass-card';
    } else {
      return 'bg-theme-secondary border border-theme-border';
    }
  };

  const { data: appointments = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/appointments'],
  });

  // Process data for time analysis based on selected period
  const processTimeAnalysis = (): { tasks: TimeAnalysisData[], summary: TimeAnalysisSummary } => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    let filteredAppointments = appointments.filter(apt => 
      apt.status === 'completed' && !apt.isPomodoro
    );

    // Filter by selected period
    switch (selectedPeriod) {
      case "today":
        filteredAppointments = filteredAppointments.filter(apt => apt.date === today);
        break;
      case "yesterday":
        filteredAppointments = filteredAppointments.filter(apt => apt.date === yesterday);
        break;
      case "week":
        filteredAppointments = filteredAppointments.filter(apt => apt.date >= weekAgo);
        break;
      case "month":
        filteredAppointments = filteredAppointments.filter(apt => apt.date >= monthAgo);
        break;
      default:
        filteredAppointments = filteredAppointments.filter(apt => apt.date === today);
    }

    const tasks: TimeAnalysisData[] = filteredAppointments.map(apt => {
      const estimated = apt.durationMinutes || 0;
      const actual = apt.actualTimeMinutes || apt.durationMinutes || 0;
      const difference = actual - estimated;
      const differencePercentage = estimated > 0 ? Math.round((difference / estimated) * 100) : 0;

      return {
        taskId: apt.id,
        title: apt.title,
        estimatedMinutes: estimated,
        actualMinutes: actual,
        difference,
        differencePercentage,
        status: apt.status,
        completedAt: apt.completedAt,
        company: apt.company,
        project: apt.project,
        date: apt.date
      };
    });

    const summary: TimeAnalysisSummary = {
      totalTasks: tasks.length,
      totalEstimated: tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0),
      totalActual: tasks.reduce((sum, task) => sum + task.actualMinutes, 0),
      totalDifference: tasks.reduce((sum, task) => sum + task.difference, 0),
      averageAccuracy: tasks.length > 0 ? 
        Math.round(tasks.reduce((sum, task) => sum + Math.abs(task.differencePercentage), 0) / tasks.length) : 0,
      tasksOverEstimate: tasks.filter(task => task.difference > 0).length,
      tasksUnderEstimate: tasks.filter(task => task.difference < 0).length,
      tasksOnTime: tasks.filter(task => task.difference === 0).length
    };

    return { tasks, summary };
  };

  const formatTime = (minutes: number): string => {
    if (minutes === 0) return "0min";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h${mins}min`;
  };

  const formatDifference = (minutes: number): string => {
    const sign = minutes > 0 ? "+" : "";
    return `${sign}${formatTime(Math.abs(minutes))}`;
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case "today": return "Hoje";
      case "yesterday": return "Ontem";
      case "week": return "Últimos 7 dias";
      case "month": return "Últimos 30 dias";
      default: return "Hoje";
    }
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen p-6 ${getThemeClasses().join(' ')}`}>
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-theme-tertiary rounded mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-theme-tertiary rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { tasks, summary } = processTimeAnalysis();

  return (
    <div className={`min-h-screen p-6 ${getThemeClasses().join(' ')}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ModernButton
              variant="outline"
              onClick={() => setLocation('/')}
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              Voltar
            </ModernButton>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Análise de Tempo Detalhada</h1>
              <p className="text-gray-600">
                Comparação completa entre tempo estimado e tempo realmente trabalhado
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-48">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="yesterday">Ontem</SelectItem>
                <SelectItem value="week">Últimos 7 dias</SelectItem>
                <SelectItem value="month">Últimos 30 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Period Info */}
        <Card className={getCardClasses()}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-theme-accent" />
              <span className="font-medium text-theme-primary">
                Analisando: {getPeriodLabel()} • {tasks.length} tarefas concluídas
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className={getCardClasses()}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-theme-secondary font-medium">Total Estimado</p>
                  <p className="text-2xl font-bold text-theme-primary">{formatTime(summary.totalEstimated)}</p>
                </div>
                <Clock className="text-theme-accent w-8 h-8" />
              </div>
            </CardContent>
          </Card>

          <Card className={getCardClasses()}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-theme-secondary font-medium">Total Real</p>
                  <p className="text-2xl font-bold text-theme-primary">{formatTime(summary.totalActual)}</p>
                </div>
                <Timer className="text-theme-accent w-8 h-8" />
              </div>
            </CardContent>
          </Card>

          <Card className={getCardClasses()}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-theme-secondary">
                    Diferença Total
                  </p>
                  <p className="text-2xl font-bold text-theme-primary">
                    {formatDifference(summary.totalDifference)}
                  </p>
                </div>
                {summary.totalDifference >= 0 ?
                  <TrendingUp className="text-theme-accent w-8 h-8" /> :
                  <TrendingDown className="text-theme-accent w-8 h-8" />
                }
              </div>
            </CardContent>
          </Card>

          <Card className={getCardClasses()}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-theme-secondary font-medium">Desvio Médio</p>
                  <p className="text-2xl font-bold text-theme-primary">{summary.averageAccuracy}%</p>
                </div>
                <CheckCircle className="text-theme-accent w-8 h-8" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Accuracy Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className={getCardClasses()}>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm text-theme-secondary font-medium mb-2">Acima do Estimado</p>
                <p className="text-4xl font-bold text-theme-primary">{summary.tasksOverEstimate}</p>
                <p className="text-xs text-theme-tertiary">
                  {summary.totalTasks > 0 ? Math.round((summary.tasksOverEstimate / summary.totalTasks) * 100) : 0}% das tarefas
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className={getCardClasses()}>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm text-theme-secondary font-medium mb-2">No Tempo Certo</p>
                <p className="text-4xl font-bold text-theme-primary">{summary.tasksOnTime}</p>
                <p className="text-xs text-theme-tertiary">
                  {summary.totalTasks > 0 ? Math.round((summary.tasksOnTime / summary.totalTasks) * 100) : 0}% das tarefas
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className={getCardClasses()}>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm text-theme-secondary font-medium mb-2">Abaixo do Estimado</p>
                <p className="text-4xl font-bold text-theme-primary">{summary.tasksUnderEstimate}</p>
                <p className="text-xs text-theme-tertiary">
                  {summary.totalTasks > 0 ? Math.round((summary.tasksUnderEstimate / summary.totalTasks) * 100) : 0}% das tarefas
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Task Analysis */}
        <Card className={getCardClasses()}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Análise Detalhada por Tarefa
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Nenhuma tarefa encontrada</p>
                <p>Não há tarefas concluídas no período selecionado para análise</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tasks.map((task) => (
                  <div key={task.taskId} className="border border-theme-border rounded-lg p-4 hover:bg-theme-tertiary transition-all duration-300 ease-in-out hover:shadow-md hover:-translate-y-0.5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-1">{task.title}</h4>
                        <div className="flex gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {task.date}
                          </Badge>
                          {task.company && (
                            <Badge variant="outline" className="text-xs">
                              {task.company}
                            </Badge>
                          )}
                          {task.project && (
                            <Badge variant="outline" className="text-xs">
                              {task.project}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Badge 
                        variant={task.difference > 0 ? "destructive" : task.difference < 0 ? "default" : "secondary"}
                        className="ml-4"
                      >
                        {task.differencePercentage > 0 ? "+" : ""}{task.differencePercentage}%
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 mb-1">Estimado</p>
                        <p className="font-medium text-blue-600">{formatTime(task.estimatedMinutes)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 mb-1">Real</p>
                        <p className="font-medium text-green-600">{formatTime(task.actualMinutes)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 mb-1">Diferença</p>
                        <p className={`font-medium ${task.difference > 0 ? 'text-red-600' : task.difference < 0 ? 'text-purple-600' : 'text-gray-600'}`}>
                          {formatDifference(task.difference)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 mb-1">Precisão</p>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={Math.max(0, 100 - Math.abs(task.differencePercentage))} 
                            className="flex-1 h-2"
                          />
                          <span className="text-xs font-medium">
                            {Math.max(0, 100 - Math.abs(task.differencePercentage))}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Insights */}
        {tasks.length > 0 && (
          <Card className={getCardClasses()}>
            <CardHeader>
              <CardTitle className="text-theme-primary">Insights da Análise</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-theme-primary mb-3">Resumo do Período</h4>
                  <ul className="space-y-2 text-sm text-theme-secondary">
                    <li>• {summary.totalTasks} tarefas concluídas em {getPeriodLabel().toLowerCase()}</li>
                    <li>• {formatTime(summary.totalEstimated)} estimado vs {formatTime(summary.totalActual)} real</li>
                    <li>• Diferença total: {formatDifference(summary.totalDifference)}</li>
                    <li>• Desvio médio: {summary.averageAccuracy}%</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-theme-primary mb-3">Distribuição de Precisão</h4>
                  <ul className="space-y-2 text-sm text-theme-secondary">
                    <li>• {summary.tasksOverEstimate} tarefas acima do estimado ({Math.round((summary.tasksOverEstimate / summary.totalTasks) * 100)}%)</li>
                    <li>• {summary.tasksOnTime} tarefas no tempo certo ({Math.round((summary.tasksOnTime / summary.totalTasks) * 100)}%)</li>
                    <li>• {summary.tasksUnderEstimate} tarefas abaixo do estimado ({Math.round((summary.tasksUnderEstimate / summary.totalTasks) * 100)}%)</li>
                    <li>• Precisão geral: {Math.round((summary.tasksOnTime / summary.totalTasks) * 100)}%</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
