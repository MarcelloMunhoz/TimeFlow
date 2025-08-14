import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  FileText, Download, Mail, Calendar, TrendingUp, 
  AlertTriangle, CheckCircle, Clock, RefreshCw, Edit,
  Send, Eye, Plus, X, Link, Paperclip
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: number | null;
  onSend?: () => void;
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

interface EditableReportData {
  risksAndAlerts: string[];
  nextSteps: string[];
  linksAndAttachments: {
    dashboardLink?: string;
    reportAttachment?: string;
    additionalLinks: string[];
  };
}

export default function FollowUpReportEditor({ open, onOpenChange, reportId, onSend }: Props) {
  console.log("🔍 FollowUpReportEditor renderizado:", { open, reportId }); // Debug log
  
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [editableData, setEditableData] = useState<EditableReportData>({
    risksAndAlerts: [],
    nextSteps: [],
    linksAndAttachments: {
      dashboardLink: '',
      reportAttachment: '',
      additionalLinks: []
    }
  });
  const [previewMode, setPreviewMode] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch report details
  const { data: report, isLoading } = useQuery({
    queryKey: ["/api/follow-up-reports", reportId],
    queryFn: async () => {
      console.log("🚀 Iniciando busca do relatório:", reportId); // Debug log
      if (!reportId) return null;
      
      try {
        const response = await apiRequest("GET", `/api/follow-up-reports`);
        const reports = await response.json();
        
        console.log("📊 Reports received:", reports); // Debug log
        
        // Find the specific report
        const targetReport = reports.find((r: any) => {
          const reportObj = r.follow_up_reports || r;
          return reportObj.id === reportId;
        });
        
        console.log("🎯 Target report found:", targetReport); // Debug log
        
        if (targetReport) {
          const reportObj = targetReport.follow_up_reports || targetReport;
          const companyObj = targetReport.companies || {};
          
          console.log("📋 Report object:", reportObj); // Debug log
          console.log("🏢 Company object:", companyObj); // Debug log
          
          // Parse the content JSON
          if (reportObj.contentJson) {
            try {
              const parsedContent = JSON.parse(reportObj.contentJson);
              console.log("✅ Parsed content:", parsedContent); // Debug log
              
              setReportData(parsedContent);
              
              // Initialize editable data with existing content or defaults
              setEditableData({
                risksAndAlerts: parsedContent.risksAndAlerts || [],
                nextSteps: parsedContent.nextSteps || [],
                linksAndAttachments: {
                  dashboardLink: parsedContent.dashboardLink || '',
                  reportAttachment: parsedContent.reportAttachment || '',
                  additionalLinks: parsedContent.additionalLinks || []
                }
              });
            } catch (parseError) {
              console.error("❌ Error parsing contentJson:", parseError);
              // Create default data if parsing fails
              setReportData({
                companyName: companyObj.name || 'Empresa não encontrada',
                reportDate: reportObj.reportDate || new Date().toISOString(),
                reportPeriodStart: reportObj.reportPeriodStart || new Date().toISOString(),
                reportPeriodEnd: reportObj.reportPeriodEnd || new Date().toISOString(),
                projects: [],
                summary: {
                  totalProjects: reportObj.totalProjects || 0,
                  completedProjects: reportObj.completedProjects || 0,
                  projectsAtRisk: reportObj.projectsAtRisk || 0,
                  overallProgress: reportObj.overallProgress || 0
                },
                blockedPhases: [],
                nextSteps: []
              });
            }
          } else {
            console.log("⚠️ No contentJson found, creating default data"); // Debug log
            // Create default data if no contentJson
            setReportData({
              companyName: companyObj.name || 'Empresa não encontrada',
              reportDate: reportObj.reportDate || new Date().toISOString(),
              reportPeriodStart: reportObj.reportPeriodStart || new Date().toISOString(),
              reportPeriodEnd: reportObj.reportPeriodEnd || new Date().toISOString(),
              projects: [],
              summary: {
                totalProjects: reportObj.totalProjects || 0,
                completedProjects: reportObj.completedProjects || 0,
                projectsAtRisk: reportObj.projectsAtRisk || 0,
                overallProgress: reportObj.overallProgress || 0
              },
              blockedPhases: [],
              nextSteps: []
            });
          }
          
          return {
            ...reportObj,
            companyName: companyObj.name || 'Empresa não encontrada'
          };
        }
        
        console.log("❌ No target report found"); // Debug log
        return null;
      } catch (error) {
        console.error("💥 Error fetching report:", error);
        return null;
      }
    },
    enabled: open && !!reportId,
  });

  console.log("🔍 Query state:", { isLoading, report, open, reportId }); // Debug log

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

  const getStatusIcon = (status: string) => {
    const icons = {
      'completed': '✅',
      'in_progress': '🟡',
      'not_started': '⚪',
      'on_hold': '⏸️',
      'cancelled': '❌',
      'blocked': '🔴'
    };
    return icons[status as keyof typeof icons] || '⚪';
  };

  const getOverallStatus = () => {
    if (!reportData || !reportData.summary) return { status: 'unknown', color: 'gray', text: 'Desconhecido' };
    
    const progress = reportData.summary.overallProgress || 0;
    const riskCount = reportData.summary.projectsAtRisk || 0;
    
    if (riskCount > 0) {
      return { status: 'at-risk', color: 'red', text: 'Atenção: risco de atraso' };
    } else if (progress >= 80) {
      return { status: 'on-track', color: 'green', text: 'Dentro do prazo' };
    } else if (progress >= 50) {
      return { status: 'attention', color: 'yellow', text: 'Atenção: risco de atraso' };
    } else {
      return { status: 'delayed', color: 'red', text: 'Atrasado' };
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Data não disponível';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Data inválida';
      }
      return format(date, "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  const addRiskAndAlert = () => {
    setEditableData(prev => ({
      ...prev,
      risksAndAlerts: [...prev.risksAndAlerts, '']
    }));
  };

  const updateRiskAndAlert = (index: number, value: string) => {
    setEditableData(prev => ({
      ...prev,
      risksAndAlerts: prev.risksAndAlerts.map((item, i) => i === index ? value : item)
    }));
  };

  const removeRiskAndAlert = (index: number) => {
    setEditableData(prev => ({
      ...prev,
      risksAndAlerts: prev.risksAndAlerts.filter((_, i) => i !== index)
    }));
  };

  const addNextStep = () => {
    setEditableData(prev => ({
      ...prev,
      nextSteps: [...prev.nextSteps, '']
    }));
  };

  const updateNextStep = (index: number, value: string) => {
    setEditableData(prev => ({
      ...prev,
      nextSteps: prev.nextSteps.map((item, i) => i === index ? value : item)
    }));
  };

  const removeNextStep = (index: number) => {
    setEditableData(prev => ({
      ...prev,
      nextSteps: prev.nextSteps.filter((_, i) => i !== index)
    }));
  };

  const addAdditionalLink = () => {
    setEditableData(prev => ({
      ...prev,
      linksAndAttachments: {
        ...prev.linksAndAttachments,
        additionalLinks: [...prev.linksAndAttachments.additionalLinks, '']
      }
    }));
  };

  const updateAdditionalLink = (index: number, value: string) => {
    setEditableData(prev => ({
      ...prev,
      linksAndAttachments: {
        ...prev.linksAndAttachments,
        additionalLinks: prev.linksAndAttachments.additionalLinks.map((item, i) => i === index ? value : item)
      }
    }));
  };

  const removeAdditionalLink = (index: number) => {
    setEditableData(prev => ({
      ...prev,
      linksAndAttachments: {
        ...prev.linksAndAttachments,
        additionalLinks: prev.linksAndAttachments.additionalLinks.filter((_, i) => i !== index)
      }
    }));
  };

  const generateHTMLReport = () => {
    if (!reportData) return '';

    const overallStatus = getOverallStatus();
    const statusIcon = {
      'on-track': '🟢',
      'attention': '🟡',
      'at-risk': '🔴',
      'delayed': '🔴'
    }[overallStatus.status] || '⚪';

    // Generate phases HTML from all projects
    const phasesHTML = reportData.projects && reportData.projects.length > 0 ? reportData.projects.flatMap(project => 
      project.phases && project.phases.length > 0 ? project.phases.map(phase => {
        const icon = getStatusIcon(phase.status);
        const statusText = getStatusLabel(phase.status);
        const deadline = phase.endDate ? ` (Prevista: ${formatDate(phase.endDate)})` : '';
        
        return `
          <div class="phase-item">
            <div class="phase-indicator ${phase.status === 'completed' ? 'bg-green-500' : phase.status === 'in_progress' ? 'bg-yellow-500' : 'bg-gray-400'}"></div>
            <div class="phase-content">
              <div class="phase-name">${icon} ${phase.name} (${statusText})</div>
              <div class="phase-deadline">${deadline}</div>
            </div>
          </div>
        `;
      }).join('') : ''
    ).join('') : `
      <div class="phase-item">
        <div class="phase-indicator bg-gray-400"></div>
        <div class="phase-content">
          <div class="phase-name">⚪ Relatório de acompanhamento (Em preparação)</div>
          <div class="phase-deadline">Relatório gerado automaticamente</div>
        </div>
      </div>
    `;

    const highlightsHTML = reportData.projects && reportData.projects.length > 0 ? reportData.projects.map(project => {
      const highlights = [];
      if (project.progressPercentage > 0) highlights.push(`Progresso de ${project.progressPercentage}% no projeto ${project.name}`);
      if (project.phases && project.phases.some(p => p.status === 'completed')) highlights.push(`Fases concluídas no projeto ${project.name}`);
      if (project.isAtRisk && project.riskReason) highlights.push(`Identificação de risco no projeto ${project.name}`);
      
      return highlights.map(highlight => `
        <div class="highlight-item">
          <div class="item-bullet"></div>
          <span>${highlight}</span>
        </div>
      `).join('');
    }).join('') : `
      <div class="highlight-item">
        <div class="item-bullet"></div>
        <span>Relatório de acompanhamento gerado com sucesso</span>
      </div>
    `;

    const nextStepsHTML = editableData.nextSteps.length > 0 ? editableData.nextSteps.map(step => `
      <div class="next-step-item">
        <div class="item-bullet"></div>
        <span>${step}</span>
      </div>
    `).join('') : `
      <div class="next-step-item">
        <div class="item-bullet"></div>
        <span>Revisar e atualizar cronogramas dos projetos</span>
      </div>
      <div class="next-step-item">
        <div class="item-bullet"></div>
        <span>Agendar reunião de alinhamento com stakeholders</span>
      </div>
    `;

    const risksSection = editableData.risksAndAlerts.length > 0 ? `
      <div class="risks-section">
        <div class="section-title">
          ⚠️ Riscos e Alertas
        </div>
        ${editableData.risksAndAlerts.map(risk => `
          <div class="risk-item">
            <span>⚠️</span>
            <span>${risk}</span>
          </div>
        `).join('')}
      </div>
    ` : '';

    const dashboardLink = editableData.linksAndAttachments.dashboardLink ? `
      <div class="link-item">
        <span>📊</span>
        <span>Dashboard Power BI: <a href="${editableData.linksAndAttachments.dashboardLink}" target="_blank">Visualizar Dashboard</a></span>
      </div>
    ` : '';

    const additionalLinksHTML = editableData.linksAndAttachments.additionalLinks.map(link => `
      <div class="link-item">
        <span>🔗</span>
        <span><a href="${link}" target="_blank">${link}</a></span>
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Atualização do Projeto - ${reportData.companyName}</title>
          <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  line-height: 1.6;
                  color: #333333;
                  background-color: #f8f9fa;
              }
              .email-container {
                  max-width: 600px;
                  margin: 0 auto;
                  background-color: #ffffff;
                  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              }
              .header {
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  padding: 40px 30px;
                  text-align: center;
              }
              .header h1 {
                  font-size: 28px;
                  font-weight: 700;
                  margin-bottom: 10px;
              }
              .header .project-name {
                  font-size: 22px;
                  font-weight: 600;
                  margin-bottom: 8px;
              }
              .header .date {
                  font-size: 16px;
                  opacity: 0.9;
              }
              .content {
                  padding: 40px 30px;
              }
              .greeting {
                  font-size: 18px;
                  margin-bottom: 30px;
                  color: #2c3e50;
              }
              .executive-summary {
                  background: linear-gradient(135deg, #f8f9ff 0%, #e8f4fd 100%);
                  border-radius: 12px;
                  padding: 25px;
                  margin-bottom: 30px;
                  border-left: 5px solid #667eea;
              }
              .section-title {
                  font-size: 20px;
                  font-weight: 700;
                  color: #2c3e50;
                  margin-bottom: 20px;
                  display: flex;
                  align-items: center;
                  gap: 10px;
              }
              .progress-container {
                  margin: 20px 0;
              }
              .progress-bar {
                  background: #e9ecef;
                  border-radius: 25px;
                  overflow: hidden;
                  height: 24px;
                  position: relative;
              }
              .progress-fill {
                  background: linear-gradient(90deg, #28a745, #20c997);
                  height: 100%;
                  border-radius: 25px;
                  position: relative;
              }
              .progress-text {
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%);
                  color: white;
                  font-weight: 700;
                  font-size: 14px;
              }
              .summary-grid {
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 20px;
                  margin-top: 20px;
              }
              .summary-item {
                  text-align: center;
                  padding: 15px;
                  background: white;
                  border-radius: 8px;
                  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
              }
              .status-badge {
                  display: inline-flex;
                  align-items: center;
                  gap: 5px;
                  padding: 8px 16px;
                  border-radius: 20px;
                  font-size: 14px;
                  font-weight: 600;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
              }
              .status-green {
                  background: linear-gradient(135deg, #28a745, #20c997);
                  color: white;
              }
              .status-yellow {
                  background: linear-gradient(135deg, #ffc107, #fd7e14);
                  color: #212529;
              }
              .status-red {
                  background: linear-gradient(135deg, #dc3545, #e83e8c);
                  color: white;
              }
              .phases-section {
                  margin: 30px 0;
              }
              .phase-item {
                  display: flex;
                  align-items: flex-start;
                  gap: 15px;
                  margin: 20px 0;
                  padding: 20px;
                  background: #ffffff;
                  border-radius: 10px;
                  border-left: 4px solid #667eea;
                  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
              }
              .phase-indicator {
                  width: 16px;
                  height: 16px;
                  border-radius: 50%;
                  flex-shrink: 0;
                  margin-top: 2px;
              }
              .phase-content {
                  flex: 1;
              }
              .phase-name {
                  font-weight: 600;
                  font-size: 16px;
                  color: #2c3e50;
                  margin-bottom: 5px;
              }
              .phase-deadline {
                  font-size: 14px;
                  color: #6c757d;
                  margin-top: 5px;
              }
              .highlights-section, .next-steps-section {
                  margin: 30px 0;
                  padding: 25px;
                  background: linear-gradient(135deg, #fff8e1 0%, #f3e5f5 100%);
                  border-radius: 12px;
                  border-left: 5px solid #ff9800;
              }
              .next-steps-section {
                  background: linear-gradient(135deg, #e8f5e8 0%, #f1f8e9 100%);
                  border-left-color: #4caf50;
              }
              .highlight-item, .next-step-item {
                  display: flex;
                  align-items: center;
                  gap: 12px;
                  margin: 12px 0;
                  padding: 12px 0;
                  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
              }
              .highlight-item:last-child, .next-step-item:last-child {
                  border-bottom: none;
              }
              .item-bullet {
                  width: 8px;
                  height: 8px;
                  background: #667eea;
                  border-radius: 50%;
                  flex-shrink: 0;
              }
              .risks-section {
                  margin: 30px 0;
                  padding: 25px;
                  background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
                  border-radius: 12px;
                  border-left: 5px solid #ffc107;
              }
              .risk-item {
                  display: flex;
                  align-items: flex-start;
                  gap: 10px;
                  margin: 10px 0;
              }
              .links-section {
                  margin: 30px 0;
                  padding: 25px;
                  background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
                  border-radius: 12px;
                  border-left: 5px solid #2196f3;
              }
              .link-item {
                  display: flex;
                  align-items: center;
                  gap: 10px;
                  margin: 10px 0;
              }
              .link-item a {
                  color: #2196f3;
                  text-decoration: none;
                  font-weight: 500;
              }
              .link-item a:hover {
                  text-decoration: underline;
              }
              .footer {
                  background: linear-gradient(135deg, #37474f 0%, #263238 100%);
                  color: white;
                  text-align: center;
                  padding: 40px 30px;
              }
              .footer h3 {
                  font-size: 20px;
                  margin-bottom: 15px;
              }
              .footer p {
                  margin: 10px 0;
                  opacity: 0.9;
              }
              .footer .contact-info {
                  margin: 20px 0;
                  padding: 20px;
                  background: rgba(255, 255, 255, 0.1);
                  border-radius: 8px;
              }
          </style>
      </head>
      <body>
          <div class="email-container">
              <div class="header">
                  <h1>📊 Atualização do Projeto</h1>
                  <div class="project-name">🚀 Status Semanal | ${reportData.companyName}</div>
                  <div class="date">${formatDate(reportData.reportDate)}</div>
              </div>
              
              <div class="content">
                  <div class="greeting">
                      Olá ${reportData.companyName}, segue a atualização do seu projeto de BI referente a ${formatDate(reportData.reportPeriodStart)} a ${formatDate(reportData.reportPeriodEnd)}.
                  </div>
                  
                  <div class="executive-summary">
                      <div class="section-title">
                          📈 Resumo Executivo
                      </div>
                      
                      <div class="progress-container">
                          <div class="progress-bar">
                              <div class="progress-fill" style="width: ${reportData.summary?.overallProgress || 0}%">
                                  <div class="progress-text">${reportData.summary?.overallProgress || 0}% concluído</div>
                              </div>
                          </div>
                      </div>
                      
                      <div class="summary-grid">
                          <div class="summary-item">
                              <strong>Status</strong>
                              <span class="status-badge status-${overallStatus.color}">${statusIcon} ${overallStatus.text}</span>
                          </div>
                          <div class="summary-item">
                              <strong>Próxima Entrega</strong>
                              ${(() => {
                                const inProgressProject = reportData.projects?.find(p => p.status === 'in_progress');
                                const inProgressPhase = inProgressProject?.phases?.find(ph => ph.status === 'in_progress');
                                return inProgressPhase?.endDate ? formatDate(inProgressPhase.endDate) : 'A definir';
                              })()}
                          </div>
                      </div>
                  </div>
                  
                  <div class="phases-section">
                      <div class="section-title">
                          🎯 Linha do Tempo / Etapas
                      </div>
                      ${phasesHTML}
                  </div>
                  
                  <div class="highlights-section">
                      <div class="section-title">
                          ✨ Principais Destaques da Semana
                      </div>
                      ${highlightsHTML}
                  </div>
                  
                  <div class="next-steps-section">
                      <div class="section-title">
                          🚀 Próximos Passos
                      </div>
                      ${nextStepsHTML}
                  </div>
                  
                  ${risksSection}
                  
                  <div class="links-section">
                      <div class="section-title">
                          📎 Link ou Anexo
                      </div>
                      ${dashboardLink}
                      ${additionalLinksHTML}
                      <div class="link-item">
                          <span>📄</span>
                          <span>Relatório detalhado em anexo (PDF/Excel)</span>
                      </div>
                  </div>
              </div>
              
              <div class="footer">
                  <h3>Equipe TimeFlow</h3>
                  <div class="contact-info">
                      <p>Em caso de dúvidas, entre em contato conosco.</p>
                      <p>📧 contato@timeflow.com | 📱 (11) 99999-9999</p>
                  </div>
                  <p>Obrigado pela parceria. Seguimos comprometidos para entregar o melhor resultado.</p>
              </div>
          </div>
      </body>
      </html>
    `;
  };

  const handleSend = async () => {
    try {
      // Aqui você implementaria a lógica para enviar o relatório
      // Por enquanto, apenas mostra uma mensagem de sucesso
      toast({
        title: "Relatório enviado com sucesso!",
        description: "O follow-up foi enviado para os destinatários configurados.",
      });
      
      onSend?.();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro ao enviar relatório",
        description: "Não foi possível enviar o relatório.",
        variant: "destructive",
      });
    }
  };

  if (!open || !reportId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Editor de Relatório de Follow-up
          </DialogTitle>
          <DialogDescription>
            Edite as informações do relatório antes de enviar o follow-up
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            Carregando relatório...
          </div>
        ) : reportData ? (
          <div className="space-y-6">
            {/* Tabs */}
            <div className="flex space-x-2 border-b">
              <Button
                variant={!previewMode ? "default" : "outline"}
                size="sm"
                onClick={() => setPreviewMode(false)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
              <Button
                variant={previewMode ? "default" : "outline"}
                size="sm"
                onClick={() => setPreviewMode(true)}
              >
                <Eye className="w-4 h-4 mr-2" />
                Visualizar
              </Button>
            </div>

            {!previewMode ? (
              /* Edit Mode */
              <div className="space-y-6">
                {/* Riscos e Alertas */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <AlertTriangle className="w-5 h-5 mr-2 text-yellow-600" />
                      Riscos e Alertas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {editableData.risksAndAlerts.map((risk, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Textarea
                          value={risk}
                          onChange={(e) => updateRiskAndAlert(index, e.target.value)}
                          placeholder="Descreva o risco ou alerta..."
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeRiskAndAlert(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      onClick={addRiskAndAlert}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Risco/Alerta
                    </Button>
                  </CardContent>
                </Card>

                {/* Próximos Passos */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                      Próximos Passos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {editableData.nextSteps.map((step, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Textarea
                          value={step}
                          onChange={(e) => updateNextStep(index, e.target.value)}
                          placeholder="Descreva o próximo passo..."
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeNextStep(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      onClick={addNextStep}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Próximo Passo
                    </Button>
                  </CardContent>
                </Card>

                {/* Links e Anexos */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Link className="w-5 h-5 mr-2 text-blue-600" />
                      Links e Anexos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="dashboard-link">Link do Dashboard Power BI</Label>
                      <Input
                        id="dashboard-link"
                        value={editableData.linksAndAttachments.dashboardLink}
                        onChange={(e) => setEditableData(prev => ({
                          ...prev,
                          linksAndAttachments: {
                            ...prev.linksAndAttachments,
                            dashboardLink: e.target.value
                          }
                        }))}
                        placeholder="https://app.powerbi.com/..."
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="report-attachment">Anexo do Relatório</Label>
                      <Input
                        id="report-attachment"
                        value={editableData.linksAndAttachments.reportAttachment}
                        onChange={(e) => setEditableData(prev => ({
                          ...prev,
                          linksAndAttachments: {
                            ...prev.linksAndAttachments,
                            reportAttachment: e.target.value
                          }
                        }))}
                        placeholder="Nome do arquivo ou link..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Links Adicionais</Label>
                      {editableData.linksAndAttachments.additionalLinks.map((link, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Input
                            value={link}
                            onChange={(e) => updateAdditionalLink(index, e.target.value)}
                            placeholder="https://..."
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeAdditionalLink(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        onClick={addAdditionalLink}
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Link
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              /* Preview Mode */
              <div className="border rounded-lg">
                <div 
                  className="p-4"
                  dangerouslySetInnerHTML={{ __html: generateHTMLReport() }}
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between space-x-3 pt-4 border-t">
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button variant="outline" onClick={() => setPreviewMode(!previewMode)}>
                  {previewMode ? <Edit className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                  {previewMode ? 'Editar' : 'Visualizar'}
                </Button>
              </div>
              
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => {
                  const html = generateHTMLReport();
                  const blob = new Blob([html], { type: 'text/html' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  const dateStr = formatDate(reportData.reportDate).replace(/[^a-zA-Z0-9-]/g, '-');
                  link.download = `follow-up-${dateStr}.html`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                }}>
                  <Download className="w-4 h-4 mr-2" />
                  Download HTML
                </Button>
                <Button onClick={handleSend}>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Follow-up
                </Button>
              </div>
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
            <div className="mt-4 text-sm text-gray-500">
              <p>Debug info:</p>
              <p>Report ID: {reportId}</p>
              <p>Report data: {JSON.stringify(report, null, 2)}</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
