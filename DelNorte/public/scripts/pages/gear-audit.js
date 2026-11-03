/**
 * Gear Audit Page
 */

async function renderGearAuditPage() {
    const user = auth.getCurrentUser();
    const container = document.getElementById('page-container');
    
    container.innerHTML = `
        <div class="page-header">
            <h1>Gear audit</h1>
            <p class="subtitle">Track your equipment, especially boot break-in</p>
        </div>
        
        <div class="gear-highlight">
            <div class="gear-highlight-icon">🥾</div>
            <div class="gear-highlight-content">
                <h2>Boot Break-in Status</h2>
                <div id="boot-status">
                    <div class="loading">Loading...</div>
                </div>
            </div>
        </div>
        
        <div class="content-grid">
            <div class="card">
                <div class="card-header">
                    <h2>Add Gear Item</h2>
                </div>
                <div class="card-body">
                    <form id="gear-form" class="form">
                        <div class="form-group">
                            <label for="item-type">Item Type</label>
                            <select id="item-type" class="input-field" required>
                                <option value="boots">🥾 Boots</option>
                                <option value="backpack">🎒 Backpack</option>
                                <option value="poles">🏔️ Trekking Poles</option>
                                <option value="jacket">🧥 Rain Jacket</option>
                                <option value="sleeping-bag">💤 Sleeping Bag</option>
                                <option value="other">📦 Other</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="item-name">Item Name / Brand</label>
                            <input type="text" id="item-name" class="input-field" placeholder="e.g., Salomon Quest 4 GTX" required>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="comfort-rating">Comfort Rating</label>
                                <select id="comfort-rating" class="input-field">
                                    <option value="">Not rated yet</option>
                                    <option value="5">⭐⭐⭐⭐⭐ Excellent</option>
                                    <option value="4">⭐⭐⭐⭐ Good</option>
                                    <option value="3">⭐⭐⭐ Okay</option>
                                    <option value="2">⭐⭐ Poor</option>
                                    <option value="1">⭐ Very Poor</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="first-used">First Used</label>
                                <input type="date" id="first-used" class="input-field">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="gear-notes">Notes</label>
                            <textarea id="gear-notes" class="input-field" rows="2" placeholder="Any issues, adjustments, or observations..."></textarea>
                        </div>
                        
                        <button type="submit" class="btn-primary">Add Gear Item</button>
                    </form>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h2>Your Gear List</h2>
                </div>
                <div class="card-body" id="gear-list">
                    <div class="loading">Loading...</div>
                </div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h2>Gear Preparation Tips</h2>
            </div>
            <div class="card-body">
                <div class="tips-grid">
                    <div class="tip-card">
                        <div class="tip-icon">🥾</div>
                        <h3>Boots: 100km Minimum</h3>
                        <p>Your boots must be fully broken in before the Camino. Aim for at least 100km of walking to prevent blisters and ensure comfort.</p>
                    </div>
                    
                    <div class="tip-card">
                        <div class="tip-icon">🎒</div>
                        <h3>Pack Weight: 10% Rule</h3>
                        <p>Your full pack should weigh no more than 10% of your body weight. Practice with full weight during the final 2 months.</p>
                    </div>
                    
                    <div class="tip-card">
                        <div class="tip-icon">🧦</div>
                        <h3>Socks Matter</h3>
                        <p>Invest in quality merino wool hiking socks. Test them during training to find what works for your feet.</p>
                    </div>
                    
                    <div class="tip-card">
                        <div class="tip-icon">🏔️</div>
                        <h3>Trekking Poles</h3>
                        <p>Practice with poles during training. They reduce knee strain and improve stability on descents.</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Handle form submission
    const form = document.getElementById('gear-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleGearSubmit(user);
    });
    
    // Load gear
    await loadGear(user);
}

async function handleGearSubmit(user) {
    const submitBtn = document.querySelector('#gear-form button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding...';
    
    try {
        const gear = {
            item_type: document.getElementById('item-type').value,
            item_name: document.getElementById('item-name').value,
            comfort_rating: document.getElementById('comfort-rating').value ? parseInt(document.getElementById('comfort-rating').value) : null,
            first_used: document.getElementById('first-used').value || null,
            notes: document.getElementById('gear-notes').value || null,
            total_km: 0,
            is_trail_ready: false
        };
        
        await api.createGear(gear);
        
        // Reset form
        document.getElementById('gear-form').reset();
        
        // Reload gear
        await loadGear(user);
        
        alert('Gear item added successfully! 🎉');
        
    } catch (error) {
        console.error('Error adding gear:', error);
        alert('Failed to add gear item. Please try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add Gear Item';
    }
}

async function loadGear(user) {
    try {
        const gear = await api.getGear(user.id);
        
        // Update boot status
        const boots = gear.filter(item => item.item_type === 'boots');
        const bootStatusEl = document.getElementById('boot-status');
        
        if (boots.length === 0) {
            bootStatusEl.innerHTML = `
                <div class="boot-status-empty">
                    <p>No boots tracked yet. Add your Camino boots above!</p>
                </div>
            `;
        } else {
            const boot = boots[0];
            const progress = Math.min((boot.total_km / CONFIG.BOOT_READY_KM) * 100, 100);
            const isReady = boot.total_km >= CONFIG.BOOT_READY_KM;
            
            bootStatusEl.innerHTML = `
                <div class="boot-progress">
                    <div class="boot-stats">
                        <div class="boot-stat">
                            <div class="boot-stat-value">${boot.total_km.toFixed(1)} km</div>
                            <div class="boot-stat-label">Distance walked</div>
                        </div>
                        <div class="boot-stat">
                            <div class="boot-stat-value">${(CONFIG.BOOT_READY_KM - boot.total_km).toFixed(1)} km</div>
                            <div class="boot-stat-label">Until trail-ready</div>
                        </div>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <div class="boot-status-label ${isReady ? 'ready' : 'not-ready'}">
                        ${isReady ? '✅ Trail-ready!' : `📍 ${progress.toFixed(0)}% complete`}
                    </div>
                </div>
            `;
        }
        
        // Render gear list
        const listContainer = document.getElementById('gear-list');
        
        if (gear.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state">
                    <p>No gear items yet. Start tracking your equipment above!</p>
                </div>
            `;
            return;
        }
        
        let html = '<div class="gear-items">';
        gear.forEach(item => {
            const icon = getGearIcon(item.item_type);
            const stars = item.comfort_rating ? '⭐'.repeat(item.comfort_rating) : 'Not rated';
            
            html += `
                <div class="gear-card">
                    <div class="gear-icon-large">${icon}</div>
                    <div class="gear-details">
                        <h3>${item.item_name}</h3>
                        <div class="gear-type">${capitalize(item.item_type)}</div>
                        ${item.total_km > 0 ? `<div class="gear-km">📍 ${item.total_km.toFixed(1)} km</div>` : ''}
                        <div class="gear-rating">${stars}</div>
                        ${item.is_trail_ready ? '<div class="gear-badge ready">✅ Trail-ready</div>' : ''}
                        ${item.notes ? `<div class="gear-notes">${item.notes}</div>` : ''}
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        listContainer.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading gear:', error);
        document.getElementById('gear-list').innerHTML = `
            <div class="error">Failed to load gear</div>
        `;
    }
}

function getGearIcon(type) {
    const icons = {
        boots: '🥾',
        backpack: '🎒',
        poles: '🏔️',
        jacket: '🧥',
        'sleeping-bag': '💤',
        other: '📦'
    };
    return icons[type] || '📦';
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).replace('-', ' ');
}
