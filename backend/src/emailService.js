const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransporter({
            host: process.env.MAIL_HOST,
            port: parseInt(process.env.MAIL_PORT) || 587,
            secure: process.env.MAIL_SECURE === 'true',
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS
            },
            tls: {
                rejectUnauthorized: false
            }
        });
    }

    async loadEmailTemplate() {
        try {
            const templatePath = path.join(__dirname, '../templates/email-template.html');
            return await fs.readFile(templatePath, 'utf-8');
        } catch (error) {
            console.error('Error loading email template:', error);
            throw new Error('Failed to load email template');
        }
    }

    getSubjectText(subjectKey) {
        const subjects = {
            'mitgliedschaft': 'Mitgliedschaft',
            'investment': 'Investitionsmöglichkeiten',
            'photovoltaik': 'Photovoltaik-Anlagen',
            'windenergie': 'Windenergie',
            'beratung': 'Energieberatung',
            'allgemein': 'Allgemeine Anfrage',
            'sonstiges': 'Sonstiges'
        };
        return subjects[subjectKey] || subjectKey;
    }

    replaceTemplateVariables(template, data) {
        let html = template;
        
        // Basic replacements
        html = html.replace(/\{\{name\}\}/g, data.name || '');
        html = html.replace(/\{\{email\}\}/g, data.email || '');
        html = html.replace(/\{\{message\}\}/g, (data.message || '').replace(/\n/g, '<br>'));
        html = html.replace(/\{\{subjectText\}\}/g, this.getSubjectText(data.subject));
        html = html.replace(/\{\{timestamp\}\}/g, new Date().toLocaleString('de-DE', {
            timeZone: 'Europe/Berlin',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }));

        // Conditional blocks for phone
        if (data.phone) {
            html = html.replace(/\{\{#if phone\}\}/g, '');
            html = html.replace(/\{\{\/if\}\}/g, '');
            html = html.replace(/\{\{phone\}\}/g, data.phone);
        } else {
            // Remove the entire phone section
            html = html.replace(/\{\{#if phone\}\}[\s\S]*?\{\{\/if\}\}/g, '');
        }

        // Conditional blocks for newsletter
        if (data.newsletter === 'on') {
            html = html.replace(/\{\{#if newsletter\}\}/g, '');
            html = html.replace(/\{\{\/if\}\}/g, '');
        } else {
            // Remove the entire newsletter section
            html = html.replace(/\{\{#if newsletter\}\}[\s\S]*?\{\{\/if\}\}/g, '');
        }

        return html;
    }

    async sendContactEmail(formData) {
        try {
            // Verify transporter configuration
            await this.transporter.verify();
            
            const template = await this.loadEmailTemplate();
            const htmlContent = this.replaceTemplateVariables(template, formData);
            
            const mailOptions = {
                from: {
                    name: 'BEGW Kontaktformular',
                    address: process.env.MAIL_FROM
                },
                to: process.env.MAIL_TO,
                replyTo: formData.email,
                subject: `Neue Kontaktanfrage: ${this.getSubjectText(formData.subject)} - ${formData.name}`,
                html: htmlContent,
                text: this.generatePlainTextEmail(formData)
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('Email sent successfully:', result.messageId);
            return { success: true, messageId: result.messageId };
            
        } catch (error) {
            console.error('Error sending email:', error);
            throw new Error(`Failed to send email: ${error.message}`);
        }
    }

    generatePlainTextEmail(data) {
        const subjectText = this.getSubjectText(data.subject);
        const timestamp = new Date().toLocaleString('de-DE', {
            timeZone: 'Europe/Berlin',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        let text = `NEUE KONTAKTANFRAGE - BEGW\n\n`;
        text += `Name: ${data.name}\n`;
        text += `E-Mail: ${data.email}\n`;
        if (data.phone) {
            text += `Telefon: ${data.phone}\n`;
        }
        text += `Betreff: ${subjectText}\n\n`;
        text += `Nachricht:\n${data.message}\n\n`;
        if (data.newsletter === 'on') {
            text += `Newsletter: Ja, möchte den Newsletter erhalten\n\n`;
        }
        text += `Eingegangen am: ${timestamp}\n\n`;
        text += `---\n`;
        text += `Diese E-Mail wurde automatisch über das Kontaktformular der BEGW-Website generiert.\n`;
        text += `Bürgerenergie Genossenschaft Westsachsen eG`;

        return text;
    }

    async testConnection() {
        try {
            await this.transporter.verify();
            console.log('✓ Email service connection successful');
            return true;
        } catch (error) {
            console.error('✗ Email service connection failed:', error.message);
            return false;
        }
    }
}

module.exports = EmailService;