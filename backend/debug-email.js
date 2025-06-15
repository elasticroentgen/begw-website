#!/usr/bin/env node

// Email configuration debugging script
require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmailConfigurations() {
    const configs = [
        // Configuration 1: Basic STARTTLS (port 587)
        {
            name: 'STARTTLS (587)',
            config: {
                host: process.env.MAIL_HOST,
                port: 587,
                secure: false,
                requireTLS: true,
                auth: {
                    user: process.env.MAIL_USER,
                    pass: process.env.MAIL_PASS
                },
                tls: {
                    rejectUnauthorized: false
                }
            }
        },
        // Configuration 2: SSL/TLS (port 465)
        {
            name: 'SSL/TLS (465)',
            config: {
                host: process.env.MAIL_HOST,
                port: 465,
                secure: true,
                auth: {
                    user: process.env.MAIL_USER,
                    pass: process.env.MAIL_PASS
                },
                tls: {
                    rejectUnauthorized: false
                }
            }
        },
        // Configuration 3: Plain (port 25)
        {
            name: 'Plain SMTP (25)',
            config: {
                host: process.env.MAIL_HOST,
                port: 25,
                secure: false,
                auth: {
                    user: process.env.MAIL_USER,
                    pass: process.env.MAIL_PASS
                }
            }
        },
        // Configuration 4: Alternative port 2587
        {
            name: 'Alternative STARTTLS (2587)',
            config: {
                host: process.env.MAIL_HOST,
                port: 2587,
                secure: false,
                requireTLS: true,
                auth: {
                    user: process.env.MAIL_USER,
                    pass: process.env.MAIL_PASS
                },
                tls: {
                    rejectUnauthorized: false
                }
            }
        }
    ];

    console.log('Testing email configurations...\n');
    console.log('Host:', process.env.MAIL_HOST);
    console.log('User:', process.env.MAIL_USER);
    console.log('Password length:', process.env.MAIL_PASS ? process.env.MAIL_PASS.length : 0);
    console.log('========================================\n');

    for (const { name, config } of configs) {
        console.log(`Testing ${name}...`);
        
        try {
            const transporter = nodemailer.createTransporter(config);
            await transporter.verify();
            console.log(`✅ ${name}: SUCCESS`);
            
            // Try to get server info
            try {
                const info = await transporter.verify();
                console.log(`   Server responded successfully`);
            } catch (e) {
                console.log(`   Warning: ${e.message}`);
            }
            
        } catch (error) {
            console.log(`❌ ${name}: FAILED`);
            console.log(`   Error: ${error.message}`);
            
            // Try to get more specific error info
            if (error.code) {
                console.log(`   Code: ${error.code}`);
            }
            if (error.response) {
                console.log(`   Response: ${error.response}`);
            }
        }
        console.log('');
    }

    // Test DNS resolution
    console.log('Testing DNS resolution...');
    try {
        const dns = require('dns').promises;
        const addresses = await dns.lookup(process.env.MAIL_HOST);
        console.log(`✅ DNS: ${process.env.MAIL_HOST} resolves to ${addresses.address}`);
        
        // Try to get MX records
        try {
            const mx = await dns.resolveMx(process.env.MAIL_HOST);
            console.log('📧 MX Records:', mx.map(record => `${record.exchange} (priority: ${record.priority})`));
        } catch (e) {
            console.log('📧 MX Records: Not available or error:', e.message);
        }
        
    } catch (error) {
        console.log(`❌ DNS: Failed to resolve ${process.env.MAIL_HOST}`);
        console.log(`   Error: ${error.message}`);
    }
}

// Check if we have the required environment variables
if (!process.env.MAIL_HOST || !process.env.MAIL_USER || !process.env.MAIL_PASS) {
    console.error('❌ Missing required environment variables:');
    console.error('   MAIL_HOST:', process.env.MAIL_HOST || 'MISSING');
    console.error('   MAIL_USER:', process.env.MAIL_USER || 'MISSING');
    console.error('   MAIL_PASS:', process.env.MAIL_PASS ? 'SET' : 'MISSING');
    process.exit(1);
}

testEmailConfigurations().catch(console.error);