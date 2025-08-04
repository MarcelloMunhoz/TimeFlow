import Handlebars from 'handlebars';
import juice from 'juice';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface ProjectProgress {
  id: number;
  name: string;
  status: string;
  progressPercentage: number;
  phases: PhaseProgress[];
  isAtRisk: boolean;
  riskReason?: string;
  nextSteps: string[];
}

export interface PhaseProgress {
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

export interface FollowUpReportData {
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

export class EmailTemplateService {
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor() {
    this.registerHelpers();
    this.compileTemplates();
  }

  /**
   * Register Handlebars helpers
   */
  private registerHelpers(): void {
    // Format date helper
    Handlebars.registerHelper('formatDate', (date: string) => {
      if (!date) return '';
      return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
    });

    // Format percentage helper
    Handlebars.registerHelper('formatPercentage', (value: number) => {
      return `${Math.round(value)}%`;
    });

    // Status color helper
    Handlebars.registerHelper('statusColor', (status: string) => {
      const colors = {
        'completed': '#10B981',
        'in_progress': '#3B82F6',
        'not_started': '#6B7280',
        'on_hold': '#F59E0B',
        'cancelled': '#EF4444',
        'blocked': '#EF4444'
      };
      return colors[status as keyof typeof colors] || '#6B7280';
    });

    // Status label helper
    Handlebars.registerHelper('statusLabel', (status: string) => {
      const labels = {
        'completed': 'Concluído',
        'in_progress': 'Em Andamento',
        'not_started': 'Não Iniciado',
        'on_hold': 'Em Espera',
        'cancelled': 'Cancelado',
        'blocked': 'Bloqueado'
      };
      return labels[status as keyof typeof labels] || status;
    });

    // Progress bar helper
    Handlebars.registerHelper('progressBar', (percentage: number) => {
      const width = Math.max(0, Math.min(100, percentage));
      const color = percentage >= 80 ? '#10B981' : percentage >= 50 ? '#3B82F6' : '#F59E0B';
      
      return new Handlebars.SafeString(`
        <div style="background-color: #E5E7EB; border-radius: 4px; height: 8px; width: 100%; margin: 4px 0;">
          <div style="background-color: ${color}; height: 100%; width: ${width}%; border-radius: 4px; transition: width 0.3s ease;"></div>
        </div>
      `);
    });

    // Risk indicator helper
    Handlebars.registerHelper('riskIndicator', (isAtRisk: boolean) => {
      if (!isAtRisk) return '';
      
      return new Handlebars.SafeString(`
        <span style="background-color: #FEF2F2; color: #DC2626; padding: 2px 6px; border-radius: 4px; font-size: 12px; font-weight: 500;">
          ⚠️ Em Risco
        </span>
      `);
    });
  }

  /**
   * Compile email templates
   */
  private compileTemplates(): void {
    // Main follow-up report template
    const followUpTemplate = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Acompanhamento - {{companyName}}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #F9FAFB; }
        .container { max-width: 800px; margin: 0 auto; background-color: #FFFFFF; }
        .header { background: linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 20px; margin: 20px 0; }
        .summary-card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 20px; text-align: center; }
        .summary-number { font-size: 32px; font-weight: bold; color: #1E40AF; margin-bottom: 5px; }
        .summary-label { color: #64748B; font-size: 14px; }
        .project-card { border: 1px solid #E2E8F0; border-radius: 8px; margin: 20px 0; overflow: hidden; }
        .project-header { background: #F8FAFC; padding: 20px; border-bottom: 1px solid #E2E8F0; }
        .project-content { padding: 20px; }
        .phase-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #F1F5F9; }
        .phase-item:last-child { border-bottom: none; }
        .blocked-phases { background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .next-steps { background: #F0F9FF; border: 1px solid #BAE6FD; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .footer { background: #F8FAFC; padding: 20px; text-align: center; color: #64748B; font-size: 14px; }
        .btn { display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>📊 Relatório de Acompanhamento</h1>
            <h2>{{companyName}}</h2>
            <p>Período: {{formatDate reportPeriodStart}} a {{formatDate reportPeriodEnd}}</p>
            <p>Gerado em: {{formatDate reportDate}}</p>
        </div>

        <!-- Content -->
        <div class="content">
            <!-- Summary -->
            <h3>📈 Resumo Executivo</h3>
            <div class="summary-grid">
                <div class="summary-card">
                    <div class="summary-number">{{summary.totalProjects}}</div>
                    <div class="summary-label">Total de Projetos</div>
                </div>
                <div class="summary-card">
                    <div class="summary-number">{{summary.completedProjects}}</div>
                    <div class="summary-label">Projetos Concluídos</div>
                </div>
                <div class="summary-card">
                    <div class="summary-number">{{summary.projectsAtRisk}}</div>
                    <div class="summary-label">Projetos em Risco</div>
                </div>
                <div class="summary-card">
                    <div class="summary-number">{{formatPercentage summary.overallProgress}}</div>
                    <div class="summary-label">Progresso Geral</div>
                </div>
            </div>

            <!-- Projects -->
            <h3>🚀 Detalhamento dos Projetos</h3>
            {{#each projects}}
            <div class="project-card">
                <div class="project-header">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h4 style="margin: 0; color: #1E293B;">{{name}}</h4>
                        <div>
                            {{{riskIndicator isAtRisk}}}
                            <span style="background-color: {{statusColor status}}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                                {{statusLabel status}}
                            </span>
                        </div>
                    </div>
                    <div style="margin-top: 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                            <span style="font-size: 14px; color: #64748B;">Progresso:</span>
                            <span style="font-weight: 600;">{{formatPercentage progressPercentage}}</span>
                        </div>
                        {{{progressBar progressPercentage}}}
                    </div>
                </div>
                <div class="project-content">
                    {{#if isAtRisk}}
                    <div style="background: #FEF2F2; border-left: 4px solid #DC2626; padding: 10px; margin-bottom: 15px;">
                        <strong>⚠️ Atenção:</strong> {{riskReason}}
                    </div>
                    {{/if}}
                    
                    <h5 style="color: #374151; margin-bottom: 10px;">Fases do Projeto:</h5>
                    {{#each phases}}
                    <div class="phase-item">
                        <div>
                            <span style="font-weight: 500;">{{name}}</span>
                            {{#if isBlocked}}
                            <span style="color: #DC2626; font-size: 12px; margin-left: 8px;">🚫 Bloqueado</span>
                            {{/if}}
                        </div>
                        <div style="text-align: right;">
                            <div>{{formatPercentage progressPercentage}}</div>
                            <div style="font-size: 12px; color: #64748B;">{{statusLabel status}}</div>
                        </div>
                    </div>
                    {{/each}}

                    {{#if nextSteps.length}}
                    <h5 style="color: #374151; margin: 15px 0 10px 0;">Próximos Passos:</h5>
                    <ul style="margin: 0; padding-left: 20px;">
                        {{#each nextSteps}}
                        <li style="margin-bottom: 5px;">{{this}}</li>
                        {{/each}}
                    </ul>
                    {{/if}}
                </div>
            </div>
            {{/each}}

            <!-- Blocked Phases -->
            {{#if blockedPhases.length}}
            <div class="blocked-phases">
                <h3 style="color: #DC2626; margin-top: 0;">🚫 Fases Bloqueadas</h3>
                {{#each blockedPhases}}
                <div style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #FECACA;">
                    <strong>{{name}}</strong>
                    {{#if blockReason}}
                    <div style="color: #7F1D1D; font-size: 14px; margin-top: 5px;">
                        Motivo: {{blockReason}}
                    </div>
                    {{/if}}
                </div>
                {{/each}}
            </div>
            {{/if}}

            <!-- Next Steps -->
            {{#if nextSteps.length}}
            <div class="next-steps">
                <h3 style="color: #1E40AF; margin-top: 0;">📋 Próximas Ações</h3>
                <ul style="margin: 0; padding-left: 20px;">
                    {{#each nextSteps}}
                    <li style="margin-bottom: 8px;">{{this}}</li>
                    {{/each}}
                </ul>
            </div>
            {{/if}}
        </div>

        <!-- Footer -->
        <div class="footer">
            <p>Este relatório foi gerado automaticamente pelo <strong>TimeFlow</strong></p>
            <p>Sistema de Gestão de Projetos BI</p>
            <p style="font-size: 12px; margin-top: 15px;">
                Para dúvidas ou suporte, entre em contato conosco.
            </p>
        </div>
    </div>
</body>
</html>
    `;

    this.templates.set('followUpReport', Handlebars.compile(followUpTemplate));
  }

  /**
   * Generate follow-up report email HTML
   */
  generateFollowUpReport(data: FollowUpReportData): string {
    const template = this.templates.get('followUpReport');
    if (!template) {
      throw new Error('Follow-up report template not found');
    }

    const html = template(data);
    
    // Inline CSS for better email client compatibility
    return juice(html);
  }

  /**
   * Generate test email HTML
   */
  generateTestEmail(recipientName?: string): string {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1>🎉 TimeFlow - Teste de Email</h1>
          <p>Sistema de Follow-up de Projetos</p>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #E2E8F0; border-radius: 0 0 8px 8px;">
          ${recipientName ? `<p>Olá, <strong>${recipientName}</strong>!</p>` : '<p>Olá!</p>'}
          
          <p>Este é um email de teste do sistema de follow-up automatizado do TimeFlow.</p>
          
          <p>Se você recebeu este email, significa que:</p>
          <ul>
            <li>✅ A configuração SMTP está funcionando corretamente</li>
            <li>✅ Os templates de email estão sendo gerados adequadamente</li>
            <li>✅ O sistema está pronto para enviar relatórios de follow-up</li>
          </ul>
          
          <div style="background: #F0F9FF; border: 1px solid #BAE6FD; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #1E40AF;">
              <strong>💡 Próximo passo:</strong> Configure as empresas que devem receber relatórios automáticos de follow-up.
            </p>
          </div>
          
          <hr style="border: 1px solid #E5E7EB; margin: 20px 0;">
          
          <p style="color: #6B7280; font-size: 14px; text-align: center;">
            Enviado em: ${format(new Date(), 'dd/MM/yyyy \'às\' HH:mm', { locale: ptBR })}<br>
            TimeFlow - Sistema de Gestão de Projetos BI
          </p>
        </div>
      </div>
    `;

    return juice(html);
  }
}

// Singleton instance
export const emailTemplateService = new EmailTemplateService();
