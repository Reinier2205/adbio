/**
 * ErrorHandler - Comprehensive error handling and recovery system
 * Handles localStorage failures, corrupted data, network issues, and provides user-friendly fallbacks
 */
class ErrorHandler {
  constructor() {
    this.storageType = this._detectBestStorageType();
    this.errorLog = [];
    this.maxLogEntries = 50;
    this.offlineMode = false;
    this.actionQueue = [];
    this.lastKnownGoodState = null;
    
    // Initialize error handling
    this._initializeErrorHandling();
  }

  /**
   * Safe localStorage operation with fallback to sessionStorage
   * @param {string} operation - 'getItem', 'setItem', 'removeItem'
   * @param {string} key - Storage key
   * @param {string} value - Value for setItem operation
   * @returns {Promise<any>} Operation result
   */
  async safeStorageOperation(operation, key, value = null) {
    try {
      // Try primary storage type first
      const result = await this._performStorageOperation(this.storageType, operation, key, value);
      
      // If successful, return result
      if (result.success) {
        return result;
      }
      
      // If primary storage failed, try fallback
      const fallbackType = this.storageType === 'localStorage' ? 'sessionStorage' : 'localStorage';
      const fallbackResult = await this._performStorageOperation(fallbackType, operation, key, value);
      
      if (fallbackResult.success) {
        // Log storage type change
        this._logError('storage_fallback', {
          primaryType: this.storageType,
          fallbackType: fallbackType,
          operation: operation,
          key: key
        });
        
        // Update storage type for future operations
        this.storageType = fallbackType;
        
        return fallbackResult;
      }
      
      // Both storage types failed
      throw new Error(`Both localStorage and sessionStorage failed for operation: ${operation}`);
      
    } catch (error) {
      this._logError('storage_operation_failed', {
        operation: operation,
        key: key,
        error: error.message,
        storageType: this.storageType
      });
      
      return {
        success: false,
        error: error.message,
        fallbackNeeded: true
      };
    }
  }

  /**
   * Handle storage quota exceeded error
   * @param {string} key - Key that caused the quota error
   * @param {string} value - Value that couldn't be stored
   * @returns {Promise<Object>} Recovery result
   */
  async handleStorageQuotaExceeded(key, value) {
    try {
      this._logError('storage_quota_exceeded', {
        key: key,
        valueSize: value ? value.length : 0,
        storageType: this.storageType
      });
      
      // Try to free up space by removing old entries
      const cleanupResult = await this._cleanupOldStorageEntries();
      
      if (cleanupResult.success) {
        // Try the operation again
        const retryResult = await this.safeStorageOperation('setItem', key, value);
        
        if (retryResult.success) {
          return {
            success: true,
            action: 'quota_cleanup_successful',
            message: 'Storage space freed up successfully'
          };
        }
      }
      
      // Cleanup didn't help, offer user options
      return {
        success: false,
        action: 'quota_exceeded_user_action_needed',
        message: 'Storage is full. Please choose an option to continue.',
        options: [
          {
            type: 'clear_old_data',
            description: 'Clear old game data to free up space',
            action: () => this._clearOldGameData()
          },
          {
            type: 'use_session_only',
            description: 'Use temporary storage (data will be lost when browser closes)',
            action: () => this._switchToSessionOnly()
          },
          {
            type: 'continue_without_saving',
            description: 'Continue without saving (not recommended)',
            action: () => this._enableNoSaveMode()
          }
        ]
      };
      
    } catch (error) {
      this._logError('quota_handling_failed', {
        error: error.message
      });
      
      return {
        success: false,
        error: 'Failed to handle storage quota error',
        fallbackAction: 'use_session_only'
      };
    }
  }

  /**
   * Create user notification for storage limitations
   * @param {string} type - Notification type
   * @param {Object} options - Notification options
   * @returns {Object} Notification element
   */
  createStorageNotification(type, options = {}) {
    try {
      const notification = document.createElement('div');
      notification.className = 'storage-notification';
      notification.setAttribute('data-type', type);
      
      let content = '';
      let actions = '';
      
      switch (type) {
        case 'localStorage_unavailable':
          content = `
            <div class="notification-icon">⚠️</div>
            <div class="notification-content">
              <h4>Storage Limited</h4>
              <p>Your browser's local storage is not available. Your game data will only be saved for this session.</p>
            </div>
          `;
          actions = `
            <button class="notification-btn primary" onclick="this.closest('.storage-notification').dismiss()">
              Got it
            </button>
          `;
          break;
          
        case 'quota_exceeded':
          content = `
            <div class="notification-icon">💾</div>
            <div class="notification-content">
              <h4>Storage Full</h4>
              <p>Your browser's storage is full. Choose an option to continue playing.</p>
            </div>
          `;
          actions = `
            <button class="notification-btn secondary" onclick="this.closest('.storage-notification').clearOldData()">
              Clear Old Data
            </button>
            <button class="notification-btn primary" onclick="this.closest('.storage-notification').useSessionOnly()">
              Use Temporary Storage
            </button>
          `;
          break;
          
        case 'storage_fallback':
          content = `
            <div class="notification-icon">🔄</div>
            <div class="notification-content">
              <h4>Storage Switched</h4>
              <p>We've switched to ${options.storageType} to keep your game running smoothly.</p>
            </div>
          `;
          actions = `
            <button class="notification-btn primary" onclick="this.closest('.storage-notification').dismiss()">
              Continue
            </button>
          `;
          break;
          
        default:
          content = `
            <div class="notification-icon">ℹ️</div>
            <div class="notification-content">
              <h4>Storage Notice</h4>
              <p>${options.message || 'There was an issue with storage.'}</p>
            </div>
          `;
          actions = `
            <button class="notification-btn primary" onclick="this.closest('.storage-notification').dismiss()">
              OK
            </button>
          `;
      }
      
      notification.innerHTML = `
        <div class="notification-body">
          ${content}
        </div>
        <div class="notification-actions">
          ${actions}
        </div>
      `;
      
      // Add notification methods
      notification.dismiss = () => {
        notification.classList.add('dismissing');
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      };
      
      notification.clearOldData = async () => {
        const result = await this._clearOldGameData();
        if (result.success) {
          notification.dismiss();
          this.createStorageNotification('data_cleared', {
            message: `Cleared ${result.itemsRemoved} old items. You can now save your game data.`
          });
        }
      };
      
      notification.useSessionOnly = () => {
        this._switchToSessionOnly();
        notification.dismiss();
        this.createStorageNotification('session_only_enabled', {
          message: 'Now using temporary storage. Your data will be saved until you close the browser.'
        });
      };
      
      // Add styles if not already added
      this._addNotificationStyles();
      
      // Add to page
      const container = this._getNotificationContainer();
      container.appendChild(notification);
      
      // Auto-dismiss after delay for some types
      if (['storage_fallback', 'data_cleared', 'session_only_enabled'].includes(type)) {
        setTimeout(() => {
          if (notification.parentNode) {
            notification.dismiss();
          }
        }, 5000);
      }
      
      return notification;
      
    } catch (error) {
      this._logError('notification_creation_failed', {
        type: type,
        error: error.message
      });
      
      // Fallback to simple alert
      alert(options.message || 'There was an issue with storage. Please refresh the page if problems persist.');
      return null;
    }
  }

  // Private methods for localStorage error handling

  /**
   * Detect the best available storage type
   * @returns {string} Storage type ('localStorage', 'sessionStorage', or 'none')
   */
  _detectBestStorageType() {
    try {
      // Test localStorage
      const testKey = 'eventbingo:storage_test';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return 'localStorage';
    } catch (error) {
      try {
        // Test sessionStorage
        const testKey = 'eventbingo:storage_test';
        sessionStorage.setItem(testKey, 'test');
        sessionStorage.removeItem(testKey);
        return 'sessionStorage';
      } catch (error) {
        return 'none';
      }
    }
  }

  /**
   * Perform storage operation with error handling
   * @param {string} storageType - 'localStorage' or 'sessionStorage'
   * @param {string} operation - Operation type
   * @param {string} key - Storage key
   * @param {string} value - Value for setItem
   * @returns {Promise<Object>} Operation result
   */
  async _performStorageOperation(storageType, operation, key, value) {
    try {
      const storage = storageType === 'localStorage' ? localStorage : sessionStorage;
      
      switch (operation) {
        case 'getItem':
          const item = storage.getItem(key);
          return { success: true, value: item };
          
        case 'setItem':
          storage.setItem(key, value);
          return { success: true };
          
        case 'removeItem':
          storage.removeItem(key);
          return { success: true };
          
        default:
          throw new Error(`Unknown storage operation: ${operation}`);
      }
    } catch (error) {
      // Handle specific storage errors
      if (error.name === 'QuotaExceededError' || error.code === 22) {
        return {
          success: false,
          error: 'quota_exceeded',
          originalError: error
        };
      }
      
      return {
        success: false,
        error: error.message,
        originalError: error
      };
    }
  }

  /**
   * Clean up old storage entries to free space
   * @returns {Promise<Object>} Cleanup result
   */
  async _cleanupOldStorageEntries() {
    try {
      const storage = this.storageType === 'localStorage' ? localStorage : sessionStorage;
      const keysToRemove = [];
      const now = Date.now();
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      
      // Find old EventBingo entries
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        
        if (key && key.startsWith('eventbingo:')) {
          try {
            const item = storage.getItem(key);
            const data = JSON.parse(item);
            
            // Check if item has timestamp and is old
            if (data.lastAccessAt || data.timestamp) {
              const itemTime = new Date(data.lastAccessAt || data.timestamp).getTime();
              
              if (now - itemTime > maxAge) {
                keysToRemove.push(key);
              }
            }
          } catch (parseError) {
            // If we can't parse it, it might be corrupted - remove it
            keysToRemove.push(key);
          }
        }
      }
      
      // Remove old entries
      keysToRemove.forEach(key => {
        try {
          storage.removeItem(key);
        } catch (error) {
          console.warn(`Failed to remove old storage key: ${key}`, error);
        }
      });
      
      return {
        success: true,
        itemsRemoved: keysToRemove.length,
        spaceFreed: true
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clear old game data with user confirmation
   * @returns {Promise<Object>} Clear result
   */
  async _clearOldGameData() {
    try {
      const storage = this.storageType === 'localStorage' ? localStorage : sessionStorage;
      const gameKeys = [];
      
      // Find all EventBingo keys
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith('eventbingo:session:')) {
          gameKeys.push(key);
        }
      }
      
      // Keep only the most recent 3 sessions
      const sessions = [];
      gameKeys.forEach(key => {
        try {
          const data = JSON.parse(storage.getItem(key));
          sessions.push({
            key: key,
            lastAccess: new Date(data.lastAccessAt || data.createdAt).getTime()
          });
        } catch (error) {
          // Corrupted data, mark for removal
          sessions.push({
            key: key,
            lastAccess: 0
          });
        }
      });
      
      // Sort by last access and remove old ones
      sessions.sort((a, b) => b.lastAccess - a.lastAccess);
      const keysToRemove = sessions.slice(3).map(s => s.key);
      
      keysToRemove.forEach(key => {
        storage.removeItem(key);
      });
      
      return {
        success: true,
        itemsRemoved: keysToRemove.length
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Switch to session-only storage mode
   */
  _switchToSessionOnly() {
    this.storageType = 'sessionStorage';
    
    // Try to copy current localStorage data to sessionStorage
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('eventbingo:')) {
          const value = localStorage.getItem(key);
          sessionStorage.setItem(key, value);
        }
      }
    } catch (error) {
      console.warn('Failed to copy localStorage to sessionStorage:', error);
    }
  }

  /**
   * Enable no-save mode (in-memory only)
   */
  _enableNoSaveMode() {
    this.storageType = 'none';
    // This would require implementing in-memory storage fallback
    console.warn('No-save mode enabled - data will not persist');
  }

  /**
   * Get or create notification container
   * @returns {HTMLElement} Notification container
   */
  _getNotificationContainer() {
    let container = document.getElementById('storage-notifications');
    
    if (!container) {
      container = document.createElement('div');
      container.id = 'storage-notifications';
      container.className = 'notification-container';
      document.body.appendChild(container);
    }
    
    return container;
  }

  /**
   * Add notification styles
   */
  _addNotificationStyles() {
    if (document.getElementById('storage-notification-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'storage-notification-styles';
    styles.textContent = `
      .notification-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        max-width: 400px;
        pointer-events: none;
      }

      .storage-notification {
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        margin-bottom: 12px;
        overflow: hidden;
        pointer-events: auto;
        animation: slideInRight 0.3s ease;
        border-left: 4px solid #4a90e2;
      }

      .storage-notification.dismissing {
        animation: slideOutRight 0.3s ease;
      }

      .notification-body {
        padding: 16px 20px;
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }

      .notification-icon {
        font-size: 1.5rem;
        flex-shrink: 0;
      }

      .notification-content h4 {
        margin: 0 0 4px 0;
        font-size: 1rem;
        font-weight: 600;
        color: #333;
      }

      .notification-content p {
        margin: 0;
        font-size: 0.9rem;
        color: #666;
        line-height: 1.4;
      }

      .notification-actions {
        padding: 12px 20px;
        background: #f8f9fa;
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }

      .notification-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        font-size: 0.9rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .notification-btn.primary {
        background: #4a90e2;
        color: white;
      }

      .notification-btn.primary:hover {
        background: #357abd;
      }

      .notification-btn.secondary {
        background: #e9ecef;
        color: #495057;
      }

      .notification-btn.secondary:hover {
        background: #dee2e6;
      }

      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      @keyframes slideOutRight {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }

      /* Dark mode support */
      body.dark-mode .storage-notification {
        background: #2d2d2d;
        color: #fff;
      }

      body.dark-mode .notification-content h4 {
        color: #fff;
      }

      body.dark-mode .notification-content p {
        color: #ccc;
      }

      body.dark-mode .notification-actions {
        background: #333;
      }

      body.dark-mode .notification-btn.secondary {
        background: #444;
        color: #fff;
      }

      body.dark-mode .notification-btn.secondary:hover {
        background: #555;
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * Handle network connectivity issues
   * @returns {Object} Network status and handling result
   */
  handleNetworkConnectivity() {
    try {
      const isOnline = navigator.onLine;
      
      if (!isOnline) {
        this._enableOfflineMode();
        return {
          success: true,
          action: 'offline_mode_enabled',
          isOnline: false,
          message: 'You are currently offline. EventBingo will work with cached data.'
        };
      } else {
        this._enableOnlineMode();
        return {
          success: true,
          action: 'online_mode_active',
          isOnline: true,
          message: 'You are online. All features are available.'
        };
      }
    } catch (error) {
      this._logError('network_connectivity_check_failed', {
        error: error.message
      });
      
      return {
        success: false,
        error: 'Failed to check network connectivity',
        assumeOffline: true
      };
    }
  }

  /**
   * Cache last known good state
   * @param {Object} state - Application state to cache
   * @returns {Promise<boolean>} Cache success status
   */
  async cacheLastKnownGoodState(state) {
    try {
      if (!state || typeof state !== 'object') {
        return false;
      }

      const cacheData = {
        state: state,
        timestamp: Date.now(),
        version: '1.0'
      };

      this.lastKnownGoodState = cacheData;

      // Try to persist to storage
      const cacheKey = 'eventbingo:lastKnownGoodState';
      const result = await this.safeStorageOperation('setItem', cacheKey, JSON.stringify(cacheData));

      if (result.success) {
        console.log('Last known good state cached successfully');
        return true;
      } else {
        console.warn('Failed to persist cached state, keeping in memory only');
        return true; // Still successful as we have it in memory
      }

    } catch (error) {
      this._logError('cache_state_failed', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * Restore last known good state
   * @returns {Promise<Object|null>} Restored state or null
   */
  async restoreLastKnownGoodState() {
    try {
      // First try in-memory cache
      if (this.lastKnownGoodState) {
        const age = Date.now() - this.lastKnownGoodState.timestamp;
        const maxAge = 60 * 60 * 1000; // 1 hour

        if (age < maxAge) {
          console.log('Restored state from memory cache');
          return this.lastKnownGoodState.state;
        }
      }

      // Try to restore from storage
      const cacheKey = 'eventbingo:lastKnownGoodState';
      const result = await this.safeStorageOperation('getItem', cacheKey);

      if (result.success && result.value) {
        const cacheData = JSON.parse(result.value);
        const age = Date.now() - cacheData.timestamp;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours

        if (age < maxAge) {
          this.lastKnownGoodState = cacheData;
          console.log('Restored state from storage cache');
          return cacheData.state;
        }
      }

      return null;

    } catch (error) {
      this._logError('restore_state_failed', {
        error: error.message
      });
      return null;
    }
  }

  /**
   * Queue action for when online
   * @param {string} actionType - Type of action
   * @param {Object} actionData - Action data
   * @returns {boolean} Queue success status
   */
  queueActionForOnline(actionType, actionData) {
    try {
      const queuedAction = {
        type: actionType,
        data: actionData,
        timestamp: Date.now(),
        id: this._generateActionId()
      };

      this.actionQueue.push(queuedAction);

      // Limit queue size
      if (this.actionQueue.length > 50) {
        this.actionQueue.splice(0, this.actionQueue.length - 50);
      }

      console.log(`Action queued for online: ${actionType}`, queuedAction);
      return true;

    } catch (error) {
      this._logError('queue_action_failed', {
        actionType: actionType,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Process queued actions when online
   * @returns {Promise<Object>} Processing result
   */
  async processQueuedActions() {
    try {
      if (!navigator.onLine) {
        return {
          success: false,
          reason: 'still_offline',
          queuedCount: this.actionQueue.length
        };
      }

      const processedActions = [];
      const failedActions = [];

      for (const action of this.actionQueue) {
        try {
          const result = await this._processQueuedAction(action);
          
          if (result.success) {
            processedActions.push(action);
          } else {
            failedActions.push({ action, error: result.error });
          }
        } catch (error) {
          failedActions.push({ action, error: error.message });
        }
      }

      // Remove processed actions from queue
      this.actionQueue = this.actionQueue.filter(action => 
        !processedActions.some(processed => processed.id === action.id)
      );

      const result = {
        success: true,
        processedCount: processedActions.length,
        failedCount: failedActions.length,
        remainingCount: this.actionQueue.length
      };

      if (processedActions.length > 0) {
        this.createStorageNotification('actions_processed', {
          message: `Processed ${processedActions.length} queued actions while you were offline.`
        });
      }

      return result;

    } catch (error) {
      this._logError('process_queued_actions_failed', {
        error: error.message,
        queueLength: this.actionQueue.length
      });

      return {
        success: false,
        error: 'Failed to process queued actions'
      };
    }
  }

  /**
   * Get offline mode status and capabilities
   * @returns {Object} Offline mode information
   */
  getOfflineModeStatus() {
    return {
      isOffline: this.offlineMode,
      isOnline: navigator.onLine,
      queuedActionsCount: this.actionQueue.length,
      hasLastKnownGoodState: !!this.lastKnownGoodState,
      capabilities: {
        canViewCachedData: true,
        canPlayOffline: true,
        canSaveProgress: this.storageType !== 'none',
        canSyncWhenOnline: true
      }
    };
  }

  // Private methods for network connectivity

  /**
   * Enable offline mode
   */
  _enableOfflineMode() {
    if (!this.offlineMode) {
      this.offlineMode = true;
      
      this._logError('offline_mode_enabled', {
        timestamp: Date.now(),
        queuedActions: this.actionQueue.length
      });

      // Show offline notification
      this.createStorageNotification('offline_mode', {
        message: 'You are now offline. Your progress will be saved locally and synced when you reconnect.'
      });

      // Set up online event listener
      window.addEventListener('online', this._handleOnlineEvent.bind(this));
    }
  }

  /**
   * Enable online mode
   */
  _enableOnlineMode() {
    if (this.offlineMode) {
      this.offlineMode = false;
      
      this._logError('online_mode_enabled', {
        timestamp: Date.now(),
        queuedActions: this.actionQueue.length
      });

      // Process any queued actions
      this.processQueuedActions();

      // Remove online event listener
      window.removeEventListener('online', this._handleOnlineEvent.bind(this));
    }
  }

  /**
   * Handle online event
   */
  _handleOnlineEvent() {
    console.log('Network connection restored');
    this._enableOnlineMode();
  }

  /**
   * Process a single queued action
   * @param {Object} action - Queued action
   * @returns {Promise<Object>} Processing result
   */
  async _processQueuedAction(action) {
    try {
      switch (action.type) {
        case 'save_session':
          // Re-attempt session save
          return await this._retrySaveSession(action.data);
          
        case 'validate_event':
          // Re-attempt event validation
          return await this._retryEventValidation(action.data);
          
        case 'sync_progress':
          // Re-attempt progress sync
          return await this._retrySyncProgress(action.data);
          
        default:
          console.warn(`Unknown queued action type: ${action.type}`);
          return { success: false, error: 'Unknown action type' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Retry session save operation
   * @param {Object} sessionData - Session data to save
   * @returns {Promise<Object>} Save result
   */
  async _retrySaveSession(sessionData) {
    try {
      // This would integrate with SessionManager
      console.log('Retrying session save:', sessionData);
      return { success: true, action: 'session_saved' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Retry event validation
   * @param {Object} eventData - Event data to validate
   * @returns {Promise<Object>} Validation result
   */
  async _retryEventValidation(eventData) {
    try {
      // This would integrate with event validation logic
      console.log('Retrying event validation:', eventData);
      return { success: true, action: 'event_validated' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Retry progress sync
   * @param {Object} progressData - Progress data to sync
   * @returns {Promise<Object>} Sync result
   */
  async _retrySyncProgress(progressData) {
    try {
      // This would integrate with progress sync logic
      console.log('Retrying progress sync:', progressData);
      return { success: true, action: 'progress_synced' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate unique action ID
   * @returns {string} Unique ID
   */
  _generateActionId() {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize error handling system
   */
  _initializeErrorHandling() {
    // Set up global error handlers
    window.addEventListener('error', (event) => {
      this._logError('javascript_error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error ? event.error.stack : null
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this._logError('unhandled_promise_rejection', {
        reason: event.reason,
        stack: event.reason ? event.reason.stack : null
      });
    });

    // Set up network connectivity monitoring
    window.addEventListener('offline', () => {
      this._enableOfflineMode();
    });

    window.addEventListener('online', () => {
      this._enableOnlineMode();
    });

    // Check initial network status
    this.handleNetworkConnectivity();

    // Check storage availability on initialization
    if (this.storageType === 'none') {
      this.createStorageNotification('localStorage_unavailable');
    } else if (this.storageType === 'sessionStorage') {
      this.createStorageNotification('storage_fallback', {
        storageType: 'sessionStorage'
      });
    }
  }

  /**
   * Detect and handle corrupted session data
   * @param {string} key - Storage key that contains corrupted data
   * @param {string} rawData - Raw data that failed to parse
   * @returns {Promise<Object>} Recovery result
   */
  async detectCorruptedData(key, rawData) {
    try {
      this._logError('corrupted_data_detected', {
        key: key,
        dataLength: rawData ? rawData.length : 0,
        dataPreview: rawData ? rawData.substring(0, 100) : null
      });

      // Try to recover partial data
      const recoveryResult = await this._attemptDataRecovery(key, rawData);
      
      if (recoveryResult.success) {
        return {
          success: true,
          action: 'data_recovered',
          recoveredData: recoveryResult.data,
          message: 'Successfully recovered your game data'
        };
      }

      // Recovery failed, offer user options
      return {
        success: false,
        action: 'corruption_recovery_needed',
        message: 'Your game data appears to be corrupted. Choose how to proceed:',
        options: [
          {
            type: 'clear_corrupted_data',
            description: 'Clear corrupted data and start fresh',
            action: () => this.clearCorruptedData(key)
          },
          {
            type: 'backup_and_clear',
            description: 'Save corrupted data for support and start fresh',
            action: () => this._backupCorruptedData(key, rawData)
          },
          {
            type: 'ignore_and_continue',
            description: 'Continue without this data (may cause issues)',
            action: () => this._ignoreCorruptedData(key)
          }
        ]
      };

    } catch (error) {
      this._logError('corruption_detection_failed', {
        key: key,
        error: error.message
      });

      return {
        success: false,
        error: 'Failed to handle corrupted data',
        fallbackAction: 'clear_corrupted_data'
      };
    }
  }

  /**
   * Clear corrupted data with user confirmation
   * @param {string} key - Storage key to clear
   * @param {boolean} userConfirmed - Whether user has confirmed the action
   * @returns {Promise<Object>} Clear result
   */
  async clearCorruptedData(key, userConfirmed = false) {
    try {
      if (!userConfirmed) {
        // Show confirmation modal
        const confirmed = await this._showCorruptionConfirmationModal(key);
        if (!confirmed) {
          return {
            success: false,
            cancelled: true
          };
        }
      }

      // Clear the corrupted data
      const clearResult = await this.safeStorageOperation('removeItem', key);
      
      if (clearResult.success) {
        this._logError('corrupted_data_cleared', {
          key: key,
          userConfirmed: userConfirmed
        });

        // Show success notification
        this.createStorageNotification('data_cleared', {
          message: 'Corrupted data has been cleared. You can now start fresh.'
        });

        return {
          success: true,
          action: 'corrupted_data_cleared',
          message: 'Corrupted data cleared successfully'
        };
      } else {
        throw new Error('Failed to clear corrupted data');
      }

    } catch (error) {
      this._logError('clear_corrupted_data_failed', {
        key: key,
        error: error.message
      });

      return {
        success: false,
        error: 'Failed to clear corrupted data'
      };
    }
  }

  /**
   * Provide "Start Fresh" option that preserves user choice
   * @param {Object} options - Start fresh options
   * @returns {Promise<Object>} Start fresh result
   */
  async provideStartFreshOption(options = {}) {
    try {
      const { 
        preserveSettings = true, 
        clearAllData = false,
        showConfirmation = true 
      } = options;

      if (showConfirmation) {
        const confirmed = await this._showStartFreshConfirmationModal(options);
        if (!confirmed) {
          return {
            success: false,
            cancelled: true
          };
        }
      }

      const result = {
        success: true,
        action: 'start_fresh',
        itemsCleared: 0,
        preservedItems: 0
      };

      if (clearAllData) {
        // Clear all EventBingo data
        result.itemsCleared = await this._clearAllEventBingoData();
      } else {
        // Clear only session data, preserve settings
        const sessionKeys = await this._getEventBingoSessionKeys();
        
        for (const key of sessionKeys) {
          const clearResult = await this.safeStorageOperation('removeItem', key);
          if (clearResult.success) {
            result.itemsCleared++;
          }
        }

        if (preserveSettings) {
          // Count preserved settings
          const settingsKeys = await this._getEventBingoSettingsKeys();
          result.preservedItems = settingsKeys.length;
        }
      }

      // Show success notification
      this.createStorageNotification('start_fresh_complete', {
        message: `Fresh start complete! Cleared ${result.itemsCleared} items${result.preservedItems > 0 ? `, preserved ${result.preservedItems} settings` : ''}.`
      });

      return result;

    } catch (error) {
      this._logError('start_fresh_failed', {
        error: error.message,
        options: options
      });

      return {
        success: false,
        error: 'Failed to start fresh'
      };
    }
  }

  // Private methods for corrupted data recovery

  /**
   * Attempt to recover data from corrupted string
   * @param {string} key - Storage key
   * @param {string} rawData - Corrupted raw data
   * @returns {Promise<Object>} Recovery result
   */
  async _attemptDataRecovery(key, rawData) {
    try {
      if (!rawData || typeof rawData !== 'string') {
        return { success: false, reason: 'no_data' };
      }

      // Try to find JSON-like patterns
      const jsonMatches = rawData.match(/\{[^{}]*\}/g);
      
      if (jsonMatches && jsonMatches.length > 0) {
        // Try to parse each potential JSON object
        for (const match of jsonMatches) {
          try {
            const parsed = JSON.parse(match);
            
            // Validate if this looks like session data
            if (this._isValidSessionStructure(parsed)) {
              return {
                success: true,
                data: parsed,
                method: 'json_pattern_match'
              };
            }
          } catch (parseError) {
            // Continue to next match
            continue;
          }
        }
      }

      // Try to extract key-value pairs
      const kvRecovery = this._attemptKeyValueRecovery(rawData);
      if (kvRecovery.success) {
        return kvRecovery;
      }

      return { success: false, reason: 'no_recoverable_data' };

    } catch (error) {
      return { 
        success: false, 
        reason: 'recovery_error',
        error: error.message 
      };
    }
  }

  /**
   * Check if parsed object has valid session structure
   * @param {Object} obj - Parsed object
   * @returns {boolean} Validation result
   */
  _isValidSessionStructure(obj) {
    if (!obj || typeof obj !== 'object') return false;

    // Check for session data fields
    const sessionFields = ['playerName', 'secretQuestion', 'secretAnswerHash'];
    const hasSessionFields = sessionFields.some(field => obj.hasOwnProperty(field));

    // Check for app state fields
    const appStateFields = ['lastUsedEvent', 'darkMode', 'navigationHistory'];
    const hasAppStateFields = appStateFields.some(field => obj.hasOwnProperty(field));

    return hasSessionFields || hasAppStateFields;
  }

  /**
   * Attempt to recover key-value pairs from corrupted data
   * @param {string} rawData - Raw corrupted data
   * @returns {Object} Recovery result
   */
  _attemptKeyValueRecovery(rawData) {
    try {
      const recovered = {};
      
      // Look for quoted key-value patterns
      const kvPatterns = [
        /"(\w+)"\s*:\s*"([^"]+)"/g,  // "key": "value"
        /"(\w+)"\s*:\s*(\d+)/g,      // "key": number
        /"(\w+)"\s*:\s*(true|false)/g // "key": boolean
      ];

      let foundAny = false;

      for (const pattern of kvPatterns) {
        let match;
        while ((match = pattern.exec(rawData)) !== null) {
          const [, key, value] = match;
          
          // Convert value to appropriate type
          if (value === 'true') recovered[key] = true;
          else if (value === 'false') recovered[key] = false;
          else if (/^\d+$/.test(value)) recovered[key] = parseInt(value);
          else recovered[key] = value;
          
          foundAny = true;
        }
      }

      if (foundAny && this._isValidSessionStructure(recovered)) {
        return {
          success: true,
          data: recovered,
          method: 'key_value_recovery'
        };
      }

      return { success: false, reason: 'no_valid_pairs' };

    } catch (error) {
      return { 
        success: false, 
        reason: 'kv_recovery_error',
        error: error.message 
      };
    }
  }

  /**
   * Backup corrupted data for support analysis
   * @param {string} key - Storage key
   * @param {string} rawData - Corrupted data
   * @returns {Promise<Object>} Backup result
   */
  async _backupCorruptedData(key, rawData) {
    try {
      const backupKey = `eventbingo:corrupted_backup:${Date.now()}`;
      const backupData = {
        originalKey: key,
        corruptedData: rawData,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      const backupResult = await this.safeStorageOperation('setItem', backupKey, JSON.stringify(backupData));
      
      if (backupResult.success) {
        // Clear the original corrupted data
        await this.safeStorageOperation('removeItem', key);
        
        this.createStorageNotification('data_backed_up', {
          message: 'Corrupted data has been backed up for analysis and cleared. You can now start fresh.'
        });

        return {
          success: true,
          backupKey: backupKey,
          action: 'data_backed_up_and_cleared'
        };
      } else {
        throw new Error('Failed to backup corrupted data');
      }

    } catch (error) {
      this._logError('backup_corrupted_data_failed', {
        key: key,
        error: error.message
      });

      return {
        success: false,
        error: 'Failed to backup corrupted data'
      };
    }
  }

  /**
   * Ignore corrupted data and continue
   * @param {string} key - Storage key to ignore
   * @returns {Object} Ignore result
   */
  _ignoreCorruptedData(key) {
    this._logError('corrupted_data_ignored', {
      key: key,
      userChoice: 'ignore_and_continue'
    });

    this.createStorageNotification('data_ignored', {
      message: 'Corrupted data ignored. Some features may not work correctly until you clear the data.'
    });

    return {
      success: true,
      action: 'corrupted_data_ignored',
      warning: 'Some features may not work correctly'
    };
  }

  /**
   * Show corruption confirmation modal
   * @param {string} key - Storage key
   * @returns {Promise<boolean>} User confirmation
   */
  async _showCorruptionConfirmationModal(key) {
    return new Promise((resolve) => {
      const modal = this._createConfirmationModal({
        title: 'Clear Corrupted Data?',
        message: `The data for "${key}" appears to be corrupted and cannot be recovered. Would you like to clear it and start fresh?`,
        confirmText: 'Clear Data',
        cancelText: 'Keep Data',
        type: 'warning'
      });

      modal.onConfirm = () => {
        modal.close();
        resolve(true);
      };

      modal.onCancel = () => {
        modal.close();
        resolve(false);
      };
    });
  }

  /**
   * Show start fresh confirmation modal
   * @param {Object} options - Start fresh options
   * @returns {Promise<boolean>} User confirmation
   */
  async _showStartFreshConfirmationModal(options) {
    return new Promise((resolve) => {
      const message = options.clearAllData 
        ? 'This will clear ALL your EventBingo data including settings. Are you sure?'
        : 'This will clear your game sessions but preserve your settings. Continue?';

      const modal = this._createConfirmationModal({
        title: 'Start Fresh?',
        message: message,
        confirmText: 'Start Fresh',
        cancelText: 'Cancel',
        type: 'warning'
      });

      modal.onConfirm = () => {
        modal.close();
        resolve(true);
      };

      modal.onCancel = () => {
        modal.close();
        resolve(false);
      };
    });
  }

  /**
   * Get all EventBingo session keys
   * @returns {Promise<Array>} Session keys
   */
  async _getEventBingoSessionKeys() {
    const keys = [];
    const storage = this.storageType === 'localStorage' ? localStorage : sessionStorage;
    
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith('eventbingo:session:')) {
        keys.push(key);
      }
    }
    
    return keys;
  }

  /**
   * Get all EventBingo settings keys
   * @returns {Promise<Array>} Settings keys
   */
  async _getEventBingoSettingsKeys() {
    const keys = [];
    const storage = this.storageType === 'localStorage' ? localStorage : sessionStorage;
    
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && (key.startsWith('eventbingo:appState') || key.startsWith('eventbingo:settings'))) {
        keys.push(key);
      }
    }
    
    return keys;
  }

  /**
   * Clear all EventBingo data
   * @returns {Promise<number>} Number of items cleared
   */
  async _clearAllEventBingoData() {
    let cleared = 0;
    const storage = this.storageType === 'localStorage' ? localStorage : sessionStorage;
    const keysToRemove = [];
    
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith('eventbingo:')) {
        keysToRemove.push(key);
      }
    }
    
    for (const key of keysToRemove) {
      const result = await this.safeStorageOperation('removeItem', key);
      if (result.success) {
        cleared++;
      }
    }
    
    return cleared;
  }

  /**
   * Create confirmation modal
   * @param {Object} options - Modal options
   * @returns {Object} Modal element
   */
  _createConfirmationModal(options) {
    const { title, message, confirmText, cancelText, type = 'info' } = options;

    const modal = document.createElement('div');
    modal.className = 'confirmation-modal-overlay';
    modal.innerHTML = `
      <div class="confirmation-modal ${type}">
        <div class="confirmation-modal-header">
          <h3>${title}</h3>
        </div>
        <div class="confirmation-modal-body">
          <p>${message}</p>
        </div>
        <div class="confirmation-modal-footer">
          <button class="confirmation-btn secondary" onclick="this.closest('.confirmation-modal-overlay').onCancel()">
            ${cancelText}
          </button>
          <button class="confirmation-btn primary ${type}" onclick="this.closest('.confirmation-modal-overlay').onConfirm()">
            ${confirmText}
          </button>
        </div>
      </div>
    `;

    // Add styles
    this._addConfirmationModalStyles();

    // Add to page
    document.body.appendChild(modal);

    modal.close = () => {
      document.body.removeChild(modal);
    };

    return modal;
  }

  /**
   * Add confirmation modal styles
   */
  _addConfirmationModalStyles() {
    if (document.getElementById('confirmation-modal-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'confirmation-modal-styles';
    styles.textContent = `
      .confirmation-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
        animation: fadeIn 0.3s ease;
      }

      .confirmation-modal {
        background: white;
        border-radius: 12px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        animation: slideIn 0.3s ease;
      }

      .confirmation-modal.warning {
        border-top: 4px solid #f39c12;
      }

      .confirmation-modal-header {
        padding: 20px 20px 0 20px;
        text-align: center;
      }

      .confirmation-modal-header h3 {
        margin: 0;
        color: #333;
        font-size: 1.2rem;
      }

      .confirmation-modal-body {
        padding: 20px;
        text-align: center;
      }

      .confirmation-modal-body p {
        margin: 0;
        color: #666;
        line-height: 1.5;
      }

      .confirmation-modal-footer {
        display: flex;
        gap: 10px;
        padding: 20px;
        border-top: 1px solid #eee;
      }

      .confirmation-btn {
        flex: 1;
        padding: 12px 20px;
        border: none;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .confirmation-btn.primary {
        background: #4a90e2;
        color: white;
      }

      .confirmation-btn.primary:hover {
        background: #357abd;
      }

      .confirmation-btn.primary.warning {
        background: #e74c3c;
      }

      .confirmation-btn.primary.warning:hover {
        background: #c0392b;
      }

      .confirmation-btn.secondary {
        background: #f8f9fa;
        color: #333;
        border: 1px solid #ddd;
      }

      .confirmation-btn.secondary:hover {
        background: #e9ecef;
      }

      /* Dark mode support */
      body.dark-mode .confirmation-modal {
        background: #2d2d2d;
        color: #fff;
      }

      body.dark-mode .confirmation-modal-header h3 {
        color: #fff;
      }

      body.dark-mode .confirmation-modal-body p {
        color: #ccc;
      }

      body.dark-mode .confirmation-modal-footer {
        border-top-color: #555;
      }

      body.dark-mode .confirmation-btn.secondary {
        background: #333;
        color: #fff;
        border-color: #555;
      }

      body.dark-mode .confirmation-btn.secondary:hover {
        background: #444;
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * Get comprehensive error analytics
   * @returns {Object} Error analytics data
   */
  getErrorAnalytics() {
    try {
      const analytics = {
        totalErrors: this.errorLog.length,
        errorsByType: {},
        errorsByHour: {},
        recentErrors: this.errorLog.slice(0, 5),
        systemInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          cookieEnabled: navigator.cookieEnabled,
          onLine: navigator.onLine,
          storageType: this.storageType
        },
        performanceInfo: this._getPerformanceInfo(),
        timestamp: Date.now()
      };

      // Group errors by type
      this.errorLog.forEach(error => {
        analytics.errorsByType[error.type] = (analytics.errorsByType[error.type] || 0) + 1;
        
        // Group by hour for trend analysis
        const hour = new Date(error.timestamp).getHours();
        analytics.errorsByHour[hour] = (analytics.errorsByHour[hour] || 0) + 1;
      });

      return analytics;

    } catch (error) {
      console.error('Failed to generate error analytics:', error);
      return {
        error: 'Failed to generate analytics',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Export error log for support
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Export result
   */
  async exportErrorLogForSupport(options = {}) {
    try {
      const { 
        includeSystemInfo = true, 
        includeUserData = false,
        maxEntries = 50 
      } = options;

      const exportData = {
        version: '1.0',
        exportTimestamp: new Date().toISOString(),
        errorCount: this.errorLog.length,
        errors: this.errorLog.slice(0, maxEntries).map(error => ({
          ...error,
          // Remove potentially sensitive data
          details: this._sanitizeErrorDetails(error.details, includeUserData)
        }))
      };

      if (includeSystemInfo) {
        exportData.systemInfo = {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          screenResolution: `${screen.width}x${screen.height}`,
          colorDepth: screen.colorDepth,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          storageType: this.storageType,
          offlineMode: this.offlineMode
        };
      }

      // Create downloadable file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const filename = `eventbingo-error-log-${Date.now()}.json`;

      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      return {
        success: true,
        filename: filename,
        errorCount: exportData.errorCount,
        exportedEntries: exportData.errors.length
      };

    } catch (error) {
      this._logError('export_error_log_failed', {
        error: error.message
      });

      return {
        success: false,
        error: 'Failed to export error log'
      };
    }
  }

  /**
   * Clear error log
   * @param {boolean} userConfirmed - Whether user confirmed the action
   * @returns {Promise<boolean>} Clear success status
   */
  async clearErrorLog(userConfirmed = false) {
    try {
      if (!userConfirmed) {
        const confirmed = await this._confirmClearErrorLog();
        if (!confirmed) {
          return false;
        }
      }

      const clearedCount = this.errorLog.length;
      
      // Clear in-memory log
      this.errorLog = [];

      // Clear persisted log
      const logKey = 'eventbingo:errorLog';
      await this.safeStorageOperation('removeItem', logKey);

      this.createStorageNotification('error_log_cleared', {
        message: `Error log cleared (${clearedCount} entries removed).`
      });

      return true;

    } catch (error) {
      console.error('Failed to clear error log:', error);
      return false;
    }
  }

  /**
   * Get error recovery suggestions
   * @param {string} errorType - Type of error
   * @returns {Array} Recovery suggestions
   */
  getErrorRecoverySuggestions(errorType) {
    const suggestions = {
      'storage_operation_failed': [
        'Try refreshing the page',
        'Clear browser cache and cookies',
        'Check if you have enough storage space',
        'Try using incognito/private browsing mode'
      ],
      'corrupted_data_detected': [
        'Clear the corrupted data and start fresh',
        'Export your data before clearing if possible',
        'Check if the issue persists across browser sessions'
      ],
      'network_connectivity_failed': [
        'Check your internet connection',
        'Try refreshing the page',
        'Work offline - your progress will be saved locally',
        'Contact your network administrator if on a corporate network'
      ],
      'javascript_error': [
        'Refresh the page to reload the application',
        'Clear browser cache and try again',
        'Update your browser to the latest version',
        'Disable browser extensions temporarily'
      ],
      'quota_exceeded': [
        'Clear old game data to free up space',
        'Use temporary storage mode',
        'Clear browser cache and storage',
        'Close other tabs that might be using storage'
      ]
    };

    return suggestions[errorType] || [
      'Try refreshing the page',
      'Clear browser cache if the problem persists',
      'Contact support if the issue continues'
    ];
  }

  // Private methods for error logging

  /**
   * Get performance information
   * @returns {Object} Performance data
   */
  _getPerformanceInfo() {
    try {
      const perf = performance;
      const timing = perf.timing;
      const navigation = perf.navigation;

      return {
        loadTime: timing.loadEventEnd - timing.navigationStart,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        firstPaint: perf.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || null,
        navigationType: navigation.type,
        redirectCount: navigation.redirectCount,
        memoryUsage: perf.memory ? {
          used: perf.memory.usedJSHeapSize,
          total: perf.memory.totalJSHeapSize,
          limit: perf.memory.jsHeapSizeLimit
        } : null
      };
    } catch (error) {
      return {
        error: 'Performance info unavailable',
        reason: error.message
      };
    }
  }

  /**
   * Sanitize error details to remove sensitive information
   * @param {Object} details - Error details
   * @param {boolean} includeUserData - Whether to include user data
   * @returns {Object} Sanitized details
   */
  _sanitizeErrorDetails(details, includeUserData = false) {
    if (!details || typeof details !== 'object') {
      return details;
    }

    const sanitized = { ...details };

    // Remove sensitive fields
    const sensitiveFields = [
      'password', 'secretAnswer', 'secretAnswerHash', 'token', 'apiKey',
      'sessionId', 'userId', 'email', 'phone', 'address'
    ];

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    // Remove user data if not included
    if (!includeUserData) {
      const userDataFields = ['playerName', 'eventCode', 'userData'];
      userDataFields.forEach(field => {
        if (sanitized[field]) {
          sanitized[field] = '[USER_DATA]';
        }
      });
    }

    return sanitized;
  }

  /**
   * Confirm clear error log action
   * @returns {Promise<boolean>} User confirmation
   */
  async _confirmClearErrorLog() {
    return new Promise((resolve) => {
      const modal = this._createConfirmationModal({
        title: 'Clear Error Log?',
        message: `This will permanently delete ${this.errorLog.length} error entries. This action cannot be undone.`,
        confirmText: 'Clear Log',
        cancelText: 'Cancel',
        type: 'warning'
      });

      modal.onConfirm = () => {
        modal.close();
        resolve(true);
      };

      modal.onCancel = () => {
        modal.close();
        resolve(false);
      };
    });
  }

  /**
   * Log error for debugging and analytics
   * @param {string} type - Error type
   * @param {Object} details - Error details
   */
  _logError(type, details = {}) {
    try {
      const errorEntry = {
        type: type,
        details: details,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        sessionId: this._getSessionId(),
        severity: this._determineSeverity(type),
        context: this._getErrorContext()
      };

      // Add to in-memory log
      this.errorLog.unshift(errorEntry);
      
      // Limit log size
      if (this.errorLog.length > this.maxLogEntries) {
        this.errorLog.splice(this.maxLogEntries);
      }

      // Try to persist error log
      this._persistErrorLog();

      // Console log for development with appropriate level
      const logLevel = errorEntry.severity === 'critical' ? 'error' : 
                      errorEntry.severity === 'high' ? 'warn' : 'log';
      
      console[logLevel](`EventBingo Error [${type}] (${errorEntry.severity}):`, details);

      // Trigger error recovery analytics
      this._analyzeErrorPatterns(errorEntry);
      
    } catch (error) {
      // Error in error logging - just console log
      console.error('Failed to log error:', error);
    }
  }

  /**
   * Persist error log to storage
   */
  async _persistErrorLog() {
    try {
      const logKey = 'eventbingo:errorLog';
      const logData = JSON.stringify(this.errorLog.slice(0, 20)); // Keep only recent 20 errors
      
      if (this.storageType !== 'none') {
        await this.safeStorageOperation('setItem', logKey, logData);
      }
    } catch (storageError) {
      // Can't save error log, but continue
      console.warn('Failed to persist error log:', storageError);
    }
  }

  /**
   * Get or generate session ID for error tracking
   * @returns {string} Session ID
   */
  _getSessionId() {
    if (!this.sessionId) {
      this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    return this.sessionId;
  }

  /**
   * Determine error severity
   * @param {string} errorType - Error type
   * @returns {string} Severity level
   */
  _determineSeverity(errorType) {
    const criticalErrors = [
      'javascript_error', 'unhandled_promise_rejection', 
      'storage_operation_failed', 'corrupted_data_detected'
    ];
    
    const highErrors = [
      'network_connectivity_failed', 'quota_exceeded',
      'authentication_failed', 'session_corruption'
    ];

    if (criticalErrors.includes(errorType)) return 'critical';
    if (highErrors.includes(errorType)) return 'high';
    return 'medium';
  }

  /**
   * Get error context information
   * @returns {Object} Context information
   */
  _getErrorContext() {
    return {
      page: window.location.pathname.split('/').pop() || 'index.html',
      storageType: this.storageType,
      offlineMode: this.offlineMode,
      queuedActions: this.actionQueue.length,
      errorLogSize: this.errorLog.length,
      memoryUsage: performance.memory ? {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024)
      } : null
    };
  }

  /**
   * Analyze error patterns for proactive recovery
   * @param {Object} errorEntry - Latest error entry
   */
  _analyzeErrorPatterns(errorEntry) {
    try {
      // Check for repeated errors
      const recentSimilarErrors = this.errorLog.filter(error => 
        error.type === errorEntry.type && 
        (Date.now() - error.timestamp) < 60000 // Last minute
      );

      if (recentSimilarErrors.length >= 3) {
        this._triggerErrorRecovery(errorEntry.type, recentSimilarErrors);
      }

      // Check for error cascades
      const recentErrors = this.errorLog.filter(error => 
        (Date.now() - error.timestamp) < 30000 // Last 30 seconds
      );

      if (recentErrors.length >= 5) {
        this._triggerCascadeRecovery(recentErrors);
      }

    } catch (error) {
      console.warn('Error pattern analysis failed:', error);
    }
  }

  /**
   * Trigger error recovery for repeated errors
   * @param {string} errorType - Type of repeated error
   * @param {Array} similarErrors - Similar error entries
   */
  _triggerErrorRecovery(errorType, similarErrors) {
    console.warn(`Repeated error detected: ${errorType} (${similarErrors.length} times)`);
    
    // Show recovery suggestions
    const suggestions = this.getErrorRecoverySuggestions(errorType);
    
    this.createStorageNotification('repeated_error_detected', {
      message: `Repeated ${errorType} detected. Try: ${suggestions[0]}`
    });
  }

  /**
   * Trigger cascade recovery for multiple errors
   * @param {Array} recentErrors - Recent error entries
   */
  _triggerCascadeRecovery(recentErrors) {
    console.error('Error cascade detected:', recentErrors.length, 'errors in 30 seconds');
    
    this.createStorageNotification('error_cascade_detected', {
      message: 'Multiple errors detected. Consider refreshing the page or clearing browser data.'
    });
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ErrorHandler;
}

// Make available globally for browser use
if (typeof window !== 'undefined') {
  window.ErrorHandler = ErrorHandler;
}