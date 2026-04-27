// Updated Fertilizer Recommendation Module with Backend Integration

const API_BASE = 'https://ai-farming-x.onrender.com/api';
document.addEventListener("DOMContentLoaded", () => {
    document.body.classList.add("loaded");
});

// Initialize Fertilizer Recommendation with Backend
function initializeFertilizerRecommendation() {
    const form = document.getElementById('fertilizer-form');
    const resultDiv = document.getElementById('fertilizer-result');

    if (!form || !resultDiv) return;

    // Load available crops from backend
    loadCropsList();

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Show loading state
        resultDiv.innerHTML = '<div class="loading">Analyzing soil data and generating recommendation...</div>';

        // Collect form data
        const formData = {
            nitrogen: parseFloat(form['nitrogen'].value) || 50,
            phosphorus: parseFloat(form['phosphorus'].value) || 30,
            potassium: parseFloat(form['potassium'].value) || 40,
            temperature: parseFloat(form['temperature'].value) || 25,
            humidity: parseFloat(form['humidity'].value) || 70,
            ph: parseFloat(form['ph'].value) || 6.5,
            rainfall: parseFloat(form['rainfall'].value) || 200,
            crop_type: form['crop-type'].value,
            soil_type: form['soil-type'].value,
            username: getFromStorage('user')?.username || 'anonymous'
        };

        try {
            // Call backend API
            const response = await fetch(`${API_BASE}/fertilizer/recommend`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Failed to get recommendation');
            }

            const recommendation = await response.json();
            displayRecommendation(recommendation, resultDiv);

            // Save to localStorage for history
            saveRecommendationToHistory(recommendation);

        } catch (error) {
            console.error('Error:', error);
            resultDiv.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Unable to generate recommendation. Please check if the backend server is running.</p>
                    <p class="error-detail">${error.message}</p>
                </div>
            `;
        }
    });
}

// Load crops list from backend
async function loadCropsList() {
    try {
        const response = await fetch(`${API_BASE}/crops`);
        const data = await response.json();
        
        const cropSelect = document.getElementById('crop-type');
        if (cropSelect && data.crops) {
            cropSelect.innerHTML = '<option value="" disabled selected>Select crop type</option>';
            data.crops.forEach(crop => {
                const option = document.createElement('option');
                option.value = crop;
                option.textContent = crop.charAt(0).toUpperCase() + crop.slice(1);
                cropSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading crops:', error);
    }
}

// Display recommendation results
function displayRecommendation(recommendation, resultDiv) {
    const soilAnalysis = recommendation.soil_analysis;
    const recommendations = recommendation.recommendations || [];

    resultDiv.innerHTML = `
        <div class="recommendation-card">
            <div class="recommendation-header">
                <h3><i class="fas fa-check-circle"></i> Fertilizer Recommendation</h3>
                <span class="recommendation-date">${new Date(recommendation.timestamp).toLocaleDateString()}</span>
            </div>

            <div class="recommendation-main">
                <div class="fertilizer-info">
                    <h4>Recommended Fertilizer</h4>
                    <div class="fertilizer-type">
                        <i class="fas fa-leaf"></i>
                        <strong>${recommendation.fertilizer_type}</strong>
                    </div>
                    <div class="dosage-info">
                        <i class="fas fa-weight"></i>
                        <span>Dosage: <strong>${recommendation.dosage}</strong></span>
                    </div>
                </div>

                <div class="application-method">
                    <h4><i class="fas fa-tasks"></i> Application Method</h4>
                    <p>${recommendation.application_method}</p>
                </div>
            </div>

            <div class="soil-analysis">
                <h4><i class="fas fa-flask"></i> Soil Analysis</h4>
                <div class="nutrient-levels">
                    <div class="nutrient-item ${soilAnalysis.nitrogen.toLowerCase()}">
                        <span class="nutrient-label">Nitrogen (N)</span>
                        <span class="nutrient-value">${soilAnalysis.nitrogen}</span>
                    </div>
                    <div class="nutrient-item ${soilAnalysis.phosphorus.toLowerCase()}">
                        <span class="nutrient-label">Phosphorus (P)</span>
                        <span class="nutrient-value">${soilAnalysis.phosphorus}</span>
                    </div>
                    <div class="nutrient-item ${soilAnalysis.potassium.toLowerCase()}">
                        <span class="nutrient-label">Potassium (K)</span>
                        <span class="nutrient-value">${soilAnalysis.potassium}</span>
                    </div>
                </div>
            </div>

            ${recommendations.length > 0 ? `
                <div class="recommendations-list">
                    <h4><i class="fas fa-lightbulb"></i> Additional Recommendations</h4>
                    <ul>
                        ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}

            <div class="recommendation-actions">
                <button class="btn primary-btn" onclick="downloadRecommendation()">
                    <i class="fas fa-download"></i> Download Report
                </button>
                <button class="btn secondary-btn" onclick="viewHistory()">
                    <i class="fas fa-history"></i> View History
                </button>
            </div>
        </div>
    `;

    // Add CSS styles dynamically if not present
    addRecommendationStyles();
}

// Add CSS styles for recommendation display
function addRecommendationStyles() {
    if (document.getElementById('recommendation-styles')) return;

    const style = document.createElement('style');
    style.id = 'recommendation-styles';
    style.textContent = `
        .loading {
            text-align: center;
            padding: 40px;
            color: var(--primary-color);
            font-size: 1.1rem;
        }

        .error-message {
            background: #fee2e2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            padding: 20px;
            color: #dc2626;
            text-align: center;
        }

        .error-message i {
            font-size: 2rem;
            margin-bottom: 10px;
        }

        .error-detail {
            font-size: 0.9rem;
            margin-top: 10px;
            opacity: 0.8;
        }

        .recommendation-card {
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            margin-top: 20px;
        }

        .recommendation-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e5e7eb;
        }

        .recommendation-header h3 {
            color: var(--primary-color);
            display: flex;
            align-items: center;
            gap: 10px;
            margin: 0;
        }

        .recommendation-date {
            color: var(--text-secondary);
            font-size: 0.9rem;
        }

        .recommendation-main {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 25px;
        }

        .fertilizer-info, .application-method {
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
        }

        .fertilizer-info h4, .application-method h4 {
            color: var(--primary-color);
            margin-bottom: 15px;
            font-size: 1rem;
        }

        .fertilizer-type {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 1.2rem;
            color: var(--primary-color);
            margin-bottom: 10px;
        }

        .dosage-info {
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--text-color);
        }

        .soil-analysis {
            margin-bottom: 25px;
        }

        .soil-analysis h4 {
            color: var(--primary-color);
            margin-bottom: 15px;
        }

        .nutrient-levels {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
        }

        .nutrient-item {
            background: #f9fafb;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            border: 2px solid transparent;
        }

        .nutrient-item.low {
            border-color: #ef4444;
            background: #fef2f2;
        }

        .nutrient-item.medium {
            border-color: #f59e0b;
            background: #fffbeb;
        }

        .nutrient-item.high {
            border-color: #10b981;
            background: #f0fdf4;
        }

        .nutrient-label {
            display: block;
            font-size: 0.85rem;
            color: var(--text-secondary);
            margin-bottom: 5px;
        }

        .nutrient-value {
            display: block;
            font-weight: 700;
            font-size: 1.1rem;
            color: var(--text-color);
        }

        .recommendations-list {
            background: #f0fdf4;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid var(--primary-color);
            margin-bottom: 25px;
        }

        .recommendations-list h4 {
            color: var(--primary-color);
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .recommendations-list ul {
            list-style: none;
            padding: 0;
        }

        .recommendations-list li {
            padding: 8px 0;
            padding-left: 25px;
            position: relative;
        }

        .recommendations-list li:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: var(--primary-color);
            font-weight: bold;
        }

        .recommendation-actions {
            display: flex;
            gap: 15px;
            justify-content: center;
        }

        @media (max-width: 768px) {
            .recommendation-main {
                grid-template-columns: 1fr;
            }

            .nutrient-levels {
                grid-template-columns: 1fr;
            }

            .recommendation-actions {
                flex-direction: column;
            }
        }
    `;
    document.head.appendChild(style);
}

// Save recommendation to local history
function saveRecommendationToHistory(recommendation) {
    let history = getFromStorage('recommendation_history') || [];
    history.unshift(recommendation);
    
    // Keep only last 10 recommendations
    if (history.length > 10) {
        history = history.slice(0, 10);
    }
    
    saveToStorage('recommendation_history', history);
}

// Download recommendation as text file
function downloadRecommendation() {
    const history = getFromStorage('recommendation_history');
    if (!history || history.length === 0) {
        alert('No recommendation available to download');
        return;
    }

    const latest = history[0];
    const content = `
FERTILIZER RECOMMENDATION REPORT
================================

Date: ${new Date(latest.timestamp).toLocaleString()}

RECOMMENDED FERTILIZER
----------------------
Type: ${latest.fertilizer_type}
Dosage: ${latest.dosage}
Application: ${latest.application_method}

SOIL ANALYSIS
-------------
Nitrogen (N): ${latest.soil_analysis.nitrogen}
Phosphorus (P): ${latest.soil_analysis.phosphorus}
Potassium (K): ${latest.soil_analysis.potassium}

RECOMMENDATIONS
---------------
${latest.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

Generated by AI-Powered Precision Farming System
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fertilizer_recommendation_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// View recommendation history
function viewHistory() {
    const history = getFromStorage('recommendation_history') || [];
    
    if (history.length === 0) {
        alert('No recommendation history available');
        return;
    }

    let historyHTML = '<div class="history-modal"><h3>Recommendation History</h3><div class="history-list">';
    
    history.forEach((rec, index) => {
        historyHTML += `
            <div class="history-item">
                <div class="history-date">${new Date(rec.timestamp).toLocaleDateString()}</div>
                <div class="history-fertilizer">${rec.fertilizer_type}</div>
                <div class="history-dosage">${rec.dosage}</div>
            </div>
        `;
    });
    
    historyHTML += '</div><button class="btn primary-btn" onclick="closeHistoryModal()">Close</button></div>';
    
    const modal = document.createElement('div');
    modal.id = 'history-modal-container';
    modal.innerHTML = historyHTML;
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(251, 249, 249, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    document.body.appendChild(modal);
}

function closeHistoryModal() {
    const modal = document.getElementById('history-modal-container');
    if (modal) {
        modal.remove();
    }
}

// Helper functions (if not already defined)
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
document.addEventListener("DOMContentLoaded", () => {
    // Show dashboard by default
    document.querySelectorAll(".module-section").forEach(sec => {
        sec.classList.add("hidden");
        sec.classList.remove("visible");
    });

    const dashboard = document.getElementById("dashboard");
    if (dashboard) {
        dashboard.classList.remove("hidden");
        dashboard.classList.add("visible");
    }

    // Navbar navigation
    document.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", e => {
            const href = this.getAttribute('href');

            // only handles internal section links

            if (!href || !href.startsWith('#')) return;

            e.preventDefault();
            const targetId = href.replace('#', '');

            // hinding all sections
            document.querySelectorAll('.module-section').forEach(section => {
                section.classList.remove('visible');
                section.classList.add('hidden');
            });

            // show the target section
            const target = document.getElementById(targetId);
            if (target){
                target.classList.remove("hidden");
                target.classList.add("visible");
            }
            
            // update active nav link
            document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
            link.classList.add("active");

            // scroll to top
            window.scrollTo({top:0, behavior:"smooth"});
        });
    });
});
document.getElementById("logout-btn")?.addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "login.html";
});
document.addEventListener("DOMContentLoaded", () => {
    initializeFertilizerRecommendation();
});
