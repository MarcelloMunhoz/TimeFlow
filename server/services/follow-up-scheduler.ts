import * as cron from 'node-cron';
import { followUpReportService } from './follow-up-report-service';
import { emailService } from './email-service';
import { emailTemplateService } from './email-template-service';
import { storage } from '../storage';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface SchedulerStatus {
  isRunning: boolean;
  lastExecution?: string;
  nextExecution?: string;
  totalReportsSent: number;
  totalErrors: number;
  scheduledJobs: ScheduledJob[];
}

export interface ScheduledJob {
  id: string;
  companyId: number;
  companyName: string;
  schedule: string;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  status: 'active' | 'inactive' | 'error';
}

export class FollowUpScheduler {
  private jobs: Map<string, any> = new Map();
  private status: SchedulerStatus = {
    isRunning: false,
    totalReportsSent: 0,
    totalErrors: 0,
    scheduledJobs: []
  };

  /**
   * Initialize the scheduler
   */
  async initialize(): Promise<void> {
    try {
      console.log('🕐 Initializing Follow-up Scheduler...');
      
      // Load and schedule all active follow-up settings
      await this.loadAndScheduleJobs();
      
      // Schedule a daily check for configuration changes
      this.scheduleDailyConfigCheck();
      
      this.status.isRunning = true;
      console.log('✅ Follow-up Scheduler initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Follow-up Scheduler:', error);
      throw error;
    }
  }

  /**
   * Load and schedule jobs for all companies
   */
  private async loadAndScheduleJobs(): Promise<void> {
    try {
      const settings = await storage.getAllFollowUpSettings();
      
      console.log(`📋 Found ${settings.length} follow-up configurations`);
      
      for (const setting of settings) {
        if (setting.enabled && setting.isActive) {
          await this.scheduleCompanyJob(setting);
        }
      }
      
      console.log(`✅ Scheduled ${this.jobs.size} follow-up jobs`);
      
    } catch (error) {
      console.error('❌ Error loading and scheduling jobs:', error);
      throw error;
    }
  }

  /**
   * Schedule a job for a specific company
   */
  private async scheduleCompanyJob(setting: any): Promise<void> {
    try {
      const jobId = `follow-up-${setting.companyId}`;
      
      // Remove existing job if it exists
      if (this.jobs.has(jobId)) {
        this.jobs.get(jobId)?.destroy();
        this.jobs.delete(jobId);
      }

      // Create cron schedule based on settings
      const cronSchedule = this.createCronSchedule(setting);
      
      console.log(`📅 Scheduling job for ${setting.companyName}: ${cronSchedule}`);
      
      // Create and start the cron job
      const task = cron.schedule(cronSchedule, async () => {
        await this.executeFollowUpJob(setting.companyId, setting.companyName);
      }, {
        scheduled: true,
        timezone: 'America/Sao_Paulo'
      } as any);

      this.jobs.set(jobId, task);
      
      // Update status
      this.updateJobStatus(setting, cronSchedule);
      
    } catch (error) {
      console.error(`❌ Error scheduling job for company ${setting.companyId}:`, error);
      this.status.totalErrors++;
    }
  }

  /**
   * Create cron schedule from settings
   */
  private createCronSchedule(setting: any): string {
    const [hour, minute] = setting.sendTime.split(':').map(Number);
    const dayOfWeek = setting.sendDay; // 0 = Sunday, 1 = Monday, etc.
    
    switch (setting.emailFrequency) {
      case 'weekly':
        // Every week on the specified day at the specified time
        return `${minute} ${hour} * * ${dayOfWeek}`;
      
      case 'biweekly':
        // Every two weeks on the specified day at the specified time
        // Note: This is a simplified version - for true biweekly, we'd need more complex logic
        return `${minute} ${hour} * * ${dayOfWeek}`;
      
      case 'monthly':
        // First occurrence of the specified day each month at the specified time
        return `${minute} ${hour} 1-7 * ${dayOfWeek}`;
      
      default:
        // Default to weekly
        return `${minute} ${hour} * * ${dayOfWeek}`;
    }
  }

  /**
   * Execute follow-up job for a company
   */
  private async executeFollowUpJob(companyId: number, companyName: string): Promise<void> {
    console.log(`🚀 Executing follow-up job for ${companyName} (ID: ${companyId})`);
    
    try {
      // Generate report
      const reportResult = await followUpReportService.generateReport(companyId);
      
      if (!reportResult.success || !reportResult.reportData) {
        throw new Error(reportResult.error || 'Failed to generate report');
      }

      console.log(`📊 Report generated for ${companyName}`);

      // Get company settings for email recipients
      const settings = await storage.getFollowUpSettings(companyId);
      
      if (!settings || !settings.recipientEmails) {
        console.log(`⚠️ No email recipients configured for ${companyName}`);
        return;
      }

      // Generate email HTML
      const emailHtml = emailTemplateService.generateFollowUpReport(reportResult.reportData);

      // Send email
      const recipients = JSON.parse(settings.recipientEmails);
      const emailResult = await emailService.sendEmail({
        to: recipients,
        subject: `Relatório de Acompanhamento - ${companyName}`,
        html: emailHtml,
        reportId: reportResult.reportId
      });

      if (emailResult.success) {
        // Update report as sent
        await storage.updateFollowUpReport(reportResult.reportId!, {
          emailSent: true,
          sentAt: new Date().toISOString()
        });

        // Update last sent date in settings
        await storage.updateFollowUpSettings(companyId, {
          lastSentDate: format(new Date(), 'yyyy-MM-dd')
        });

        this.status.totalReportsSent++;
        console.log(`✅ Follow-up report sent successfully to ${companyName}`);
        
      } else {
        throw new Error(emailResult.error || 'Failed to send email');
      }

    } catch (error) {
      console.error(`❌ Error executing follow-up job for ${companyName}:`, error);
      this.status.totalErrors++;
      
      // Log the error for monitoring
      // In production, you might want to send alerts or notifications
    }
  }

  /**
   * Update job status in the scheduler status
   */
  private updateJobStatus(setting: any, cronSchedule: string): void {
    const jobIndex = this.status.scheduledJobs.findIndex(j => j.companyId === setting.companyId);
    
    const jobStatus: ScheduledJob = {
      id: `follow-up-${setting.companyId}`,
      companyId: setting.companyId,
      companyName: setting.companyName,
      schedule: cronSchedule,
      enabled: setting.enabled,
      status: 'active'
    };

    if (jobIndex >= 0) {
      this.status.scheduledJobs[jobIndex] = jobStatus;
    } else {
      this.status.scheduledJobs.push(jobStatus);
    }
  }

  /**
   * Schedule daily configuration check
   */
  private scheduleDailyConfigCheck(): void {
    // Check for configuration changes every day at 6 AM
    cron.schedule('0 6 * * *', async () => {
      console.log('🔄 Checking for follow-up configuration changes...');
      await this.reloadJobs();
    }, {
      scheduled: true,
      timezone: 'America/Sao_Paulo'
    } as any);
  }

  /**
   * Reload all jobs (useful when configuration changes)
   */
  async reloadJobs(): Promise<void> {
    try {
      console.log('🔄 Reloading follow-up jobs...');
      
      // Stop all existing jobs
      this.stopAllJobs();
      
      // Clear status
      this.status.scheduledJobs = [];
      
      // Reload and schedule jobs
      await this.loadAndScheduleJobs();
      
      console.log('✅ Follow-up jobs reloaded successfully');
      
    } catch (error) {
      console.error('❌ Error reloading jobs:', error);
      this.status.totalErrors++;
    }
  }

  /**
   * Stop all scheduled jobs
   */
  stopAllJobs(): void {
    console.log('🛑 Stopping all follow-up jobs...');
    
    this.jobs.forEach((task, jobId) => {
      task.destroy();
      console.log(`🛑 Stopped job: ${jobId}`);
    });
    
    this.jobs.clear();
    this.status.isRunning = false;
    
    console.log('✅ All follow-up jobs stopped');
  }

  /**
   * Manually trigger a follow-up job for a company
   */
  async triggerManualJob(companyId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const company = await storage.getCompanies();
      const targetCompany = company.find(c => c.id === companyId);
      
      if (!targetCompany) {
        return { success: false, error: 'Company not found' };
      }

      await this.executeFollowUpJob(companyId, targetCompany.name);
      
      return { success: true };
      
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): SchedulerStatus {
    return {
      ...this.status,
      lastExecution: this.status.lastExecution,
      nextExecution: this.getNextExecution()
    };
  }

  /**
   * Get next execution time
   */
  private getNextExecution(): string | undefined {
    // This is a simplified version - in production you might want more sophisticated logic
    const now = new Date();
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + (1 + 7 - now.getDay()) % 7);
    nextMonday.setHours(8, 0, 0, 0);
    
    return nextMonday.toISOString();
  }

  /**
   * Enable/disable a specific company's job
   */
  async toggleCompanyJob(companyId: number, enabled: boolean): Promise<void> {
    const jobId = `follow-up-${companyId}`;
    
    if (enabled) {
      // Reload the specific job
      const settings = await storage.getFollowUpSettings(companyId);
      if (settings) {
        await this.scheduleCompanyJob(settings);
      }
    } else {
      // Stop the specific job
      const task = this.jobs.get(jobId);
      if (task) {
        task.destroy();
        this.jobs.delete(jobId);
      }
      
      // Update status
      const jobIndex = this.status.scheduledJobs.findIndex(j => j.companyId === companyId);
      if (jobIndex >= 0) {
        this.status.scheduledJobs[jobIndex].status = 'inactive';
      }
    }
  }
}

// Singleton instance
export const followUpScheduler = new FollowUpScheduler();
