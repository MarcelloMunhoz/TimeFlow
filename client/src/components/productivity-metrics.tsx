import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Clock, AlertTriangle, TrendingUp, BarChart3, Target, Zap } from "lucide-react";

interface ProductivityStats {
  todayCompleted: number;
  scheduledHoursToday: number;
  slaExpired: number;
  slaCompliance: number;
  rescheduled: number;
  pomodorosToday: number;
  nextTask?: string;
}

export default function ProductivityMetrics() {
  const { data: stats, isLoading } = useQuery<ProductivityStats>({
    queryKey: ['/api/stats/productivity'],
  });

  const { data: appointments = [] } = useQuery<any[]>({
    queryKey: ['/api/appointments'],
  });

  // Calculate next task
  const getNextTask = () => {
    if (!appointments.length) return "--:--";
    
    const now = new Date();
    
    const upcomingTasks = appointments
      .filter((apt: any) => {
        const taskDate = new Date(`${apt.date}T${apt.startTime}`);
        return taskDate > now && apt.status === 'scheduled' && !apt.isPomodoro;
      })
      .sort((a: any, b: any) => {
        const timeA = new Date(`${a.date}T${a.startTime}`).getTime();
        const timeB = new Date(`${b.date}T${b.startTime}`).getTime();
        return timeA - timeB;
      });
    
    return upcomingTasks.length > 0 ? upcomingTasks[0].startTime : "--:--";
  };

  if (isLoading) {
    return (
      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Resumo de Produtividade</h2>
        <p className="text-gray-600">
          Acompanhe seu desempenho diário e métricas de produtividade em tempo real
        </p>
      </div>

      {/* Main Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-green-50 border-green-200 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Concluídos Hoje</p>
                <p className="text-3xl font-bold text-green-600">{stats?.todayCompleted || 0}</p>
                <p className="text-xs text-green-600 mt-1">tarefas finalizadas</p>
              </div>
              <CheckCircle className="text-green-600 w-8 h-8" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-blue-50 border-blue-200 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Horas Agendadas</p>
                <p className="text-3xl font-bold text-blue-600">{stats?.scheduledHoursToday || 0}h</p>
                <p className="text-xs text-blue-600 mt-1">tempo planejado</p>
              </div>
              <Clock className="text-blue-600 w-8 h-8" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Cumprimento SLA</p>
                <p className="text-3xl font-bold text-purple-600">{stats?.slaCompliance || 100}%</p>
                <p className="text-xs text-purple-600 mt-1">dentro do prazo</p>
              </div>
              <Target className="text-purple-600 w-8 h-8" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-200 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">Pomodoros</p>
                <p className="text-3xl font-bold text-orange-600">{stats?.pomodorosToday || 0}</p>
                <p className="text-xs text-orange-600 mt-1">sessões hoje</p>
              </div>
              <Zap className="text-orange-600 w-8 h-8" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <EnhancedCard
            variant="elevated"
            className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-200/50 hover:shadow-lg transition-all duration-300 group"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-red-700">SLA Vencidos</p>
                <p className="text-3xl font-bold text-red-900">{stats?.slaExpired || 0}</p>
                <p className="text-xs text-red-600">tarefas atrasadas</p>
              </div>
              <div className="p-3 bg-red-200/50 rounded-xl group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </EnhancedCard>
        </Grid>
      </Animated>
    </div>
  );
}
