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
        }),
    
    captcha: Joi.number()
        .integer()
        .min(0)
        .max(20)
        .required()
        .messages({
            'number.base': 'Captcha-Antwort muss eine Zahl sein',
            'number.integer': 'Captcha-Antwort muss eine ganze Zahl sein',
            'number.min': 'Captcha-Antwort ist ungültig',
            'number.max': 'Captcha-Antwort ist ungültig',
            'any.required': 'Bitte beantworten Sie die Sicherheitsfrage'
        }),
    
    website: Joi.string()
        .allow('')
        .max(0)
        .messages({
            'string.max': 'Spam-Schutz aktiviert'
        })
});

const membershipFormSchema = Joi.object({
    firstname: Joi.string()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.base': 'Vorname muss ein Text sein',
            'string.empty': 'Vorname ist erforderlich',
            'string.min': 'Vorname muss mindestens 2 Zeichen lang sein',
            'string.max': 'Vorname darf maximal 100 Zeichen lang sein',
            'any.required': 'Vorname ist erforderlich'
        }),
    
    lastname: Joi.string()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.base': 'Nachname muss ein Text sein',
            'string.empty': 'Nachname ist erforderlich',
            'string.min': 'Nachname muss mindestens 2 Zeichen lang sein',
            'string.max': 'Nachname darf maximal 100 Zeichen lang sein',
            'any.required': 'Nachname ist erforderlich'
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
    
    street: Joi.string()
        .min(5)
        .max(200)
        .required()
        .messages({
            'string.base': 'Straße muss ein Text sein',
            'string.empty': 'Straße und Hausnummer sind erforderlich',
            'string.min': 'Straße muss mindestens 5 Zeichen lang sein',
            'string.max': 'Straße darf maximal 200 Zeichen lang sein',
            'any.required': 'Straße und Hausnummer sind erforderlich'
        }),
    
    zipcode: Joi.string()
        .pattern(/^[0-9]{5}$/)
        .required()
        .messages({
            'string.pattern.base': 'PLZ muss 5-stellig sein',
            'string.empty': 'Postleitzahl ist erforderlich',
            'any.required': 'Postleitzahl ist erforderlich'
        }),
    
    city: Joi.string()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.base': 'Ort muss ein Text sein',
            'string.empty': 'Ort ist erforderlich',
            'string.min': 'Ort muss mindestens 2 Zeichen lang sein',
            'string.max': 'Ort darf maximal 100 Zeichen lang sein',
            'any.required': 'Ort ist erforderlich'
        }),
    
    'mandatory-shares': Joi.number()
        .integer()
        .min(1)
        .max(1)
        .required()
        .messages({
            'number.base': 'Pflichtanteil muss eine Zahl sein',
            'number.integer': 'Pflichtanteil muss eine ganze Zahl sein',
            'number.min': 'Mindestens ein Pflichtanteil erforderlich',
            'number.max': 'Nur ein Pflichtanteil erlaubt',
            'any.required': 'Pflichtanteil ist erforderlich'
        }),
    
    'voluntary-shares': Joi.number()
        .integer()
        .min(0)
        .max(99)
        .required()
        .messages({
            'number.base': 'Freiwillige Anteile müssen eine Zahl sein',
            'number.integer': 'Freiwillige Anteile müssen eine ganze Zahl sein',
            'number.min': 'Freiwillige Anteile können nicht negativ sein',
            'number.max': 'Maximal 99 freiwillige Anteile erlaubt',
            'any.required': 'Anzahl freiwilliger Anteile ist erforderlich'
        }),
    
    mandatoryShares: Joi.number()
        .integer()
        .min(1)
        .max(1)
        .required(),
    
    totalShares: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .required(),
    
    totalAmount: Joi.number()
        .integer()
        .min(250)
        .max(25000)
        .required(),
    
    formType: Joi.string()
        .valid('membership')
        .required(),
    
    privacy: Joi.string()
        .valid('on')
        .required()
        .messages({
            'any.only': 'Sie müssen der Datenschutzerklärung zustimmen',
            'any.required': 'Sie müssen der Datenschutzerklärung zustimmen'
        }),
    
    terms: Joi.string()
        .valid('on')
        .required()
        .messages({
            'any.only': 'Sie müssen die Satzung akzeptieren und dem Beitritt zur Genossenschaft zustimmen',
            'any.required': 'Sie müssen die Satzung akzeptieren und dem Beitritt zur Genossenschaft zustimmen'
        }),
    
    captcha: Joi.number()
        .integer()
        .min(0)
        .max(20)
        .required()
        .messages({
            'number.base': 'Captcha-Antwort muss eine Zahl sein',
            'number.integer': 'Captcha-Antwort muss eine ganze Zahl sein',
            'number.min': 'Captcha-Antwort ist ungültig',
            'number.max': 'Captcha-Antwort ist ungültig',
            'any.required': 'Bitte beantworten Sie die Sicherheitsfrage'
        }),
    
    website: Joi.string()
        .allow('')
        .max(0)
        .messages({
            'string.max': 'Spam-Schutz aktiviert'
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

function validateMembershipForm(data) {
    const { error, value } = membershipFormSchema.validate(data, {
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
    validateMembershipForm,
    validateRateLimit,
    validateHoneypot,
    detectSpam
};