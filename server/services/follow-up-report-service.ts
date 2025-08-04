import { db } from '../db';
import { 
  companies, projects, projectPhases, phases, 
  followUpSettings, followUpReports 
} from '../../shared/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { 
  FollowUpReportData, 
  ProjectProgress, 
  PhaseProgress 
} from './email-template-service';

export interface ReportFilters {
  companyId?: number;
  startDate?: string;
  endDate?: string;
  includeCompleted?: boolean;
}

export interface ReportGenerationResult {
  success: boolean;
  reportId?: number;
  reportData?: FollowUpReportData;
  error?: string;
}

export class FollowUpReportService {
  
  /**
   * Generate follow-up report for a company
   */
  async generateReport(companyId: number, filters?: ReportFilters): Promise<ReportGenerationResult> {
    try {
      console.log(`📊 Generating follow-up report for company ${companyId}...`);

      // Get company information
      const company = await this.getCompanyInfo(companyId);
      if (!company) {
        return {
          success: false,
          error: `Company with ID ${companyId} not found`
        };
      }

      // Get report period
      const reportPeriod = this.getReportPeriod(filters);
      
      // Get projects data
      const projectsData = await this.getProjectsData(companyId, reportPeriod);
      
      // Calculate summary metrics
      const summary = this.calculateSummary(projectsData);
      
      // Identify blocked phases
      const blockedPhases = this.identifyBlockedPhases(projectsData);
      
      // Generate next steps
      const nextSteps = this.generateNextSteps(projectsData, blockedPhases);

      // Create report data
      const reportData: FollowUpReportData = {
        companyName: company.name,
        reportDate: new Date().toISOString(),
        reportPeriodStart: reportPeriod.startDate,
        reportPeriodEnd: reportPeriod.endDate,
        projects: projectsData,
        summary,
        blockedPhases,
        nextSteps
      };

      // Save report to database
      const reportId = await this.saveReport(companyId, reportData, reportPeriod);

      console.log(`✅ Follow-up report generated successfully for ${company.name}`);

      return {
        success: true,
        reportId,
        reportData
      };

    } catch (error) {
      console.error('❌ Error generating follow-up report:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get company information
   */
  private async getCompanyInfo(companyId: number) {
    const result = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
    
    return result[0] || null;
  }

  /**
   * Get report period (default: last week)
   */
  private getReportPeriod(filters?: ReportFilters) {
    const now = new Date();
    
    if (filters?.startDate && filters?.endDate) {
      return {
        startDate: filters.startDate,
        endDate: filters.endDate
      };
    }

    // Default: last week (Monday to Sunday)
    const lastWeekStart = startOfWeek(subDays(now, 7), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subDays(now, 7), { weekStartsOn: 1 });

    return {
      startDate: format(lastWeekStart, 'yyyy-MM-dd'),
      endDate: format(lastWeekEnd, 'yyyy-MM-dd')
    };
  }

  /**
   * Get projects data with phases
   */
  private async getProjectsData(companyId: number, reportPeriod: { startDate: string; endDate: string }): Promise<ProjectProgress[]> {
    // Get all active projects for the company
    const projectsQuery = await db
      .select({
        id: projects.id,
        name: projects.name,
        status: projects.status,
        progressPercentage: projects.progressPercentage,
        startDate: projects.startDate,
        endDate: projects.endDate,
        priority: projects.priority
      })
      .from(projects)
      .where(
        and(
          eq(projects.companyId, companyId),
          eq(projects.status, 'active')
        )
      )
      .orderBy(projects.name);

    const projectsData: ProjectProgress[] = [];

    for (const project of projectsQuery) {
      // Get phases for this project
      const phasesData = await this.getProjectPhases(project.id);
      
      // Determine if project is at risk
      const riskAssessment = this.assessProjectRisk(project, phasesData);
      
      // Generate next steps for this project
      const projectNextSteps = this.generateProjectNextSteps(project, phasesData);

      projectsData.push({
        id: project.id,
        name: project.name,
        status: project.status || 'active',
        progressPercentage: project.progressPercentage || 0,
        phases: phasesData,
        isAtRisk: riskAssessment.isAtRisk,
        riskReason: riskAssessment.reason,
        nextSteps: projectNextSteps
      });
    }

    return projectsData;
  }

  /**
   * Get phases for a project
   */
  private async getProjectPhases(projectId: number): Promise<PhaseProgress[]> {
    const phasesQuery = await db
      .select({
        id: projectPhases.id,
        phaseId: projectPhases.phaseId,
        phaseName: phases.name,
        status: projectPhases.status,
        progressPercentage: projectPhases.progressPercentage,
        startDate: projectPhases.startDate,
        endDate: projectPhases.endDate,
        actualStartDate: projectPhases.actualStartDate,
        actualEndDate: projectPhases.actualEndDate,
        notes: projectPhases.notes
      })
      .from(projectPhases)
      .leftJoin(phases, eq(projectPhases.phaseId, phases.id))
      .where(eq(projectPhases.projectId, projectId))
      .orderBy(phases.orderIndex);

    return phasesQuery.map(phase => {
      const isBlocked = this.isPhaseBlocked(phase);
      const daysRemaining = this.calculateDaysRemaining(phase.endDate || undefined);

      return {
        id: phase.id,
        name: phase.phaseName || 'Fase sem nome',
        status: phase.status || 'not_started',
        progressPercentage: phase.progressPercentage || 0,
        startDate: phase.startDate || undefined,
        endDate: phase.endDate || undefined,
        isBlocked: isBlocked.blocked,
        blockReason: isBlocked.reason,
        daysRemaining
      };
    });
  }

  /**
   * Check if a phase is blocked
   */
  private isPhaseBlocked(phase: any): { blocked: boolean; reason?: string } {
    const now = new Date();
    
    // Phase is blocked if it's overdue and not completed
    if (phase.endDate && phase.status !== 'completed') {
      const endDate = new Date(phase.endDate);
      if (endDate < now) {
        return {
          blocked: true,
          reason: `Fase atrasada - prazo era ${format(endDate, 'dd/MM/yyyy', { locale: ptBR })}`
        };
      }
    }

    // Phase is blocked if it's in progress but has 0% progress for more than expected
    if (phase.status === 'in_progress' && (phase.progressPercentage || 0) === 0) {
      return {
        blocked: true,
        reason: 'Fase em andamento sem progresso registrado'
      };
    }

    // Check for specific blocking conditions in notes
    if (phase.notes && phase.notes.toLowerCase().includes('bloqueado')) {
      return {
        blocked: true,
        reason: 'Bloqueio identificado nas observações'
      };
    }

    return { blocked: false };
  }

  /**
   * Calculate days remaining for a phase
   */
  private calculateDaysRemaining(endDate?: string): number | undefined {
    if (!endDate) return undefined;
    
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  /**
   * Assess if a project is at risk
   */
  private assessProjectRisk(project: any, phases: PhaseProgress[]): { isAtRisk: boolean; reason?: string } {
    // Project is at risk if it has blocked phases
    const blockedPhases = phases.filter(p => p.isBlocked);
    if (blockedPhases.length > 0) {
      return {
        isAtRisk: true,
        reason: `${blockedPhases.length} fase(s) bloqueada(s)`
      };
    }

    // Project is at risk if overall progress is too low for the time elapsed
    const progressPercentage = project.progressPercentage || 0;
    if (progressPercentage < 20 && project.startDate) {
      const startDate = new Date(project.startDate);
      const now = new Date();
      const daysElapsed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysElapsed > 30) { // More than 30 days with less than 20% progress
        return {
          isAtRisk: true,
          reason: 'Progresso baixo para o tempo decorrido'
        };
      }
    }

    // Project is at risk if it's overdue
    if (project.endDate) {
      const endDate = new Date(project.endDate);
      const now = new Date();
      if (endDate < now && project.status !== 'completed') {
        return {
          isAtRisk: true,
          reason: `Projeto atrasado - prazo era ${format(endDate, 'dd/MM/yyyy', { locale: ptBR })}`
        };
      }
    }

    return { isAtRisk: false };
  }

  /**
   * Calculate summary metrics
   */
  private calculateSummary(projects: ProjectProgress[]) {
    const totalProjects = projects.length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    const projectsAtRisk = projects.filter(p => p.isAtRisk).length;
    
    // Calculate overall progress as average of all projects
    const totalProgress = projects.reduce((sum, p) => sum + (p.progressPercentage || 0), 0);
    const overallProgress = totalProjects > 0 ? Math.round(totalProgress / totalProjects) : 0;

    return {
      totalProjects,
      completedProjects,
      projectsAtRisk,
      overallProgress
    };
  }

  /**
   * Identify blocked phases across all projects
   */
  private identifyBlockedPhases(projects: ProjectProgress[]): PhaseProgress[] {
    const blockedPhases: PhaseProgress[] = [];
    
    for (const project of projects) {
      const blocked = project.phases.filter(p => p.isBlocked);
      blockedPhases.push(...blocked);
    }

    return blockedPhases;
  }

  /**
   * Generate next steps for a project
   */
  private generateProjectNextSteps(project: any, phases: PhaseProgress[]): string[] {
    const steps: string[] = [];
    
    // Find current phase
    const currentPhase = phases.find(p => p.status === 'in_progress');
    if (currentPhase) {
      steps.push(`Continuar desenvolvimento da fase "${currentPhase.name}"`);
    }

    // Find next phase to start
    const nextPhase = phases.find(p => p.status === 'not_started');
    if (nextPhase) {
      steps.push(`Preparar início da fase "${nextPhase.name}"`);
    }

    // Address blocked phases
    const blockedPhases = phases.filter(p => p.isBlocked);
    for (const blocked of blockedPhases) {
      steps.push(`Resolver bloqueio na fase "${blocked.name}"`);
    }

    return steps;
  }

  /**
   * Generate overall next steps
   */
  private generateNextSteps(projects: ProjectProgress[], blockedPhases: PhaseProgress[]): string[] {
    const steps: string[] = [];

    // Address blocked phases first
    if (blockedPhases.length > 0) {
      steps.push(`Resolver ${blockedPhases.length} fase(s) bloqueada(s)`);
    }

    // Projects at risk
    const atRiskProjects = projects.filter(p => p.isAtRisk);
    if (atRiskProjects.length > 0) {
      steps.push(`Revisar ${atRiskProjects.length} projeto(s) em risco`);
    }

    // General recommendations
    steps.push('Agendar reunião de alinhamento com stakeholders');
    steps.push('Atualizar cronogramas dos projetos em andamento');

    return steps;
  }

  /**
   * Save report to database
   */
  private async saveReport(
    companyId: number, 
    reportData: FollowUpReportData, 
    reportPeriod: { startDate: string; endDate: string }
  ): Promise<number> {
    const [report] = await db.insert(followUpReports).values({
      companyId,
      reportDate: format(new Date(), 'yyyy-MM-dd'),
      reportPeriodStart: reportPeriod.startDate,
      reportPeriodEnd: reportPeriod.endDate,
      contentJson: JSON.stringify(reportData),
      totalProjects: reportData.summary.totalProjects,
      completedProjects: reportData.summary.completedProjects,
      projectsAtRisk: reportData.summary.projectsAtRisk,
      overallProgress: reportData.summary.overallProgress,
      emailSent: false
    }).returning();

    return report.id;
  }

  /**
   * Get companies that should receive follow-up reports
   */
  async getCompaniesForFollowUp(): Promise<any[]> {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

    return await db
      .select({
        companyId: followUpSettings.companyId,
        companyName: companies.name,
        settings: followUpSettings
      })
      .from(followUpSettings)
      .leftJoin(companies, eq(followUpSettings.companyId, companies.id))
      .where(
        and(
          eq(followUpSettings.enabled, true),
          eq(followUpSettings.isActive, true),
          eq(followUpSettings.sendDay, dayOfWeek)
        )
      );
  }
}

// Singleton instance
export const followUpReportService = new FollowUpReportService();
