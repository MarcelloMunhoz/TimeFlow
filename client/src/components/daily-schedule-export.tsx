import { useState } from "react";
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
  Share
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useTheme } from "@/hooks/use-theme";
import { getTodayString } from "@/lib/date-utils";

interface DailyScheduleExportProps {
  selectedDate?: string;
  showTriggerButton?: boolean;
  triggerElement?: React.ReactNode;
}

export default function DailyScheduleExport({ 
  selectedDate = getTodayString(), 
  showTriggerButton = true,
  triggerElement
}: DailyScheduleExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exportDate, setExportDate] = useState(selectedDate);
  const [isExporting, setIsExporting] = useState(false);
  const [exportedText, setExportedText] = useState<string>("");
  const [previewData, setPreviewData] = useState<any>(null);

  const { toast } = useToast();
  const { getCardClasses, getButtonClasses } = useTheme();

  // Fetch schedule preview
  const { data: scheduleData, isLoading: isLoadingPreview, error: previewError } = useQuery({
    queryKey: ['/api/schedule/daily', exportDate],
    queryFn: async () => {
      if (!exportDate) return null;
      console.log('🔍 Fetching schedule data for:', exportDate);
      const response = await apiRequest("GET", `/api/schedule/daily/${exportDate}`);
      const data = await response.json();
      console.log('📅 Schedule data received:', data);
      return data;
    },
    enabled: !!exportDate && isOpen,
  });

  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      const response = await fetch(`/api/schedule/export/${exportDate}?format=text`);
      
      if (!response.ok) {
        throw new Error('Falha ao exportar cronograma');
      }
      
      const text = await response.text();
      setExportedText(text);
      
      // Download file
      const blob = new Blob([text], { type: 'text/plain; charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cronograma-${exportDate}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "📅 Cronograma exportado!",
        description: `Arquivo cronograma-${exportDate}.txt baixado com sucesso.`
      });
      
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "❌ Erro na exportação",
        description: "Não foi possível exportar o cronograma. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      setIsExporting(true);
      
      const response = await fetch(`/api/schedule/export/${exportDate}?format=text`);
      
      if (!response.ok) {
        throw new Error('Falha ao gerar cronograma');
      }
      
      const text = await response.text();
      await navigator.clipboard.writeText(text);
      
      toast({
        title: "📋 Copiado!",
        description: "Cronograma copiado para a área de transferência. Você pode colar no WhatsApp ou email."
      });
      
    } catch (error) {
      console.error('Copy error:', error);
      toast({
        title: "❌ Erro ao copiar",
        description: "Não foi possível copiar o cronograma. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'delayed': return 'bg-red-100 text-red-800 border-red-200';
      case 'rescheduled': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
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

  const getAppointmentEmoji = (apt: any) => {
    if (apt.isPomodoro) return '🍅';
    if (apt.category === 'subfase_conclusao') return '✅';
    if (apt.isOvertime) return '⏰';
    if (apt.priority === 'urgent') return '🚨';
    if (apt.priority === 'high') return '🔥';
    if (apt.meetingUrl) return '💻';
    if (apt.location) return '📍';
    return '📝';
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
        <Download className="w-4 h-4" />
        Exportar Cronograma
      </Button>
    </DialogTrigger>
  ) : null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {TriggerButton}
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-accent-blue" />
            Exportar Cronograma Diário
          </DialogTitle>
          <DialogDescription>
            Exporte seu cronograma diário com emojis para enviar ao seu chefe ou equipe.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Date Selection */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-theme-primary mb-2">
                Data do Cronograma
              </label>
              <Input
                type="date"
                value={exportDate}
                onChange={(e) => setExportDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="text-sm text-theme-secondary pt-6">
              {exportDate && formatDate(exportDate)}
            </div>
          </div>

          {/* Preview */}
          {exportDate && (
            <div className={`${getCardClasses()} p-4`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-theme-primary flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Prévia do Cronograma
                </h3>
              </div>

              {isLoadingPreview ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-theme-tertiary rounded w-1/2"></div>
                  <div className="h-4 bg-theme-tertiary rounded w-3/4"></div>
                  <div className="h-4 bg-theme-tertiary rounded w-1/3"></div>
                </div>
              ) : scheduleData ? (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-theme-primary">
                        {scheduleData.summary.totalAppointments}
                      </div>
                      <div className="text-sm text-theme-secondary">
                        📝 Total de agendamentos
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-theme-primary">
                        {scheduleData.summary.totalDurationHours}h
                      </div>
                      <div className="text-sm text-theme-secondary">
                        ⏰ Tempo total
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-theme-primary">
                        {scheduleData.summary.scheduledAppointments}
                      </div>
                      <div className="text-sm text-theme-secondary">
                        📅 Agendados
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-theme-primary">
                        {scheduleData.summary.pomodoroSessions}
                      </div>
                      <div className="text-sm text-theme-secondary">
                        🍅 Pomodoros
                      </div>
                    </div>
                  </div>

                  {/* Appointments List */}
                  {scheduleData.appointments.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-2">🎉</div>
                      <div className="text-lg font-medium text-theme-primary">Agenda Livre!</div>
                      <div className="text-theme-secondary">Não há agendamentos para este dia.</div>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {scheduleData.appointments.map((apt: any) => (
                        <div key={apt.id} className="border rounded-lg p-3 bg-theme-tertiary">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{getAppointmentEmoji(apt)}</span>
                              <span className="font-medium text-theme-primary">
                                {apt.startTime} - {apt.endTime}
                              </span>
                              <Badge className={getStatusColor(apt.status)} variant="outline">
                                {apt.status}
                              </Badge>
                              {apt.priority && apt.priority !== 'medium' && (
                                <Badge className={getPriorityColor(apt.priority)} variant="outline">
                                  {apt.priority}
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-theme-muted">
                              {apt.durationMinutes}min
                            </div>
                          </div>
                          
                          <div className="text-theme-primary font-medium mb-1">
                            {apt.title}
                          </div>
                          
                          {apt.description && (
                            <div className="text-sm text-theme-secondary mb-2">
                              {apt.description}
                            </div>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-theme-muted">
                            {apt.project && (
                              <div className="flex items-center gap-1">
                                <Target className="w-3 h-3" />
                                {apt.project.name}
                              </div>
                            )}
                            {apt.company && (
                              <div className="flex items-center gap-1">
                                <Building className="w-3 h-3" />
                                {apt.company.name}
                              </div>
                            )}
                            {apt.assignedUser && (
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {apt.assignedUser.name}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-theme-secondary">
                  Selecione uma data para visualizar o cronograma
                </div>
              )}
            </div>
          )}

          {/* Export Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-theme-muted">
            <div className="text-sm text-theme-secondary">
              💡 Dica: Use "Copiar" para enviar via WhatsApp ou email
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={handleCopyToClipboard}
                disabled={!exportDate || isExporting}
                className={`${getButtonClasses('outline')} flex items-center gap-2`}
              >
                <Copy className="w-4 h-4" />
                {isExporting ? 'Copiando...' : 'Copiar'}
              </Button>
              
              <Button
                onClick={handleExport}
                disabled={!exportDate || isExporting}
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
                  Como usar o cronograma exportado:
                </h4>
                <ul className="text-sm text-theme-secondary space-y-1">
                  <li>• <strong>WhatsApp/Telegram:</strong> Use "Copiar" e cole na conversa</li>
                  <li>• <strong>Email:</strong> Use "Copiar" e cole no corpo do email</li>
                  <li>• <strong>Arquivo:</strong> Use "Baixar" para salvar como arquivo .txt</li>
                  <li>• <strong>Impressão:</strong> Abra o arquivo baixado e imprima</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
