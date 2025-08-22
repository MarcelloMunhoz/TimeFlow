import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Download, 
  Calendar, 
  FileText, 
  Copy, 
  CheckCircle, 
  Clock, 
  Target, 
  Building, 
  User,
  Eye,
  Share,
  TrendingUp,
  BarChart3,
  Briefcase
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useTheme } from "@/hooks/use-theme";

interface WeeklySummaryExportProps {
  selectedStartDate?: string;
  showTriggerButton?: boolean;
  triggerElement?: React.ReactNode;
}

// Get Monday of current week as default
const getCurrentWeekStart = (): string => {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(today.setDate(diff));
  return monday.toISOString().split('T')[0];
};

export default function WeeklySummaryExport({ 
  selectedStartDate = getCurrentWeekStart(), 
  showTriggerButton = true,
  triggerElement
}: WeeklySummaryExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState(selectedStartDate);
  const [isExporting, setIsExporting] = useState(false);

  const { toast } = useToast();
  const { getCardClasses, getButtonClasses } = useTheme();

  // Calculate end date (6 days later)
  const getEndDate = (start: string) => {
    const startDateObj = new Date(start + 'T00:00:00');
    const endDateObj = new Date(startDateObj);
    endDateObj.setDate(endDateObj.getDate() + 6);
    return endDateObj.toISOString().split('T')[0];
  };

  // Fetch weekly summary preview from REAL API
  const { data: summaryData, isLoading: isLoadingPreview, error: previewError } = useQuery({
    queryKey: ['/api/summary/weekly', startDate],
    queryFn: async () => {
      if (!startDate) return null;
      console.log('📊 Fetching REAL weekly summary data for:', startDate);
      const response = await apiRequest("GET", `/api/summary/weekly/${startDate}`);
      const data = await response.json();
      console.log('📊 REAL weekly summary data received:', data);
      return data;
    },
    enabled: !!startDate && isOpen,
  });

  const handleExport = async () => {
    try {
      setIsExporting(true);
      console.log('💾 Attempting to export REAL weekly summary for start date:', startDate);
      
      const response = await fetch(`/api/summary/export/${startDate}?format=text`);
      console.log('💾 Export response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('💾 Export response error:', errorText);
        throw new Error(`Falha ao exportar resumo semanal: ${response.status}`);
      }
      
      const text = await response.text();
      console.log('💾 Generated REAL text length:', text.length);
      
      // Download file
      const blob = new Blob([text], { type: 'text/plain; charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resumo-semanal-${startDate}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('💾 REAL file download initiated successfully');
      
      toast({
        title: "📊 Resumo semanal exportado!",
        description: `Arquivo resumo-semanal-${startDate}.txt baixado com sucesso.`
      });
      
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: "❌ Erro na exportação",
        description: `Não foi possível exportar o resumo semanal: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      setIsExporting(true);
      console.log('📋 Attempting to copy REAL weekly summary for start date:', startDate);
      
      const response = await fetch(`/api/summary/export/${startDate}?format=text`);
      console.log('📋 Copy response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('📋 Copy response error:', errorText);
        throw new Error(`Falha ao gerar resumo semanal: ${response.status}`);
      }
      
      const text = await response.text();
      console.log('📋 Generated REAL text length:', text.length);
      
      // Check if clipboard API is available
      if (!navigator.clipboard) {
        throw new Error('Clipboard API não disponível neste navegador');
      }
      
      await navigator.clipboard.writeText(text);
      console.log('📋 REAL text copied to clipboard successfully');
      
      toast({
        title: "📋 Copiado!",
        description: "Resumo semanal copiado para a área de transferência. Você pode colar no email ou apresentação."
      });
      
    } catch (error: any) {
      console.error('Copy error:', error);
      toast({
        title: "❌ Erro ao copiar",
        description: `Não foi possível copiar o resumo semanal: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start + 'T00:00:00');
    const endDate = new Date(end + 'T00:00:00');
    const startStr = startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const endStr = endDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${startStr} a ${endStr}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'active': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'delayed': return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 75) return 'text-blue-600';
    if (percentage >= 50) return 'text-yellow-600';
    if (percentage >= 25) return 'text-orange-600';
    if (percentage > 0) return 'text-red-600';
    return 'text-gray-400';
  };

  const TriggerButton = triggerElement ? (
    <DialogTrigger asChild>
      <div onClick={() => setIsOpen(true)}>
        {triggerElement}
      </div>
    </DialogTrigger>
  ) : showTriggerButton ? (
    <DialogTrigger asChild>
      <Button 
        className={`${getButtonClasses('outline')} flex items-center gap-2`}
        onClick={() => setIsOpen(true)}
      >
        <BarChart3 className="w-4 h-4" />
        Resumo Semanal
      </Button>
    </DialogTrigger>
  ) : null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {TriggerButton}
      
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-accent-blue" />
            Exportar Resumo Semanal de Projetos
          </DialogTitle>
          <DialogDescription>
            Exporte um resumo completo dos projetos ativos, progresso, atividades e próximas tarefas da semana para sua reunião.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Week Selection */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-theme-primary mb-2">
                Início da Semana (Segunda-feira)
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="text-sm text-theme-secondary pt-6">
              {startDate && formatDateRange(startDate, getEndDate(startDate))}
            </div>
          </div>

          {/* Preview */}
          {startDate && (
            <div className={`${getCardClasses()} p-4`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-theme-primary flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Prévia do Resumo Semanal
                </h3>
              </div>

              {isLoadingPreview ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-theme-tertiary rounded w-1/2"></div>
                  <div className="h-4 bg-theme-tertiary rounded w-3/4"></div>
                  <div className="h-4 bg-theme-tertiary rounded w-1/3"></div>
                </div>
              ) : previewError ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">❌</div>
                  <div className="text-lg font-medium text-red-600">Erro ao carregar resumo semanal</div>
                  <div className="text-theme-secondary text-sm mt-2">
                    {(previewError as any).message || 'Erro desconhecido'}
                  </div>
                  <div className="text-xs text-theme-muted mt-2">
                    Verifique se o servidor está rodando e tente novamente
                  </div>
                </div>
              ) : summaryData ? (
                <div className="space-y-6">
                  {/* Executive Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-theme-primary">
                        {summaryData.summary.totalProjects}
                      </div>
                      <div className="text-sm text-theme-secondary">
                        🎯 Projetos Ativos
                      </div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${getProgressColor(summaryData.summary.averageProgress)}`}>
                        {summaryData.summary.averageProgress}%
                      </div>
                      <div className="text-sm text-theme-secondary">
                        📊 Progresso Médio
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-theme-primary">
                        {summaryData.summary.completionRate}%
                      </div>
                      <div className="text-sm text-theme-secondary">
                        ✅ Taxa de Conclusão
                      </div>
                    </div>
                  </div>

                  {/* Projects List */}
                  {summaryData.projects.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-2">🎉</div>
                      <div className="text-lg font-medium text-theme-primary">Nenhum Projeto Ativo!</div>
                      <div className="text-theme-secondary">Não há projetos ativos no momento.</div>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {summaryData.projects.map((project: any) => (
                        <div key={project.id} className="border rounded-lg p-4 bg-theme-tertiary">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <Briefcase className="w-5 h-5 text-accent-blue" />
                                <span className="font-semibold text-theme-primary text-lg">
                                  {project.name}
                                </span>
                              </div>
                              <Badge className={getStatusColor(project.status)} variant="outline">
                                {project.status}
                              </Badge>
                              <Badge className={getPriorityColor(project.priority)} variant="outline">
                                {project.priority}
                              </Badge>
                            </div>
                            <div className={`text-lg font-bold ${getProgressColor(project.progressPercentage || 0)}`}>
                              {project.progressPercentage || 0}%
                            </div>
                          </div>
                          
                          

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            {project.company && (
                              <div className="flex items-center gap-1">
                                <Building className="w-3 h-3" />
                                <span className="text-theme-muted">{project.company.name}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              <span className="text-theme-muted">
                                {project.weekMetrics.completedTasks}/{project.weekMetrics.totalTasks} concluídas
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <Target className="w-3 h-3" />
                              <span className="text-theme-muted">
                                {project.nextTasks?.length || 0} próximas tarefas
                              </span>
                            </div>
                          </div>

                          {project.endDate && (
                            <div className="mt-2 text-xs text-theme-muted">
                              🎯 Conclusão prevista: {new Date(project.endDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Companies Summary */}
                  {summaryData.summary.uniqueCompanies.length > 0 && (
                    <div className="border-t border-theme-muted pt-4">
                      <div className="text-sm font-medium text-theme-primary mb-2">
                        🏢 Empresas Envolvidas:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {summaryData.summary.uniqueCompanies.map((company: string) => (
                          <Badge key={company} variant="outline" className="text-xs">
                            {company}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-theme-secondary">
                  Selecione uma data para visualizar o resumo semanal
                </div>
              )}
            </div>
          )}

          {/* Export Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-theme-muted">
            <div className="text-sm text-theme-secondary">
              💡 Dica: Use "Copiar" para incluir em apresentações ou emails
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={handleCopyToClipboard}
                disabled={!startDate || isExporting}
                className={`${getButtonClasses('outline')} flex items-center gap-2`}
              >
                <Copy className="w-4 h-4" />
                {isExporting ? 'Copiando...' : 'Copiar'}
              </Button>
              
              <Button
                onClick={handleExport}
                disabled={!startDate || isExporting}
                className={`${getButtonClasses('primary')} flex items-center gap-2`}
              >
                <Download className="w-4 h-4" />
                {isExporting ? 'Exportando...' : 'Baixar Arquivo'}
              </Button>
            </div>
          </div>

          {/* Usage Instructions */}
          <div className={`${getCardClasses()} p-4 border-accent-blue/20 bg-blue-50/50 dark:bg-blue-900/20`}>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-accent-blue/20 flex items-center justify-center flex-shrink-0">
                <Share className="w-4 h-4 text-accent-blue" />
              </div>
              <div>
                <h4 className="font-medium text-theme-primary mb-2">
                  Como usar o resumo semanal:
                </h4>
                <ul className="text-sm text-theme-secondary space-y-1">
                  <li>• <strong>Reunião de Status:</strong> Use "Copiar" e cole na apresentação</li>
                  <li>• <strong>Email para Chefe:</strong> Use "Copiar" e cole no corpo do email</li>
                  <li>• <strong>Arquivo de Backup:</strong> Use "Baixar" para salvar como arquivo .txt</li>
                  <li>• <strong>Relatório Impresso:</strong> Abra o arquivo baixado e imprima</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
