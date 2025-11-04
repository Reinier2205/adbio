/**
 * StatePreserver - Maintain consistent state across page navigation
 * Handles state management, context tracking, and error recovery
 */
class StatePreserver {
  constructor(sessionManager) {
    this.sessionManager = sessionManager || new SessionManager();
    this.stateKey = 'eventbingo:navigationState';
    this.historyKey = 'eventbingo:navigationHistory';
    this.maxHistoryEntries = 10;
  }

  /**
   * Save current navigation state
   * @param {Object} currentState - Current application state
   * @returns {boolean} Success status
   */
  saveNavigationState(currentState) {
    try {
      if (!currentState || typeof currentState !== 'object') {
        console.warn('Invalid state provided to saveNavigationState');
        return false;
      }

      const navigationState = {
        ...currentState,
        timestamp: Date.now(),
        page: this._getCurrentPage(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        version: '1.0'
      };

      // Save to sessionStorage for immediate access
      sessionStorage.setItem(this.stateKey, JSON.stringify(navigationState));
      
      // Also save to localStorage for persistence across sessions
      localStorage.setItem(this.stateKey, JSON.stringify(navigationState));
      
      console.log('Navigation state saved:', navigationState);
      return true;
    } catch (error) {
      console.error('Failed to save navigation state:', error);
      return false;
    }
  }

  /**
   * Restore navigation state
   * @returns {Object|null} Restored state or null if not found
   */
  restoreNavigationState() {
    try {
      // Try sessionStorage first (most recent)
      let stateStr = sessionStorage.getItem(this.stateKey);
      
      // Fall back to localStorage if sessionStorage is empty
      if (!stateStr) {
        stateStr = localStorage.getItem(this.stateKey);
      }
      
      if (!stateStr) {
        console.log('No navigation state found to restore');
        return null;
      }

      const state = JSON.parse(stateStr);
      
      // Validate state
      if (!this._validateState(state)) {
        console.warn('Invalid navigation state found, clearing...');
        this._clearNavigationState();
        return null;
      }

      // Check if state is too old (more than 1 hour)
      const stateAge = Date.now() - state.timestamp;
      const maxAge = 60 * 60 * 1000; // 1 hour
      
      if (stateAge > maxAge) {
        console.log('Navigation state is too old, clearing...');
        this._clearNavigationState();
        return null;
      }

      console.log('Navigation state restored:', state);
      return state;
    } catch (error) {
      console.error('Failed to restore navigation state:', error);
      this._clearNavigationState();
      return null;
    }
  }

  /**
   * Track user action for navigation history
   * @param {string} action - Action performed
   * @param {Object} context - Action context
   * @returns {boolean} Success status
   */
  trackUserAction(action, context = {}) {
    try {
      const actionEntry = {
        action,
        context,
        timestamp: Date.now(),
        page: this._getCurrentPage(),
        url: window.location.href,
        userAgent: navigator.userAgent
      };

      // Get existing history
      const history = this.getNavigationHistory();
      
      // Add new entry at the beginning
      history.unshift(actionEntry);
      
      // Limit history size
      if (history.length > this.maxHistoryEntries) {
        history.splice(this.maxHistoryEntries);
      }

      // Save updated history
      localStorage.setItem(this.historyKey, JSON.stringify(history));
      
      console.log('User action tracked:', actionEntry);
      return true;
    } catch (error) {
      console.error('Failed to track user action:', error);
      return false;
    }
  }

  /**
   * Get navigation history
   * @returns {Array} Navigation history entries
   */
  getNavigationHistory() {
    try {
      const historyStr = localStorage.getItem(this.historyKey);
      
      if (!historyStr) {
        return [];
      }

      const history = JSON.parse(historyStr);
      
      // Validate history format
      if (!Array.isArray(history)) {
        console.warn('Invalid navigation history format, resetting...');
        localStorage.removeItem(this.historyKey);
        return [];
      }

      return history;
    } catch (error) {
      console.error('Failed to get navigation history:', error);
      return [];
    }
  }

  /**
   * Handle state corruption by clearing and providing fallback options
   * @returns {Object} Recovery options
   */
  handleStateCorruption() {
    try {
      console.warn('Handling state corruption...');
      
      // Clear corrupted state
      this._clearNavigationState();
      
      // Try to recover from session manager
      const lastUsedEvent = this.sessionManager.getLastUsedEvent();
      const allSessions = this.sessionManager.getAllPlayerSessions();
      
      const recoveryOptions = {
        success: true,
        action: 'stateCorruptionRecovered',
        options: []
      };

      if (lastUsedEvent && allSessions.length > 0) {
        const lastSession = allSessions.find(s => s.eventCode === lastUsedEvent);
        
        if (lastSession) {
          recoveryOptions.options.push({
            type: 'continueLastSession',
            eventCode: lastUsedEvent,
            playerName: lastSession.playerName,
            description: `Continue with ${lastSession.playerName} in ${lastUsedEvent}`
          });
        }
      }

      // Add option to view all sessions
      if (allSessions.length > 0) {
        recoveryOptions.options.push({
          type: 'selectFromSessions',
          sessions: allSessions,
          description: 'Choose from your saved sessions'
        });
      }

      // Always provide option to start fresh
      recoveryOptions.options.push({
        type: 'startFresh',
        description: 'Start with a new event'
      });

      console.log('State corruption recovery options:', recoveryOptions);
      return recoveryOptions;
    } catch (error) {
      console.error('Failed to handle state corruption:', error);
      return {
        success: false,
        error: 'Failed to recover from state corruption',
        options: [{
          type: 'startFresh',
          description: 'Start with a new event'
        }]
      };
    }
  }

  /**
   * Provide fallback options when normal flow fails
   * @param {string} reason - Reason for fallback
   * @returns {Object} Fallback options
   */
  provideFallbackOptions(reason = 'unknown') {
    try {
      console.log(`Providing fallback options for reason: ${reason}`);
      
      const fallbackOptions = {
        success: true,
        reason,
        options: []
      };

      // Try to get available sessions
      const allSessions = this.sessionManager.getAllPlayerSessions();
      const lastUsedEvent = this.sessionManager.getLastUsedEvent();

      // Option 1: Continue with last used event
      if (lastUsedEvent) {
        const lastSession = allSessions.find(s => s.eventCode === lastUsedEvent);
        if (lastSession) {
          fallbackOptions.options.push({
            type: 'continueLastEvent',
            eventCode: lastUsedEvent,
            playerName: lastSession.playerName,
            description: `Continue with ${lastSession.playerName} in ${lastUsedEvent}`,
            priority: 1
          });
        }
      }

      // Option 2: Select from available sessions
      if (allSessions.length > 1) {
        fallbackOptions.options.push({
          type: 'selectSession',
          sessions: allSessions.slice(0, 5), // Limit to 5 most recent
          description: 'Choose from your recent sessions',
          priority: 2
        });
      }

      // Option 3: Enter event code manually
      fallbackOptions.options.push({
        type: 'enterEventCode',
        description: 'Enter an event code manually',
        priority: 3
      });

      // Option 4: Go to info page
      fallbackOptions.options.push({
        type: 'goToInfo',
        description: 'Learn how to play EventBingo',
        priority: 4
      });

      // Sort by priority
      fallbackOptions.options.sort((a, b) => (a.priority || 999) - (b.priority || 999));

      console.log('Fallback options provided:', fallbackOptions);
      return fallbackOptions;
    } catch (error) {
      console.error('Failed to provide fallback options:', error);
      return {
        success: false,
        error: 'Failed to generate fallback options',
        options: [{
          type: 'goToInfo',
          description: 'Go to info page',
          priority: 1
        }]
      };
    }
  }

  /**
   * Clear all navigation state
   * @returns {boolean} Success status
   */
  clearNavigationState() {
    return this._clearNavigationState();
  }

  /**
   * Clear navigation history
   * @returns {boolean} Success status
   */
  clearNavigationHistory() {
    try {
      localStorage.removeItem(this.historyKey);
      sessionStorage.removeItem(this.historyKey);
      console.log('Navigation history cleared');
      return true;
    } catch (error) {
      console.error('Failed to clear navigation history:', error);
      return false;
    }
  }

  /**
   * Get current application state summary
   * @returns {Object} State summary
   */
  getCurrentStateSummary() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const currentState = this.restoreNavigationState();
      const history = this.getNavigationHistory();
      const lastUsedEvent = this.sessionManager.getLastUsedEvent();
      const allSessions = this.sessionManager.getAllPlayerSessions();

      return {
        currentPage: this._getCurrentPage(),
        currentUrl: window.location.href,
        urlParams: Object.fromEntries(urlParams.entries()),
        savedState: currentState,
        historyCount: history.length,
        lastUsedEvent,
        sessionCount: allSessions.length,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Failed to get current state summary:', error);
      return {
        error: 'Failed to get state summary',
        timestamp: Date.now()
      };
    }
  }

  // Private methods

  /**
   * Get current page name
   * @returns {string} Current page name
   */
  _getCurrentPage() {
    const path = window.location.pathname;
    return path.split('/').pop() || 'index.html';
  }

  /**
   * Validate navigation state structure
   * @param {Object} state - State to validate
   * @returns {boolean} Validation result
   */
  _validateState(state) {
    if (!state || typeof state !== 'object') {
      return false;
    }

    // Check required fields
    const requiredFields = ['timestamp', 'page', 'url'];
    for (const field of requiredFields) {
      if (!state.hasOwnProperty(field)) {
        return false;
      }
    }

    // Validate timestamp
    if (typeof state.timestamp !== 'number' || state.timestamp <= 0) {
      return false;
    }

    return true;
  }

  /**
   * Clear navigation state from storage
   * @returns {boolean} Success status
   */
  _clearNavigationState() {
    try {
      sessionStorage.removeItem(this.stateKey);
      localStorage.removeItem(this.stateKey);
      console.log('Navigation state cleared');
      return true;
    } catch (error) {
      console.error('Failed to clear navigation state:', error);
      return false;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StatePreserver;
}

// Make available globally for browser use
if (typeof window !== 'undefined') {
  window.StatePreserver = StatePreserver;
}