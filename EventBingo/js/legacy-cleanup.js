/**
 * Legacy Code Cleanup Utility
 * Removes old authentication code and updates references to use new SessionManager
 */
class LegacyCleanup {
  constructor() {
    this.legacyFunctions = [
      'AuthManager',
      'authManager',
      'registerNewPlayer',
      'verifyPlayerAuthentication', 
      'getPlayerQuestion',
      'setPlayerAuthentication',
      'updateUIForAuthState'
    ];
    
    this.legacyVariables = [
      'currentPlayerSecret',
      'isAuthenticated',
      'isViewOnlyMode'
    ];
    
    this.cleanupLog = [];
  }

  /**
   * Clean up legacy authentication code from the global scope
   * @returns {Object} Cleanup results
   */
  cleanupGlobalScope() {
    const results = {
      functionsRemoved: [],
      variablesRemoved: [],
      errors: []
    };

    // Remove legacy functions from window object
    this.legacyFunctions.forEach(funcName => {
      try {
        if (typeof window[funcName] !== 'undefined') {
          delete window[funcName];
          results.functionsRemoved.push(funcName);
          this.log(`Removed legacy function: ${funcName}`);
        }
      } catch (error) {
        results.errors.push(`Failed to remove ${funcName}: ${error.message}`);
      }
    });

    // Remove legacy variables from window object
    this.legacyVariables.forEach(varName => {
      try {
        if (typeof window[varName] !== 'undefined') {
          delete window[varName];
          results.variablesRemoved.push(varName);
          this.log(`Removed legacy variable: ${varName}`);
        }
      } catch (error) {
        results.errors.push(`Failed to remove ${varName}: ${error.message}`);
      }
    });

    return results;
  }

  /**
   * Clean up legacy localStorage keys
   * @returns {Object} Cleanup results
   */
  cleanupLegacyStorage() {
    const results = {
      keysRemoved: [],
      errors: []
    };

    try {
      const keysToRemove = [];
      
      // Find all legacy authentication keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('secret_answer_') ||
          key.startsWith('secret_verified_') ||
          key.startsWith('secret_timestamp_') ||
          key.startsWith('lastPlayer_') ||
          key.startsWith('auth_')
        )) {
          keysToRemove.push(key);
        }
      }
      
      // Remove legacy keys
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
          results.keysRemoved.push(key);
          this.log(`Removed legacy storage key: ${key}`);
        } catch (error) {
          results.errors.push(`Failed to remove key ${key}: ${error.message}`);
        }
      });

    } catch (error) {
      results.errors.push(`Storage cleanup error: ${error.message}`);
    }

    return results;
  }

  /**
   * Migrate legacy data to new SessionManager format
   * @param {SessionManager} sessionManager - New session manager instance
   * @returns {Object} Migration results
   */
  migrateLegacyData(sessionManager) {
    const results = {
      playersMigrated: [],
      errors: []
    };

    try {
      const legacyPlayers = new Map();
      
      // Collect legacy player data
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('secret_answer_')) {
          try {
            const keyParts = key.replace('secret_answer_', '').split('_');
            const eventCode = keyParts[0];
            const playerName = keyParts.slice(1).join('_');
            
            const answer = localStorage.getItem(key);
            const verifiedKey = `secret_verified_${eventCode}_${playerName}`;
            const isVerified = localStorage.getItem(verifiedKey) === 'true';
            
            if (isVerified && answer) {
              const playerKey = `${eventCode}:${playerName}`;
              legacyPlayers.set(playerKey, {
                eventCode,
                playerName,
                secretAnswer: answer
              });
            }
          } catch (error) {
            results.errors.push(`Failed to parse legacy key ${key}: ${error.message}`);
          }
        }
      }
      
      // Migrate to new format (but we can't create full sessions without secret questions)
      // Instead, we'll just log what would be migrated
      for (const [playerKey, playerData] of legacyPlayers) {
        this.log(`Would migrate player: ${playerData.playerName} in event ${playerData.eventCode}`);
        results.playersMigrated.push(playerKey);
      }
      
      this.log(`Found ${legacyPlayers.size} legacy players that could be migrated`);
      
    } catch (error) {
      results.errors.push(`Migration error: ${error.message}`);
    }

    return results;
  }

  /**
   * Remove legacy CSS classes and styles
   * @returns {Object} Cleanup results
   */
  cleanupLegacyStyles() {
    const results = {
      stylesRemoved: [],
      errors: []
    };

    try {
      // Remove legacy style elements
      const legacyStyleIds = [
        'legacy-auth-styles',
        'old-player-styles',
        'deprecated-modal-styles'
      ];
      
      legacyStyleIds.forEach(styleId => {
        const styleElement = document.getElementById(styleId);
        if (styleElement) {
          styleElement.remove();
          results.stylesRemoved.push(styleId);
          this.log(`Removed legacy style element: ${styleId}`);
        }
      });

      // Remove legacy CSS classes from elements
      const legacyClasses = [
        'old-auth-modal',
        'legacy-player-selector',
        'deprecated-upload-section'
      ];
      
      legacyClasses.forEach(className => {
        const elements = document.querySelectorAll(`.${className}`);
        elements.forEach(element => {
          element.classList.remove(className);
          this.log(`Removed legacy class ${className} from element`);
        });
      });

    } catch (error) {
      results.errors.push(`Style cleanup error: ${error.message}`);
    }

    return results;
  }

  /**
   * Update function references to use new SessionManager
   * @param {Object} newManagers - Object containing new manager instances
   * @returns {Object} Update results
   */
  updateFunctionReferences(newManagers) {
    const results = {
      referencesUpdated: [],
      errors: []
    };

    try {
      const { sessionManager, playerAuthenticator, flowController } = newManagers;
      
      // Create replacement functions that use new managers
      if (sessionManager) {
        // Replace legacy authentication check
        window.hasPlayerSession = (eventCode, playerName) => {
          return sessionManager.getPlayerSession(eventCode)
            .then(session => session && session.playerName === playerName)
            .catch(() => false);
        };
        results.referencesUpdated.push('hasPlayerSession');
        
        // Replace legacy storage operations
        window.clearPlayerData = (eventCode) => {
          return sessionManager.clearPlayerSession(eventCode);
        };
        results.referencesUpdated.push('clearPlayerData');
      }
      
      if (playerAuthenticator) {
        // Replace legacy authentication functions
        window.authenticatePlayer = (eventCode, playerName, answer) => {
          return playerAuthenticator.authenticatePlayer(eventCode, playerName, answer);
        };
        results.referencesUpdated.push('authenticatePlayer');
        
        window.createPlayer = (eventCode, playerName, question, answer) => {
          return playerAuthenticator.createPlayerProfile(eventCode, playerName, question, answer);
        };
        results.referencesUpdated.push('createPlayer');
      }
      
      if (flowController) {
        // Replace legacy navigation functions
        window.navigateToPlayer = (eventCode, playerName) => {
          return flowController.routeToGameInterface(eventCode, playerName);
        };
        results.referencesUpdated.push('navigateToPlayer');
      }
      
      this.log(`Updated ${results.referencesUpdated.length} function references`);
      
    } catch (error) {
      results.errors.push(`Reference update error: ${error.message}`);
    }

    return results;
  }

  /**
   * Perform complete legacy cleanup
   * @param {Object} newManagers - New manager instances
   * @returns {Object} Complete cleanup results
   */
  performCompleteCleanup(newManagers = {}) {
    const results = {
      globalScope: this.cleanupGlobalScope(),
      storage: this.cleanupLegacyStorage(),
      migration: this.migrateLegacyData(newManagers.sessionManager),
      styles: this.cleanupLegacyStyles(),
      references: this.updateFunctionReferences(newManagers),
      summary: {
        totalItemsRemoved: 0,
        totalErrors: 0
      }
    };

    // Calculate summary
    results.summary.totalItemsRemoved = 
      results.globalScope.functionsRemoved.length +
      results.globalScope.variablesRemoved.length +
      results.storage.keysRemoved.length +
      results.styles.stylesRemoved.length +
      results.references.referencesUpdated.length;

    results.summary.totalErrors = 
      results.globalScope.errors.length +
      results.storage.errors.length +
      results.migration.errors.length +
      results.styles.errors.length +
      results.references.errors.length;

    this.log(`Cleanup complete: ${results.summary.totalItemsRemoved} items processed, ${results.summary.totalErrors} errors`);
    
    return results;
  }

  /**
   * Get cleanup log
   * @returns {Array} Log entries
   */
  getCleanupLog() {
    return [...this.cleanupLog];
  }

  /**
   * Clear cleanup log
   */
  clearLog() {
    this.cleanupLog = [];
  }

  /**
   * Log cleanup action
   * @param {string} message - Log message
   */
  log(message) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      message
    };
    this.cleanupLog.push(logEntry);
    console.log(`[LegacyCleanup] ${message}`);
  }

  /**
   * Check for remaining legacy code
   * @returns {Object} Detection results
   */
  detectRemainingLegacyCode() {
    const results = {
      functions: [],
      variables: [],
      storageKeys: [],
      domElements: []
    };

    // Check for remaining legacy functions
    this.legacyFunctions.forEach(funcName => {
      if (typeof window[funcName] !== 'undefined') {
        results.functions.push(funcName);
      }
    });

    // Check for remaining legacy variables
    this.legacyVariables.forEach(varName => {
      if (typeof window[varName] !== 'undefined') {
        results.variables.push(varName);
      }
    });

    // Check for remaining legacy storage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('secret_') ||
        key.startsWith('lastPlayer_') ||
        key.startsWith('auth_')
      )) {
        results.storageKeys.push(key);
      }
    }

    // Check for legacy DOM elements
    const legacySelectors = [
      '.old-auth-modal',
      '.legacy-player-selector',
      '#legacy-auth-container'
    ];
    
    legacySelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        results.domElements.push({
          selector,
          count: elements.length
        });
      }
    });

    return results;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LegacyCleanup;
}

// Make available globally for browser use
if (typeof window !== 'undefined') {
  window.LegacyCleanup = LegacyCleanup;
}