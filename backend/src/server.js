require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const EmailService = require('./emailService');
const { validateContactForm, validateHoneypot, detectSpam } = require('./validation');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize email service
const emailService = new EmailService();

app.set('trust proxy', 1 /* number of proxies between user and server */)

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            process.env.FRONTEND_URL,
            'http://localhost:8080',
            'http://localhost:3000',
            'https://buergerenergie-westsachsen.de',
            'https://www.buergerenergie-westsachsen.de'
        ].filter(Boolean);
        
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: {
        error: 'Zu viele Anfragen von dieser IP-Adresse. Bitte versuchen Sie es später erneut.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/health';
    }
});

app.use('/api/', limiter);

// Logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} - ${req.method} ${req.path} - IP: ${req.ip}`);
    next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        const emailStatus = await emailService.testConnection();
        
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            services: {
                email: emailStatus ? 'connected' : 'disconnected'
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: 'Health check failed'
        });
    }
});

// Contact form submission endpoint
app.post('/api/contact', async (req, res) => {
    try {
        console.log('Contact form submission received:', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString()
        });

        // Validate honeypot (anti-spam)
        if (!validateHoneypot(req.body)) {
            console.warn('Honeypot triggered, likely spam:', req.ip);
            return res.status(400).json({
                success: false,
                error: 'Invalid request',
                code: 'INVALID_REQUEST'
            });
        }

        // Validate form data
        const validation = validateContactForm(req.body);
        if (!validation.isValid) {
            console.warn('Validation failed:', validation.errors);
            return res.status(400).json({
                success: false,
                error: 'Validierungsfehler',
                details: validation.errors,
                code: 'VALIDATION_ERROR'
            });
        }

        // Spam detection
        if (detectSpam(validation.data)) {
            console.warn('Spam detected:', req.ip, validation.data.name);
            return res.status(400).json({
                success: false,
                error: 'Ihre Nachricht konnte nicht versendet werden. Bitte überprüfen Sie den Inhalt.',
                code: 'SPAM_DETECTED'
            });
        }

        // Send email
        console.log('Sending email for:', validation.data.name, validation.data.email);
        const result = await emailService.sendContactEmail(validation.data);

        console.log('Email sent successfully:', result.messageId);
        
        res.json({
            success: true,
            message: 'Vielen Dank für Ihre Nachricht! Wir werden uns zeitnah bei Ihnen melden.',
            messageId: result.messageId
        });

    } catch (error) {
        console.error('Error processing contact form:', error);
        
        // Don't expose internal errors to client
        res.status(500).json({
            success: false,
            error: 'Ein technischer Fehler ist aufgetreten. Bitte versuchen Sie es später erneut oder kontaktieren Sie uns direkt.',
            code: 'INTERNAL_ERROR'
        });
    }
});

// API documentation endpoint
app.get('/api', (req, res) => {
    res.json({
        name: 'BEGW Contact API',
        version: '1.0.0',
        endpoints: {
            'POST /api/contact': 'Submit contact form',
            'GET /health': 'Health check',
            'GET /api': 'API documentation'
        },
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        code: 'NOT_FOUND'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({
            error: 'CORS policy violation',
            code: 'CORS_ERROR'
        });
    }
    
    res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
    });
});

// Start server
async function startServer() {
    try {
        // Test email service on startup
        console.log('Testing email service connection...');
        await emailService.testConnection();
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`✓ BEGW Contact API server running on port ${PORT}`);
            console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`✓ CORS allowed origins: ${process.env.FRONTEND_URL || 'localhost'}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    process.exit(0);
});

startServer();
