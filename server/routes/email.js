const express = require('express');
const nodemailer = require('nodemailer');
const { encrypt, decrypt } = require('../utils/encryption');
const db = require('../database');
const router = express.Router();

// Get master password from environment
const MASTER_PASSWORD = process.env.EMAIL_ENCRYPTION_KEY || 'default-key-change-in-production';

/**
 * GET /api/email/config
 * Get current SMTP configuration (without sensitive data)
 */
router.get('/config', async (req, res) => {
    try {
        const config = await db.get(`
            SELECT id, smtp_server, smtp_port, smtp_user, from_email, from_name, 
                   ssl_enabled, tls_enabled, is_active, created_at, updated_at
            FROM smtp_config 
            WHERE is_active = 1 
            ORDER BY created_at DESC 
            LIMIT 1
        `);

        if (!config) {
            return res.json({
                success: true,
                data: null,
                message: 'No SMTP configuration found'
            });
        }

        res.json({
            success: true,
            data: config
        });
    } catch (error) {
        console.error('Error fetching SMTP config:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch SMTP configuration'
        });
    }
});

/**
 * POST /api/email/config
 * Save or update SMTP configuration
 */
router.post('/config', async (req, res) => {
    try {
        const {
            smtp_server,
            smtp_port,
            smtp_user,
            smtp_password,
            from_name,
            ssl_enabled,
            tls_enabled
        } = req.body;

        // Validate required fields
        if (!smtp_server || !smtp_port || !smtp_user || !smtp_password) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: smtp_server, smtp_port, smtp_user, smtp_password'
            });
        }

        // Encrypt the password
        const encryptedPassword = encrypt(smtp_password, MASTER_PASSWORD);

        // Deactivate existing configurations
        await db.run('UPDATE smtp_config SET is_active = 0');

        // Insert new configuration
        const result = await db.run(`
            INSERT INTO smtp_config (
                smtp_server, smtp_port, smtp_user, smtp_password_encrypted,
                from_email, from_name, ssl_enabled, tls_enabled, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        `, [
            smtp_server,
            parseInt(smtp_port),
            smtp_user,
            encryptedPassword,
            'noreply@meudominio.com', // Fixed from email
            from_name || 'Equipe TimeFlow',
            ssl_enabled ? 1 : 0,
            tls_enabled ? 1 : 0
        ]);

        res.json({
            success: true,
            data: { id: result.lastID },
            message: 'SMTP configuration saved successfully'
        });
    } catch (error) {
        console.error('Error saving SMTP config:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save SMTP configuration'
        });
    }
});

/**
 * POST /api/email/test
 * Test SMTP connection
 */
router.post('/test', async (req, res) => {
    try {
        const { test_email } = req.body;

        if (!test_email) {
            return res.status(400).json({
                success: false,
                message: 'Test email address is required'
            });
        }

        // Get current SMTP configuration
        const config = await db.get(`
            SELECT * FROM smtp_config 
            WHERE is_active = 1 
            ORDER BY created_at DESC 
            LIMIT 1
        `);

        if (!config) {
            return res.status(400).json({
                success: false,
                message: 'No SMTP configuration found. Please configure SMTP settings first.'
            });
        }

        // Decrypt password
        const decryptedPassword = decrypt(config.smtp_password_encrypted, MASTER_PASSWORD);

        // Create transporter
        const transporter = nodemailer.createTransporter({
            host: config.smtp_server,
            port: config.smtp_port,
            secure: config.ssl_enabled === 1, // true for 465, false for other ports
            auth: {
                user: config.smtp_user,
                pass: decryptedPassword
            },
            tls: {
                rejectUnauthorized: false // Allow self-signed certificates
            }
        });

        // Verify connection
        await transporter.verify();

        // Send test email
        const testEmailContent = {
            from: `"${config.from_name}" <${config.from_email}>`,
            to: test_email,
            subject: '✅ Teste de Configuração SMTP - TimeFlow',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px;">
                        <h1>✅ Teste de Configuração SMTP</h1>
                        <p>TimeFlow - Sistema de Gestão de Projetos</p>
                    </div>
                    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                        <h2>Configuração SMTP Funcionando!</h2>
                        <p>Parabéns! Sua configuração SMTP está funcionando corretamente.</p>
                        <p><strong>Servidor:</strong> ${config.smtp_server}</p>
                        <p><strong>Porta:</strong> ${config.smtp_port}</p>
                        <p><strong>SSL/TLS:</strong> ${config.ssl_enabled ? 'SSL' : 'TLS'} habilitado</p>
                        <p><strong>Data do teste:</strong> ${new Date().toLocaleString('pt-BR')}</p>
                        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
                        <p style="color: #666; font-size: 14px;">
                            Este é um e-mail de teste automático do sistema TimeFlow.<br>
                            Agora você pode enviar follow-ups automáticos para seus clientes!
                        </p>
                    </div>
                </div>
            `,
            text: `
Teste de Configuração SMTP - TimeFlow

Parabéns! Sua configuração SMTP está funcionando corretamente.

Servidor: ${config.smtp_server}
Porta: ${config.smtp_port}
SSL/TLS: ${config.ssl_enabled ? 'SSL' : 'TLS'} habilitado
Data do teste: ${new Date().toLocaleString('pt-BR')}

Este é um e-mail de teste automático do sistema TimeFlow.
Agora você pode enviar follow-ups automáticos para seus clientes!
            `
        };

        await transporter.sendMail(testEmailContent);

        // Log the test
        await db.run(`
            INSERT INTO email_logs (
                recipient_email, subject, status, smtp_config_id, attempts
            ) VALUES (?, ?, 'sent', ?, 1)
        `, [test_email, testEmailContent.subject, config.id]);

        res.json({
            success: true,
            message: `Test email sent successfully to ${test_email}`
        });
    } catch (error) {
        console.error('SMTP test error:', error);
        
        // Log the failed test
        try {
            const config = await db.get('SELECT id FROM smtp_config WHERE is_active = 1 LIMIT 1');
            if (config) {
                await db.run(`
                    INSERT INTO email_logs (
                        recipient_email, subject, status, error_message, smtp_config_id, attempts
                    ) VALUES (?, ?, 'failed', ?, ?, 1)
                `, [req.body.test_email || 'unknown', 'SMTP Test', error.message, config.id]);
            }
        } catch (logError) {
            console.error('Error logging failed test:', logError);
        }

        res.status(500).json({
            success: false,
            message: `SMTP test failed: ${error.message}`
        });
    }
});

/**
 * GET /api/email/logs
 * Get email logs with pagination and filters
 */
router.get('/logs', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            status,
            recipient,
            start_date,
            end_date
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        let whereClause = '1=1';
        const params = [];

        if (status) {
            whereClause += ' AND status = ?';
            params.push(status);
        }

        if (recipient) {
            whereClause += ' AND recipient_email LIKE ?';
            params.push(`%${recipient}%`);
        }

        if (start_date) {
            whereClause += ' AND created_at >= ?';
            params.push(start_date);
        }

        if (end_date) {
            whereClause += ' AND created_at <= ?';
            params.push(end_date);
        }

        // Get total count
        const countResult = await db.get(`
            SELECT COUNT(*) as total FROM email_logs WHERE ${whereClause}
        `, params);

        // Get logs
        const logs = await db.all(`
            SELECT el.*, sc.smtp_server, p.name as project_name, c.name as company_name
            FROM email_logs el
            LEFT JOIN smtp_config sc ON el.smtp_config_id = sc.id
            LEFT JOIN projects p ON el.project_id = p.id
            LEFT JOIN companies c ON el.company_id = c.id
            WHERE ${whereClause}
            ORDER BY el.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), offset]);

        res.json({
            success: true,
            data: {
                logs,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: countResult.total,
                    pages: Math.ceil(countResult.total / parseInt(limit))
                }
            }
        });
    } catch (error) {
        console.error('Error fetching email logs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch email logs'
        });
    }
});

/**
 * POST /api/email/send-followup
 * Send follow-up email manually
 */
router.post('/send-followup', async (req, res) => {
    try {
        const { project_id, recipient_email, recipient_name } = req.body;

        if (!project_id || !recipient_email) {
            return res.status(400).json({
                success: false,
                message: 'Project ID and recipient email are required'
            });
        }

        // Get project data
        const project = await db.get(`
            SELECT p.*, c.name as company_name, c.contact_email, c.contact_name
            FROM projects p
            LEFT JOIN companies c ON p.company_id = c.id
            WHERE p.id = ?
        `, [project_id]);

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Get SMTP configuration
        const config = await db.get(`
            SELECT * FROM smtp_config
            WHERE is_active = 1
            ORDER BY created_at DESC
            LIMIT 1
        `);

        if (!config) {
            return res.status(400).json({
                success: false,
                message: 'No SMTP configuration found'
            });
        }

        // Generate email content
        const emailContent = await generateFollowUpEmail(project, recipient_name || project.contact_name);

        // Send email
        const result = await sendEmail({
            config,
            to: recipient_email,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
            project_id,
            company_id: project.company_id
        });

        res.json({
            success: true,
            data: { log_id: result.logId },
            message: 'Follow-up email sent successfully'
        });
    } catch (error) {
        console.error('Error sending follow-up email:', error);
        res.status(500).json({
            success: false,
            message: `Failed to send follow-up email: ${error.message}`
        });
    }
});

/**
 * Helper function to generate follow-up email content
 */
async function generateFollowUpEmail(project, clientName) {
    // Get project phases and progress
    const phases = await db.all(`
        SELECT pp.*, p.name as phase_name, p.color as phase_color
        FROM project_phases pp
        JOIN phases p ON pp.phase_id = p.id
        WHERE pp.project_id = ?
        ORDER BY p.order_index
    `, [project.id]);

    // Calculate progress
    const totalPhases = phases.length;
    const completedPhases = phases.filter(p => p.status === 'completed').length;
    const progressPercentage = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;

    // Get recent appointments for highlights
    const recentAppointments = await db.all(`
        SELECT * FROM appointments
        WHERE project_id = ? AND status = 'completed'
        AND date >= date('now', '-7 days')
        ORDER BY date DESC, start_time DESC
        LIMIT 5
    `, [project.id]);

    // Get upcoming appointments
    const upcomingAppointments = await db.all(`
        SELECT * FROM appointments
        WHERE project_id = ? AND status = 'scheduled'
        AND date >= date('now')
        ORDER BY date ASC, start_time ASC
        LIMIT 3
    `, [project.id]);

    // Generate template variables
    const templateVars = {
        project_name: project.name,
        client_name: clientName || 'Cliente',
        current_date: new Date().toLocaleDateString('pt-BR'),
        progress_percentage: progressPercentage,
        status_class: progressPercentage >= 80 ? 'status-green' : progressPercentage >= 50 ? 'status-yellow' : 'status-red',
        status_text: progressPercentage >= 80 ? '🟢 No Prazo' : progressPercentage >= 50 ? '🟡 Em Andamento' : '🔴 Atenção',
        next_delivery: upcomingAppointments.length > 0 ?
            new Date(upcomingAppointments[0].date).toLocaleDateString('pt-BR') : 'A definir',
        phases_html: generatePhasesHTML(phases),
        phases_text: generatePhasesText(phases),
        highlights_html: generateHighlightsHTML(recentAppointments),
        highlights_text: generateHighlightsText(recentAppointments),
        next_steps_html: generateNextStepsHTML(upcomingAppointments),
        next_steps_text: generateNextStepsText(upcomingAppointments),
        risks_section: progressPercentage < 50 ? generateRisksHTML() : '',
        risks_text: progressPercentage < 50 ? generateRisksText() : '',
        dashboard_link: process.env.FRONTEND_URL ?
            `<p>• <a href="${process.env.FRONTEND_URL}/projects/${project.id}">Acessar Dashboard do Projeto</a></p>` : ''
    };

    // Get email template
    const template = await db.get(`
        SELECT * FROM email_templates
        WHERE template_type = 'followup' AND is_active = 1
        LIMIT 1
    `);

    if (!template) {
        throw new Error('No follow-up email template found');
    }

    // Replace template variables
    let subject = template.subject_template;
    let html = template.html_template;
    let text = template.text_template;

    Object.keys(templateVars).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(regex, templateVars[key]);
        html = html.replace(regex, templateVars[key]);
        text = text.replace(regex, templateVars[key]);
    });

    return { subject, html, text };
}

/**
 * Helper function to send email
 */
async function sendEmail({ config, to, subject, html, text, project_id, company_id }) {
    try {
        // Decrypt password
        const decryptedPassword = decrypt(config.smtp_password_encrypted, MASTER_PASSWORD);

        // Create transporter
        const transporter = nodemailer.createTransporter({
            host: config.smtp_server,
            port: config.smtp_port,
            secure: config.ssl_enabled === 1,
            auth: {
                user: config.smtp_user,
                pass: decryptedPassword
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        // Send email
        const info = await transporter.sendMail({
            from: `"${config.from_name}" <${config.from_email}>`,
            to,
            subject,
            html,
            text
        });

        // Log success
        const result = await db.run(`
            INSERT INTO email_logs (
                recipient_email, subject, body_html, body_text, status,
                smtp_config_id, project_id, company_id, attempts, sent_at
            ) VALUES (?, ?, ?, ?, 'sent', ?, ?, ?, 1, datetime('now'))
        `, [to, subject, html, text, config.id, project_id, company_id]);

        return { logId: result.lastID, messageId: info.messageId };
    } catch (error) {
        // Log failure
        await db.run(`
            INSERT INTO email_logs (
                recipient_email, subject, body_html, body_text, status, error_message,
                smtp_config_id, project_id, company_id, attempts
            ) VALUES (?, ?, ?, ?, 'failed', ?, ?, ?, ?, 1)
        `, [to, subject, html, text, error.message, config.id, project_id, company_id]);

        throw error;
    }
}

// Helper functions for template generation
function generatePhasesHTML(phases) {
    return phases.map(phase => `
        <div class="phase-item">
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 12px; height: 12px; border-radius: 50%; background: ${phase.phase_color || '#667eea'};"></div>
                <strong>${phase.phase_name}</strong>
                <span class="status-badge ${phase.status === 'completed' ? 'status-green' : phase.status === 'in_progress' ? 'status-yellow' : 'status-red'}">
                    ${phase.status === 'completed' ? '✅ Concluído' : phase.status === 'in_progress' ? '🔄 Em Andamento' : '⏳ Pendente'}
                </span>
            </div>
            ${phase.deadline ? `<p style="margin: 5px 0; color: #666;">Prazo: ${new Date(phase.deadline).toLocaleDateString('pt-BR')}</p>` : ''}
        </div>
    `).join('');
}

function generatePhasesText(phases) {
    return phases.map(phase =>
        `• ${phase.phase_name}: ${phase.status === 'completed' ? 'Concluído' : phase.status === 'in_progress' ? 'Em Andamento' : 'Pendente'}${phase.deadline ? ` (Prazo: ${new Date(phase.deadline).toLocaleDateString('pt-BR')})` : ''}`
    ).join('\n');
}

function generateHighlightsHTML(appointments) {
    if (appointments.length === 0) {
        return '<p>• Nenhuma atividade registrada esta semana</p>';
    }
    return appointments.map(apt =>
        `<p>• ${apt.title} - ${new Date(apt.date).toLocaleDateString('pt-BR')}</p>`
    ).join('');
}

function generateHighlightsText(appointments) {
    if (appointments.length === 0) {
        return '• Nenhuma atividade registrada esta semana';
    }
    return appointments.map(apt =>
        `• ${apt.title} - ${new Date(apt.date).toLocaleDateString('pt-BR')}`
    ).join('\n');
}

function generateNextStepsHTML(appointments) {
    if (appointments.length === 0) {
        return '<p>• Próximas atividades serão definidas em breve</p>';
    }
    return appointments.map(apt =>
        `<p>• ${apt.title} - ${new Date(apt.date).toLocaleDateString('pt-BR')}</p>`
    ).join('');
}

function generateNextStepsText(appointments) {
    if (appointments.length === 0) {
        return '• Próximas atividades serão definidas em breve';
    }
    return appointments.map(apt =>
        `• ${apt.title} - ${new Date(apt.date).toLocaleDateString('pt-BR')}`
    ).join('\n');
}

function generateRisksHTML() {
    return `
        <h3>⚠️ Riscos e Alertas</h3>
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 15px 0;">
            <p><strong>Atenção:</strong> O projeto está com progresso abaixo do esperado.</p>
            <p>• Recomendamos revisar o cronograma</p>
            <p>• Verificar possíveis bloqueios ou dependências</p>
            <p>• Agendar reunião de alinhamento se necessário</p>
        </div>
    `;
}

function generateRisksText() {
    return `
RISCOS E ALERTAS
• Atenção: O projeto está com progresso abaixo do esperado
• Recomendamos revisar o cronograma
• Verificar possíveis bloqueios ou dependências
• Agendar reunião de alinhamento se necessário
    `;
}

module.exports = router;
