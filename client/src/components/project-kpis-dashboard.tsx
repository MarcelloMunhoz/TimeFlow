import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Clock, AlertTriangle, CheckCircle, 
  Target, Calendar, Users, BarChart3, RefreshCw, Download
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ProjectNotifications from "@/components/project-notifications";

interface KPIData {
  totalProjects: number;
  completedProjects: number;
  onTimeCompletionRate: number;
  averageExecutionTime: number;
  projectsAtRisk: number;
  averageProgressPercentage: number;
  phaseEfficiency: Array<{ phaseName: string; averageDuration: number; plannedDuration: number }>;
  monthlyTrend: Array<{ month: string; completed: number; started: number }>;
}

interface Filters {
  startDate: string;
  endDate: string;
  companyId: string;
  status: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function ProjectKPIsDashboard() {
  const [filters, setFilters] = useState<Filters>({
    startDate: '',
    endDate: '',
    companyId: 'all',
    status: 'all'
  });
  const { toast } = useToast();

  // Fetch KPIs data
  const { data: kpis, isLoading, refetch } = useQuery<KPIData>({
    queryKey: ["/api/projects/kpis", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.companyId && filters.companyId !== 'all') params.append('companyId', filters.companyId);
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      
      const response = await apiRequest("GET", `/api/projects/kpis?${params.toString()}`);
      return response.json();
    }
  });

  // Fetch companies for filter
  const { data: companies } = useQuery({
    queryKey: ["/api/companies"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/companies");
      return response.json();
    }
  });

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      companyId: 'all',
      status: 'all'
    });
  };

  const exportData = () => {
    if (!kpis) return;
    
    const dataStr = JSON.stringify(kpis, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `project-kpis-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({ title: "Dados exportados com sucesso!" });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Carregando KPIs...</span>
        </div>
      </div>
    );
  }

  if (!kpis) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          Erro ao carregar dados dos KPIs
        </div>
      </div>
    );
  }

  const completionRate = kpis.totalProjects > 0 ? (kpis.completedProjects / kpis.totalProjects) * 100 : 0;
  const activeProjects = kpis.totalProjects - kpis.completedProjects;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard de KPIs</h1>
          <p className="text-gray-600">Métricas de performance e gerenciamento de projetos</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" onClick={exportData}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="start-date">Data Início</Label>
              <Input
                id="start-date"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="end-date">Data Fim</Label>
              <Input
                id="end-date"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="company">Empresa</Label>
              <Select value={filters.companyId} onValueChange={(value) => handleFilterChange('companyId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as empresas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as empresas</SelectItem>
                  {companies?.filter((company: any) => company.id && company.id.toString().trim() !== "").map((company: any) => (
                    <SelectItem key={company.id} value={company.id.toString()}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="paused">Pausado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={clearFilters} className="w-full">
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Projetos</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              {kpis.completedProjects} concluídos, {activeProjects} ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(completionRate)}%</div>
            <p className="text-xs text-muted-foreground">
              {kpis.onTimeCompletionRate.toFixed(1)}% no prazo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.averageExecutionTime.toFixed(0)} dias</div>
            <p className="text-xs text-muted-foreground">
              Tempo médio de execução
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projetos em Risco</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{kpis.projectsAtRisk}</div>
            <p className="text-xs text-muted-foreground">
              Requerem atenção
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Notifications Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ProjectNotifications maxHeight="300px" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resumo de Alertas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Projetos Atrasados:</span>
                <Badge variant="destructive">
                  {kpis.projectsAtRisk}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Taxa de Sucesso:</span>
                <Badge variant={kpis.onTimeCompletionRate >= 80 ? "default" : "secondary"}>
                  {kpis.onTimeCompletionRate.toFixed(1)}%
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Progresso Médio:</span>
                <span className="font-semibold">
                  {kpis.averageProgressPercentage.toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progress Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Progresso Médio dos Projetos</CardTitle>
            <CardDescription>Percentual médio de conclusão dos projetos ativos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Progresso Médio</span>
                <span className="text-2xl font-bold">{kpis.averageProgressPercentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${kpis.averageProgressPercentage}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-semibold text-green-600">{kpis.completedProjects}</div>
                  <div className="text-xs text-gray-500">Concluídos</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-blue-600">{activeProjects}</div>
                  <div className="text-xs text-gray-500">Em Andamento</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-orange-600">{kpis.projectsAtRisk}</div>
                  <div className="text-xs text-gray-500">Em Risco</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Phase Efficiency Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Eficiência por Fase</CardTitle>
            <CardDescription>Tempo real vs. planejado por fase do projeto</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={kpis.phaseEfficiency}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="phaseName" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="plannedDuration" fill="#8884d8" name="Planejado (dias)" />
                <Bar dataKey="averageDuration" fill="#82ca9d" name="Real (dias)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Tendência Mensal</CardTitle>
            <CardDescription>Projetos iniciados vs. concluídos por mês</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={kpis.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="started" stroke="#8884d8" name="Iniciados" />
                <Line type="monotone" dataKey="completed" stroke="#82ca9d" name="Concluídos" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Project Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Status</CardTitle>
            <CardDescription>Proporção de projetos por status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Concluídos', value: kpis.completedProjects, color: '#00C49F' },
                    { name: 'Ativos', value: activeProjects, color: '#0088FE' },
                    { name: 'Em Risco', value: kpis.projectsAtRisk, color: '#FF8042' }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    { name: 'Concluídos', value: kpis.completedProjects, color: '#00C49F' },
                    { name: 'Ativos', value: activeProjects, color: '#0088FE' },
                    { name: 'Em Risco', value: kpis.projectsAtRisk, color: '#FF8042' }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
              Performance Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Taxa de Sucesso:</span>
                <Badge variant={kpis.onTimeCompletionRate >= 80 ? "default" : "destructive"}>
                  {kpis.onTimeCompletionRate.toFixed(1)}%
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Eficiência:</span>
                <Badge variant={kpis.averageProgressPercentage >= 70 ? "default" : "secondary"}>
                  {kpis.averageProgressPercentage.toFixed(1)}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Clock className="w-5 h-5 mr-2 text-blue-600" />
              Gestão de Tempo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Tempo Médio:</span>
                <span className="font-semibold">{kpis.averageExecutionTime.toFixed(0)} dias</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">No Prazo:</span>
                <Badge variant={kpis.onTimeCompletionRate >= 80 ? "default" : "destructive"}>
                  {kpis.onTimeCompletionRate.toFixed(1)}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-orange-600" />
              Gestão de Riscos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Projetos em Risco:</span>
                <Badge variant={kpis.projectsAtRisk === 0 ? "default" : "destructive"}>
                  {kpis.projectsAtRisk}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Taxa de Risco:</span>
                <span className="font-semibold">
                  {kpis.totalProjects > 0 ? ((kpis.projectsAtRisk / kpis.totalProjects) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
