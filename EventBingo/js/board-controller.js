/**
 * BoardController - Central state management for the Bingo Board
 * Handles view switching, player selection, and board state coordination
 */
class BoardController {
  constructor() {
    this.state = {
      currentView: 'card', // 'card' | 'player'
      selectedPlayer: null, // null means "All Players"
      eventCode: '',
      players: [],
      squares: [],
      photos: {},
      completionStats: {},
      progressSummary: {},
      isAuthenticated: false,
      isViewOnly: false,
      lastUpdateTime: null,
      isLoading: false,
      error: null,
      retryCount: 0
    };
    
    this.listeners = {
      stateChange: [],
      viewChange: [],
      playerChange: [],
      progressUpdate: []
    };
    
    this.workerURL = "https://shy-recipe-5fb1.reinier-olivier.workers.dev/";
    this.progressCalculator = new ProgressCalculator();
    this.performanceMonitor = typeof PerformanceMonitor !== 'undefined' ? new PerformanceMonitor() : null;
    this.updateInterval = null;
    this.autoUpdateEnabled = true;
    
    // Performance optimization settings
    this.batchSize = 8; // Number of photos to load concurrently
    this.preloadDistance = 2; // Number of players ahead to preload
  }

  /**
   * Initialize the board with event context
   * @param {string} eventCode - The event code
   * @param {string} initialPlayer - Optional initial player to select
   */
  async initialize(eventCode, initialPlayer = null) {
    try {
      this.state.eventCode = eventCode;
      this.state.isLoading = true;
      this.state.error = null;
      
      // Set authentication context from URL params or localStorage
      this.setAuthenticationContext();
      
      // Load initial data with error handling
      await this.loadPlayersWithRetry();
      await this.loadSquares();
      
      // Validate that we have data
      if (!this.state.players || this.state.players.length === 0) {
        throw new Error('No players found for this event. The event may not exist or have no participants yet.');
      }
      
      // Set initial player selection
      if (initialPlayer && this.state.players.find(p => p.name === initialPlayer)) {
        this.state.selectedPlayer = initialPlayer;
        this.state.currentView = 'player';
      } else {
        this.state.selectedPlayer = null;
        this.state.currentView = 'card';
      }
      
      // Load photos based on initial view
      await this.loadPhotosForCurrentView();
      
      // Calculate initial completion stats
      this.updateCompletionStats();
      
      this.state.isLoading = false;
      
      // Notify listeners of initialization
      this.notifyStateChange();
      
      return true;
    } catch (error) {
      this.state.isLoading = false;
      this.state.error = {
        type: 'initialization',
        message: error.message || 'Failed to initialize board',
        canRetry: true,
        timestamp: Date.now()
      };
      
      console.error('Failed to initialize BoardController:', error);
      this.notifyStateChange();
      throw error;
    }
  }

  /**
   * Switch to player view for a specific player
   * @param {string} playerName - Name of the player to view
   */
  async switchToPlayerView(playerName) {
    if (!playerName || !this.state.players.find(p => p.name === playerName)) {
      this.state.error = {
        type: 'validation',
        message: `Player "${playerName}" not found`,
        canRetry: false,
        timestamp: Date.now()
      };
      this.notifyStateChange();
      return false;
    }

    const previousView = this.state.currentView;
    const previousPlayer = this.state.selectedPlayer;

    this.state.currentView = 'player';
    this.state.selectedPlayer = playerName;
    this.state.isLoading = true;
    this.state.error = null;

    try {
      // Load photos for the selected player if not already loaded
      if (!this.state.photos[playerName]) {
        await this.loadPlayerPhotosWithRetry(playerName);
      }

      // Update completion stats for player view
      this.updateCompletionStats();

      this.state.isLoading = false;

      // Notify listeners
      this.notifyViewChange(previousView, 'player');
      this.notifyPlayerChange(previousPlayer, playerName);
      this.notifyStateChange();

      return true;
    } catch (error) {
      console.error('Failed to switch to player view:', error);
      
      // Revert state on error
      this.state.currentView = previousView;
      this.state.selectedPlayer = previousPlayer;
      this.state.isLoading = false;
      this.state.error = {
        type: 'view_switch',
        message: `Failed to load ${playerName}'s board: ${error.message}`,
        canRetry: true,
        timestamp: Date.now(),
        retryAction: () => this.switchToPlayerView(playerName)
      };
      
      this.notifyStateChange();
      return false;
    }
  }

  /**
   * Switch to card view (all players overview)
   */
  async switchToCardView() {
    const previousView = this.state.currentView;
    const previousPlayer = this.state.selectedPlayer;

    this.state.currentView = 'card';
    this.state.selectedPlayer = null;
    this.state.isLoading = true;
    this.state.error = null;

    try {
      // Ensure we have photos for all players for card view
      await this.loadPhotosForCurrentView();

      // Update completion stats for card view
      this.updateCompletionStats();

      this.state.isLoading = false;

      // Notify listeners
      this.notifyViewChange(previousView, 'card');
      this.notifyPlayerChange(previousPlayer, null);
      this.notifyStateChange();

      return true;
    } catch (error) {
      console.error('Failed to switch to card view:', error);
      
      // Revert state on error
      this.state.currentView = previousView;
      this.state.selectedPlayer = previousPlayer;
      this.state.isLoading = false;
      this.state.error = {
        type: 'view_switch',
        message: `Failed to load board overview: ${error.message}`,
        canRetry: true,
        timestamp: Date.now(),
        retryAction: () => this.switchToCardView()
      };
      
      this.notifyStateChange();
      return false;
    }
  }

  /**
   * Update progress and refresh completion statistics
   */
  async updateProgress() {
    try {
      this.state.error = null; // Clear any previous errors
      
      const oldData = {
        players: [...this.state.players],
        photos: JSON.parse(JSON.stringify(this.state.photos)),
        squares: [...this.state.squares]
      };

      // Reload photos for current view
      await this.loadPhotosForCurrentView();
      
      // Recalculate completion stats using ProgressCalculator
      this.updateCompletionStats();
      
      // Calculate progress updates for real-time notifications
      const progressUpdates = this.progressCalculator.calculateProgressUpdates(oldData, {
        players: this.state.players,
        photos: this.state.photos,
        squares: this.state.squares
      });

      // Update timestamp
      this.state.lastUpdateTime = Date.now();
      
      // Notify listeners
      this.notifyStateChange();
      
      // Notify progress update listeners if there are changes
      if (progressUpdates && progressUpdates.hasChanges) {
        this.notifyProgressUpdate(progressUpdates);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to update progress:', error);
      
      this.state.error = {
        type: 'update',
        message: `Failed to refresh board data: ${error.message}`,
        canRetry: true,
        timestamp: Date.now(),
        retryAction: () => this.updateProgress()
      };
      
      this.notifyStateChange();
      return false;
    }
  }

  /**
   * Retry the last failed operation
   */
  async retryLastOperation() {
    if (this.state.error && this.state.error.retryAction) {
      try {
        await this.state.error.retryAction();
      } catch (error) {
        console.error('Retry failed:', error);
      }
    }
  }

  /**
   * Clear current error state
   */
  clearError() {
    this.state.error = null;
    this.notifyStateChange();
  }

  /**
   * Get current state (read-only copy)
   */
  getState() {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Get current view type
   */
  getCurrentView() {
    return this.state.currentView;
  }

  /**
   * Get selected player
   */
  getSelectedPlayer() {
    return this.state.selectedPlayer;
  }

  /**
   * Get completion statistics
   */
  getCompletionStats() {
    return this.state.completionStats;
  }

  /**
   * Get progress summary
   */
  getProgressSummary() {
    return this.state.progressSummary;
  }

  /**
   * Get individual player progress
   * @param {string} playerName - Name of the player
   */
  getPlayerProgress(playerName) {
    return this.progressCalculator.getPlayerProgress(playerName, this.state.photos, this.state.squares);
  }

  /**
   * Get square completion rates
   */
  getSquareCompletionRates() {
    return this.progressCalculator.calculateSquareCompletionRates(this.state.players, this.state.photos, this.state.squares);
  }

  /**
   * Enable or disable automatic progress updates
   * @param {boolean} enabled - Whether to enable auto updates
   * @param {number} intervalMs - Update interval in milliseconds (default: 30000)
   */
  setAutoUpdate(enabled, intervalMs = 30000) {
    this.autoUpdateEnabled = enabled;
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    if (enabled) {
      this.updateInterval = setInterval(() => {
        this.updateProgress().catch(error => {
          console.warn('Auto update failed:', error);
        });
      }, intervalMs);
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return this.state.isAuthenticated;
  }

  /**
   * Check if in view-only mode
   */
  isViewOnly() {
    return this.state.isViewOnly;
  }

  // Event listener management
  addEventListener(type, callback) {
    if (this.listeners[type]) {
      this.listeners[type].push(callback);
    }
  }

  removeEventListener(type, callback) {
    if (this.listeners[type]) {
      const index = this.listeners[type].indexOf(callback);
      if (index > -1) {
        this.listeners[type].splice(index, 1);
      }
    }
  }

  /**
   * Get performance metrics from the performance monitor
   */
  getPerformanceMetrics() {
    if (this.performanceMonitor) {
      return this.performanceMonitor.getPerformanceMetrics();
    }
    return null;
  }

  /**
   * Cleanup resources when controller is no longer needed
   */
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    this.progressCalculator.clearCache();
    
    if (this.performanceMonitor) {
      this.performanceMonitor.destroy();
    }
    
    // Clear all listeners
    Object.keys(this.listeners).forEach(type => {
      this.listeners[type] = [];
    });
  }

  // Private methods

  /**
   * Set authentication context from URL params or localStorage
   */
  setAuthenticationContext() {
    const params = new URLSearchParams(window.location.search);
    const currentPlayer = params.get("player") || "";
    
    // Check if user has a current player context (indicates authentication)
    this.state.isAuthenticated = !!currentPlayer;
    
    // Check for view-only mode (no player context but has event access)
    this.state.isViewOnly = !currentPlayer && !!this.state.eventCode;
    
    // Try to get player context from localStorage as fallback
    if (!currentPlayer) {
      try {
        const storedPlayer = localStorage.getItem('eventbingo:currentPlayer') || 
                           localStorage.getItem(`eventbingo:lastPlayer:${this.state.eventCode}`);
        if (storedPlayer) {
          this.state.isAuthenticated = true;
          this.state.isViewOnly = false;
        }
      } catch (error) {
        console.warn('Could not access localStorage for player context');
      }
    }
  }

  /**
   * Load all players for the event
   */
  async loadPlayers() {
    const response = await fetch(`${this.workerURL}players?event=${this.state.eventCode}`);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Event "${this.state.eventCode}" not found. Please check the event code.`);
      } else if (response.status === 403) {
        throw new Error('Access denied. You may not have permission to view this event.');
      } else if (response.status >= 500) {
        throw new Error('Server error. Please try again later.');
      } else {
        throw new Error(`Failed to load players (${response.status})`);
      }
    }
    
    const players = await response.json();
    if (!Array.isArray(players)) {
      throw new Error('Invalid player data received from server');
    }
    
    this.state.players = players;
  }

  /**
   * Load players with retry mechanism
   */
  async loadPlayersWithRetry(maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.loadPlayers();
        this.state.retryCount = 0; // Reset retry count on success
        return;
      } catch (error) {
        lastError = error;
        this.state.retryCount = attempt;
        
        // Don't retry for certain error types
        if (error.message.includes('not found') || 
            error.message.includes('Access denied') ||
            error.message.includes('Invalid player data')) {
          throw error;
        }
        
        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Load squares/challenges for the event
   */
  async loadSquares() {
    // For now, use the hardcoded squares from the main game
    // In the future, this could be loaded from the API
    this.state.squares = [
      "An old photo with Anneke",
      "A photo from a past birthday or braai",
      "The oldest selfie you have together",
      "A photo that shows where your friendship began",
      "A photo from a time you both looked too young to drink beer",
      "Anneke walking barefoot (bonus: dirty feet)",
      "Anneke drinking beer (bonus: a cheers moment)",
      "Someone borrowing something from Anneke",
      "Oliver riding his bike",
      "Oliver dunking something in tea",
      "Oliver playing ball with someone",
      "The baby with a new \"aunt\" or \"uncle\"",
      "Everyone gathered around the fire",
      "A sunrise or sunset over camp",
      "Someone cooking or braaing",
      "Anneke reading a book in peace",
      "Morning coffee in a mug that's clearly been used too many times",
      "Oliver \"helping\" with something",
      "A creative photo of everyone together",
      "Someone caught mid-laugh",
      "A barefoot photo competition (yours vs Anneke's)",
      "Someone \"borrowing\" Anneke's beer",
      "A photo that proves you're having more fun than planned",
      "A photo that shows the \"spirit of the weekend\"",
      "Your favorite memory moment — real or recreated"
    ].map((text, index) => ({ index, challengeText: text, position: { row: Math.floor(index / 5), col: index % 5 } }));
  }

  /**
   * Load photos for a specific player
   */
  async loadPlayerPhotos(playerName) {
    try {
      const response = await fetch(`${this.workerURL}player?name=${encodeURIComponent(playerName)}&event=${this.state.eventCode}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          // Player not found or no photos - this is not necessarily an error
          console.warn(`No photos found for player: ${playerName}`);
          this.state.photos[playerName] = {};
          return;
        } else if (response.status === 403) {
          throw new Error(`Access denied for player ${playerName}. You may not have permission to view their photos.`);
        } else if (response.status >= 500) {
          throw new Error(`Server error while loading photos for ${playerName}. Please try again later.`);
        } else {
          throw new Error(`Failed to load photos for ${playerName} (${response.status})`);
        }
      }
      
      const playerPhotos = await response.json();
      
      // Validate photo data
      if (typeof playerPhotos !== 'object' || playerPhotos === null) {
        console.warn(`Invalid photo data for ${playerName}, using empty object`);
        this.state.photos[playerName] = {};
        return;
      }
      
      this.state.photos[playerName] = playerPhotos;
    } catch (error) {
      console.error(`Error loading photos for ${playerName}:`, error);
      // Set empty photos object to prevent repeated failures
      this.state.photos[playerName] = {};
      throw error;
    }
  }

  /**
   * Load photos for a specific player with retry mechanism
   */
  async loadPlayerPhotosWithRetry(playerName, maxRetries = 2) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.loadPlayerPhotos(playerName);
        return;
      } catch (error) {
        lastError = error;
        
        // Don't retry for certain error types
        if (error.message.includes('Access denied') || 
            error.message.includes('Invalid photo data')) {
          throw error;
        }
        
        // Wait before retrying
        if (attempt < maxRetries) {
          const delay = 1000 * attempt;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Load photos based on current view with performance optimization
   */
  async loadPhotosForCurrentView() {
    const errors = [];
    
    if (this.state.currentView === 'player' && this.state.selectedPlayer) {
      // Load photos for selected player only
      try {
        await this.loadPlayerPhotosWithRetry(this.state.selectedPlayer);
        
        // Preload photos for adjacent players for faster navigation
        if (this.performanceMonitor) {
          this.preloadAdjacentPlayers(this.state.selectedPlayer);
        }
      } catch (error) {
        errors.push({ player: this.state.selectedPlayer, error: error.message });
      }
    } else {
      // Load photos for all players for card view with batching
      if (this.performanceMonitor && this.state.players.length > this.batchSize) {
        await this.loadPhotosInBatches();
      } else {
        // Fallback to original method for smaller datasets
        const loadPromises = this.state.players.map(async (player) => {
          try {
            await this.loadPlayerPhotosWithRetry(player.name);
          } catch (error) {
            console.warn(`Failed to load photos for ${player.name}:`, error);
            errors.push({ player: player.name, error: error.message });
            // Continue loading other players even if one fails
          }
        });
        
        await Promise.allSettled(loadPromises);
      }
    }
    
    // If we have partial failures, log them but don't fail completely
    if (errors.length > 0) {
      console.warn('Some photos failed to load:', errors);
      
      // If all players failed to load photos, this might be a more serious issue
      if (errors.length === this.state.players.length) {
        throw new Error(`Failed to load photos for all players. This might be a network or server issue.`);
      }
    }
  }

  /**
   * Load photos in optimized batches for large datasets
   */
  async loadPhotosInBatches() {
    const batches = [];
    for (let i = 0; i < this.state.players.length; i += this.batchSize) {
      batches.push(this.state.players.slice(i, i + this.batchSize));
    }

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const priority = i === 0 ? 'high' : 'normal'; // First batch gets high priority
      
      const batchPromises = batch.map(async (player) => {
        try {
          await this.loadPlayerPhotosWithRetry(player.name);
          
          // Extract photo URLs for performance monitoring
          const playerPhotos = this.state.photos[player.name] || {};
          const photoUrls = Object.values(playerPhotos).filter(url => url && url.trim() !== '');
          
          if (this.performanceMonitor && photoUrls.length > 0) {
            await this.performanceMonitor.optimizePhotoLoading(photoUrls, { 
              priority,
              preload: i > 0 // Preload for non-first batches
            });
          }
        } catch (error) {
          console.warn(`Failed to load photos for ${player.name}:`, error);
        }
      });
      
      await Promise.allSettled(batchPromises);
      
      // Add small delay between batches to prevent overwhelming the browser
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  /**
   * Preload photos for adjacent players for faster navigation
   * @param {string} currentPlayer - Currently selected player
   */
  async preloadAdjacentPlayers(currentPlayer) {
    const currentIndex = this.state.players.findIndex(p => p.name === currentPlayer);
    if (currentIndex === -1) return;

    const playersToPreload = [];
    
    // Get adjacent players
    for (let i = 1; i <= this.preloadDistance; i++) {
      const prevIndex = currentIndex - i;
      const nextIndex = currentIndex + i;
      
      if (prevIndex >= 0) {
        playersToPreload.push(this.state.players[prevIndex].name);
      }
      if (nextIndex < this.state.players.length) {
        playersToPreload.push(this.state.players[nextIndex].name);
      }
    }

    // Preload photos for adjacent players in background
    playersToPreload.forEach(async (playerName) => {
      if (!this.state.photos[playerName]) {
        try {
          await this.loadPlayerPhotosWithRetry(playerName);
        } catch (error) {
          console.warn(`Failed to preload photos for ${playerName}:`, error);
        }
      }
    });
  }

  /**
   * Update completion statistics based on current state using ProgressCalculator
   */
  updateCompletionStats() {
    if (this.state.currentView === 'card') {
      // Calculate comprehensive completion stats for all players
      this.state.completionStats = this.progressCalculator.calculateCompletionStats(
        this.state.players, 
        this.state.photos, 
        this.state.squares
      );
      
      // Generate progress summary for card view
      this.state.progressSummary = this.progressCalculator.getProgressSummary(
        this.state.players,
        this.state.photos,
        this.state.squares
      );
      
    } else if (this.state.currentView === 'player' && this.state.selectedPlayer) {
      // Calculate individual player progress
      const playerProgress = this.progressCalculator.getPlayerProgress(
        this.state.selectedPlayer,
        this.state.photos,
        this.state.squares
      );

      // Format as completion stats for compatibility with existing code
      this.state.completionStats = {
        totalPlayers: 1,
        totalSquares: this.state.squares.length,
        overallCompletion: playerProgress.completionRate,
        totalCompletions: playerProgress.completionCount,
        averagePlayerProgress: playerProgress.completionCount,
        squareStats: playerProgress.completedSquares.concat(playerProgress.outstandingSquares).map(square => ({
          squareIndex: square.squareIndex,
          challengeText: square.challengeText,
          completedBy: square.photoUrl ? [this.state.selectedPlayer] : [],
          outstandingPlayers: square.photoUrl ? [] : [this.state.selectedPlayer],
          completionRate: square.photoUrl ? 100 : 0
        })),
        playerStats: [{
          playerName: this.state.selectedPlayer,
          completionCount: playerProgress.completionCount,
          completionRate: playerProgress.completionRate,
          completedSquares: playerProgress.completedSquares,
          outstandingSquares: playerProgress.outstandingSquares,
          rank: 1
        }]
      };

      // Set progress summary for player view
      this.state.progressSummary = {
        overview: {
          totalPlayers: 1,
          totalSquares: this.state.squares.length,
          overallCompletion: playerProgress.completionRate,
          totalCompletions: playerProgress.completionCount,
          averagePlayerProgress: playerProgress.completionCount
        },
        playerProgress: playerProgress,
        recentActivity: playerProgress.recentActivity
      };
    }
  }

  // Notification methods
  notifyStateChange() {
    this.listeners.stateChange.forEach(callback => {
      try {
        callback(this.getState());
      } catch (error) {
        console.error('Error in state change listener:', error);
      }
    });
  }

  notifyViewChange(previousView, newView) {
    this.listeners.viewChange.forEach(callback => {
      try {
        callback(previousView, newView);
      } catch (error) {
        console.error('Error in view change listener:', error);
      }
    });
  }

  notifyPlayerChange(previousPlayer, newPlayer) {
    this.listeners.playerChange.forEach(callback => {
      try {
        callback(previousPlayer, newPlayer);
      } catch (error) {
        console.error('Error in player change listener:', error);
      }
    });
  }

  notifyProgressUpdate(progressUpdates) {
    this.listeners.progressUpdate.forEach(callback => {
      try {
        callback(progressUpdates);
      } catch (error) {
        console.error('Error in progress update listener:', error);
      }
    });
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BoardController;
}