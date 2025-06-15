// Mobile Navigation Toggle
document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    // Toggle mobile menu
    hamburger?.addEventListener('click', function() {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
        
        // Animate hamburger bars
        const bars = hamburger.querySelectorAll('.bar');
        if (hamburger.classList.contains('active')) {
            bars[0].style.transform = 'rotate(-45deg) translate(-5px, 6px)';
            bars[1].style.opacity = '0';
            bars[2].style.transform = 'rotate(45deg) translate(-5px, -6px)';
        } else {
            bars[0].style.transform = 'none';
            bars[1].style.opacity = '1';
            bars[2].style.transform = 'none';
        }
    });

    // Close mobile menu when clicking on a link
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            hamburger?.classList.remove('active');
            navMenu?.classList.remove('active');
            
            // Reset hamburger animation
            const bars = hamburger?.querySelectorAll('.bar');
            if (bars) {
                bars[0].style.transform = 'none';
                bars[1].style.opacity = '1';
                bars[2].style.transform = 'none';
            }
        });
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', function(event) {
        const isClickInsideNav = navMenu?.contains(event.target);
        const isClickOnHamburger = hamburger?.contains(event.target);
        
        if (!isClickInsideNav && !isClickOnHamburger && navMenu?.classList.contains('active')) {
            hamburger?.classList.remove('active');
            navMenu?.classList.remove('active');
            
            // Reset hamburger animation
            const bars = hamburger?.querySelectorAll('.bar');
            if (bars) {
                bars[0].style.transform = 'none';
                bars[1].style.opacity = '1';
                bars[2].style.transform = 'none';
            }
        }
    });
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const headerOffset = 80;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// Header scroll effect
window.addEventListener('scroll', function() {
    const header = document.querySelector('.header');
    if (window.scrollY > 100) {
        header?.classList.add('scrolled');
    } else {
        header?.classList.remove('scrolled');
    }
});

// Captcha functionality
let captchaAnswer = 0;

function generateCaptcha() {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const operators = ['+', '-'];
    const operator = operators[Math.floor(Math.random() * operators.length)];
    
    let question, answer;
    if (operator === '+') {
        question = `${num1} + ${num2}`;
        answer = num1 + num2;
    } else {
        // Ensure subtraction doesn't result in negative numbers
        const larger = Math.max(num1, num2);
        const smaller = Math.min(num1, num2);
        question = `${larger} - ${smaller}`;
        answer = larger - smaller;
    }
    
    captchaAnswer = answer;
    const questionElement = document.getElementById('captcha-question');
    if (questionElement) {
        questionElement.textContent = question;
    }
}

// Initialize captcha when page loads
document.addEventListener('DOMContentLoaded', function() {
    generateCaptcha();
    
    // Regenerate captcha if user gets it wrong
    const captchaInput = document.getElementById('captcha');
    if (captchaInput) {
        captchaInput.addEventListener('blur', function() {
            const userAnswer = parseInt(this.value);
            if (userAnswer && userAnswer !== captchaAnswer) {
                // Don't immediately regenerate, give them a chance to correct
                this.setCustomValidity('Die Antwort ist nicht korrekt. Bitte versuchen Sie es erneut.');
            } else {
                this.setCustomValidity('');
            }
        });
    }
});

// Contact Form Handling
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form data
        const formData = new FormData(contactForm);
        const formObject = {};
        formData.forEach((value, key) => {
            formObject[key] = value;
        });

        // Validate required fields
        const requiredFields = ['name', 'email', 'subject', 'message'];
        const emptyFields = requiredFields.filter(field => !formObject[field]);
        
        if (emptyFields.length > 0) {
            showAlert('Bitte füllen Sie alle Pflichtfelder aus.', 'error');
            return;
        }

        // Validate email
        if (!isValidEmail(formObject.email)) {
            showAlert('Bitte geben Sie eine gültige E-Mail-Adresse ein.', 'error');
            return;
        }

        // Check privacy consent
        if (!formObject.privacy) {
            showAlert('Bitte stimmen Sie der Datenschutzerklärung zu.', 'error');
            return;
        }

        // Validate captcha
        const userCaptchaAnswer = parseInt(formObject.captcha);
        if (!userCaptchaAnswer || userCaptchaAnswer !== captchaAnswer) {
            showAlert('Die Sicherheitsfrage wurde nicht korrekt beantwortet. Bitte versuchen Sie es erneut.', 'error');
            generateCaptcha(); // Generate new captcha
            document.getElementById('captcha').value = '';
            return;
        }

        // Check honeypot (anti-spam)
        if (formObject.website && formObject.website.length > 0) {
            // Bot detected, fail silently or show generic error
            showAlert('Ein technischer Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.', 'error');
            return;
        }

        // Submit form to API
        const submitButton = contactForm.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Wird gesendet...';
        submitButton.disabled = true;

        // Send to API
        submitToAPI(formObject)
            .then(response => {
                if (response.success) {
                    showAlert(response.message || 'Vielen Dank für Ihre Nachricht! Wir werden uns zeitnah bei Ihnen melden.', 'success');
                    contactForm.reset();
                    generateCaptcha(); // Generate new captcha after successful submission
                } else {
                    throw new Error(response.error || 'Ein Fehler ist aufgetreten');
                }
            })
            .catch(error => {
                console.error('Form submission error:', error);
                showAlert(error.message || 'Ein technischer Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.', 'error');
            })
            .finally(() => {
                submitButton.innerHTML = originalText;
                submitButton.disabled = false;
            });
    });
}

// API submission function
async function submitToAPI(formData) {
    const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3000/api/contact'
        : `${window.location.protocol}//api.buergerenergie-westsachsen.de/api/contact`;
    
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        // Handle response
        const data = await response.json();
        
        if (!response.ok) {
            // Handle validation errors
            if (response.status === 400 && data.details) {
                const errorMessages = Object.values(data.details).join('\n');
                throw new Error(errorMessages);
            }
            
            // Handle rate limiting
            if (response.status === 429) {
                throw new Error(data.error || 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.');
            }
            
            // Handle other errors
            throw new Error(data.error || `Server-Fehler: ${response.status}`);
        }
        
        return data;
        
    } catch (error) {
        // Handle network errors
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Verbindungsfehler. Bitte überprüfen Sie Ihre Internetverbindung.');
        }
        
        // Re-throw other errors
        throw error;
    }
}

// Email validation
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Alert system
function showAlert(message, type) {
    // Remove existing alerts
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }

    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <div class="alert-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
            <button class="alert-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    // Add alert styles if not already present
    if (!document.querySelector('#alert-styles')) {
        const alertStyles = document.createElement('style');
        alertStyles.id = 'alert-styles';
        alertStyles.textContent = `
            .alert {
                position: fixed;
                top: 100px;
                right: 20px;
                z-index: 10000;
                min-width: 300px;
                max-width: 500px;
                padding: 1rem;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                animation: slideInRight 0.3s ease-out;
            }
            
            .alert-success {
                background: #d4edda;
                color: #155724;
                border-left: 4px solid #28a745;
            }
            
            .alert-error {
                background: #f8d7da;
                color: #721c24;
                border-left: 4px solid #dc3545;
            }
            
            .alert-content {
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }
            
            .alert-content i:first-child {
                font-size: 1.2rem;
            }
            
            .alert-close {
                background: none;
                border: none;
                cursor: pointer;
                padding: 0.25rem;
                margin-left: auto;
                opacity: 0.7;
                transition: opacity 0.3s ease;
            }
            
            .alert-close:hover {
                opacity: 1;
            }
            
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @media (max-width: 768px) {
                .alert {
                    right: 10px;
                    left: 10px;
                    min-width: auto;
                }
            }
        `;
        document.head.appendChild(alertStyles);
    }

    // Add alert to page
    document.body.appendChild(alert);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert.parentElement) {
            alert.style.animation = 'slideOutRight 0.3s ease-in forwards';
            setTimeout(() => alert.remove(), 300);
        }
    }, 5000);
}

// Logo placeholder replacement
function replaceLogo(logoUrl) {
    const logoPlaceholders = document.querySelectorAll('#logo-placeholder, #logo-footer-placeholder');
    logoPlaceholders.forEach(placeholder => {
        if (logoUrl) {
            placeholder.src = logoUrl;
            placeholder.style.background = 'none';
            placeholder.style.color = 'inherit';
        }
    });
}

// Animate elements on scroll
function animateOnScroll() {
    const animatedElements = document.querySelectorAll('.service-card, .stat-item, .contact-item');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.6s ease-out forwards';
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        observer.observe(el);
    });
}

// Initialize animations when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    animateOnScroll();
});

// Counter animation for statistics
function animateCounters() {
    const counters = document.querySelectorAll('.stat-number');
    
    counters.forEach(counter => {
        const target = parseInt(counter.textContent.replace(/\D/g, ''));
        const suffix = counter.textContent.replace(/[\d\s]/g, '');
        let current = 0;
        const increment = target / 100;
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                counter.textContent = target + suffix;
                clearInterval(timer);
            } else {
                counter.textContent = Math.floor(current) + suffix;
            }
        }, 20);
    });
}

// Trigger counter animation when stats section is visible
const statsSection = document.querySelector('.about-stats');
if (statsSection) {
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounters();
                statsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    statsObserver.observe(statsSection);
}

// Form field validation feedback
function addFormValidation() {
    const formInputs = document.querySelectorAll('.contact-form input, .contact-form select, .contact-form textarea');
    
    formInputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateField(this);
        });
        
        input.addEventListener('input', function() {
            if (this.classList.contains('error')) {
                validateField(this);
            }
        });
    });
}

function validateField(field) {
    const value = field.value.trim();
    const isRequired = field.hasAttribute('required');
    
    // Remove existing error styling
    field.classList.remove('error');
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
    
    let isValid = true;
    let errorMessage = '';
    
    if (isRequired && !value) {
        isValid = false;
        errorMessage = 'Dieses Feld ist erforderlich.';
    } else if (field.type === 'email' && value && !isValidEmail(value)) {
        isValid = false;
        errorMessage = 'Bitte geben Sie eine gültige E-Mail-Adresse ein.';
    }
    
    if (!isValid) {
        field.classList.add('error');
        const errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        errorElement.textContent = errorMessage;
        errorElement.style.cssText = 'color: #dc3545; font-size: 0.875rem; margin-top: 0.25rem;';
        field.parentNode.appendChild(errorElement);
    }
    
    return isValid;
}

// Add field validation styles
const validationStyles = document.createElement('style');
validationStyles.textContent = `
    .form-group input.error,
    .form-group select.error,
    .form-group textarea.error {
        border-color: #dc3545 !important;
        box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);
    }
`;
document.head.appendChild(validationStyles);

// Initialize form validation
document.addEventListener('DOMContentLoaded', function() {
    addFormValidation();
});

// Keyboard navigation enhancement
document.addEventListener('keydown', function(e) {
    // Close mobile menu with Escape key
    if (e.key === 'Escape') {
        const navMenu = document.querySelector('.nav-menu');
        const hamburger = document.querySelector('.hamburger');
        
        if (navMenu?.classList.contains('active')) {
            hamburger?.classList.remove('active');
            navMenu.classList.remove('active');
            
            // Reset hamburger animation
            const bars = hamburger?.querySelectorAll('.bar');
            if (bars) {
                bars[0].style.transform = 'none';
                bars[1].style.opacity = '1';
                bars[2].style.transform = 'none';
            }
        }
    }
});

// Add loading state for external resources
window.addEventListener('load', function() {
    document.body.classList.add('loaded');
});

// Add basic loading styles
const loadingStyles = document.createElement('style');
loadingStyles.textContent = `
    body:not(.loaded) .hero-image .energy-icon {
        animation: pulse 1s infinite;
    }
    
    body.loaded .hero-image .energy-icon {
        animation: pulse 2s infinite;
    }
`;
document.head.appendChild(loadingStyles);
