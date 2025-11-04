/**
 * Performance-optimized SessionManager with caching and lazy loading
 * Extends the base SessionManager with performance improvements
 */
class PerformanceOptimizedSessionManager extends SessionManager {
  constructor(errorHandler) {
    super(errorHandler);
    
    // Performance optimization properties
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.batchOperations = [];
    this.batchTimeout = null;
    this.batchDelay = 100; // 100ms batch delay
    this.performanceMetrics = {
      cacheHits: 0,
      cacheMisses: 0,
      operationTimes: [],
      batchedOperations: 0
    };
    
    // Lazy loading flags
    this.appStateLoaded = false;
    this.sessionsIndexLoaded = false;
    this.sessionsIndex = new Map(); // eventCode -> basic info
  }

  /**
   * Get player session with caching and lazy loading
   * @param {string} eventCode - Event identifier
   * @returns {Promise<Object|null>} Session data or null
   */
  async getPlayerSession(eventCode) {
    const startTime = performance.now();
    
    try {
      if (!eventCode) {
        return null;
      }

      const cacheKey = `session:${eventCode}`;
      
      // Check cache first
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        
        // Check if cache is still valid
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          this.performanceMetrics.cacheHits++;
          this._recordOperationTime(startTime, 'getPlayerSession', 'cache');
          return cached.data;
        } else {
          // Cache expired, remove it
          this.cache.delete(cacheKey);
        }
      }

      this.performanceMetrics.cacheMisses++;
      
      // Load from storage
      const sessionData = await super.getPlayerSession(eventCode);
      
      // Cache the result (even if null)
      this.cache.set(cacheKey, {
        data: sessionData,
        timestamp: Date.now()
      });
      
      // Update sessions index for faster lookups
      if (sessionData) {
        this.sessionsIndex.set(eventCode, {
          playerName: sessionData.playerName,
          lastAccessAt: sessionData.lastAccessAt,
          createdAt: sessionData.createdAt
        });
      }
      
      this._recordOperationTime(startTime, 'getPlayerSession', 'storage');
      return sessionData;
    } catch (error) {
      this._recordOperationTime(startTime, 'getPlayerSession', 'error');
      throw error;
    }
  }

  /**
   * Save player session with batching and cache invalidation
   * @param {string} eventCode - Event identifier
   * @param {string} playerName - Player's name
   * @param {string} secretQuestion - Player's secret question
   * @param {string} secretAnswer - Player's secret answer
   * @returns {Promise<boolean>} Success status
   */
  async savePlayerSession(eventCode, playerName, secretQuestion, secretAnswer) {
    const startTime = performance.now();
    
    try {
      // Invalidate cache for this event
      const cacheKey = `session:${eventCode}`;
      this.cache.delete(cacheKey);
      
      // Batch the operation if possible
      const operation = {
        type: 'saveSession',
        eventCode,
        playerName,
        secretQuestion,
        secretAnswer,
        timestamp: Date.now()
      };
      
      // For critical operations like saving, execute immediately
      const result = await super.savePlayerSession(eventCode, playerName, secretQuestion, secretAnswer);
      
      // Update cache with new data if successful
      if (result) {
        const sessionData = await this._loadSessionFromStorage(eventCode);
        if (sessionData) {
          this.cache.set(cacheKey, {
            data: sessionData,
            timestamp: Date.now()
          });
          
          // Update sessions index
          this.sessionsIndex.set(eventCode, {
            playerName: sessionData.playerName,
            lastAccessAt: sessionData.lastAccessAt,
            createdAt: sessionData.createdAt
          });
        }
      }
      
      this._recordOperationTime(startTime, 'savePlayerSession', 'immediate');
      return result;
    } catch (error) {
      this._recordOperationTime(startTime, 'savePlayerSession', 'error');
      throw error;
    }
  }

  /**
   * Get all player sessions with lazy loading and caching
   * @returns {Promise<Array>} Array of session objects
   */
  async getAllPlayerSessions() {
    const startTime = performance.now();
    
    try {
      // Check if we have a cached index
      if (!this.sessionsIndexLoaded) {
        await this._loadSessionsIndex();
      }
      
      const sessions = [];
      
      // Use index for faster iteration
      for (const [eventCode, basicInfo] of this.sessionsIndex) {
        // Try to get from cache first
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
      
      this._recordOperationTime(startTime, 'getAllPlayerSessions', 'optimized');
      return sessions;
    } catch (error) {
      this._recordOperationTime(startTime, 'getAllPlayerSessions', 'error');
      // Fallback to parent implementation
      return await super.getAllPlayerSessions();
    }
  }

  /**
   * Get last used event with caching
   * @returns {Promise<string|null>} Last used event code
   */
  async getLastUsedEvent() {
    const startTime = performance.now();
    
    try {
      const cacheKey = 'appState:lastUsedEvent';
      
      // Check cache first
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          this.performanceMetrics.cacheHits++;
          this._recordOperationTime(startTime, 'getLastUsedEvent', 'cache');
          return cached.data;
        } else {
          this.cache.delete(cacheKey);
        }
      }

      this.performanceMetrics.cacheMisses++;
      
      // Load from storage
      const lastUsedEvent = await super.getLastUsedEvent();
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: lastUsedEvent,
        timestamp: Date.now()
      });
      
      this._recordOperationTime(startTime, 'getLastUsedEvent', 'storage');
      return lastUsedEvent;
    } catch (error) {
      this._recordOperationTime(startTime, 'getLastUsedEvent', 'error');
      throw error;
    }
  }

  /**
   * Set last used event with cache update
   * @param {string} eventCode - Event code to save
   * @returns {Promise<boolean>} Success status
   */
  async setLastUsedEvent(eventCode) {
    const startTime = performance.now();
    
    try {
      // Update cache immediately
      const cacheKey = 'appState:lastUsedEvent';
      this.cache.set(cacheKey, {
        data: eventCode,
        timestamp: Date.now()
      });
      
      // Batch the storage operation
      this._batchOperation({
        type: 'setLastUsedEvent',
        eventCode,
        timestamp: Date.now()
      });
      
      this._recordOperationTime(startTime, 'setLastUsedEvent', 'batched');
      return true;
    } catch (error) {
      this._recordOperationTime(startTime, 'setLastUsedEvent', 'error');
      throw error;
    }
  }

  /**
   * Clear player session with cache invalidation
   * @param {string} eventCode - Event identifier
   * @returns {Promise<boolean>} Success status
   */
  async clearPlayerSession(eventCode) {
    const startTime = performance.now();
    
    try {
      // Clear from cache
      const cacheKey = `session:${eventCode}`;
      this.cache.delete(cacheKey);
      
      // Remove from sessions index
      this.sessionsIndex.delete(eventCode);
      
      // Clear from storage
      const result = await super.clearPlayerSession(eventCode);
      
      this._recordOperationTime(startTime, 'clearPlayerSession', 'immediate');
      return result;
    } catch (error) {
      this._recordOperationTime(startTime, 'clearPlayerSession', 'error');
      throw error;
    }
  }

  /**
   * Preload frequently accessed sessions
   * @param {Array<string>} eventCodes - Event codes to preload
   * @returns {Promise<void>}
   */
  async preloadSessions(eventCodes = []) {
    const startTime = performance.now();
    
    try {
      // If no specific events provided, preload recent ones
      if (eventCodes.length === 0) {
        if (!this.sessionsIndexLoaded) {
          await this._loadSessionsIndex();
        }
        
        // Get the 3 most recently accessed events
        const recentEvents = Array.from(this.sessionsIndex.entries())
          .sort((a, b) => new Date(b[1].lastAccessAt) - new Date(a[1].lastAccessAt))
          .slice(0, 3)
          .map(([eventCode]) => eventCode);
        
        eventCodes = recentEvents;
      }
      
      // Preload sessions in parallel
      const preloadPromises = eventCodes.map(eventCode => 
        this.getPlayerSession(eventCode).catch(error => {
          console.warn(`Failed to preload session for ${eventCode}:`, error);
          return null;
        })
      );
      
      await Promise.all(preloadPromises);
      
      this._recordOperationTime(startTime, 'preloadSessions', 'batch');
      console.log(`Preloaded ${eventCodes.length} sessions`);
    } catch (error) {
      console.error('Failed to preload sessions:', error);
      this._recordOperationTime(startTime, 'preloadSessions', 'error');
    }
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance statistics
   */
  getPerformanceMetrics() {
    const totalOperations = this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses;
    const cacheHitRate = totalOperations > 0 ? (this.performanceMetrics.cacheHits / totalOperations) * 100 : 0;
    
    const operationTimes = this.performanceMetrics.operationTimes;
    const avgOperationTime = operationTimes.length > 0 
      ? operationTimes.reduce((sum, time) => sum + time, 0) / operationTimes.length 
      : 0;
    
    return {
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      totalOperations,
      cacheHits: this.performanceMetrics.cacheHits,
      cacheMisses: this.performanceMetrics.cacheMisses,
      averageOperationTime: Math.round(avgOperationTime * 100) / 100,
      batchedOperations: this.performanceMetrics.batchedOperations,
      cacheSize: this.cache.size,
      sessionsIndexSize: this.sessionsIndex.size
    };
  }

  /**
   * Clear performance cache
   * @returns {void}
   */
  clearCache() {
    this.cache.clear();
    this.sessionsIndex.clear();
    this.sessionsIndexLoaded = false;
    this.appStateLoaded = false;
    console.log('Performance cache cleared');
  }

  /**
   * Optimize storage by cleaning up expired cache entries
   * @returns {number} Number of entries cleaned
   */
  optimizeCache() {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }
    
    console.log(`Cleaned ${cleanedCount} expired cache entries`);
    return cleanedCount;
  }

  // Private methods

  /**
   * Load sessions index for faster lookups
   * @returns {Promise<void>}
   */
  async _loadSessionsIndex() {
    if (this.sessionsIndexLoaded) return;
    
    try {
      const storageKeys = [];
      
      // Get all session keys from localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.keyPrefix)) {
          storageKeys.push(key);
        }
      }
      
      // Load basic info for each session
      for (const key of storageKeys) {
        try {
          const eventCode = key.replace(this.keyPrefix, '');
          const sessionDataStr = localStorage.getItem(key);
          
          if (sessionDataStr) {
            const sessionData = JSON.parse(sessionDataStr);
            
            if (this.validateSessionData(sessionData)) {
              this.sessionsIndex.set(eventCode, {
                playerName: sessionData.playerName,
                lastAccessAt: sessionData.lastAccessAt,
                createdAt: sessionData.createdAt
              });
            }
          }
        } catch (error) {
          console.warn(`Failed to load session index for key ${key}:`, error);
        }
      }
      
      this.sessionsIndexLoaded = true;
      console.log(`Loaded sessions index with ${this.sessionsIndex.size} entries`);
    } catch (error) {
      console.error('Failed to load sessions index:', error);
    }
  }

  /**
   * Load session data directly from storage (bypassing cache)
   * @param {string} eventCode - Event identifier
   * @returns {Promise<Object|null>} Session data
   */
  async _loadSessionFromStorage(eventCode) {
    try {
      const sessionKey = this._getSessionKey(eventCode);
      const sessionDataStr = localStorage.getItem(sessionKey);
      
      if (!sessionDataStr) {
        return null;
      }

      const sessionData = JSON.parse(sessionDataStr);
      
      if (!this.validateSessionData(sessionData)) {
        return null;
      }

      return sessionData;
    } catch (error) {
      console.error('Failed to load session from storage:', error);
      return null;
    }
  }

  /**
   * Batch non-critical operations for better performance
   * @param {Object} operation - Operation to batch
   * @returns {void}
   */
  _batchOperation(operation) {
    this.batchOperations.push(operation);
    this.performanceMetrics.batchedOperations++;
    
    // Clear existing timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }
    
    // Set new timeout to process batch
    this.batchTimeout = setTimeout(() => {
      this._processBatchedOperations();
    }, this.batchDelay);
  }

  /**
   * Process batched operations
   * @returns {Promise<void>}
   */
  async _processBatchedOperations() {
    if (this.batchOperations.length === 0) return;
    
    const operations = [...this.batchOperations];
    this.batchOperations = [];
    this.batchTimeout = null;
    
    console.log(`Processing ${operations.length} batched operations`);
    
    // Group operations by type
    const groupedOps = operations.reduce((groups, op) => {
      if (!groups[op.type]) {
        groups[op.type] = [];
      }
      groups[op.type].push(op);
      return groups;
    }, {});
    
    // Process each group
    for (const [type, ops] of Object.entries(groupedOps)) {
      try {
        switch (type) {
          case 'setLastUsedEvent':
            // Only process the most recent setLastUsedEvent
            const latestOp = ops.reduce((latest, op) => 
              op.timestamp > latest.timestamp ? op : latest
            );
            await super.setLastUsedEvent(latestOp.eventCode);
            break;
            
          default:
            console.warn(`Unknown batched operation type: ${type}`);
        }
      } catch (error) {
        console.error(`Failed to process batched operations of type ${type}:`, error);
      }
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
    
    this.performanceMetrics.operationTimes.push(duration);
    
    // Keep only the last 100 operation times
    if (this.performanceMetrics.operationTimes.length > 100) {
      this.performanceMetrics.operationTimes.shift();
    }
    
    // Log slow operations
    if (duration > 50) { // More than 50ms
      console.warn(`Slow ${operation} operation (${source}): ${Math.round(duration)}ms`);
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceOptimizedSessionManager;
}

// Make available globally for browser use
if (typeof window !== 'undefined') {
  window.PerformanceOptimizedSessionManager = PerformanceOptimizedSessionManager;
}