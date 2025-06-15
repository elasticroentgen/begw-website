const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

class EmailService {
    constructor() {
        console.log('Email service configuration:', {
            host: process.env.MAIL_HOST,
            port: parseInt(process.env.MAIL_PORT) || 587,
            secure: process.env.MAIL_SECURE === 'true',
            user: process.env.MAIL_USER,
            passLength: process.env.MAIL_PASS ? process.env.MAIL_PASS.length : 0
        });

        // Try different authentication methods based on common configurations
        const port = parseInt(process.env.MAIL_PORT) || 587;
        const isSecure = port === 465 || process.env.MAIL_SECURE === 'true';
        
        this.transporter = nodemailer.createTransporter({
            host: process.env.MAIL_HOST,
            port: port,
            secure: isSecure,
            // Force TLS for non-secure connections
            requireTLS: !isSecure,
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS
            },
            tls: {
                // Don't fail on invalid certs
                rejectUnauthorized: false,
                // Force minimum TLS version
                minVersion: 'TLSv1.2',
                // Cipher settings for better compatibility
                ciphers: 'SSLv3',
                // Disable specific extensions that might cause issues
                honorCipherOrder: true
            },
            // Connection timeout
            connectionTimeout: 10000,
            greetingTimeout: 5000,
            socketTimeout: 10000,
            // Enable debug output in development
            debug: process.env.NODE_ENV !== 'production',
            logger: process.env.NODE_ENV !== 'production'
        });

        // Alternative transporter for fallback
        this.fallbackTransporter = nodemailer.createTransporter({
            host: process.env.MAIL_HOST,
            port: 465, // Try SSL port
            secure: true,
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
            html = html.replace(/\{\{#if phone\}\}[\s\S]*?\{\{\/if\}\}/g, '');
        }

        // Conditional blocks for newsletter
        if (data.newsletter === 'on') {
            html = html.replace(/\{\{#if newsletter\}\}/g, '');
            html = html.replace(/\{\{\/if\}\}/g, '');
        } else {
            html = html.replace(/\{\{#if newsletter\}\}[\s\S]*?\{\{\/if\}\}/g, '');
        }

        return html;
    }

    async sendContactEmail(formData) {
        let lastError;
        
        // Try main transporter first
        try {
            await this.transporter.verify();
            return await this._sendWithTransporter(this.transporter, formData);
        } catch (error) {
            console.warn('Primary transporter failed:', error.message);
            lastError = error;
        }

        // Try fallback transporter
        try {
            console.log('Trying fallback transporter (port 465)...');
            await this.fallbackTransporter.verify();
            return await this._sendWithTransporter(this.fallbackTransporter, formData);
        } catch (error) {
            console.error('Fallback transporter also failed:', error.message);
            lastError = error;
        }

        // Both failed, throw the last error
        throw new Error(`All email sending attempts failed. Last error: ${lastError.message}`);
    }

    async _sendWithTransporter(transporter, formData) {
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

        const result = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', result.messageId);
        return { success: true, messageId: result.messageId };
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
            console.log('Testing primary transporter...');
            await this.transporter.verify();
            console.log('✓ Primary email service connection successful');
            return true;
        } catch (error1) {
            console.warn('✗ Primary transporter failed:', error1.message);
            
            try {
                console.log('Testing fallback transporter...');
                await this.fallbackTransporter.verify();
                console.log('✓ Fallback email service connection successful');
                return true;
            } catch (error2) {
                console.error('✗ Both email service connections failed');
                console.error('Primary error:', error1.message);
                console.error('Fallback error:', error2.message);
                return false;
            }
        }
    }
}

module.exports = EmailService;