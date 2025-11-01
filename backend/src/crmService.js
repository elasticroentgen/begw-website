const https = require('https');
const http = require('http');

class CRMService {
    constructor() {
        this.apiUrl = process.env.GENOCRM_API_URL || 'https://localhost:7273';
        this.apiKey = process.env.GENOCRM_API_KEY || 'CHANGE_THIS_TO_A_SECURE_KEY';

        if (!this.apiKey) {
            console.warn('⚠️  GenoCRM API Key not configured. Member applications will not be submitted to CRM.');
        }
    }

    /**
     * Submit member application to GenoCRM
     * @param {Object} memberData - The validated member data
     * @returns {Promise<Object>} - The CRM response
     */
    async submitMemberApplication(memberData) {
        if (!this.apiKey) {
            throw new Error('GenoCRM API Key is not configured');
        }

        try {
            // Parse birth date - handle different formats
            let birthDate = null;
            if (memberData.birthdate) {
                // Try to parse the date string (format can be DD.MM.YYYY or YYYY-MM-DD)
                const dateStr = memberData.birthdate.trim();
                if (dateStr.includes('.')) {
                    // German format DD.MM.YYYY
                    const parts = dateStr.split('.');
                    if (parts.length === 3) {
                        birthDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                    }
                } else if (dateStr.includes('-')) {
                    // ISO format YYYY-MM-DD
                    birthDate = dateStr;
                } else if (dateStr.includes('/')) {
                    // US format MM/DD/YYYY
                    const parts = dateStr.split('/');
                    if (parts.length === 3) {
                        birthDate = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
                    }
                }
            }

            // Map form data to GenoCRM API format
            const payload = {
                memberType: 0, // Individual (0 = Individual, 1 = Company)
                firstName: memberData.firstname,
                lastName: memberData.lastname,
                email: memberData.email,
                phone: memberData.phone || '',
                street: memberData.street,
                postalCode: memberData.zipcode,
                city: memberData.city,
                country: 'Deutschland',
                birthDate: birthDate,
                notes: this.buildNotes(memberData),
                requestedShares: memberData.totalShares
            };

            console.log('Submitting member application to GenoCRM:', {
                email: payload.email,
                name: `${payload.firstName} ${payload.lastName}`
            });

            const response = await this.makeApiRequest('/api/registration/apply', 'POST', payload);

            console.log('GenoCRM API response:', response);

            return {
                success: true,
                memberId: response.memberId,
                message: response.message
            };

        } catch (error) {
            console.error('Error submitting to GenoCRM:', error.message);

            // If it's a conflict (duplicate email), handle gracefully
            if (error.statusCode === 409) {
                throw new Error('Diese E-Mail-Adresse ist bereits registriert.');
            }

            // For other errors, throw a generic error
            throw new Error('Fehler beim Übermitteln der Daten an das CRM-System.');
        }
    }

    /**
     * Build notes field from membership data
     * @param {Object} memberData
     * @returns {string}
     */
    buildNotes(memberData) {
        const notes = [];

        notes.push(`Mitgliedsantrag über Website eingereicht am ${new Date().toLocaleDateString('de-DE')}`);
        notes.push(`\nPflichtanteile: ${memberData.mandatoryShares || 1}`);
        notes.push(`Freiwillige Anteile: ${memberData['voluntary-shares'] || 0}`);
        notes.push(`Gesamtanteile: ${memberData.totalShares}`);
        notes.push(`Gesamtbetrag: ${memberData.totalAmount}€`);

        if (memberData.abilities && memberData.abilities.trim()) {
            notes.push(`\nKompetenzen: ${memberData.abilities}`);
        }

        return notes.join('\n');
    }

    /**
     * Make HTTP(S) request to GenoCRM API
     * @param {string} endpoint - API endpoint path
     * @param {string} method - HTTP method
     * @param {Object} data - Request payload
     * @returns {Promise<Object>} - Parsed response
     */
    makeApiRequest(endpoint, method, data) {
        return new Promise((resolve, reject) => {
            const url = new URL(endpoint, this.apiUrl);
            const isHttps = url.protocol === 'https:';
            const httpModule = isHttps ? https : http;

            const postData = JSON.stringify(data);

            const options = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname,
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'X-API-Key': this.apiKey
                },
                // For development: allow self-signed certificates
                rejectUnauthorized: process.env.NODE_ENV === 'production'
            };

            const req = httpModule.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    try {
                        const parsedData = JSON.parse(responseData);

                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(parsedData);
                        } else {
                            const error = new Error(parsedData.message || `API request failed with status ${res.statusCode}`);
                            error.statusCode = res.statusCode;
                            error.response = parsedData;
                            reject(error);
                        }
                    } catch (parseError) {
                        reject(new Error(`Failed to parse API response: ${responseData}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error(`API request failed: ${error.message}`));
            });

            req.write(postData);
            req.end();
        });
    }

    /**
     * Test CRM API connection
     * @returns {Promise<boolean>}
     */
    async testConnection() {
        if (!this.apiKey) {
            return false;
        }

        try {
            // We could add a health check endpoint if needed
            // For now, just return true if API key is configured
            return true;
        } catch (error) {
            console.error('GenoCRM connection test failed:', error.message);
            return false;
        }
    }
}

module.exports = CRMService;
