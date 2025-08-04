import nodemailer from 'nodemailer';
import { db } from '../db';
import { emailSettings, emailLogs } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import type { EmailSettings, InsertEmailLog } from '../../shared/schema';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  reportId?: number;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  logId?: number;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private settings: EmailSettings | null = null;

  /**
   * Initialize the email service with current settings
   */
  async initialize(): Promise<void> {
    try {
      // Get active email settings
      const activeSettings = await db
        .select()
        .from(emailSettings)
        .where(eq(emailSettings.isActive, true))
        .limit(1);

      if (activeSettings.length === 0) {
        throw new Error('No active email settings found. Please configure SMTP settings first.');
      }

      this.settings = activeSettings[0];

      // Create transporter
      this.transporter = nodemailer.createTransport({
        host: this.settings.smtpHost,
        port: this.settings.smtpPort,
        secure: this.settings.smtpSecure, // true for 465, false for other ports
        auth: {
          user: this.settings.smtpUser,
          pass: this.settings.smtpPassword,
        },
        tls: {
          rejectUnauthorized: false // Allow self-signed certificates
        }
      } as any);

      console.log('📧 Email service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error);
      throw error;
    }
  }

  /**
   * Send an email
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    if (!this.transporter || !this.settings) {
      await this.initialize();
    }

    const recipients = Array.isArray(options.to) ? options.to : [options.to];
    const results: EmailResult[] = [];

    // Send to each recipient individually for better tracking
    for (const recipient of recipients) {
      const result = await this.sendSingleEmail({
        ...options,
        to: recipient
      });
      results.push(result);
    }

    // Return combined result
    const allSuccessful = results.every(r => r.success);
    return {
      success: allSuccessful,
      messageId: results.find(r => r.messageId)?.messageId,
      error: allSuccessful ? undefined : results.filter(r => !r.success).map(r => r.error).join('; '),
      logId: results[0]?.logId
    };
  }

  /**
   * Send email to a single recipient
   */
  private async sendSingleEmail(options: EmailOptions): Promise<EmailResult> {
    if (!this.transporter || !this.settings) {
      throw new Error('Email service not initialized');
    }

    const recipient = Array.isArray(options.to) ? options.to[0] : options.to;
    let logId: number | undefined;

    try {
      // Create email log entry
      if (options.reportId) {
        const [log] = await db.insert(emailLogs).values({
          reportId: options.reportId,
          recipientEmail: recipient,
          subject: options.subject,
          status: 'pending'
        }).returning();
        logId = log.id;
      }

      // Send email
      const info = await this.transporter.sendMail({
        from: `"${this.settings.fromName}" <${this.settings.fromEmail}>`,
        to: recipient,
        subject: options.subject,
        html: options.html,
        text: options.text || this.htmlToText(options.html)
      });

      // Update log with success
      if (logId) {
        await db.update(emailLogs)
          .set({
            status: 'sent',
            sentAt: new Date().toISOString()
          })
          .where(eq(emailLogs.id, logId));
      }

      console.log(`📧 Email sent successfully to ${recipient}:`, info.messageId);

      return {
        success: true,
        messageId: info.messageId,
        logId
      };

    } catch (error) {
      console.error(`❌ Failed to send email to ${recipient}:`, error);

      // Update log with error
      if (logId) {
        await db.update(emailLogs)
          .set({
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          })
          .where(eq(emailLogs.id, logId));
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        logId
      };
    }
  }

  /**
   * Test email configuration
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.transporter) {
        await this.initialize();
      }

      if (!this.transporter) {
        throw new Error('Failed to initialize transporter');
      }

      await this.transporter.verify();
      console.log('📧 Email connection test successful');
      
      return { success: true };
    } catch (error) {
      console.error('❌ Email connection test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send test email
   */
  async sendTestEmail(to: string): Promise<EmailResult> {
    const testHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B82F6;">TimeFlow - Teste de Email</h2>
        <p>Este é um email de teste do sistema TimeFlow.</p>
        <p>Se você recebeu este email, a configuração SMTP está funcionando corretamente.</p>
        <hr style="border: 1px solid #E5E7EB; margin: 20px 0;">
        <p style="color: #6B7280; font-size: 14px;">
          Enviado em: ${new Date().toLocaleString('pt-BR')}
        </p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: 'TimeFlow - Teste de Configuração de Email',
      html: testHtml
    });
  }

  /**
   * Convert HTML to plain text (basic implementation)
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&') // Replace &amp; with &
      .replace(/&lt;/g, '<') // Replace &lt; with <
      .replace(/&gt;/g, '>') // Replace &gt; with >
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
  }

  /**
   * Get email settings
   */
  async getSettings(): Promise<EmailSettings | null> {
    const activeSettings = await db
      .select()
      .from(emailSettings)
      .where(eq(emailSettings.isActive, true))
      .limit(1);

    return activeSettings[0] || null;
  }

  /**
   * Update email settings
   */
  async updateSettings(newSettings: Partial<EmailSettings>): Promise<void> {
    const currentSettings = await this.getSettings();
    
    if (!currentSettings) {
      throw new Error('No email settings found');
    }

    await db.update(emailSettings)
      .set({
        ...newSettings,
        updatedAt: new Date().toISOString()
      })
      .where(eq(emailSettings.id, currentSettings.id));

    // Reinitialize with new settings
    this.transporter = null;
    this.settings = null;
    await this.initialize();
  }
}

// Singleton instance
export const emailService = new EmailService();
