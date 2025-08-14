-- Migration: Create email system tables
-- Created: 2024-12-07
-- Description: Creates tables for SMTP configuration and email logs

-- Table for SMTP configuration
CREATE TABLE IF NOT EXISTS smtp_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    smtp_server VARCHAR(255) NOT NULL,
    smtp_port INTEGER NOT NULL DEFAULT 587,
    smtp_user VARCHAR(255) NOT NULL,
    smtp_password_encrypted TEXT NOT NULL,
    from_email VARCHAR(255) NOT NULL DEFAULT 'noreply@meudominio.com',
    from_name VARCHAR(255) NOT NULL DEFAULT 'Equipe TimeFlow',
    ssl_enabled BOOLEAN NOT NULL DEFAULT 1,
    tls_enabled BOOLEAN NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table for email logs
CREATE TABLE IF NOT EXISTS email_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    subject VARCHAR(500) NOT NULL,
    body_html TEXT,
    body_text TEXT,
    status VARCHAR(50) NOT NULL, -- 'pending', 'sent', 'failed', 'retry'
    error_message TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    smtp_config_id INTEGER,
    project_id INTEGER,
    company_id INTEGER,
    attachment_paths TEXT, -- JSON array of file paths
    scheduled_at DATETIME,
    sent_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (smtp_config_id) REFERENCES smtp_config(id),
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- Table for email templates
CREATE TABLE IF NOT EXISTS email_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    subject_template VARCHAR(500) NOT NULL,
    html_template TEXT NOT NULL,
    text_template TEXT,
    template_type VARCHAR(100) NOT NULL, -- 'followup', 'report', 'notification'
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table for email automation schedules
CREATE TABLE IF NOT EXISTS email_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    template_id INTEGER NOT NULL,
    cron_expression VARCHAR(100) NOT NULL, -- e.g., '0 9 * * 1' for every Monday at 9 AM
    is_active BOOLEAN NOT NULL DEFAULT 1,
    last_run_at DATETIME,
    next_run_at DATETIME,
    project_filter TEXT, -- JSON filter criteria
    company_filter TEXT, -- JSON filter criteria
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES email_templates(id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_project_id ON email_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_company_id ON email_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_email_schedules_next_run ON email_schedules(next_run_at, is_active);

-- Insert default follow-up email template
INSERT OR IGNORE INTO email_templates (id, name, subject_template, html_template, text_template, template_type) VALUES (
    1,
    'Follow-up Semanal de Projeto',
    '📊 Atualização do Projeto {{project_name}} – {{current_date}}',
    '<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Atualização do Projeto</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .progress-bar { background: #e0e0e0; border-radius: 10px; overflow: hidden; margin: 10px 0; }
        .progress-fill { background: linear-gradient(90deg, #4CAF50, #45a049); height: 20px; border-radius: 10px; }
        .status-badge { display: inline-block; padding: 5px 10px; border-radius: 15px; font-size: 12px; font-weight: bold; }
        .status-green { background: #4CAF50; color: white; }
        .status-yellow { background: #FFC107; color: #333; }
        .status-red { background: #f44336; color: white; }
        .phase-item { margin: 15px 0; padding: 15px; background: white; border-radius: 8px; border-left: 4px solid #667eea; }
        .footer { text-align: center; margin-top: 30px; padding: 20px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Atualização do Projeto</h1>
            <h2>{{project_name}}</h2>
            <p>{{current_date}}</p>
        </div>
        <div class="content">
            <p>Olá {{client_name}},</p>
            
            <h3>📈 Resumo Executivo</h3>
            <div class="progress-bar">
                <div class="progress-fill" style="width: {{progress_percentage}}%"></div>
            </div>
            <p><strong>Progresso:</strong> {{progress_percentage}}% concluído</p>
            <p><strong>Status:</strong> <span class="status-badge {{status_class}}">{{status_text}}</span></p>
            <p><strong>Próxima Entrega:</strong> {{next_delivery}}</p>
            
            <h3>🎯 Timeline de Fases</h3>
            {{phases_html}}
            
            <h3>✨ Destaques da Semana</h3>
            {{highlights_html}}
            
            <h3>🚀 Próximos Passos</h3>
            {{next_steps_html}}
            
            {{risks_section}}
            
            <h3>📎 Anexos e Links</h3>
            <p>• Relatório detalhado em anexo (PDF/Excel)</p>
            {{dashboard_link}}
        </div>
        <div class="footer">
            <p><strong>Equipe TimeFlow</strong></p>
            <p>Em caso de dúvidas, entre em contato conosco.</p>
            <p>Obrigado pela confiança! 🙏</p>
        </div>
    </div>
</body>
</html>',
    'Atualização do Projeto {{project_name}} - {{current_date}}

Olá {{client_name}},

RESUMO EXECUTIVO
- Progresso: {{progress_percentage}}% concluído
- Status: {{status_text}}
- Próxima Entrega: {{next_delivery}}

TIMELINE DE FASES
{{phases_text}}

DESTAQUES DA SEMANA
{{highlights_text}}

PRÓXIMOS PASSOS
{{next_steps_text}}

{{risks_text}}

ANEXOS
- Relatório detalhado em anexo

Equipe TimeFlow
Em caso de dúvidas, entre em contato conosco.
Obrigado pela confiança!',
    'followup'
);

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_smtp_config_timestamp 
    AFTER UPDATE ON smtp_config
    FOR EACH ROW
BEGIN
    UPDATE smtp_config SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_email_logs_timestamp 
    AFTER UPDATE ON email_logs
    FOR EACH ROW
BEGIN
    UPDATE email_logs SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_email_templates_timestamp 
    AFTER UPDATE ON email_templates
    FOR EACH ROW
BEGIN
    UPDATE email_templates SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_email_schedules_timestamp 
    AFTER UPDATE ON email_schedules
    FOR EACH ROW
BEGIN
    UPDATE email_schedules SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
