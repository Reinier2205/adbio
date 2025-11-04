/**
 * AdvancedProgressUI - UI components for advanced progress visualization controls
 * Provides sorting controls, highlight settings, and statistics panels
 */
class AdvancedProgressUI {
  constructor() {
    this.visualizer = null;
    this.isVisible = false;
  }

  /**
   * Initialize the UI with the visualizer instance
   * @param {AdvancedProgressVisualizer} visualizer - Visualizer instance
   */
  initialize(visualizer) {
    this.visualizer = visualizer;
    this.createControlPanels();
    this.setupEventListeners();
  }

  /**
   * Create the control panels for advanced features
   */
  createControlPanels() {
    // Create main container
    const container = document.createElement('div');
    container.id = 'advancedProgressControls';
    container.className = 'advanced-progress-controls';
    container.style.display = 'none';

    // Create sorting controls
    const sortingPanel = this.createSortingPanel();
    container.appendChild(sortingPanel);

    // Create statistics panel
    const statsPanel = this.createStatisticsPanel();
    container.appendChild(statsPanel);

    // Insert after completion toggles
    const completionToggles = document.getElementById('completionToggles');
    if (completionToggles) {
      completionToggles.parentNode.insertBefore(container, completionToggles.nextSibling);
    }

    // Create toggle button
    this.createToggleButton();
  }

  /**
   * Create sorting controls panel
   * @returns {HTMLElement} Sorting panel element
   */
  createSortingPanel() {
    const panel = document.createElement('div');
    panel.className = 'sorting-controls';
    
    panel.innerHTML = `
      <label for="challengeSort">Sort Challenges:</label>
      <select id="challengeSort" class="sort-select">
        <option value="popularity-desc">Popularity (High to Low)</option>
        <option value="popularity-asc">Popularity (Low to High)</option>
        <option value="difficulty-desc">Difficulty (Hard to Easy)</option>
        <option value="difficulty-asc">Difficulty (Easy to Hard)</option>
      </select>
    `;

    return panel;
  }



  /**
   * Create statistics panel
   * @returns {HTMLElement} Statistics panel element
   */
  createStatisticsPanel() {
    const panel = document.createElement('div');
    panel.className = 'statistics-panel';
    
    panel.innerHTML = `
      <h4>Progress Statistics</h4>
      <div class="stats-grid" id="statsGrid">
        <div class="stat-item">
          <span class="stat-value" id="totalPlayers">-</span>
          <span class="stat-label">Players</span>
        </div>
        <div class="stat-item">
          <span class="stat-value" id="totalChallenges">-</span>
          <span class="stat-label">Challenges</span>
        </div>
        <div class="stat-item">
          <span class="stat-value" id="totalCompletions">-</span>
          <span class="stat-label">Completions</span>
        </div>
        <div class="stat-item">
          <span class="stat-value" id="avgProgress">-</span>
          <span class="stat-label">Avg Progress</span>
        </div>
        <div class="stat-item">
          <span class="stat-value" id="topPerformer">-</span>
          <span class="stat-label">Top Player</span>
        </div>
      </div>
    `;

    return panel;
  }

  /**
   * Create toggle button for showing/hiding advanced controls
   */
  createToggleButton() {
    const button = document.createElement('button');
    button.id = 'advancedToggleBtn';
    button.className = 'toggle-button advanced-toggle';
    button.innerHTML = '📊 Advanced';
    button.title = 'Show advanced progress visualization options';
    
    // Add to completion toggles
    const completionToggles = document.getElementById('completionToggles');
    if (completionToggles) {
      completionToggles.appendChild(button);
    }
  }

  /**
   * Setup event listeners for all controls
   */
  setupEventListeners() {
    // Toggle button
    const toggleBtn = document.getElementById('advancedToggleBtn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggleControls());
    }



    // Challenge sorting (placeholder for future implementation)
    const challengeSort = document.getElementById('challengeSort');
    if (challengeSort) {
      challengeSort.addEventListener('change', (e) => {
        // Future implementation for challenge sorting
        console.log('Challenge sort changed to:', e.target.value);
      });
    }


  }

  /**
   * Toggle visibility of advanced controls
   */
  toggleControls() {
    const controls = document.getElementById('advancedProgressControls');
    const toggleBtn = document.getElementById('advancedToggleBtn');
    
    if (!controls || !toggleBtn) return;

    this.isVisible = !this.isVisible;
    
    if (this.isVisible) {
      controls.style.display = 'block';
      toggleBtn.classList.add('active');
      toggleBtn.innerHTML = '📊 Hide Advanced';
      toggleBtn.title = 'Hide advanced progress visualization options';
      
      // Animate in
      controls.style.opacity = '0';
      controls.style.transform = 'translateY(-10px)';
      
      setTimeout(() => {
        controls.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        controls.style.opacity = '1';
        controls.style.transform = 'translateY(0)';
      }, 10);
      
      // Update statistics when shown
      this.updateStatistics();
    } else {
      controls.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      controls.style.opacity = '0';
      controls.style.transform = 'translateY(-10px)';
      
      setTimeout(() => {
        controls.style.display = 'none';
      }, 300);
      
      toggleBtn.classList.remove('active');
      toggleBtn.innerHTML = '📊 Advanced';
      toggleBtn.title = 'Show advanced progress visualization options';
    }
  }

  /**
   * Update statistics display
   */
  updateStatistics() {
    if (!this.visualizer || !this.visualizer.boardController) return;

    const state = this.visualizer.boardController.getState();
    if (!state || !state.completionStats) return;

    const stats = state.completionStats;
    
    // Update basic stats
    this.updateStatValue('totalPlayers', stats.totalPlayers || 0);
    this.updateStatValue('totalChallenges', stats.totalSquares || 0);
    this.updateStatValue('totalCompletions', stats.totalCompletions || 0);
    this.updateStatValue('avgProgress', `${(stats.averagePlayerProgress || 0).toFixed(1)}`);

    // Update top performer
    const topPlayer = stats.playerStats && stats.playerStats.length > 0 
      ? stats.playerStats[0] 
      : null;
    this.updateStatValue('topPerformer', topPlayer ? topPlayer.playerName : '-');


  }

  /**
   * Update a specific statistic value
   * @param {string} statId - Statistic element ID
   * @param {string|number} value - New value
   */
  updateStatValue(statId, value) {
    const element = document.getElementById(statId);
    if (element) {
      element.textContent = value;
      
      // Add update animation
      element.style.transform = 'scale(1.1)';
      element.style.transition = 'transform 0.2s ease';
      
      setTimeout(() => {
        element.style.transform = 'scale(1)';
      }, 200);
    }
  }

  /**
   * Show controls (called externally)
   */
  show() {
    if (!this.isVisible) {
      this.toggleControls();
    }
  }

  /**
   * Hide controls (called externally)
   */
  hide() {
    if (this.isVisible) {
      this.toggleControls();
    }
  }

  /**
   * Update controls based on current view
   * @param {string} currentView - Current view ('card' or 'player')
   */
  updateForView(currentView) {
    const controls = document.getElementById('advancedProgressControls');
    const toggleBtn = document.getElementById('advancedToggleBtn');
    
    if (!controls || !toggleBtn) return;

    if (currentView === 'card') {
      // Show all controls in card view
      const challengeSort = document.getElementById('challengeSort');
      
      if (challengeSort) challengeSort.parentElement.style.display = 'block';
      
      toggleBtn.style.display = 'inline-block';
    } else if (currentView === 'player') {
      // Keep other controls in player view
      toggleBtn.style.display = 'inline-block';
    }

    // Update statistics if visible
    if (this.isVisible) {
      this.updateStatistics();
    }
  }



  /**
   * Get current settings
   * @returns {Object} Current UI settings
   */
  getSettings() {
    const challengeSort = document.getElementById('challengeSort');
    
    return {
      challengeSort: challengeSort ? challengeSort.value : 'popularity-desc',
      isVisible: this.isVisible
    };
  }

  /**
   * Apply settings
   * @param {Object} settings - Settings to apply
   */
  applySettings(settings) {
    if (settings.challengeSort) {
      const challengeSort = document.getElementById('challengeSort');
      if (challengeSort) {
        challengeSort.value = settings.challengeSort;
      }
    }



    if (settings.isVisible && !this.isVisible) {
      this.show();
    } else if (!settings.isVisible && this.isVisible) {
      this.hide();
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdvancedProgressUI;
}