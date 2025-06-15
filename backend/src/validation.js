const Joi = require('joi');

const contactFormSchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.base': 'Name muss ein Text sein',
            'string.empty': 'Name ist erforderlich',
            'string.min': 'Name muss mindestens 2 Zeichen lang sein',
            'string.max': 'Name darf maximal 100 Zeichen lang sein',
            'any.required': 'Name ist erforderlich'
        }),
    
    email: Joi.string()
        .email()
        .required()
        .messages({
            'string.base': 'E-Mail muss ein Text sein',
            'string.empty': 'E-Mail-Adresse ist erforderlich',
            'string.email': 'Bitte geben Sie eine gültige E-Mail-Adresse ein',
            'any.required': 'E-Mail-Adresse ist erforderlich'
        }),
    
    phone: Joi.string()
        .pattern(/^[\d\s\+\-\(\)\/]+$/)
        .min(6)
        .max(30)
        .allow('')
        .messages({
            'string.pattern.base': 'Telefonnummer enthält ungültige Zeichen',
            'string.min': 'Telefonnummer muss mindestens 6 Zeichen lang sein',
            'string.max': 'Telefonnummer darf maximal 30 Zeichen lang sein'
        }),
    
    subject: Joi.string()
        .valid('mitgliedschaft', 'investment', 'photovoltaik', 'windenergie', 'beratung', 'allgemein', 'sonstiges')
        .required()
        .messages({
            'any.only': 'Bitte wählen Sie einen gültigen Betreff aus',
            'any.required': 'Betreff ist erforderlich'
        }),
    
    message: Joi.string()
        .min(10)
        .max(2000)
        .required()
        .messages({
            'string.base': 'Nachricht muss ein Text sein',
            'string.empty': 'Nachricht ist erforderlich',
            'string.min': 'Nachricht muss mindestens 10 Zeichen lang sein',
            'string.max': 'Nachricht darf maximal 2000 Zeichen lang sein',
            'any.required': 'Nachricht ist erforderlich'
        }),
    
    privacy: Joi.string()
        .valid('on')
        .required()
        .messages({
            'any.only': 'Sie müssen der Datenschutzerklärung zustimmen',
            'any.required': 'Sie müssen der Datenschutzerklärung zustimmen'
        }),
    
    newsletter: Joi.string()
        .valid('on', '')
        .allow('')
        .messages({
            'any.only': 'Ungültiger Newsletter-Wert'
        })
});

function validateContactForm(data) {
    const { error, value } = contactFormSchema.validate(data, {
        abortEarly: false,
        stripUnknown: true
    });
    
    if (error) {
        const errors = error.details.reduce((acc, detail) => {
            acc[detail.path[0]] = detail.message;
            return acc;
        }, {});
        
        return {
            isValid: false,
            errors,
            data: null
        };
    }
    
    return {
        isValid: true,
        errors: null,
        data: value
    };
}

// Rate limiting validation
function validateRateLimit(req) {
    // This will be handled by express-rate-limit middleware
    // but we can add additional custom logic here if needed
    return true;
}

// Honeypot field validation (anti-spam)
function validateHoneypot(data) {
    // Check for common honeypot field names
    const honeypotFields = ['website', 'url', 'homepage', 'fax'];
    
    for (const field of honeypotFields) {
        if (data[field] && data[field].length > 0) {
            return false; // Likely spam
        }
    }
    
    return true;
}

// Basic spam detection
function detectSpam(data) {
    const spamKeywords = [
        'viagra', 'casino', 'lottery', 'winner', 'congratulations',
        'click here', 'free money', 'make money', 'business opportunity'
    ];
    
    const content = `${data.name} ${data.message}`.toLowerCase();
    
    // Check for excessive keywords
    const keywordCount = spamKeywords.filter(keyword => 
        content.includes(keyword)
    ).length;
    
    if (keywordCount >= 2) {
        return true; // Likely spam
    }
    
    // Check for excessive links
    const linkCount = (data.message.match(/https?:\/\//g) || []).length;
    if (linkCount > 2) {
        return true; // Likely spam
    }
    
    // Check for excessive capital letters
    const upperCaseCount = (data.message.match(/[A-Z]/g) || []).length;
    const totalLetters = (data.message.match(/[A-Za-z]/g) || []).length;
    
    if (totalLetters > 0 && (upperCaseCount / totalLetters) > 0.7) {
        return true; // Likely spam (too many capitals)
    }
    
    return false;
}

module.exports = {
    validateContactForm,
    validateRateLimit,
    validateHoneypot,
    detectSpam
};