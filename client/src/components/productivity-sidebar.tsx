import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Clock, AlertTriangle, TrendingUp, Filter, Calendar, BarChart3 } from "lucide-react";

interface ProductivityStats {
  todayCompleted: number;
  scheduledHoursToday: string;
  slaExpired: number;
  slaCompliance: number;
  rescheduled: number;
  pomodorosToday: number;
  nextTask?: string;
}

interface ProductivitySidebarProps {
  onFilterChange: (filters: any) => void;
}

export default function ProductivitySidebar({ onFilterChange }: ProductivitySidebarProps) {
  const { data: stats } = useQuery<ProductivityStats>({
    queryKey: ['/api/stats/productivity'],
  });

  const { data: appointments = [] } = useQuery<any[]>({
    queryKey: ['/api/appointments'],
  });

  const handleFilterChange = (field: string, value: string) => {
    onFilterChange({ [field]: value });
  };

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

  // Get unique projects and companies
  const projectSet = new Set(appointments.filter((apt: any) => apt.project && apt.project.trim() !== "").map((apt: any) => apt.project));
  const companySet = new Set(appointments.filter((apt: any) => apt.company && apt.company.trim() !== "").map((apt: any) => apt.company));
  const uniqueProjects = Array.from(projectSet).filter(Boolean);
  const uniqueCompanies = Array.from(companySet).filter(Boolean);

  return (
    <aside className="w-80 bg-white shadow-sm border-r border-gray-200 h-screen sticky top-16 overflow-y-auto">
      <div className="p-6">
        {/* Productivity Dashboard */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo de Produtividade</h2>
          <div className="space-y-4">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Concluídos Hoje</p>
                    <p className="text-2xl font-bold text-green-600">{stats?.todayCompleted || 0}</p>
                  </div>
                  <CheckCircle className="text-green-600 text-2xl w-8 h-8" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Tempo Trabalhado</p>
                    <p className="text-2xl font-bold text-blue-600">{stats?.scheduledHoursToday || "0min"}</p>
                  </div>
                  <Clock className="text-blue-600 text-2xl w-8 h-8" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">SLA Vencidos</p>
                    <p className="text-2xl font-bold text-red-600">{stats?.slaExpired || 0}</p>
                  </div>
                  <AlertTriangle className="text-red-600 text-2xl w-8 h-8" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">% Cumprimento SLA</p>
                    <p className="text-2xl font-bold text-gray-700">{stats?.slaCompliance || 0}%</p>
                  </div>
                  <BarChart3 className="text-gray-600 text-2xl w-8 h-8" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <h3 className="text-md font-medium text-gray-900 mb-3">Filtros</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Período</label>
              <Select onValueChange={(value) => handleFilterChange('period', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Hoje" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Esta Semana</SelectItem>
                  <SelectItem value="month">Este Mês</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Projeto</label>
              <Select onValueChange={(value) => handleFilterChange('project', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os Projetos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Projetos</SelectItem>
                  {uniqueProjects.filter(project => project && project.trim() !== "").map((project) => (
                    <SelectItem key={project} value={project}>{project}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Empresa</label>
              <Select onValueChange={(value) => handleFilterChange('company', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as Empresas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Empresas</SelectItem>
                  {uniqueCompanies.filter(company => company && company.trim() !== "").map((company) => (
                    <SelectItem key={company} value={company}>{company}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status SLA</label>
              <Select onValueChange={(value) => handleFilterChange('slaStatus', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="within">Dentro do SLA</SelectItem>
                  <SelectItem value="expired">SLA Vencido</SelectItem>
                  <SelectItem value="none">Sem SLA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" className="w-full">
              <Filter className="w-4 h-4 mr-2" />
              Aplicar Filtros
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <Card className="bg-gray-50">
          <CardContent className="p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Estatísticas Rápidas</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Reagendamentos:</span>
                <span className="font-medium">{stats?.rescheduled || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pomodoros Hoje:</span>
                <span className="font-medium">{stats?.pomodorosToday || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Próxima Tarefa:</span>
                <span className="font-medium text-blue-600">{stats?.nextTask || getNextTask()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </aside>
  );
}
