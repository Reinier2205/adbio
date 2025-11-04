/**
 * SessionManager - Centralized management of player session data in localStorage
 * Handles secure storage, validation, and retrieval of player sessions
 */
class SessionManager {
  constructor(errorHandler, performanceMonitor) {
    this.keyPrefix = 'eventbingo:session:';
    this.appStateKey = 'eventbingo:appState';
    this.version = '1.0';
    this.errorHandler = errorHandler || (typeof ErrorHandler !== 'undefined' ? new ErrorHandler() : null);
    this.performanceMonitor = performanceMonitor || (typeof PerformanceMonitor !== 'undefined' ? new PerformanceMonitor() : null);
    
    // Performance optimization properties
    this._cache = new Map();
    this._cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this._performanceMetrics = {
      cacheHits: 0,
      cacheMisses: 0,
      operationTimes: []
    };
  }

  /**
   * Save player session data to localStorage with cache invalidation
   * @param {string} eventCode - Event identifier
   * @param {string} playerName - Player's name
   * @param {string} secretQuestion - Player's secret question
   * @param {string} secretAnswer - Player's secret answer (will be hashed)
   * @returns {Promise<boolean>} Success status
   */
  async savePlayerSession(eventCode, playerName, secretQuestion, secretAnswer) {
    const startTime = performance.now();
    
    try {
      if (!eventCode || !playerName || !secretQuestion || !secretAnswer) {
        throw new Error('Missing required session data');
      }

      // Invalidate cache for this event
      const cacheKey = `session:${eventCode}`;
      this._cache.delete(cacheKey);

      const secretAnswerHash = await this._hashAnswer(secretAnswer.trim());

      const sessionData = {
        playerName: playerName.trim(),
        secretQuestion: secretQuestion.trim(),
        secretAnswerHash: secretAnswerHash,
        createdAt: new Date().toISOString(),
        lastAccessAt: new Date().toISOString(),
        version: this.version
      };

      const sessionKey = this._getSessionKey(eventCode);
      const sessionDataStr = JSON.stringify(sessionData);
      
      // Use ErrorHandler for safe storage operation
      if (this.errorHandler) {
        const result = await this.errorHandler.safeStorageOperation('setItem', sessionKey, sessionDataStr);
        
        if (!result.success) {
          // Handle storage errors
          if (result.error === 'quota_exceeded') {
            const quotaResult = await this.errorHandler.handleStorageQuotaExceeded(sessionKey, sessionDataStr);
            if (!quotaResult.success) {
              throw new Error('Storage quota exceeded and cleanup failed');
            }
          } else {
            throw new Error(`Storage operation failed: ${result.error}`);
          }
        }
      } else {
        // Fallback to direct localStorage
        localStorage.setItem(sessionKey, sessionDataStr);
      }
      
      // Update cache with new data
      this._cache.set(cacheKey, {
        data: sessionData,
        timestamp: Date.now()
      });
      
      // Update last used event
      await this.setLastUsedEvent(eventCode);
      
      console.log(`Session saved for player ${playerName} in event ${eventCode}`);
      this._recordOperationTime(startTime, 'savePlayerSession', 'storage');
      return true;
    } catch (error) {
      console.error('Failed to save player session:', error);
      this._recordOperationTime(startTime, 'savePlayerSession', 'error');
      
      // Show user-friendly error notification
      if (this.errorHandler) {
        this.errorHandler.createStorageNotification('save_failed', {
          message: 'Failed to save your game data. Please try again or contact support if the problem persists.'
        });
      }
      
      return false;
    }
  }

  /**
   * Get player session data from localStorage with caching
   * @param {string} eventCode - Event identifier
   * @returns {Promise<Object|null>} Session data or null if not found/invalid
   */
  async getPlayerSession(eventCode) {
    const startTime = performance.now();
    
    try {
      if (!eventCode) {
        return null;
      }

      const cacheKey = `session:${eventCode}`;
      
      // Check cache first
      if (this._cache.has(cacheKey)) {
        const cached = this._cache.get(cacheKey);
        
        // Check if cache is still valid
        if (Date.now() - cached.timestamp < this._cacheTimeout) {
          this._performanceMetrics.cacheHits++;
          this._recordOperationTime(startTime, 'getPlayerSession', 'cache');
          return cached.data;
        } else {
          // Cache expired, remove it
          this._cache.delete(cacheKey);
        }
      }

      this._performanceMetrics.cacheMisses++;

      const sessionKey = this._getSessionKey(eventCode);
      let sessionDataStr = null;
      
      // Use ErrorHandler for safe storage operation
      if (this.errorHandler) {
        const result = await this.errorHandler.safeStorageOperation('getItem', sessionKey);
        
        if (!result.success) {
          console.warn(`Failed to get session data for event ${eventCode}:`, result.error);
          return null;
        }
        
        sessionDataStr = result.value;
      } else {
        // Fallback to direct localStorage
        sessionDataStr = localStorage.getItem(sessionKey);
      }
      
      if (!sessionDataStr) {
        // Cache null result to avoid repeated lookups
        this._cache.set(cacheKey, {
          data: null,
          timestamp: Date.now()
        });
        this._recordOperationTime(startTime, 'getPlayerSession', 'storage');
        return null;
      }

      const sessionData = JSON.parse(sessionDataStr);
      
      // Validate session data
      if (!this.validateSessionData(sessionData)) {
        console.warn(`Invalid session data for event ${eventCode}, clearing...`);
        await this.clearPlayerSession(eventCode);
        return null;
      }

      // Update last access time
      sessionData.lastAccessAt = new Date().toISOString();
      
      // Save updated session data
      if (this.errorHandler) {
        await this.errorHandler.safeStorageOperation('setItem', sessionKey, JSON.stringify(sessionData));
      } else {
        localStorage.setItem(sessionKey, JSON.stringify(sessionData));
      }
      
      // Cache the result
      this._cache.set(cacheKey, {
        data: sessionData,
        timestamp: Date.now()
      });
      
      console.log(`Session loaded for player ${sessionData.playerName} in event ${eventCode}`);
      this._recordOperationTime(startTime, 'getPlayerSession', 'storage');
      return sessionData;
    } catch (error) {
      console.error('Failed to get player session:', error);
      this._recordOperationTime(startTime, 'getPlayerSession', 'error');
      
      // Handle corrupted data
      if (error instanceof SyntaxError) {
        console.warn(`Corrupted session data for event ${eventCode}, clearing...`);
        await this.clearPlayerSession(eventCode);
        
        if (this.errorHandler) {
          this.errorHandler.createStorageNotification('corrupted_data', {
            message: 'Your saved game data was corrupted and has been cleared. You can start a new game.'
          });
        }
      }
      
      return null;
    }
  }

  /**
   * Clear player session data from localStorage with cache invalidation
   * @param {string} eventCode - Event identifier
   * @returns {Promise<boolean>} Success status
   */
  async clearPlayerSession(eventCode) {
    const startTime = performance.now();
    
    try {
      if (!eventCode) {
        return false;
      }

      // Clear from cache
      const cacheKey = `session:${eventCode}`;
      this._cache.delete(cacheKey);

      const sessionKey = this._getSessionKey(eventCode);
      
      // Use ErrorHandler for safe storage operation
      if (this.errorHandler) {
        const result = await this.errorHandler.safeStorageOperation('removeItem', sessionKey);
        
        if (!result.success) {
          console.warn(`Failed to clear session for event ${eventCode}:`, result.error);
          return false;
        }
      } else {
        // Fallback to direct localStorage
        localStorage.removeItem(sessionKey);
      }
      
      console.log(`Session cleared for event ${eventCode}`);
      this._recordOperationTime(startTime, 'clearPlayerSession', 'storage');
      return true;
    } catch (error) {
      console.error('Failed to clear player session:', error);
      this._recordOperationTime(startTime, 'clearPlayerSession', 'error');
      return false;
    }
  }

  /**
   * Validate session data integrity
   * @param {Object} sessionData - Session data to validate
   * @returns {boolean} Validation result
   */
  validateSessionData(sessionData) {
    if (!sessionData || typeof sessionData !== 'object') {
      return false;
    }

    const requiredFields = ['playerName', 'secretQuestion', 'secretAnswerHash', 'createdAt', 'lastAccessAt'];
    
    for (const field of requiredFields) {
      if (!sessionData[field] || typeof sessionData[field] !== 'string') {
        return false;
      }
    }

    // Validate timestamps
    try {
      new Date(sessionData.createdAt);
      new Date(sessionData.lastAccessAt);
    } catch (error) {
      return false;
    }

    // Check if session is expired (30 days)
    if (this.isSessionExpired(sessionData)) {
      return false;
    }

    return true;
  }

  /**
   * Check if session has expired
   * @param {Object} sessionData - Session data to check
   * @returns {boolean} True if expired
   */
  isSessionExpired(sessionData) {
    try {
      const lastAccess = new Date(sessionData.lastAccessAt);
      const now = new Date();
      const daysSinceAccess = (now - lastAccess) / (1000 * 60 * 60 * 24);
      
      // Sessions expire after 30 days of inactivity
      return daysSinceAccess > 30;
    } catch (error) {
      return true; // Consider invalid dates as expired
    }
  }

  /**
   * Get the last used event code
   * @returns {Promise<string|null>} Last used event code
   */
  async getLastUsedEvent() {
    try {
      const appState = await this._getAppState();
      return appState.lastUsedEvent || null;
    } catch (error) {
      console.error('Failed to get last used event:', error);
      return null;
    }
  }

  /**
   * Set the last used event code
   * @param {string} eventCode - Event code to save
   * @returns {Promise<boolean>} Success status
   */
  async setLastUsedEvent(eventCode) {
    try {
      if (!eventCode) {
        return false;
      }

      const appState = await this._getAppState();
      appState.lastUsedEvent = eventCode;
      appState.lastUpdated = new Date().toISOString();
      
      const appStateStr = JSON.stringify(appState);
      
      // Use ErrorHandler for safe storage operation
      if (this.errorHandler) {
        const result = await this.errorHandler.safeStorageOperation('setItem', this.appStateKey, appStateStr);
        
        if (!result.success) {
          console.warn('Failed to save app state:', result.error);
          return false;
        }
      } else {
        // Fallback to direct localStorage
        localStorage.setItem(this.appStateKey, appStateStr);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to set last used event:', error);
      return false;
    }
  }

  /**
   * Get all player sessions
   * @returns {Promise<Array>} Array of session objects with eventCode
   */
  async getAllPlayerSessions() {
    try {
      const sessions = [];
      
      // Get storage keys safely
      let storageKeys = [];
      
      if (this.errorHandler && this.errorHandler.storageType !== 'none') {
        const storage = this.errorHandler.storageType === 'localStorage' ? localStorage : sessionStorage;
        
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && key.startsWith(this.keyPrefix)) {
            storageKeys.push(key);
          }
        }
      } else {
        // Fallback to localStorage
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(this.keyPrefix)) {
            storageKeys.push(key);
          }
        }
      }
      
      // Load each session
      for (const key of storageKeys) {
        const eventCode = key.replace(this.keyPrefix, '');
        const sessionData = await this.getPlayerSession(eventCode);
        
        if (sessionData) {
          sessions.push({
            eventCode,
            ...sessionData
          });
        }
      }
      
      // Sort by last access time (most recent first)
      sessions.sort((a, b) => new Date(b.lastAccessAt) - new Date(a.lastAccessAt));
      
      return sessions;
    } catch (error) {
      console.error('Failed to get all player sessions:', error);
      return [];
    }
  }

  /**
   * Clear all player sessions (for privacy/reset)
   * @returns {boolean} Success status
   */
  clearAllPlayerSessions() {
    try {
      const keysToRemove = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.keyPrefix)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Also clear app state
      localStorage.removeItem(this.appStateKey);
      
      console.log(`Cleared ${keysToRemove.length} player sessions`);
      return true;
    } catch (error) {
      console.error('Failed to clear all player sessions:', error);
      return false;
    }
  }

  /**
   * Validate secret answer against stored hash
   * @param {string} providedAnswer - Answer provided by user
   * @param {string} storedHash - Stored hash to compare against
   * @returns {Promise<boolean>} Validation result
   */
  async validateSecretAnswer(providedAnswer, storedHash) {
    try {
      if (!providedAnswer || !storedHash) {
        return false;
      }

      const providedHash = await this._hashAnswer(providedAnswer.trim());
      return providedHash === storedHash;
    } catch (error) {
      console.error('Failed to validate secret answer:', error);
      return false;
    }
  }

  /**
   * Check if localStorage is available
   * @returns {boolean} Availability status
   */
  isStorageAvailable() {
    try {
      const testKey = 'eventbingo:test';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get storage usage information
   * @returns {Object} Storage usage stats
   */
  getStorageInfo() {
    try {
      let totalSize = 0;
      let sessionCount = 0;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.keyPrefix)) {
          const value = localStorage.getItem(key);
          totalSize += key.length + (value ? value.length : 0);
          sessionCount++;
        }
      }
      
      return {
        sessionCount,
        totalSize,
        isAvailable: this.isStorageAvailable(),
        cacheSize: this._cache.size,
        performanceMetrics: this.getPerformanceMetrics()
      };
    } catch (error) {
      return {
        sessionCount: 0,
        totalSize: 0,
        isAvailable: false,
        error: error.message
      };
    }
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance statistics
   */
  getPerformanceMetrics() {
    const totalOperations = this._performanceMetrics.cacheHits + this._performanceMetrics.cacheMisses;
    const cacheHitRate = totalOperations > 0 ? (this._performanceMetrics.cacheHits / totalOperations) * 100 : 0;
    
    const operationTimes = this._performanceMetrics.operationTimes;
    const avgOperationTime = operationTimes.length > 0 
      ? operationTimes.reduce((sum, time) => sum + time, 0) / operationTimes.length 
      : 0;
    
    return {
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      totalOperations,
      cacheHits: this._performanceMetrics.cacheHits,
      cacheMisses: this._performanceMetrics.cacheMisses,
      averageOperationTime: Math.round(avgOperationTime * 100) / 100,
      cacheSize: this._cache.size
    };
  }

  /**
   * Clear performance cache
   * @returns {void}
   */
  clearCache() {
    this._cache.clear();
    console.log('Performance cache cleared');
  }

  /**
   * Optimize cache by cleaning up expired entries
   * @returns {number} Number of entries cleaned
   */
  optimizeCache() {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, value] of this._cache.entries()) {
      if (now - value.timestamp > this._cacheTimeout) {
        this._cache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`Cleaned ${cleanedCount} expired cache entries`);
    }
    return cleanedCount;
  }

  // Private methods

  /**
   * Generate session key for localStorage
   * @param {string} eventCode - Event identifier
   * @returns {string} Storage key
   */
  _getSessionKey(eventCode) {
    return `${this.keyPrefix}${eventCode.toLowerCase()}`;
  }

  /**
   * Hash secret answer using SHA-256 (with fallback)
   * @param {string} answer - Answer to hash
   * @returns {string|Promise<string>} Hashed answer
   */
  _hashAnswer(answer) {
    const normalizedAnswer = answer.toLowerCase().trim();
    
    // Try to use Web Crypto API for secure hashing
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      return this._hashAnswerSecure(normalizedAnswer);
    }
    
    // Fallback to simple hash for older browsers
    return this._hashAnswerSimple(normalizedAnswer);
  }

  /**
   * Secure hash using Web Crypto API
   * @param {string} answer - Normalized answer
   * @returns {Promise<string>} Hashed answer
   */
  async _hashAnswerSecure(answer) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(answer);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.warn('Secure hashing failed, using fallback:', error);
      return this._hashAnswerSimple(answer);
    }
  }

  /**
   * Simple hash fallback for older browsers
   * @param {string} answer - Normalized answer
   * @returns {string} Hashed answer
   */
  _hashAnswerSimple(answer) {
    let hash = 0;
    
    if (answer.length === 0) return hash.toString();
    
    for (let i = 0; i < answer.length; i++) {
      const char = answer.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * Get app state from localStorage
   * @returns {Promise<Object>} App state object
   */
  async _getAppState() {
    try {
      let appStateStr = null;
      
      // Use ErrorHandler for safe storage operation
      if (this.errorHandler) {
        const result = await this.errorHandler.safeStorageOperation('getItem', this.appStateKey);
        
        if (result.success) {
          appStateStr = result.value;
        }
      } else {
        // Fallback to direct localStorage
        appStateStr = localStorage.getItem(this.appStateKey);
      }
      
      if (!appStateStr) {
        return {
          lastUsedEvent: null,
          darkMode: false,
          navigationHistory: [],
          lastPage: null,
          version: this.version
        };
      }
      
      return JSON.parse(appStateStr);
    } catch (error) {
      console.error('Failed to get app state:', error);
      return {
        lastUsedEvent: null,
        darkMode: false,
        navigationHistory: [],
        lastPage: null,
        version: this.version
      };
    }
  }

  /**
   * Record operation timing for performance monitoring
   * @param {number} startTime - Operation start time
   * @param {string} operation - Operation name
   * @param {string} source - Data source (cache/storage/error)
   * @returns {void}
   */
  _recordOperationTime(startTime, operation, source) {
    const duration = performance.now() - startTime;
    
    this._performanceMetrics.operationTimes.push(duration);
    
    // Keep only the last 100 operation times
    if (this._performanceMetrics.operationTimes.length > 100) {
      this._performanceMetrics.operationTimes.shift();
    }
    
    // Record in performance monitor if available
    if (this.performanceMonitor) {
      this.performanceMonitor.recordSessionOperation(operation, duration, source, {
        cacheHit: source === 'cache',
        sessionManager: true
      });
    }
    
    // Log slow operations
    if (duration > 50) { // More than 50ms
      console.warn(`Slow ${operation} operation (${source}): ${Math.round(duration)}ms`);
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SessionManager;
}

// Make available globally for browser use
if (typeof window !== 'undefined') {
  window.SessionManager = SessionManager;
}