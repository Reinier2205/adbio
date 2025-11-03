/**
 * AdvancedProgressVisualizer - Enhanced progress visualization features
 * Provides visual progress bars, completion percentages, highlighting, activity indicators,
 * pattern detection, and sorting options for the Bingo Board
 */
class AdvancedProgressVisualizer {
  constructor() {
    this.progressCalculator = null;
    this.boardController = null;
    this.gridRenderer = null;
    this.sortOptions = {
      players: 'completion-desc', // 'completion-desc', 'completion-asc', 'name-asc', 'name-desc'
      challenges: 'popularity-desc' // 'popularity-desc', 'popularity-asc', 'difficulty-desc', 'difficulty-asc'
    };
    this.highlightSettings = {
      fullyCompleted: true,
      popularChallenges: true,
      recentActivity: true,
      completionPatterns: true
    };
    this.activityThreshold = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  }

  /**
   * Initialize the visualizer with required dependencies
   * @param {ProgressCalculator} progressCalculator - Progress calculator instance
   * @param {BoardController} boardController - Board controller instance
   * @param {GridRenderer} gridRenderer - Grid renderer instance
   */
  initialize(progressCalculator, boardController, gridRenderer) {
    this.progressCalculator = progressCalculator;
    this.boardController = boardController;
    this.gridRenderer = gridRenderer;
    
    // Set up event listeners
    this.boardController.addEventListener('stateChange', (state) => {
      this.updateAdvancedVisualizations(state);
    });
  }

  /**
   * Update all advanced visualizations based on current state
   * @param {Object} state - Current board state
   */
  updateAdvancedVisualizations(state) {
    if (!state || !state.completionStats) return;

    try {
      // Update progress bars and percentages
      this.updateProgressBars(state);
      
      // Update highlighting
      this.updateHighlighting(state);
      
      // Update activity indicators
      this.updateActivityIndicators(state);
      
      // Update pattern detection
      this.updatePatternDetection(state);
      
      // Update sorting if needed
      this.applySorting(state);
      
    } catch (error) {
      console.error('Error updating advanced visualizations:', error);
    }
  }

  /**
   * Implement visual progress bars and completion percentages
   * @param {Object} state - Current board state
   */
  updateProgressBars(state) {
    // Update main progress bar with enhanced styling
    this.updateMainProgressBar(state);
    
    // Add individual square progress indicators
    this.updateSquareProgressIndicators(state);
    
    // Add player progress indicators in card view
    if (state.currentView === 'card') {
      this.updatePlayerProgressIndicators(state);
    }
  }

  /**
   * Update the main progress bar with enhanced styling
   * @param {Object} state - Current board state
   */
  updateMainProgressBar(state) {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    if (!progressFill || !progressText) return;

    const stats = state.completionStats;
    const percentage = stats.overallCompletion || 0;
    
    // Enhanced progress text with more details
    let progressDetails = '';
    if (state.currentView === 'card') {
      const totalCompletions = stats.totalCompletions || 0;
      const totalPossible = (stats.totalPlayers || 0) * (stats.totalSquares || 0);
      progressDetails = `Overall: ${percentage.toFixed(1)}% (${totalCompletions}/${totalPossible} completions)`;
      
      // Add milestone indicators
      const milestones = this.calculateMilestones(percentage);
      if (milestones.length > 0) {
        progressDetails += ` • ${milestones[milestones.length - 1].message}`;
      }
    } else if (state.currentView === 'player' && state.selectedPlayer) {
      const playerProgress = this.progressCalculator.getPlayerProgress(
        state.selectedPlayer, state.photos, state.squares
      );
      progressDetails = `${state.selectedPlayer}: ${percentage.toFixed(1)}% (${playerProgress.completionCount}/${playerProgress.totalSquares})`;
      
      // Add progress level
      progressDetails += ` • ${playerProgress.progressLevel}`;
    }
    
    progressText.textContent = progressDetails;
    
    // Enhanced progress bar styling with gradient based on completion level
    const progressColor = this.getProgressColor(percentage);
    progressFill.style.background = `linear-gradient(90deg, ${progressColor.start}, ${progressColor.end})`;
    progressFill.style.width = `${percentage}%`;
    
    // Add pulsing animation for recent progress
    if (this.hasRecentProgress(state)) {
      progressFill.classList.add('recent-progress');
      setTimeout(() => progressFill.classList.remove('recent-progress'), 3000);
    }
  }

  /**
   * Update progress indicators for individual squares
   * @param {Object} state - Current board state
   */
  updateSquareProgressIndicators(state) {
    const squares = document.querySelectorAll('.bingo-square.card-view');
    
    squares.forEach((square, index) => {
      const squareIndex = parseInt(square.dataset.squareIndex);
      const squareStat = state.completionStats.squareStats.find(s => s.squareIndex === squareIndex);
      
      if (!squareStat) return;
      
      // Add completion percentage badge
      this.addCompletionBadge(square, squareStat);
      
      // Add difficulty indicator
      this.addDifficultyIndicator(square, squareStat);
      
      // Add popularity indicator
      this.addPopularityIndicator(square, squareStat);
    });
  }

  /**
   * Update player progress indicators in card view
   * @param {Object} state - Current board state
   */
  updatePlayerProgressIndicators(state) {
    const playerCircles = document.querySelectorAll('.player-circle:not(.all-players)');
    
    playerCircles.forEach(circle => {
      const playerName = circle.title;
      const playerStat = state.completionStats.playerStats.find(p => p.playerName === playerName);
      
      if (!playerStat) return;
      
      // Add progress ring around player circle
      this.addPlayerProgressRing(circle, playerStat);
      
      // Add completion count badge
      this.addPlayerCompletionBadge(circle, playerStat);
    });
  }

  /**
   * Add highlighting for fully completed players and popular challenges
   * @param {Object} state - Current board state
   */
  updateHighlighting(state) {
    if (!this.highlightSettings.fullyCompleted && !this.highlightSettings.popularChallenges) return;

    // Highlight fully completed players
    if (this.highlightSettings.fullyCompleted) {
      this.highlightFullyCompletedPlayers(state);
    }
    
    // Highlight popular challenges
    if (this.highlightSettings.popularChallenges) {
      this.highlightPopularChallenges(state);
    }
  }

  /**
   * Highlight players who have completed all challenges
   * @param {Object} state - Current board state
   */
  highlightFullyCompletedPlayers(state) {
    const playerCircles = document.querySelectorAll('.player-circle:not(.all-players)');
    
    playerCircles.forEach(circle => {
      const playerName = circle.title;
      const playerStat = state.completionStats.playerStats.find(p => p.playerName === playerName);
      
      if (playerStat && playerStat.completionRate >= 100) {
        circle.classList.add('fully-completed');
        circle.title = `${playerName} - 100% Complete! 🏆`;
      } else {
        circle.classList.remove('fully-completed');
      }
    });
  }

  /**
   * Highlight popular challenges (completed by most players)
   * @param {Object} state - Current board state
   */
  highlightPopularChallenges(state) {
    if (state.currentView !== 'card') return;

    const squares = document.querySelectorAll('.bingo-square.card-view');
    const sortedSquares = [...state.completionStats.squareStats]
      .sort((a, b) => b.completionRate - a.completionRate);
    
    // Highlight top 20% most popular challenges
    const topCount = Math.max(1, Math.ceil(sortedSquares.length * 0.2));
    const popularSquares = sortedSquares.slice(0, topCount);
    
    squares.forEach(square => {
      const squareIndex = parseInt(square.dataset.squareIndex);
      const isPopular = popularSquares.some(s => s.squareIndex === squareIndex);
      
      if (isPopular) {
        square.classList.add('popular-challenge');
      } else {
        square.classList.remove('popular-challenge');
      }
    });
  }

  /**
   * Create visual indicators for recent activity and new uploads
   * @param {Object} state - Current board state
   */
  updateActivityIndicators(state) {
    if (!this.highlightSettings.recentActivity) return;

    // This would ideally use timestamp data from photos
    // For now, we'll simulate recent activity detection
    this.addRecentActivityIndicators(state);
  }

  /**
   * Add recent activity indicators to squares and players
   * @param {Object} state - Current board state
   */
  addRecentActivityIndicators(state) {
    // Add "new" badges to recently completed squares
    const squares = document.querySelectorAll('.bingo-square');
    
    squares.forEach(square => {
      // Remove existing activity indicators
      const existingIndicator = square.querySelector('.activity-indicator');
      if (existingIndicator) {
        existingIndicator.remove();
      }
      
      // For demo purposes, randomly mark some squares as having recent activity
      if (Math.random() < 0.1) { // 10% chance for demo
        this.addActivityIndicator(square, 'new');
      }
    });
  }

  /**
   * Add completion pattern detection (rows, columns, diagonals)
   * @param {Object} state - Current board state
   */
  updatePatternDetection(state) {
    if (!this.highlightSettings.completionPatterns || state.currentView !== 'player') return;

    const playerName = state.selectedPlayer;
    if (!playerName) return;

    const patterns = this.detectCompletionPatterns(state, playerName);
    this.highlightCompletionPatterns(patterns);
  }

  /**
   * Detect completion patterns for a player
   * @param {Object} state - Current board state
   * @param {string} playerName - Player name
   * @returns {Object} Detected patterns
   */
  detectCompletionPatterns(state, playerName) {
    const playerPhotos = state.photos[playerName] || {};
    const completedSquares = new Set();
    
    // Build set of completed square indices
    state.squares.forEach(square => {
      if (playerPhotos[square.challengeText]) {
        completedSquares.add(square.index);
      }
    });

    const patterns = {
      rows: [],
      columns: [],
      diagonals: [],
      completedLines: 0
    };

    // Check rows (0-4)
    for (let row = 0; row < 5; row++) {
      const rowSquares = [];
      let completedInRow = 0;
      
      for (let col = 0; col < 5; col++) {
        const squareIndex = row * 5 + col;
        rowSquares.push(squareIndex);
        if (completedSquares.has(squareIndex)) {
          completedInRow++;
        }
      }
      
      patterns.rows.push({
        squares: rowSquares,
        completed: completedInRow,
        isComplete: completedInRow === 5
      });
      
      if (completedInRow === 5) {
        patterns.completedLines++;
      }
    }

    // Check columns (0-4)
    for (let col = 0; col < 5; col++) {
      const colSquares = [];
      let completedInCol = 0;
      
      for (let row = 0; row < 5; row++) {
        const squareIndex = row * 5 + col;
        colSquares.push(squareIndex);
        if (completedSquares.has(squareIndex)) {
          completedInCol++;
        }
      }
      
      patterns.columns.push({
        squares: colSquares,
        completed: completedInCol,
        isComplete: completedInCol === 5
      });
      
      if (completedInCol === 5) {
        patterns.completedLines++;
      }
    }

    // Check diagonals
    const diagonal1 = [0, 6, 12, 18, 24]; // Top-left to bottom-right
    const diagonal2 = [4, 8, 12, 16, 20]; // Top-right to bottom-left
    
    const diagonal1Completed = diagonal1.filter(i => completedSquares.has(i)).length;
    const diagonal2Completed = diagonal2.filter(i => completedSquares.has(i)).length;
    
    patterns.diagonals.push({
      squares: diagonal1,
      completed: diagonal1Completed,
      isComplete: diagonal1Completed === 5
    });
    
    patterns.diagonals.push({
      squares: diagonal2,
      completed: diagonal2Completed,
      isComplete: diagonal2Completed === 5
    });
    
    if (diagonal1Completed === 5) patterns.completedLines++;
    if (diagonal2Completed === 5) patterns.completedLines++;

    return patterns;
  }

  /**
   * Highlight completion patterns on the grid
   * @param {Object} patterns - Detected patterns
   */
  highlightCompletionPatterns(patterns) {
    // Clear existing pattern highlights
    document.querySelectorAll('.bingo-square').forEach(square => {
      square.classList.remove('pattern-complete', 'pattern-progress');
    });

    // Highlight completed lines
    [...patterns.rows, ...patterns.columns, ...patterns.diagonals].forEach(pattern => {
      if (pattern.isComplete) {
        pattern.squares.forEach(squareIndex => {
          const square = document.querySelector(`[data-square-index="${squareIndex}"]`);
          if (square) {
            square.classList.add('pattern-complete');
          }
        });
      } else if (pattern.completed >= 3) {
        // Highlight lines that are close to completion
        pattern.squares.forEach(squareIndex => {
          const square = document.querySelector(`[data-square-index="${squareIndex}"]`);
          if (square) {
            square.classList.add('pattern-progress');
          }
        });
      }
    });

    // Show pattern completion summary
    this.showPatternSummary(patterns);
  }

  /**
   * Implement sorting options for players by completion rate
   * @param {Object} state - Current board state
   */
  applySorting(state) {
    if (state.currentView === 'card') {
      this.sortPlayerCircles(state);
    }
  }

  /**
   * Sort player circles by completion rate
   * @param {Object} state - Current board state
   */
  sortPlayerCircles(state) {
    const playerScroll = document.getElementById('playerScroll');
    if (!playerScroll) return;

    const allPlayersItem = playerScroll.querySelector('.player-item:first-child');
    const playerItems = Array.from(playerScroll.querySelectorAll('.player-item:not(:first-child)'));
    
    // Sort player items based on current sort option
    playerItems.sort((a, b) => {
      const playerA = a.querySelector('.player-circle').title;
      const playerB = b.querySelector('.player-circle').title;
      
      const statA = state.completionStats.playerStats.find(p => p.playerName === playerA);
      const statB = state.completionStats.playerStats.find(p => p.playerName === playerB);
      
      if (!statA || !statB) return 0;
      
      switch (this.sortOptions.players) {
        case 'completion-desc':
          return statB.completionRate - statA.completionRate;
        case 'completion-asc':
          return statA.completionRate - statB.completionRate;
        case 'name-asc':
          return playerA.localeCompare(playerB);
        case 'name-desc':
          return playerB.localeCompare(playerA);
        default:
          return 0;
      }
    });

    // Re-append sorted items
    playerScroll.innerHTML = '';
    playerScroll.appendChild(allPlayersItem);
    playerItems.forEach(item => playerScroll.appendChild(item));
  }

  /**
   * Add completion badge to a square
   * @param {HTMLElement} square - Square element
   * @param {Object} squareStat - Square statistics
   */
  addCompletionBadge(square, squareStat) {
    // Remove existing badge
    const existingBadge = square.querySelector('.completion-badge');
    if (existingBadge) {
      existingBadge.remove();
    }

    const badge = document.createElement('div');
    badge.className = 'completion-badge';
    badge.textContent = `${squareStat.completionRate.toFixed(0)}%`;
    badge.title = `${squareStat.completedBy.length} of ${squareStat.completedBy.length + squareStat.outstandingPlayers.length} players completed`;
    
    square.appendChild(badge);
  }

  /**
   * Add difficulty indicator to a square
   * @param {HTMLElement} square - Square element
   * @param {Object} squareStat - Square statistics
   */
  addDifficultyIndicator(square, squareStat) {
    const difficulty = this.progressCalculator.calculateSquareDifficulty(squareStat.completionRate);
    square.classList.remove('difficulty-easy', 'difficulty-medium', 'difficulty-hard', 'difficulty-very-hard');
    square.classList.add(`difficulty-${difficulty.toLowerCase().replace(' ', '-')}`);
    
    // Add difficulty badge
    const existingDifficulty = square.querySelector('.difficulty-indicator');
    if (existingDifficulty) {
      existingDifficulty.remove();
    }

    const indicator = document.createElement('div');
    indicator.className = 'difficulty-indicator';
    indicator.textContent = this.getDifficultyIcon(difficulty);
    indicator.title = `Difficulty: ${difficulty}`;
    
    square.appendChild(indicator);
  }

  /**
   * Add popularity indicator to a square
   * @param {HTMLElement} square - Square element
   * @param {Object} squareStat - Square statistics
   */
  addPopularityIndicator(square, squareStat) {
    const popularity = this.progressCalculator.calculateSquarePopularity(
      squareStat.completedBy.length,
      squareStat.completedBy.length + squareStat.outstandingPlayers.length
    );
    
    if (popularity === 'Very Popular') {
      square.classList.add('very-popular');
    } else {
      square.classList.remove('very-popular');
    }
  }

  /**
   * Add progress ring around player circle
   * @param {HTMLElement} circle - Player circle element
   * @param {Object} playerStat - Player statistics
   */
  addPlayerProgressRing(circle, playerStat) {
    // Remove existing ring
    const existingRing = circle.querySelector('.progress-ring');
    if (existingRing) {
      existingRing.remove();
    }

    const ring = document.createElement('div');
    ring.className = 'progress-ring';
    ring.style.setProperty('--progress', `${playerStat.completionRate}%`);
    
    circle.appendChild(ring);
  }

  /**
   * Add completion count badge to player circle
   * @param {HTMLElement} circle - Player circle element
   * @param {Object} playerStat - Player statistics
   */
  addPlayerCompletionBadge(circle, playerStat) {
    // Remove existing badge
    const existingBadge = circle.parentElement.querySelector('.player-completion-badge');
    if (existingBadge) {
      existingBadge.remove();
    }

    const badge = document.createElement('div');
    badge.className = 'player-completion-badge';
    badge.textContent = playerStat.completionCount;
    badge.title = `${playerStat.completionCount} challenges completed`;
    
    circle.parentElement.appendChild(badge);
  }

  /**
   * Add activity indicator to a square
   * @param {HTMLElement} square - Square element
   * @param {string} type - Activity type ('new', 'updated', etc.)
   */
  addActivityIndicator(square, type) {
    const indicator = document.createElement('div');
    indicator.className = `activity-indicator activity-${type}`;
    indicator.textContent = type === 'new' ? '🆕' : '📸';
    indicator.title = type === 'new' ? 'New completion!' : 'Recent activity';
    
    square.appendChild(indicator);
  }

  /**
   * Show pattern completion summary
   * @param {Object} patterns - Detected patterns
   */
  showPatternSummary(patterns) {
    // Remove existing summary
    const existingSummary = document.querySelector('.pattern-summary');
    if (existingSummary) {
      existingSummary.remove();
    }

    if (patterns.completedLines === 0) return;

    const summary = document.createElement('div');
    summary.className = 'pattern-summary';
    summary.innerHTML = `
      <div class="pattern-summary-content">
        <span class="pattern-icon">🎯</span>
        <span class="pattern-text">${patterns.completedLines} line${patterns.completedLines > 1 ? 's' : ''} completed!</span>
      </div>
    `;
    
    const progressInfo = document.getElementById('progressInfo');
    if (progressInfo) {
      progressInfo.appendChild(summary);
    }
  }

  /**
   * Get progress color based on completion percentage
   * @param {number} percentage - Completion percentage
   * @returns {Object} Color gradient object
   */
  getProgressColor(percentage) {
    if (percentage >= 90) {
      return { start: '#51cf66', end: '#40c057' }; // Green
    } else if (percentage >= 70) {
      return { start: '#74c0fc', end: '#4dabf7' }; // Blue
    } else if (percentage >= 50) {
      return { start: '#ffd43b', end: '#fab005' }; // Yellow
    } else if (percentage >= 25) {
      return { start: '#ff8cc8', end: '#e64980' }; // Pink
    } else {
      return { start: '#ff6b6b', end: '#e03131' }; // Red
    }
  }

  /**
   * Get difficulty icon
   * @param {string} difficulty - Difficulty level
   * @returns {string} Icon for difficulty
   */
  getDifficultyIcon(difficulty) {
    switch (difficulty) {
      case 'Easy': return '🟢';
      case 'Medium': return '🟡';
      case 'Hard': return '🟠';
      case 'Very Hard': return '🔴';
      default: return '⚪';
    }
  }

  /**
   * Calculate milestones based on completion percentage
   * @param {number} percentage - Completion percentage
   * @returns {Array} Array of milestone objects
   */
  calculateMilestones(percentage) {
    const milestones = [];
    
    if (percentage >= 25) {
      milestones.push({ threshold: 25, message: 'Quarter complete!' });
    }
    if (percentage >= 50) {
      milestones.push({ threshold: 50, message: 'Halfway there!' });
    }
    if (percentage >= 75) {
      milestones.push({ threshold: 75, message: 'Three quarters done!' });
    }
    if (percentage >= 90) {
      milestones.push({ threshold: 90, message: 'Almost finished!' });
    }
    if (percentage >= 100) {
      milestones.push({ threshold: 100, message: 'Perfect completion!' });
    }

    return milestones;
  }

  /**
   * Check if there has been recent progress
   * @param {Object} state - Current board state
   * @returns {boolean} Whether there has been recent progress
   */
  hasRecentProgress(state) {
    // This would ideally check timestamp data
    // For now, return false as we don't have timestamp data
    return false;
  }

  /**
   * Set sort option for players
   * @param {string} sortOption - Sort option
   */
  setPlayerSortOption(sortOption) {
    this.sortOptions.players = sortOption;
    
    // Trigger re-sort if board is initialized
    if (this.boardController) {
      const state = this.boardController.getState();
      this.applySorting(state);
    }
  }

  /**
   * Set highlight settings
   * @param {Object} settings - Highlight settings
   */
  setHighlightSettings(settings) {
    this.highlightSettings = { ...this.highlightSettings, ...settings };
    
    // Trigger re-highlight if board is initialized
    if (this.boardController) {
      const state = this.boardController.getState();
      this.updateHighlighting(state);
    }
  }

  /**
   * Toggle a specific highlight setting
   * @param {string} setting - Setting name
   */
  toggleHighlightSetting(setting) {
    if (this.highlightSettings.hasOwnProperty(setting)) {
      this.highlightSettings[setting] = !this.highlightSettings[setting];
      
      // Trigger re-highlight if board is initialized
      if (this.boardController) {
        const state = this.boardController.getState();
        this.updateHighlighting(state);
      }
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdvancedProgressVisualizer;
}