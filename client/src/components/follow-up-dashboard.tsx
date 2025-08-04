import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Mail, Send, Settings, FileText, Calendar, TrendingUp, 
  AlertTriangle, CheckCircle, Clock, Users, Download,
  RefreshCw, Eye, Edit
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import EmailSettingsConfig from "./email-settings-config";
import FollowUpSettingsDialog from "./follow-up-settings-dialog";
import FollowUpReportViewer from "./follow-up-report-viewer";

interface FollowUpSettings {
  id: number;
  companyId: number;
  companyName: string;
  enabled: boolean;
  emailFrequency: string;
  sendDay: number;
  sendTime: string;
  recipientEmails: string | null;
  customTemplate: string | null;
  includeBlockedPhases: boolean;
  includeProgressCharts: boolean;
  includeNextSteps: boolean;
  lastSentDate: string | null;
  isActive: boolean;
}

interface FollowUpReport {
  id: number;
  companyId: number;
  companyName: string;
  reportDate: string;
  totalProjects: number;
  completedProjects: number;
  projectsAtRisk: number;
  overallProgress: number;
  emailSent: boolean;
  sentAt: string | null;
  createdAt: string;
  contentJson?: string;
}

export default function FollowUpDashboard() {
  const [selectedCompany, setSelectedCompany] = useState<number | null>(null);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [selectedSettings, setSelectedSettings] = useState<FollowUpSettings | null>(null);
  const [reportViewerOpen, setReportViewerOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch follow-up settings
  const { data: settings = [], isLoading: settingsLoading, error: settingsError } = useQuery({
    queryKey: ["/api/follow-up-settings"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/follow-up-settings");
        const data = await response.json();
        // Ensure data is an array and has valid structure
        return Array.isArray(data) ? data.map(setting => ({
          ...setting,
          enabled: setting.enabled !== undefined ? setting.enabled : true,
          emailFrequency: setting.emailFrequency || 'weekly',
          sendDay: setting.sendDay !== undefined ? setting.sendDay : 1,
          sendTime: setting.sendTime || '08:00',
          isActive: setting.isActive !== undefined ? setting.isActive : true
        })) : [];
      } catch (error) {
        console.error('Error fetching follow-up settings:', error);
        return [];
      }
    },
  });

  // Fetch follow-up reports
  const { data: reports = [], isLoading: reportsLoading, error: reportsError } = useQuery({
    queryKey: ["/api/follow-up-reports"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/follow-up-reports");
        const data = await response.json();
        // Ensure data is an array and has valid structure
        return Array.isArray(data) ? data.map(item => {
          // Handle the complex structure returned by the API
          const report = item.follow_up_reports || item;
          const company = item.companies || {};

          return {
            id: report.id,
            companyId: report.companyId,
            companyName: company.name || 'Empresa não encontrada',
            reportDate: report.reportDate,
            reportPeriodStart: report.reportPeriodStart,
            reportPeriodEnd: report.reportPeriodEnd,
            totalProjects: report.totalProjects || 0,
            completedProjects: report.completedProjects || 0,
            projectsAtRisk: report.projectsAtRisk || 0,
            overallProgress: report.overallProgress || 0,
            emailSent: report.emailSent || false,
            sentAt: report.sentAt,
            createdAt: report.createdAt || new Date().toISOString(),
            contentJson: report.contentJson
          };
        }) : [];
      } catch (error) {
        console.error('Error fetching follow-up reports:', error);
        return [];
      }
    },
  });

  // Generate report mutation
  const generateReportMutation = useMutation({
    mutationFn: async (companyId: number) => {
      const response = await apiRequest("POST", `/api/follow-up-reports/generate/${companyId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/follow-up-reports"] });
      toast({
        title: "Relatório gerado com sucesso!",
        description: "O relatório de follow-up foi gerado e está disponível para visualização.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao gerar relatório",
        description: error.message || "Não foi possível gerar o relatório.",
        variant: "destructive",
      });
    },
  });

  // Send report mutation
  const sendReportMutation = useMutation({
    mutationFn: async (companyId: number) => {
      const response = await apiRequest("POST", `/api/follow-up-reports/send/${companyId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/follow-up-reports"] });
      toast({
        title: "Relatório enviado com sucesso!",
        description: "O relatório de follow-up foi enviado por email.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar relatório",
        description: error.message || "Não foi possível enviar o relatório.",
        variant: "destructive",
      });
    },
  });

  const getFrequencyLabel = (frequency: string) => {
    const labels = {
      weekly: "Semanal",
      biweekly: "Quinzenal",
      monthly: "Mensal"
    };
    return labels[frequency as keyof typeof labels] || frequency;
  };

  const getDayLabel = (day: number) => {
    const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    return days[day] || `Dia ${day}`;
  };

  const getStatusColor = (enabled: boolean) => {
    return enabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800";
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Data não disponível';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Data inválida';
      }
      return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch (error) {
      return 'Data inválida';
    }
  };

  const openSettingsDialog = (setting: FollowUpSettings) => {
    setSelectedSettings(setting);
    setSettingsDialogOpen(true);
  };

  const openReportViewer = (reportId: number) => {
    setSelectedReportId(reportId);
    setReportViewerOpen(true);
  };

  const downloadReport = async (report: FollowUpReport) => {
    try {
      // Parse the content JSON to get the report data
      const reportData = JSON.parse(report.contentJson || '{}');

      // Create a simple text version of the report
      const textContent = `
RELATÓRIO DE ACOMPANHAMENTO - ${report.companyName}
Período: ${formatDate(reportData.reportPeriodStart)} a ${formatDate(reportData.reportPeriodEnd)}
Gerado em: ${formatDate(report.createdAt)}

RESUMO EXECUTIVO:
- Total de Projetos: ${report.totalProjects}
- Projetos Concluídos: ${report.completedProjects}
- Projetos em Risco: ${report.projectsAtRisk}
- Progresso Geral: ${report.overallProgress}%

PROJETOS:
${reportData.projects?.map((project: any) => `
- ${project.name} (${project.progressPercentage}%)
  Status: ${project.status}
  ${project.isAtRisk ? `⚠️ Em Risco: ${project.riskReason}` : ''}

  Próximos Passos:
  ${project.nextSteps?.map((step: string) => `    • ${step}`).join('\n  ') || ''}
`).join('\n') || ''}

PRÓXIMAS AÇÕES:
${reportData.nextSteps?.map((step: string) => `- ${step}`).join('\n') || ''}

---
Relatório gerado automaticamente pelo TimeFlow
Sistema de Gestão de Projetos BI
      `.trim();

      // Create and download the file
      const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = report.createdAt.split('T')[0] || new Date().toISOString().split('T')[0];
      link.download = `follow-up-${report.companyName.replace(/[^a-zA-Z0-9]/g, '-')}-${dateStr}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Download concluído!",
        description: "O relatório foi baixado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o relatório.",
        variant: "destructive",
      });
    }
  };

  // Show error state if there are critical errors
  if (settingsError || reportsError) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Erro ao carregar dados do Follow-up
          </h3>
          <p className="text-gray-600 mb-4">
            Não foi possível carregar as informações do sistema de follow-up.
          </p>
          <Button onClick={() => queryClient.invalidateQueries()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Follow-up de Projetos</h1>
          <p className="text-gray-600 mt-1">
            Gerencie relatórios automáticos de acompanhamento de projetos
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries()}
            disabled={settingsLoading || reportsLoading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Empresas Ativas</p>
                <p className="text-3xl font-bold text-blue-600">
                  {settings.filter((s: FollowUpSettings) => s.enabled).length}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Relatórios Enviados</p>
                <p className="text-3xl font-bold text-green-600">
                  {reports.filter((r: FollowUpReport) => r.emailSent).length}
                </p>
              </div>
              <Mail className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Projetos em Risco</p>
                <p className="text-3xl font-bold text-red-600">
                  {reports.reduce((sum: number, r: FollowUpReport) => sum + (r.projectsAtRisk || 0), 0)}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Progresso Médio</p>
                <p className="text-3xl font-bold text-purple-600">
                  {reports.length > 0
                    ? Math.round(reports.reduce((sum: number, r: FollowUpReport) => sum + (r.overallProgress || 0), 0) / reports.length)
                    : 0}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="settings">Configurações</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
          <TabsTrigger value="email-config">Email</TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Configurações de Follow-up por Empresa
              </CardTitle>
              <CardDescription>
                Configure quais empresas recebem relatórios automáticos e com que frequência
              </CardDescription>
            </CardHeader>
            <CardContent>
              {settingsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  Carregando configurações...
                </div>
              ) : (
                <div className="space-y-4">
                  {settings.map((setting: FollowUpSettings) => (
                    <div
                      key={setting.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-medium text-gray-900">{setting.companyName}</h3>
                          <Badge className={getStatusColor(setting.enabled)}>
                            {setting.enabled ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          <span>{getFrequencyLabel(setting.emailFrequency)}</span>
                          <span className="mx-2">•</span>
                          <span>{getDayLabel(setting.sendDay)} às {setting.sendTime}</span>
                          {setting.lastSentDate && (
                            <>
                              <span className="mx-2">•</span>
                              <span>Último envio: {formatDate(setting.lastSentDate)?.split(' às')[0] || 'Nunca'}</span>
                            </>
                          )}
                        </div>
                        {setting.recipientEmails && (
                          <div className="mt-1 text-sm text-gray-500">
                            Destinatários: {JSON.parse(setting.recipientEmails).length} email(s)
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generateReportMutation.mutate(setting.companyId)}
                          disabled={generateReportMutation.isPending}
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          Gerar
                        </Button>
                        {setting.recipientEmails && (
                          <Button
                            size="sm"
                            onClick={() => sendReportMutation.mutate(setting.companyId)}
                            disabled={sendReportMutation.isPending}
                          >
                            <Send className="w-4 h-4 mr-1" />
                            Enviar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openSettingsDialog(setting)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Histórico de Relatórios
              </CardTitle>
              <CardDescription>
                Visualize todos os relatórios de follow-up gerados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  Carregando relatórios...
                </div>
              ) : (
                <div className="space-y-4">
                  {reports.map((report: FollowUpReport) => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-medium text-gray-900">{report.companyName}</h3>
                          <Badge variant={report.emailSent ? "default" : "secondary"}>
                            {report.emailSent ? "Enviado" : "Pendente"}
                          </Badge>
                          {report.projectsAtRisk > 0 && (
                            <Badge variant="destructive">
                              {report.projectsAtRisk} em risco
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          <span>{formatDate(report.createdAt)}</span>
                          <span className="mx-2">•</span>
                          <span>{report.totalProjects || 0} projetos</span>
                          <span className="mx-2">•</span>
                          <span>{report.overallProgress || 0}% progresso</span>
                          {report.sentAt && (
                            <>
                              <span className="mx-2">•</span>
                              <span>Enviado em {formatDate(report.sentAt)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openReportViewer(report.id)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Visualizar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadReport(report)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Config Tab */}
        <TabsContent value="email-config" className="space-y-6">
          <EmailSettingsConfig />
        </TabsContent>
      </Tabs>

      {/* Settings Dialog */}
      <FollowUpSettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        settings={selectedSettings}
      />

      {/* Report Viewer Dialog */}
      <FollowUpReportViewer
        open={reportViewerOpen}
        onOpenChange={setReportViewerOpen}
        reportId={selectedReportId}
      />
    </div>
  );
}
