import { useState, useEffect, useRef } from "react";
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
  phaseEfficiency: Array<{
    phaseName: string;
    averageDuration: number;
    plannedDuration: number;
    efficiency: number;
    completedCount: number;
    totalCount: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    displayMonth: string;
    completed: number;
    started: number;
    active: number;
    completionRate: number;
  }>;
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
  const scrollPositionRef = useRef<number>(0);

  // Preserve scroll position when filters change
  useEffect(() => {
    const handleScroll = () => {
      scrollPositionRef.current = window.scrollY;
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Restore scroll position after data updates
  useEffect(() => {
    if (scrollPositionRef.current > 0) {
      const timer = setTimeout(() => {
        window.scrollTo({ top: scrollPositionRef.current, behavior: 'auto' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [filters]);

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
    // Store current scroll position before filter change
    scrollPositionRef.current = window.scrollY;
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    // Store current scroll position before clearing filters
    scrollPositionRef.current = window.scrollY;
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
                <span className="text-sm">🚨 Projetos em Risco:</span>
                <Badge variant={kpis.projectsAtRisk > 0 ? "destructive" : "default"}>
                  {kpis.projectsAtRisk}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">✅ Taxa de Sucesso:</span>
                <Badge variant={kpis.onTimeCompletionRate >= 80 ? "default" : kpis.onTimeCompletionRate >= 60 ? "secondary" : "destructive"}>
                  {kpis.onTimeCompletionRate.toFixed(1)}%
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">📊 Progresso Médio:</span>
                <Badge variant={kpis.averageProgressPercentage >= 70 ? "default" : kpis.averageProgressPercentage >= 50 ? "secondary" : "destructive"}>
                  {kpis.averageProgressPercentage.toFixed(1)}%
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">⏱️ Tempo Médio:</span>
                <span className="font-semibold text-sm">
                  {kpis.averageExecutionTime.toFixed(0)} dias
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">📈 Projetos Ativos:</span>
                <span className="font-semibold text-sm">
                  {activeProjects}
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
            <div className="space-y-4">
              {/* Efficiency Summary */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {kpis.phaseEfficiency.length > 0 ?
                      Math.round(kpis.phaseEfficiency.reduce((acc, phase) => acc + phase.efficiency, 0) / kpis.phaseEfficiency.length) : 0}%
                  </div>
                  <div className="text-sm text-muted-foreground">Eficiência Média</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {kpis.phaseEfficiency.reduce((acc, phase) => acc + phase.completedCount, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Fases Concluídas</div>
                </div>
              </div>

              {/* Chart */}
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={kpis.phaseEfficiency} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <XAxis
                    dataKey="phaseName"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis label={{ value: 'Dias', angle: -90, position: 'insideLeft' }} />
                  <Tooltip
                    formatter={(value, name, props) => [
                      `${value} dias`,
                      name === 'plannedDuration' ? 'Planejado' : 'Real'
                    ]}
                    labelFormatter={(label) => `Fase: ${label}`}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border rounded shadow-lg">
                            <p className="font-semibold">{label}</p>
                            <p className="text-blue-600">Planejado: {data.plannedDuration} dias</p>
                            <p className="text-green-600">Real: {data.averageDuration} dias</p>
                            <p className="text-purple-600">Eficiência: {data.efficiency}%</p>
                            <p className="text-gray-600">Concluídas: {data.completedCount}/{data.totalCount}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="plannedDuration" fill="#3b82f6" name="Planejado" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="averageDuration" fill="#10b981" name="Real" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Tendência Mensal</CardTitle>
            <CardDescription>Projetos iniciados vs. concluídos por mês (últimos 6 meses)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Trend Summary */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {kpis.monthlyTrend.reduce((acc, month) => acc + month.started, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Iniciados</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {kpis.monthlyTrend.reduce((acc, month) => acc + month.completed, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Concluídos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {kpis.monthlyTrend.length > 0 ?
                      Math.round(kpis.monthlyTrend.reduce((acc, month) => acc + month.completionRate, 0) / kpis.monthlyTrend.length) : 0}%
                  </div>
                  <div className="text-sm text-muted-foreground">Taxa Média</div>
                </div>
              </div>

              {/* Chart */}
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={kpis.monthlyTrend} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <XAxis
                    dataKey="displayMonth"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis label={{ value: 'Projetos', angle: -90, position: 'insideLeft' }} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border rounded shadow-lg">
                            <p className="font-semibold">{label}</p>
                            <p className="text-blue-600">Iniciados: {data.started}</p>
                            <p className="text-green-600">Concluídos: {data.completed}</p>
                            <p className="text-orange-600">Ativos: {data.active}</p>
                            <p className="text-purple-600">Taxa de Conclusão: {data.completionRate}%</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="started"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    name="Iniciados"
                  />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    name="Concluídos"
                  />
                  <Line
                    type="monotone"
                    dataKey="active"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#f59e0b', strokeWidth: 2, r: 3 }}
                    name="Ativos"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Project Status Distribution */}
        <Card className="neo-card">
          <CardHeader>
            <CardTitle>Distribuição de Status</CardTitle>
            <CardDescription>Proporção de projetos por status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Status Summary */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-3 rounded-lg neo-inset">
                  <div className="text-2xl font-bold text-green-600">
                    {kpis.completedProjects}
                  </div>
                  <div className="text-sm text-muted-foreground">Concluídos</div>
                  <div className="text-xs text-green-600 font-medium">
                    {kpis.totalProjects > 0 ? Math.round((kpis.completedProjects / kpis.totalProjects) * 100) : 0}%
                  </div>
                </div>
                <div className="text-center p-3 rounded-lg neo-inset">
                  <div className="text-2xl font-bold text-blue-600">
                    {activeProjects}
                  </div>
                  <div className="text-sm text-muted-foreground">Ativos</div>
                  <div className="text-xs text-blue-600 font-medium">
                    {kpis.totalProjects > 0 ? Math.round((activeProjects / kpis.totalProjects) * 100) : 0}%
                  </div>
                </div>
                <div className="text-center p-3 rounded-lg neo-inset">
                  <div className="text-2xl font-bold text-orange-600">
                    {kpis.projectsAtRisk}
                  </div>
                  <div className="text-sm text-muted-foreground">Em Risco</div>
                  <div className="text-xs text-orange-600 font-medium">
                    {kpis.totalProjects > 0 ? Math.round((kpis.projectsAtRisk / kpis.totalProjects) * 100) : 0}%
                  </div>
                </div>
              </div>

              {/* Neomorphic Pie Chart Container */}
              <div className="relative p-6 rounded-2xl neo-inset bg-gradient-to-br from-gray-50 to-gray-100">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <defs>
                      <filter id="neo-shadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="2" dy="2" stdDeviation="3" floodColor="#00000020"/>
                        <feDropShadow dx="-2" dy="-2" stdDeviation="3" floodColor="#ffffff80"/>
                      </filter>
                    </defs>
                    <Pie
                      data={[
                        {
                          name: 'Concluídos',
                          value: kpis.completedProjects,
                          color: '#10b981',
                          percentage: kpis.totalProjects > 0 ? Math.round((kpis.completedProjects / kpis.totalProjects) * 100) : 0
                        },
                        {
                          name: 'Ativos',
                          value: activeProjects,
                          color: '#3b82f6',
                          percentage: kpis.totalProjects > 0 ? Math.round((activeProjects / kpis.totalProjects) * 100) : 0
                        },
                        {
                          name: 'Em Risco',
                          value: kpis.projectsAtRisk,
                          color: '#f59e0b',
                          percentage: kpis.totalProjects > 0 ? Math.round((kpis.projectsAtRisk / kpis.totalProjects) * 100) : 0
                        }
                      ].filter(item => item.value > 0)} // Only show segments with data
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} ${percentage}%`}
                      outerRadius={90}
                      innerRadius={30}
                      fill="#8884d8"
                      dataKey="value"
                      stroke="#ffffff"
                      strokeWidth={3}
                    >
                      {[
                        { name: 'Concluídos', value: kpis.completedProjects, color: '#10b981' },
                        { name: 'Ativos', value: activeProjects, color: '#3b82f6' },
                        { name: 'Em Risco', value: kpis.projectsAtRisk, color: '#f59e0b' }
                      ].filter(item => item.value > 0).map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          filter="url(#neo-shadow)"
                          style={{
                            filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.1)) drop-shadow(-1px -1px 2px rgba(255,255,255,0.8))'
                          }}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-3 border rounded-lg shadow-lg neo-card">
                              <p className="font-semibold">{data.name}</p>
                              <p className="text-sm">Quantidade: {data.value}</p>
                              <p className="text-sm">Percentual: {data.percentage}%</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Performance Geral */}
        <Card className="neo-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <div className="p-2 rounded-lg neo-inset mr-3">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              Performance Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 rounded-lg neo-inset bg-gradient-to-r from-green-50 to-emerald-50">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Taxa de Sucesso:</span>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${kpis.onTimeCompletionRate >= 80 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className={`font-bold text-lg ${kpis.onTimeCompletionRate >= 80 ? 'text-green-600' : 'text-red-600'}`}>
                      {kpis.onTimeCompletionRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-lg neo-inset bg-gradient-to-r from-blue-50 to-cyan-50">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Eficiência:</span>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${kpis.averageProgressPercentage >= 70 ? 'bg-blue-500' : 'bg-yellow-500'}`}></div>
                    <span className={`font-bold text-lg ${kpis.averageProgressPercentage >= 70 ? 'text-blue-600' : 'text-yellow-600'}`}>
                      {kpis.averageProgressPercentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gestão de Tempo */}
        <Card className="neo-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <div className="p-2 rounded-lg neo-inset mr-3">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              Gestão de Tempo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 rounded-lg neo-inset bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Tempo Médio:</span>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span className="font-bold text-lg text-blue-600">
                      {kpis.averageExecutionTime.toFixed(0)} dias
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-lg neo-inset bg-gradient-to-r from-emerald-50 to-green-50">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">No Prazo:</span>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${kpis.onTimeCompletionRate >= 80 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className={`font-bold text-lg ${kpis.onTimeCompletionRate >= 80 ? 'text-green-600' : 'text-red-600'}`}>
                      {kpis.onTimeCompletionRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gestão de Riscos */}
        <Card className="neo-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <div className="p-2 rounded-lg neo-inset mr-3">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              Gestão de Riscos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 rounded-lg neo-inset bg-gradient-to-r from-orange-50 to-amber-50">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Projetos em Risco:</span>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${kpis.projectsAtRisk === 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className={`font-bold text-lg ${kpis.projectsAtRisk === 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {kpis.projectsAtRisk}
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-lg neo-inset bg-gradient-to-r from-red-50 to-pink-50">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Taxa de Risco:</span>
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    <span className="font-bold text-lg text-orange-600">
                      {kpis.totalProjects > 0 ? ((kpis.projectsAtRisk / kpis.totalProjects) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
