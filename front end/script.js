// FarmShield - Livestock Biosecurity Portal JavaScript
// Handles navigation, forms, and interactive functionality

// const API_BASE = 'http://127.0.0.1:5000/api'; // Backend removed

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    if (window.location.pathname.endsWith('login.html')) {
        initializeLogin();
    } else {
        checkAuthentication();
        // Initialize all components
        initializeNavigation();
        initializeRiskAssessment();
        initializeDashboard();
        initializeAlerts();
        initializeTasks();
        initializeAlertFilters();  // Add filter initialization
        initializeFertilizerRecommendation();
        initializeLogout();  // Initialize logout functionality
    }
});

// Navigation functionality
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.module-section');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            const targetId = this.getAttribute('href').substring(1);

            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));

            // Add active class to clicked link
            this.classList.add('active');

            // Hide all sections
            sections.forEach(section => {
                section.classList.remove('visible');
                section.classList.add('hidden');
            });

            // Show target section
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.remove('hidden');
                targetSection.classList.add('visible');
            }
        });
    });
}

// Risk Assessment Form functionality
function initializeRiskAssessment() {
    const form = document.getElementById('risk-assessment-form');

    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();

            const formData = new FormData(form);
            const answers = {
                fencing: formData.get('fencing'),
                quarantine: formData.get('quarantine')
            };

            // Calculate biosecurity score and display
            const score = calculateBiosecurityScore(answers);
            displayBiosecurityScore(score);

            // Save to localStorage
            saveToStorage('lastAssessment', { answers, score });

            // Refresh dashboard data
            initializeDashboard();
        });
    }
}

// Calculate biosecurity score based on answers
function calculateBiosecurityScore(answers) {
    let score = 0;
    let maxScore = 0;

    // Fencing question (40 points)
    maxScore += 40;
    if (answers.fencing === 'yes') {
        score += 40;
    }

    // Quarantine question (60 points)
    maxScore += 60;
    if (answers.quarantine === 'yes') {
        score += 60;
    }

    return {
        total: score,
        max: maxScore,
        percentage: Math.round((score / maxScore) * 100)
    };
}

// Display biosecurity score on dashboard
function displayBiosecurityScore(score) {
    const scoreElement = document.getElementById('biosecurity-score');
    const scoreMessage = document.querySelector('.score-message');

    if (scoreElement) {
        scoreElement.textContent = score.percentage + '%';

        // Update color based on score
        if (score.percentage >= 80) {
            scoreElement.style.color = '#4caf50'; // Green
            scoreMessage.textContent = 'Excellent! Your farm has strong biosecurity measures.';
        } else if (score.percentage >= 60) {
            scoreElement.style.color = '#ff9800'; // Orange
            scoreMessage.textContent = 'Good, but there\'s room for improvement.';
        } else {
            scoreElement.style.color = '#f44336'; // Red
            scoreMessage.textContent = 'Your biosecurity needs immediate attention.';
        }
    }
}

// Dashboard initialization
function initializeDashboard() {
    // Load last assessment if available
    const lastAssessment = getFromStorage('lastAssessment');
    if (lastAssessment) {
        displayBiosecurityScore(lastAssessment.score);
    }
}

// Alerts functionality
function initializeAlerts() {
    const alertList = document.getElementById('alert-list');

    // Load existing alerts or use sample
    let alerts = getFromStorage('alerts');
    if (!alerts || alerts.length === 0) {
        const sampleAlerts = [
            {
                id: 1,
                type: 'high',
                message: 'Disease outbreak reported in neighboring county',
                date: new Date().toISOString()
            },
            {
                id: 2,
                type: 'medium',
                message: 'Weather conditions may increase disease risk',
                date: new Date(Date.now() - 86400000).toISOString() // 1 day ago
            },
            {
                id: 3,
                type: 'resolved',
                message: 'Previous alert resolved',
                date: new Date(Date.now() - 172800000).toISOString() // 2 days ago
            }
        ];
        alerts = sampleAlerts;
        saveToStorage('alerts', alerts);
    }


    if (alertList) {
        displayAlerts(alerts);
        updateAlertStats(alerts);
    }
}

// Display alerts in the UI
function displayAlerts(alerts, filter = 'all') {
    const alertList = document.getElementById('alert-list');

    if (!alertList) return;

    // Filter alerts if needed
    let filteredAlerts = alerts;
    if (filter !== 'all') {
        filteredAlerts = alerts.filter(alert => alert.type === filter);
    }

    alertList.innerHTML = '';

    if (filteredAlerts.length === 0) {
        alertList.innerHTML = '<li>No alerts matching the filter.</li>';
        return;
    }

    filteredAlerts.forEach(alert => {
        const li = document.createElement('li');
        li.className = `alert-item ${alert.type}`;
        li.innerHTML = `
            <div class="alert-header">
                <div class="alert-title">
                    <i class="fas fa-${alert.type === 'high' ? 'exclamation-triangle' : alert.type === 'medium' ? 'cloud-rain' : 'check-circle'}"></i>
                    ${alert.message}
                </div>
                <div class="alert-priority ${alert.type}">${alert.type.charAt(0).toUpperCase() + alert.type.slice(1)}</div>
            </div>
            <div class="alert-content">
                <p>${alert.message}</p>
                <div class="alert-meta">
                    <span class="alert-date"><i class="fas fa-calendar"></i> ${formatDate(alert.date)}</span>
                </div>
            </div>
            <div class="alert-actions">
                <button class="btn primary-btn view-details">View Details</button>
                ${alert.type !== 'resolved' ? '<button class="btn secondary-btn mark-resolved">Mark Resolved</button>' : ''}
            </div>
        `;

        // Add event listeners
        const viewBtn = li.querySelector('.view-details');
        if (viewBtn) {
            viewBtn.addEventListener('click', () => {
                alert('Viewing details for: ' + alert.message);  // Placeholder for modal/details
            });
        }

        const resolveBtn = li.querySelector('.mark-resolved');
        if (resolveBtn) {
            resolveBtn.addEventListener('click', () => {
                // Mark as resolved in localStorage
                alert.type = 'resolved';
                saveToStorage('alerts', alerts);
                // Refresh alerts
                initializeAlerts();
            });
        }

        alertList.appendChild(li);
    });
}

// Update alert statistics
function updateAlertStats(alerts) {
    const highEl = document.getElementById('high-alerts');
    const mediumEl = document.getElementById('medium-alerts');
    const resolvedEl = document.getElementById('resolved-alerts');

    if (highEl) highEl.textContent = alerts.filter(a => a.type === 'high').length;
    if (mediumEl) mediumEl.textContent = alerts.filter(a => a.type === 'medium').length;
    if (resolvedEl) resolvedEl.textContent = alerts.filter(a => a.type === 'resolved').length;
}

// Tasks functionality
function initializeTasks() {
    const taskList = document.getElementById('task-list');

    // Load tasks from localStorage or use sample
    let tasks = getFromStorage('tasks');
    if (!tasks || tasks.length === 0) {
        const sampleTasks = [
            { id: 1, text: 'Clean and disinfect entry points.', completed: true },
            { id: 2, text: 'Update animal count.', completed: true },
            { id: 3, text: 'Check feed quality.', completed: false },
            { id: 4, text: 'Inspect fencing.', completed: false }
        ];
        tasks = sampleTasks;
        saveToStorage('tasks', tasks);
    }

    if (taskList) {
        displayTasks(tasks);
    }
}

// Display tasks in the UI
function displayTasks(tasks) {
    const taskList = document.getElementById('task-list');

    if (!taskList) return;

    taskList.innerHTML = '';

    tasks.forEach(task => {
        const li = document.createElement('li');
        li.className = task.completed ? 'completed' : '';
        li.innerHTML = `
            <i class="fas fa-${task.completed ? 'check-circle' : 'circle'}"></i>
            <span class="${task.completed ? 'completed-text' : ''}">${task.text}</span>
        `;

        // Add click handler to toggle completion
        li.addEventListener('click', function() {
            // Toggle completion in localStorage
            task.completed = !task.completed;
            saveToStorage('tasks', tasks);
            // Refresh tasks
            initializeTasks();
        });

        taskList.appendChild(li);
    });
}

// Local Storage functions
function saveToStorage(key, data) {
    try {
        localStorage.setItem(`farmshield_${key}`, JSON.stringify(data));
    } catch (e) {
        console.warn('Could not save to localStorage:', e);
    }
}

function getFromStorage(key) {
    try {
        const item = localStorage.getItem(`farmshield_${key}`);
        return item ? JSON.parse(item) : null;
    } catch (e) {
        console.warn('Could not retrieve from localStorage:', e);
        return null;
    }
}

function loadDataFromStorage() {
    // Load and display saved data
    const savedTasks = getFromStorage('tasks');
    if (savedTasks) {
        displayTasks(savedTasks);
    }

    const savedAlerts = getFromStorage('alerts');
    if (savedAlerts) {
        displayAlerts(savedAlerts);
        updateAlertStats(savedAlerts);
    }
}

// Add filter functionality for alerts
function initializeAlertFilters() {
    const filterBtns = document.querySelectorAll('.alert-filters .btn');
    let currentFilter = 'all';

    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.dataset.filter;
            currentFilter = filter;

            // Update active button
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // Re-display alerts with filter
            const alerts = getFromStorage('alerts') || [];
            displayAlerts(alerts, filter);
        });
    });
}

// Utility function to format dates
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
        return 'Today';
    } else if (diffDays === 2) {
        return 'Yesterday';
    } else if (diffDays <= 7) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString();
    }
}

// Authentication functions
function checkAuthentication() {
    const isLoggedIn = getFromStorage('isLoggedIn');
    if (!isLoggedIn) {
        window.location.href = 'login.html';
    }
}

function initializeLogin() {
    const form = document.getElementById('login-form');
    const messageDiv = document.getElementById('login-message');

    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();

            const username = form['username'].value.trim();
            const password = form['password'].value.trim();

            // Simple authentication (in a real app, this would be server-side)
            if (username === 'farmer' && password === 'password' ) {
                saveToStorage('isLoggedIn', true);
                saveToStorage('user', { username: username });
                showMessage('Login successful! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = 'run.html';
                }, 1000);
            
            } else {
                showMessage('Invalid username or password.', 'error');
            }
        });
    }

    function showMessage(message, type) {
        if (messageDiv) {
            messageDiv.textContent = message;
            messageDiv.className = `login-message ${type}`;
            messageDiv.style.display = 'block';
        }
    }
}

// Logout functionality
function initializeLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            saveToStorage('isLoggedIn', false);
            saveToStorage('user', null);
            window.location.href = 'login.html';
        });
    }
}

// Add smooth scrolling for better UX
document.documentElement.style.scrollBehavior = 'smooth';

// Add loading animation
window.addEventListener('load', function() {
    document.body.classList.add('loaded');
});

// Error handling for missing elements
window.addEventListener('error', function(e) {
    console.warn('JavaScript error:', e.error);
});

// Fertilizer Recommendation Module
function initializeFertilizerRecommendation() {
    const form = document.getElementById('fertilizer-form');
    const resultDiv = document.getElementById('fertilizer-result');

    if (!form || !resultDiv) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const soilType = form['soil-type'].value;
        const moisture = form['moisture-content'].value;
        const cropType = form['crop-type'].value;

        const recommendation = getFertilizerRecommendation(soilType, moisture, cropType);
        resultDiv.innerHTML = `<h3>Recommendation:</h3><p>${recommendation}</p>`;
    });
}

function getFertilizerRecommendation(soilType, moisture, cropType) {
    // Basic example logic for fertilizer recommendation
    if (!soilType || !moisture || !cropType) {
        return 'Please select all parameters.';
    }

    // Example rules (can be expanded)
    if (soilType === 'clay' && moisture === 'high') {
        return 'Use balanced NPK fertilizer with good drainage management.';
    } else if (soilType === 'sandy' && moisture === 'low') {
        return 'Use slow-release nitrogen fertilizer and increase irrigation.';
    } else if (cropType === 'legume') {
        return 'Legumes fix nitrogen; use phosphorus-rich fertilizer.';
    } else {
        return 'Use general-purpose fertilizer suitable for your crop and soil.';
    }
}
