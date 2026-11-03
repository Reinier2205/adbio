/**
 * Trail Fuel Page
 */

async function renderTrailFuelPage() {
    const user = auth.getCurrentUser();
    const container = document.getElementById('page-container');
    
    container.innerHTML = `
        <div class="page-header">
            <h1>Trail fuel</h1>
            <p class="subtitle">Nutrition superfoods for Camino preparation</p>
        </div>
        
        <div class="info-banner">
            <div class="info-icon">🍎</div>
            <div class="info-content">
                <strong>Fuel your training</strong>
                <p>These superfoods provide the energy, protein, and nutrients needed for endurance training and recovery.</p>
            </div>
        </div>
        
        <div class="superfoods-grid">
            ${CAMINO_SUPERFOODS.map(food => `
                <div class="superfood-card">
                    <div class="superfood-icon">${food.icon}</div>
                    <h3>${food.name}</h3>
                    <div class="superfood-category">${food.category}</div>
                    <p class="superfood-description">${food.description}</p>
                </div>
            `).join('')}
        </div>
        
        <div class="card">
            <div class="card-header">
                <h2>Daily Nutrition Guidelines</h2>
            </div>
            <div class="card-body">
                <div class="nutrition-grid">
                    <div class="nutrition-card">
                        <div class="nutrition-icon">🥗</div>
                        <h3>Before Training</h3>
                        <ul>
                            <li><strong>2-3 hours before:</strong> Oats with banana and nuts</li>
                            <li><strong>30 minutes before:</strong> Light snack (toast with avocado)</li>
                            <li><strong>Hydration:</strong> 500ml water</li>
                        </ul>
                    </div>
                    
                    <div class="nutrition-card">
                        <div class="nutrition-icon">💪</div>
                        <h3>During Training</h3>
                        <ul>
                            <li><strong>Every hour:</strong> 30-60g carbs (banana, energy bar)</li>
                            <li><strong>Hydration:</strong> 150-250ml water every 20 minutes</li>
                            <li><strong>Long walks (3+ hours):</strong> Add electrolytes</li>
                        </ul>
                    </div>
                    
                    <div class="nutrition-card">
                        <div class="nutrition-icon">🔄</div>
                        <h3>After Training</h3>
                        <ul>
                            <li><strong>Within 30 minutes:</strong> Protein + carbs (yoghurt with fruit)</li>
                            <li><strong>Main meal (within 2 hours):</strong> Lean protein + complex carbs</li>
                            <li><strong>Recovery:</strong> Continue hydrating throughout the day</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h2>Sample Training Day Meal Plan</h2>
            </div>
            <div class="card-body">
                <div class="meal-plan">
                    <div class="meal">
                        <div class="meal-time">☀️ Breakfast (7:00 AM)</div>
                        <div class="meal-content">
                            <strong>Oats with toppings</strong>
                            <p>Oatmeal with banana slices, almonds, and a drizzle of honey. Scrambled eggs on the side.</p>
                        </div>
                    </div>
                    
                    <div class="meal">
                        <div class="meal-time">🚶 Pre-Walk Snack (9:30 AM)</div>
                        <div class="meal-content">
                            <strong>Light fuel</strong>
                            <p>Avocado toast on whole grain bread. Small banana.</p>
                        </div>
                    </div>
                    
                    <div class="meal">
                        <div class="meal-time">🥤 During Walk (11:00 AM)</div>
                        <div class="meal-content">
                            <strong>Energy boost</strong>
                            <p>Trail mix (nuts and dried fruit). Energy bar. Water with electrolytes.</p>
                        </div>
                    </div>
                    
                    <div class="meal">
                        <div class="meal-time">🍽️ Lunch (1:00 PM)</div>
                        <div class="meal-content">
                            <strong>Recovery meal</strong>
                            <p>Grilled chicken or lean beef with quinoa and roasted vegetables. Side salad with beans.</p>
                        </div>
                    </div>
                    
                    <div class="meal">
                        <div class="meal-time">🥜 Afternoon Snack (4:00 PM)</div>
                        <div class="meal-content">
                            <strong>Protein boost</strong>
                            <p>Plain yoghurt with berries. Handful of almonds.</p>
                        </div>
                    </div>
                    
                    <div class="meal">
                        <div class="meal-time">🌙 Dinner (7:00 PM)</div>
                        <div class="meal-content">
                            <strong>Evening refuel</strong>
                            <p>Baked fish or lentil stew with sweet potato and steamed greens. Whole grain bread.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h2>Hydration Tips</h2>
            </div>
            <div class="card-body">
                <div class="tips-grid">
                    <div class="tip-card">
                        <div class="tip-icon">💧</div>
                        <h3>Daily Target</h3>
                        <p>Aim for 2-3 liters of water per day, more on training days. Monitor urine color - pale yellow is ideal.</p>
                    </div>
                    
                    <div class="tip-card">
                        <div class="tip-icon">⚡</div>
                        <h3>Electrolytes</h3>
                        <p>For walks over 90 minutes, add electrolyte tablets or sports drink to prevent cramping.</p>
                    </div>
                    
                    <div class="tip-card">
                        <div class="tip-icon">☕</div>
                        <h3>Caffeine Strategy</h3>
                        <p>Morning coffee is fine, but avoid excessive caffeine before long walks as it can dehydrate.</p>
                    </div>
                    
                    <div class="tip-card">
                        <div class="tip-icon">🌡️</div>
                        <h3>Weather Adjustment</h3>
                        <p>Increase hydration in hot weather. Carry 1-2 liters on training walks.</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h2>Trail Snack Ideas</h2>
            </div>
            <div class="card-body">
                <p>Pack these energy-dense, portable snacks for your training walks:</p>
                <div class="snacks-list">
                    <div class="snack-item">🥜 <strong>Trail Mix:</strong> Nuts, seeds, dried fruit, dark chocolate chips</div>
                    <div class="snack-item">🍌 <strong>Fresh Fruit:</strong> Bananas, apples, oranges (easy to carry)</div>
                    <div class="snack-item">🥖 <strong>Sandwiches:</strong> Whole grain with lean protein and avocado</div>
                    <div class="snack-item">🍫 <strong>Energy Bars:</strong> Look for 200-300 calories, balanced macros</div>
                    <div class="snack-item">🥚 <strong>Hard-Boiled Eggs:</strong> Portable protein for recovery</div>
                    <div class="snack-item">🧀 <strong>Cheese & Crackers:</strong> Whole grain crackers with aged cheese</div>
                    <div class="snack-item">🥤 <strong>Nut Butter Packets:</strong> Single-serve for quick energy</div>
                </div>
            </div>
        </div>
    `;
}
