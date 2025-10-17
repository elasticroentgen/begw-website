const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const QRCode = require('qrcode');

class EmailService {
    constructor() {
        console.log('Email service configuration:', {
            host: process.env.MAIL_HOST,
            port: parseInt(process.env.MAIL_PORT) || 587,
            secure: process.env.MAIL_SECURE === 'true',
            user: process.env.MAIL_USER,
            passLength: process.env.MAIL_PASS ? process.env.MAIL_PASS.length : 0
        });

        this.transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST,
            port: parseInt(process.env.MAIL_PORT) || 587,
            secure: process.env.MAIL_SECURE === 'true', // true for 465, false for other ports
            requireTLS: true,
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS
            },
            tls: {
                // Don't fail on invalid certs (for self-signed certificates)
                rejectUnauthorized: false,
                // Allow legacy TLS renegotiation
                secureProtocol: 'TLSv1_2_method'
            },
            // Enable debug output
            debug: process.env.NODE_ENV !== 'production',
            logger: process.env.NODE_ENV !== 'production'
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
                    name: 'BEW Kontaktformular',
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

        let text = `NEUE KONTAKTANFRAGE - BEW\n\n`;
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
        text += `Diese E-Mail wurde automatisch über das Kontaktformular der BEW-Website generiert.\n`;
        text += `Bürgerenergie Westsachsen eG`;

        return text;
    }

    async sendMembershipEmail(formData) {
        try {
            // Verify transporter configuration
            await this.transporter.verify();
            
            const template = await this.loadMembershipTemplate();
            const htmlContent = this.replaceMembershipTemplateVariables(template, formData);
            
            const mailOptions = {
                from: {
                    name: 'BEW Mitgliedsantrag',
                    address: process.env.MAIL_FROM
                },
                to: process.env.MAIL_TO,
                replyTo: formData.email,
                subject: `Neuer Mitgliedsantrag - ${formData.firstname} ${formData.lastname}`,
                html: htmlContent,
                text: this.generateMembershipPlainTextEmail(formData)
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('Membership email sent successfully:', result.messageId);
            return { success: true, messageId: result.messageId };
            
        } catch (error) {
            console.error('Error sending membership email:', error);
            throw new Error(`Failed to send membership email: ${error.message}`);
        }
    }

    async loadMembershipTemplate() {
        try {
            const templatePath = path.join(__dirname, '../templates/membership-template.html');
            return await fs.readFile(templatePath, 'utf-8');
        } catch (error) {
            console.error('Error loading membership template:', error);
            throw new Error('Failed to load membership email template');
        }
    }

    replaceMembershipTemplateVariables(template, data) {
        let html = template;
        
        // Basic personal information
        html = html.replace(/\{\{firstname\}\}/g, data.firstname || '');
        html = html.replace(/\{\{lastname\}\}/g, data.lastname || '');
        html = html.replace(/\{\{email\}\}/g, data.email || '');
        html = html.replace(/\{\{phone\}\}/g, data.phone || '');
        html = html.replace(/\{\{birthdate\}\}/g, data.birthdate || '');
        html = html.replace(/\{\{street\}\}/g, data.street || '');
        html = html.replace(/\{\{zipcode\}\}/g, data.zipcode || '');
        html = html.replace(/\{\{city\}\}/g, data.city || '');
        html = html.replace(/\{\{abilities\}\}/g, data.abilities || '');
        
        // Shares information
        html = html.replace(/\{\{mandatoryShares\}\}/g, data.mandatoryShares || 1);
        html = html.replace(/\{\{voluntaryShares\}\}/g, data['voluntary-shares'] || 0);
        html = html.replace(/\{\{totalShares\}\}/g, data.totalShares || 1);
        html = html.replace(/\{\{totalAmount\}\}/g, (data.totalAmount || 250).toLocaleString('de-DE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }));
        html = html.replace(/\{\{mandatoryAmount\}\}/g, '250,00');
        html = html.replace(/\{\{voluntaryAmount\}\}/g, ((data['voluntary-shares'] || 0) * 250).toLocaleString('de-DE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }));

        // Timestamp
        html = html.replace(/\{\{timestamp\}\}/g, new Date().toLocaleString('de-DE', {
            timeZone: 'Europe/Berlin',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }));

        return html;
    }

    generateMembershipPlainTextEmail(data) {
        const timestamp = new Date().toLocaleString('de-DE', {
            timeZone: 'Europe/Berlin',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        let text = `NEUER MITGLIEDSANTRAG - BEW\n\n`;
        text += `PERSÖNLICHE DATEN:\n`;
        text += `Name: ${data.firstname} ${data.lastname}\n`;
        text += `Geburtsdatum: ${data.birthdate}\n`;
        text += `E-Mail: ${data.email}\n`;
        if (data.phone) {
            text += `Telefon: ${data.phone}\n`;
        }
        text += `Adresse: ${data.street}\n`;
        text += `         ${data.zipcode} ${data.city}\n\n`;
        text += `Kompetenzen: ${data.abilities || 'Keine Angabe'}\n\n`;
        
        text += `GESCHÄFTSANTEILE:\n`;
        text += `Pflichtanteil: ${data.mandatoryShares} × 250,00 € = 250,00 €\n`;
        text += `Freiwillige Anteile: ${data['voluntary-shares'] || 0} × 250,00 € = ${((data['voluntary-shares'] || 0) * 250).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €\n`;
        text += `Gesamt: ${data.totalShares} Anteile = ${(data.totalAmount || 250).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €\n\n`;
        
        text += `Eingegangen am: ${timestamp}\n\n`;
        text += `RECHTLICHE BESTÄTIGUNGEN:\n`;
        text += `✓ Datenschutzerklärung akzeptiert\n`;
        text += `✓ Satzung gelesen\n\n`;
        text += `---\n`;
        text += `Diese E-Mail wurde automatisch über das Mitgliedsantragsformular der BEW-Website generiert.\n`;
        text += `Bürgerenergie Westsachsen eG`;

        return text;
    }

    async sendMembershipConfirmEmail(formData) {
        try {
            // Verify transporter configuration
            await this.transporter.verify();

            const template = await this.loadMembershipConfirmTemplate();
            const htmlContent = await this.replaceMembershipConfirmTemplateVariables(template, formData);

            const mailOptions = {
                from: {
                    name: 'Bürgerenergie Westsachsen eG',
                    address: process.env.MAIL_FROM
                },
                replyTo: process.env.MAIL_TO,
                to: formData.email,
                subject: `Ihr Mitgliedsantrag`,
                html: htmlContent,
                text: this.generateMembershipConfirmPlainTextEmail(formData)
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('Membership confirmation email sent successfully:', result.messageId);
            return { success: true, messageId: result.messageId };

        } catch (error) {
            console.error('Error sending membership confirmation email:', error);
            throw new Error(`Failed to send membership confirmation email: ${error.message}`);
        }
    }

    async loadMembershipConfirmTemplate() {
        try {
            const templatePath = path.join(__dirname, '../templates/membership-confirm-template.html');
            return await fs.readFile(templatePath, 'utf-8');
        } catch (error) {
            console.error('Error loading membership confirmation template:', error);
            throw new Error('Failed to load membership confirmatio email template');
        }
    }

    /**
     * Generates an EPC QR code for SEPA bank transfers
     * @param {string} accountName - Beneficiary name
     * @param {string} iban - IBAN
     * @param {string} bic - BIC
     * @param {number} amount - Transfer amount in EUR
     * @param {string} reference - Payment reference/purpose
     * @returns {Promise<string>} Base64 data URI of the QR code PNG image
     */
    async generateEpcQrCode(accountName, iban, bic, amount, reference) {
        // EPC QR Code format (version 002)
        // See: https://www.europeanpaymentscouncil.eu/document-library/guidance-documents/quick-response-code-guidelines-enable-data-capture-initiation
        const epcData = [
            'BCD',                           // Service Tag
            '002',                           // Version
            '1',                             // Character Set (1 = UTF-8)
            'SCT',                           // Identification (SEPA Credit Transfer)
            bic || '',                       // BIC (can be empty)
            accountName || '',               // Beneficiary Name
            iban || '',                      // Beneficiary IBAN
            `EUR${amount.toFixed(2)}`,       // Amount (EUR with 2 decimals)
            '',                 // Remittance Information (Structured)
            '',                               // Remittance Information (Unstructured)
            reference || ''                              // Purpose (empty)
        ].join('\n');

        console.log('Generating EPC QR Code with data:', {
            accountName,
            iban,
            bic,
            amount,
            reference,
            epcDataLength: epcData.length
        });

        try {
            // Generate QR code as base64 data URL (PNG format)
            const qrDataUrl = await QRCode.toDataURL(epcData, {
                errorCorrectionLevel: 'M',
                margin: 2,
                width: 450,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });

            console.log('QR Code generated successfully as data URL, length:', qrDataUrl.length);

            if (!qrDataUrl || qrDataUrl.trim().length === 0) {
                throw new Error('QR code generation returned empty string');
            }

            return qrDataUrl;
        } catch (error) {
            console.error('Error generating EPC QR code:', error);
            throw new Error('Failed to generate payment QR code');
        }
    }

    /**
     * Formats an IBAN into 4-character groups for better readability
     * @param {string} iban - The IBAN to format
     * @returns {string} Formatted IBAN with spaces every 4 characters
     */
    formatIban(iban) {
        if (!iban) return '';
        // Remove any existing spaces
        const cleanIban = iban.replace(/\s/g, '');
        // Split into groups of 4 characters
        return cleanIban.match(/.{1,4}/g)?.join(' ') || cleanIban;
    }

    async replaceMembershipConfirmTemplateVariables(template, data) {
        let html = template;

        // Basic personal information
        html = html.replace(/\{\{firstname\}\}/g, data.firstname || '');
        html = html.replace(/\{\{lastname\}\}/g, data.lastname || '');
        html = html.replace(/\{\{email\}\}/g, data.email || '');

        // Shares information
        html = html.replace(/\{\{mandatoryShares\}\}/g, data.mandatoryShares || 1);
        html = html.replace(/\{\{voluntaryShares\}\}/g, data['voluntary-shares'] || 0);
        html = html.replace(/\{\{totalShares\}\}/g, data.totalShares || 1);
        html = html.replace(/\{\{totalAmount\}\}/g, (data.totalAmount || 250).toLocaleString('de-DE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }));
        html = html.replace(/\{\{mandatoryAmount\}\}/g, '250,00');
        html = html.replace(/\{\{voluntaryAmount\}\}/g, ((data['voluntary-shares'] || 0) * 250).toLocaleString('de-DE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }));

        // Timestamp
        html = html.replace(/\{\{timestamp\}\}/g, new Date().toLocaleString('de-DE', {
            timeZone: 'Europe/Berlin',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }));

        // Bank details
        const accountName = process.env.BANK_ACCOUNT_NAME || 'Bürgerenergie Westsachsen eG';
        const iban = process.env.BANK_IBAN || '';
        const bic = process.env.BANK_BIC || '';

        html = html.replace(/\{\{bankAccountName\}\}/g, accountName);
        html = html.replace(/\{\{bankIban\}\}/g, this.formatIban(iban));
        html = html.replace(/\{\{bankBic\}\}/g, bic);

        // Generate EPC QR Code for payment
        const amount = data.totalAmount || 250;
        const reference = `${data.firstname} ${data.lastname} Anteile`;

        console.log('About to generate QR code for membership confirmation');
        try {
            const qrCodeDataUrl = await this.generateEpcQrCode(accountName, iban, bic, amount, reference);
            console.log('QR code generated as data URL, length:', qrCodeDataUrl.length);
            // Create an img tag with the base64 data URL
            const qrCodeImg = `<img src="${qrCodeDataUrl}" alt="SEPA QR Code für Überweisung" style="max-width: 100%; height: auto; display: block;" />`;
            html = html.replace(/\{\{qrCodeSvg\}\}/g, qrCodeImg);
            console.log('QR code inserted into template as img tag');
        } catch (error) {
            console.error('Failed to generate QR code:', error);
            // Fallback to empty if QR generation fails
            html = html.replace(/\{\{qrCodeSvg\}\}/g, '<p style="color: red;">QR Code konnte nicht generiert werden</p>');
        }

        return html;
    }

    generateMembershipConfirmPlainTextEmail(data) {
        const timestamp = new Date().toLocaleString('de-DE', {
            timeZone: 'Europe/Berlin',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        const accountName = process.env.BANK_ACCOUNT_NAME || 'Bürgerenergie Westsachsen eG';
        const iban = process.env.BANK_IBAN || '';
        const bic = process.env.BANK_BIC || '';

        let text = `Ihr Mitgliedsantrag\n\n`;
        text += `Willkommen ${data.firstname} ${data.lastname}!\n\n`;
        text += "Vielen Dank für Ihre Unterstützung der lokalen Energiewende!\n\n"
        text += `Ihre Geschäftsanteile:\n`;
        text += `Pflichtanteil: ${data.mandatoryShares} × 250,00 € = 250,00 €\n`;
        text += `Freiwillige Anteile: ${data['voluntary-shares'] || 0} × 250,00 € = ${((data['voluntary-shares'] || 0) * 250).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €\n`;
        text += `Gesamt: ${data.totalShares} Anteile = ${(data.totalAmount || 250).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €\n\n`;

        text += `ZAHLUNGSINFORMATIONEN:\n`;
        text += `Bitte überweisen Sie Ihre Geschäftsanteile an folgendes Konto:\n\n`;
        text += `Empfänger: ${accountName}\n`;
        text += `IBAN: ${this.formatIban(iban)}\n`;
        text += `BIC: ${bic}\n`;
        text += `Verwendungszweck: ${data.firstname} ${data.lastname} Anteile\n`;
        text += `Betrag: ${(data.totalAmount || 250).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €\n\n`;

        text += `Eingegangen am: ${timestamp}\n\n`;
        text += `---\n`;
        text += `Diese E-Mail wurde automatisch über das Mitgliedsantragsformular der BEW-Website generiert.\n`;
        text += `Bürgerenergie Westsachsen eG`;

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
