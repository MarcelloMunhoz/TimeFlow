import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, Download, Mail, Calendar, TrendingUp, 
  AlertTriangle, CheckCircle, Clock, RefreshCw
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: number | null;
}

interface ReportData {
  companyName: string;
  reportDate: string;
  reportPeriodStart: string;
  reportPeriodEnd: string;
  projects: ProjectProgress[];
  summary: {
    totalProjects: number;
    completedProjects: number;
    projectsAtRisk: number;
    overallProgress: number;
  };
  blockedPhases: PhaseProgress[];
  nextSteps: string[];
}

interface ProjectProgress {
  id: number;
  name: string;
  status: string;
  progressPercentage: number;
  phases: PhaseProgress[];
  isAtRisk: boolean;
  riskReason?: string;
  nextSteps: string[];
}

interface PhaseProgress {
  id: number;
  name: string;
  status: string;
  progressPercentage: number;
  startDate?: string;
  endDate?: string;
  isBlocked: boolean;
  blockReason?: string;
  daysRemaining?: number;
}

export default function FollowUpReportViewer({ open, onOpenChange, reportId }: Props) {
  const [reportData, setReportData] = useState<ReportData | null>(null);

  // Fetch report details
  const { data: report, isLoading } = useQuery({
    queryKey: ["/api/follow-up-reports", reportId],
    queryFn: async () => {
      if (!reportId) return null;
      
      const response = await apiRequest("GET", `/api/follow-up-reports`);
      const reports = await response.json();
      
      // Find the specific report
      const targetReport = reports.find((r: any) => {
        const reportObj = r.follow_up_reports || r;
        return reportObj.id === reportId;
      });
      
      if (targetReport) {
        const reportObj = targetReport.follow_up_reports || targetReport;
        const companyObj = targetReport.companies || {};
        
        // Parse the content JSON
        if (reportObj.contentJson) {
          const parsedContent = JSON.parse(reportObj.contentJson);
          setReportData(parsedContent);
        }
        
        return {
          ...reportObj,
          companyName: companyObj.name || 'Empresa não encontrada'
        };
      }
      
      return null;
    },
    enabled: open && !!reportId,
  });

  const getStatusColor = (status: string) => {
    const colors = {
      'completed': 'bg-green-100 text-green-800',
      'in_progress': 'bg-blue-100 text-blue-800',
      'not_started': 'bg-gray-100 text-gray-800',
      'on_hold': 'bg-yellow-100 text-yellow-800',
      'cancelled': 'bg-red-100 text-red-800',
      'blocked': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      'completed': 'Concluído',
      'in_progress': 'Em Andamento',
      'not_started': 'Não Iniciado',
      'on_hold': 'Em Espera',
      'cancelled': 'Cancelado',
      'blocked': 'Bloqueado',
      'active': 'Ativo'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const handleDownload = () => {
    if (!reportData || !report) return;
    
    // Create a simple text version of the report
    const textContent = `
RELATÓRIO DE ACOMPANHAMENTO - ${reportData.companyName}
Período: ${formatDate(reportData.reportPeriodStart)} a ${formatDate(reportData.reportPeriodEnd)}
Gerado em: ${formatDate(reportData.reportDate)}

RESUMO EXECUTIVO:
- Total de Projetos: ${reportData.summary.totalProjects}
- Projetos Concluídos: ${reportData.summary.completedProjects}
- Projetos em Risco: ${reportData.summary.projectsAtRisk}
- Progresso Geral: ${reportData.summary.overallProgress}%

PROJETOS:
${reportData.projects.map(project => `
- ${project.name} (${project.progressPercentage}%)
  Status: ${getStatusLabel(project.status)}
  ${project.isAtRisk ? `⚠️ Em Risco: ${project.riskReason}` : ''}
  
  Fases:
  ${project.phases.map(phase => `    • ${phase.name}: ${phase.progressPercentage}% (${getStatusLabel(phase.status)})`).join('\n  ')}
  
  Próximos Passos:
  ${project.nextSteps.map(step => `    • ${step}`).join('\n  ')}
`).join('\n')}

${reportData.blockedPhases.length > 0 ? `
FASES BLOQUEADAS:
${reportData.blockedPhases.map(phase => `- ${phase.name}: ${phase.blockReason}`).join('\n')}
` : ''}

PRÓXIMAS AÇÕES:
${reportData.nextSteps.map(step => `- ${step}`).join('\n')}

---
Relatório gerado automaticamente pelo TimeFlow
Sistema de Gestão de Projetos BI
    `.trim();

    // Create and download the file
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = reportData.reportDate.split('T')[0] || new Date().toISOString().split('T')[0];
    link.download = `follow-up-${reportData.companyName.replace(/[^a-zA-Z0-9]/g, '-')}-${dateStr}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!open || !reportId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Visualizar Relatório de Follow-up
          </DialogTitle>
          <DialogDescription>
            Detalhes completos do relatório de acompanhamento
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            Carregando relatório...
          </div>
        ) : reportData ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-theme-secondary p-6 rounded-lg border border-theme-border">
              <h2 className="text-2xl font-bold text-theme-primary mb-2">
                {reportData.companyName}
              </h2>
              <div className="flex items-center space-x-4 text-theme-secondary">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span>Período: {formatDate(reportData.reportPeriodStart)} a {formatDate(reportData.reportPeriodEnd)}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  <span>Gerado em: {formatDate(reportData.reportDate)}</span>
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{reportData.summary.totalProjects}</div>
                  <div className="text-sm text-gray-600">Total de Projetos</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{reportData.summary.completedProjects}</div>
                  <div className="text-sm text-gray-600">Concluídos</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{reportData.summary.projectsAtRisk}</div>
                  <div className="text-sm text-gray-600">Em Risco</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{reportData.summary.overallProgress}%</div>
                  <div className="text-sm text-gray-600">Progresso Geral</div>
                </CardContent>
              </Card>
            </div>

            {/* Projects */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Detalhamento dos Projetos
              </h3>
              
              {reportData.projects.map((project) => (
                <Card key={project.id} className="border-l-4 border-l-blue-500">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <div className="flex items-center space-x-2">
                        {project.isAtRisk && (
                          <Badge variant="destructive" className="flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Em Risco
                          </Badge>
                        )}
                        <Badge className={getStatusColor(project.status)}>
                          {getStatusLabel(project.status)}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progresso:</span>
                        <span className="font-semibold">{project.progressPercentage}%</span>
                      </div>
                      <Progress value={project.progressPercentage} className="h-2" />
                    </div>
                    {project.isAtRisk && project.riskReason && (
                      <div className="bg-red-50 border border-red-200 rounded p-3 mt-2">
                        <div className="flex items-start">
                          <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5" />
                          <div>
                            <div className="font-medium text-red-800">Atenção:</div>
                            <div className="text-red-700 text-sm">{project.riskReason}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Fases do Projeto:</h5>
                        <div className="space-y-2">
                          {project.phases.slice(0, 5).map((phase) => (
                            <div key={phase.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex items-center">
                                <span className="text-sm font-medium">{phase.name}</span>
                                {phase.isBlocked && (
                                  <Badge variant="destructive" className="ml-2 text-xs">
                                    Bloqueado
                                  </Badge>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold">{phase.progressPercentage}%</div>
                                <div className="text-xs text-gray-500">{getStatusLabel(phase.status)}</div>
                              </div>
                            </div>
                          ))}
                          {project.phases.length > 5 && (
                            <div className="text-sm text-gray-500 text-center py-2">
                              ... e mais {project.phases.length - 5} fases
                            </div>
                          )}
                        </div>
                      </div>

                      {project.nextSteps.length > 0 && (
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Próximos Passos:</h5>
                          <ul className="list-disc list-inside space-y-1">
                            {project.nextSteps.map((step, index) => (
                              <li key={index} className="text-sm text-gray-700">{step}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Blocked Phases */}
            {reportData.blockedPhases.length > 0 && (
              <Card className="border-l-4 border-l-red-500">
                <CardHeader>
                  <CardTitle className="text-lg text-red-700 flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Fases Bloqueadas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {reportData.blockedPhases.map((phase) => (
                      <div key={phase.id} className="p-3 bg-red-50 border border-red-200 rounded">
                        <div className="font-medium text-red-800">{phase.name}</div>
                        {phase.blockReason && (
                          <div className="text-sm text-red-600 mt-1">
                            Motivo: {phase.blockReason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Next Steps */}
            {reportData.nextSteps.length > 0 && (
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <CardTitle className="text-lg text-blue-700 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Próximas Ações
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-2">
                    {reportData.nextSteps.map((step, index) => (
                      <li key={index} className="text-gray-700">{step}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="outline" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Relatório não encontrado
            </h3>
            <p className="text-gray-600">
              Não foi possível carregar os dados do relatório.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
