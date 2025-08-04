-- Migration: Add Follow-up System Tables
-- Description: Creates tables for automated project follow-up reports and email system
-- Date: 2025-01-03

-- ===== EMAIL SETTINGS TABLE =====
-- Global SMTP configuration for sending follow-up emails
CREATE TABLE IF NOT EXISTS email_settings (
  id SERIAL PRIMARY KEY,
  smtp_host TEXT NOT NULL,
  smtp_port INTEGER NOT NULL DEFAULT 587,
  smtp_user TEXT NOT NULL,
  smtp_password TEXT NOT NULL, -- Should be encrypted in production
  smtp_secure BOOLEAN DEFAULT false, -- TLS/SSL
  from_email TEXT NOT NULL,
  from_name TEXT NOT NULL DEFAULT 'TimeFlow',
  is_active BOOLEAN DEFAULT true,
  created_at TEXT NOT NULL DEFAULT (NOW()::TEXT),
  updated_at TEXT NOT NULL DEFAULT (NOW()::TEXT)
);

-- ===== FOLLOW-UP SETTINGS TABLE =====
-- Per-company configuration for follow-up reports
CREATE TABLE IF NOT EXISTS follow_up_settings (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  email_frequency TEXT NOT NULL DEFAULT 'weekly', -- weekly, biweekly, monthly
  send_day INTEGER DEFAULT 1, -- 1=Monday, 2=Tuesday, etc.
  send_time TEXT DEFAULT '08:00', -- HH:MM format
  recipient_emails TEXT, -- JSON array of email addresses
  custom_template TEXT, -- Custom email template HTML
  include_blocked_phases BOOLEAN DEFAULT true,
  include_progress_charts BOOLEAN DEFAULT true,
  include_next_steps BOOLEAN DEFAULT true,
  last_sent_date TEXT, -- YYYY-MM-DD format
  is_active BOOLEAN DEFAULT true,
  created_at TEXT NOT NULL DEFAULT (NOW()::TEXT),
  updated_at TEXT NOT NULL DEFAULT (NOW()::TEXT),
  
  -- Ensure one settings record per company
  UNIQUE(company_id)
);

-- ===== FOLLOW-UP REPORTS TABLE =====
-- Historical reports generated for companies
CREATE TABLE IF NOT EXISTS follow_up_reports (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  report_date TEXT NOT NULL, -- YYYY-MM-DD format
  report_period_start TEXT NOT NULL, -- YYYY-MM-DD format
  report_period_end TEXT NOT NULL, -- YYYY-MM-DD format
  content_json TEXT NOT NULL, -- JSON with report data
  html_content TEXT, -- Generated HTML for email
  total_projects INTEGER DEFAULT 0,
  completed_projects INTEGER DEFAULT 0,
  projects_at_risk INTEGER DEFAULT 0,
  overall_progress INTEGER DEFAULT 0, -- 0-100 percentage
  email_sent BOOLEAN DEFAULT false,
  sent_at TEXT, -- ISO timestamp when email was sent
  generated_by INTEGER REFERENCES users(id), -- User who generated (null for auto)
  created_at TEXT NOT NULL DEFAULT (NOW()::TEXT)
);

-- ===== EMAIL LOGS TABLE =====
-- Tracking email delivery and status
CREATE TABLE IF NOT EXISTS email_logs (
  id SERIAL PRIMARY KEY,
  report_id INTEGER REFERENCES follow_up_reports(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed, bounced
  error_message TEXT, -- Error details if failed
  sent_at TEXT, -- ISO timestamp when email was sent
  delivered_at TEXT, -- ISO timestamp when email was delivered
  opened_at TEXT, -- ISO timestamp when email was opened (if tracking enabled)
  retry_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (NOW()::TEXT)
);

-- ===== INDEXES FOR PERFORMANCE =====

-- Follow-up settings indexes
CREATE INDEX IF NOT EXISTS idx_follow_up_settings_company_id ON follow_up_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_settings_enabled ON follow_up_settings(enabled);

-- Follow-up reports indexes
CREATE INDEX IF NOT EXISTS idx_follow_up_reports_company_id ON follow_up_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_reports_date ON follow_up_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_follow_up_reports_period ON follow_up_reports(report_period_start, report_period_end);
CREATE INDEX IF NOT EXISTS idx_follow_up_reports_email_sent ON follow_up_reports(email_sent);

-- Email logs indexes
CREATE INDEX IF NOT EXISTS idx_email_logs_report_id ON email_logs(report_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);

-- ===== DEFAULT DATA =====

-- Insert default email settings (will need to be configured)
INSERT INTO email_settings (
  smtp_host, 
  smtp_port, 
  smtp_user, 
  smtp_password, 
  from_email, 
  from_name,
  is_active
) VALUES (
  'smtp.gmail.com',
  587,
  'noreply@timeflow.com',
  'your_app_password_here',
  'noreply@timeflow.com',
  'TimeFlow - Sistema de Gestão de Projetos',
  false -- Disabled by default until configured
) ON CONFLICT DO NOTHING;

-- Enable follow-up for all existing client companies by default
INSERT INTO follow_up_settings (
  company_id,
  enabled,
  email_frequency,
  send_day,
  send_time,
  recipient_emails
)
SELECT 
  id,
  true,
  'weekly',
  1, -- Monday
  '08:00',
  CASE 
    WHEN email IS NOT NULL AND email != '' THEN '["' || email || '"]'
    ELSE NULL
  END
FROM companies 
WHERE type = 'client' 
  AND is_active = true
ON CONFLICT (company_id) DO NOTHING;

-- ===== TRIGGERS FOR UPDATED_AT =====

-- Trigger for email_settings updated_at
CREATE OR REPLACE FUNCTION update_email_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW()::TEXT;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_email_settings_updated_at
  BEFORE UPDATE ON email_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_email_settings_updated_at();

-- Trigger for follow_up_settings updated_at
CREATE OR REPLACE FUNCTION update_follow_up_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW()::TEXT;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_follow_up_settings_updated_at
  BEFORE UPDATE ON follow_up_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_follow_up_settings_updated_at();

-- ===== COMMENTS =====

COMMENT ON TABLE email_settings IS 'Global SMTP configuration for sending follow-up emails';
COMMENT ON TABLE follow_up_settings IS 'Per-company configuration for automated follow-up reports';
COMMENT ON TABLE follow_up_reports IS 'Historical follow-up reports generated for companies';
COMMENT ON TABLE email_logs IS 'Tracking email delivery status and logs';

COMMENT ON COLUMN follow_up_settings.email_frequency IS 'Frequency of reports: weekly, biweekly, monthly';
COMMENT ON COLUMN follow_up_settings.send_day IS 'Day of week to send: 1=Monday, 2=Tuesday, etc.';
COMMENT ON COLUMN follow_up_settings.recipient_emails IS 'JSON array of email addresses to receive reports';
COMMENT ON COLUMN follow_up_reports.content_json IS 'Complete report data in JSON format';
COMMENT ON COLUMN email_logs.status IS 'Email status: pending, sent, failed, bounced';
