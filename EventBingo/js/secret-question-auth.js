/**
 * SecretQuestionAuth - Enhanced secret question authentication for player switching
 * Integrates with existing authentication system and provides fallback to view-only mode
 */
class SecretQuestionAuth {
  constructor(sessionManager, playerAuthenticator) {
    this.sessionManager = sessionManager;
    this.playerAuthenticator = playerAuthenticator;
    this.currentEventCode = null;
    this.authenticationCache = new Map(); // Cache successful authentications
    this.authenticationAttempts = new Map(); // Track failed attempts
    
    this.initializeAuth();
  }

  /**
   * Initialize the authentication system
   */
  initializeAuth() {
    this.setupEventListeners();
    this.addAuthStyles();
  }

  /**
   * Set the current event context
   * @param {string} eventCode - Current event code
   */
  setEventContext(eventCode) {
    this.currentEventCode = eventCode;
  }

  /**
   * Authenticate a player for switching with comprehensive flow
   * @param {string} targetPlayerName - Player to authenticate as
   * @param {Object} options - Authentication options
   * @returns {Promise<Object>} Authentication result
   */
  async authenticateForSwitching(targetPlayerName, options = {}) {
    try {
      const { 
        allowViewOnly = true, 
        showPlayerInfo = true,
        title = 'Player Authentication'
      } = options;

      // Check if player has a session for this event
      const session = this.sessionManager.getPlayerSession(this.currentEventCode);
      
      if (!session || session.playerName !== targetPlayerName) {
        return await this.handlePlayerNotFound(targetPlayerName, { allowViewOnly });
      }

      // Check if already authenticated in cache
      const cacheKey = `${this.currentEventCode}:${targetPlayerName}`;
      if (this.authenticationCache.has(cacheKey)) {
        const cachedAuth = this.authenticationCache.get(cacheKey);
        if (this.isAuthenticationValid(cachedAuth)) {
          return {
            success: true,
            authenticationLevel: 'full',
            playerName: targetPlayerName,
            playerData: session,
            fromCache: true
          };
        } else {
          this.authenticationCache.delete(cacheKey);
        }
      }

      // Show authentication prompt
      return await this.showAuthenticationPrompt(targetPlayerName, session, {
        allowViewOnly,
        showPlayerInfo,
        title
      });
    } catch (error) {
      console.error('Authentication error:', error);
      return {
        success: false,
        error: 'Authentication failed due to system error',
        canRetry: true
      };
    }
  }

  /**
   * Show authentication prompt with secret question
   * @param {string} playerName - Player name
   * @param {Object} session - Player session data
   * @param {Object} options - Prompt options
   * @returns {Promise<Object>} Authentication result
   */
  async showAuthenticationPrompt(playerName, session, options = {}) {
    return new Promise((resolve) => {
      const modal = this.createAuthenticationModal(playerName, session, options);
      
      modal.onAuthenticate = async (answer) => {
        const result = await this.processAuthentication(playerName, answer);
        
        if (result.success) {
          // Cache successful authentication
          this.cacheAuthentication(playerName, result);
          modal.close();
          resolve({
            ...result,
            authenticationLevel: 'full',
            playerData: session
          });
        } else {
          modal.showError(result.error);
          modal.updateAttemptsDisplay(result.attemptsLeft || 0);
          
          if (!result.canRetry) {
            modal.disableAuthentication();
            // Auto-fallback to view-only after lockout
            if (options.allowViewOnly) {
              setTimeout(() => {
                modal.triggerViewOnly();
              }, 2000);
            }
          }
        }
      };

      modal.onViewOnly = () => {
        modal.close();
        resolve({
          success: true,
          authenticationLevel: 'viewOnly',
          playerName,
          playerData: session
        });
      };

      modal.onCancel = () => {
        modal.close();
        resolve({
          success: false,
          cancelled: true
        });
      };
    });
  }

  /**
   * Process authentication attempt
   * @param {string} playerName - Player name
   * @param {string} answer - Provided answer
   * @returns {Promise<Object>} Authentication result
   */
  async processAuthentication(playerName, answer) {
    try {
      const result = await this.playerAuthenticator.authenticatePlayer(
        this.currentEventCode,
        playerName,
        answer
      );

      if (result.success) {
        // Clear failed attempts on success
        this.clearFailedAttempts(playerName);
        
        return {
          success: true,
          playerName,
          timestamp: Date.now()
        };
      } else {
        // Track failed attempt
        this.recordFailedAttempt(playerName);
        
        return {
          success: false,
          error: result.error,
          canRetry: result.canRetry,
          attemptsLeft: result.attemptsLeft,
          lockedOut: result.lockedOut
        };
      }
    } catch (error) {
      console.error('Authentication processing error:', error);
      return {
        success: false,
        error: 'Network error - please try again',
        canRetry: true
      };
    }
  }

  /**
   * Handle case when player is not found
   * @param {string} playerName - Player name
   * @param {Object} options - Options
   * @returns {Promise<Object>} Result
   */
  async handlePlayerNotFound(playerName, options = {}) {
    const { allowViewOnly = true } = options;
    
    if (!allowViewOnly) {
      return {
        success: false,
        error: 'Player not found and view-only mode not allowed',
        canRetry: false
      };
    }

    return new Promise((resolve) => {
      const modal = this.createPlayerNotFoundModal(playerName);
      
      modal.onViewOnly = () => {
        modal.close();
        resolve({
          success: true,
          authenticationLevel: 'viewOnly',
          playerName,
          playerData: null
        });
      };

      modal.onCancel = () => {
        modal.close();
        resolve({
          success: false,
          cancelled: true
        });
      };
    });
  }

  /**
   * Create authentication modal
   * @param {string} playerName - Player name
   * @param {Object} session - Session data
   * @param {Object} options - Modal options
   * @returns {Object} Modal object
   */
  createAuthenticationModal(playerName, session, options = {}) {
    const { allowViewOnly = true, showPlayerInfo = true, title = 'Player Authentication' } = options;
    
    const modal = document.createElement('div');
    modal.className = 'secret-auth-modal-overlay';
    
    const authStatus = this.playerAuthenticator.getAuthenticationStatus(playerName);
    const attemptsLeft = authStatus.attemptsLeft;
    const isLockedOut = authStatus.isLockedOut;
    
    modal.innerHTML = `
      <div class="secret-auth-modal">
        <div class="secret-auth-header">
          <h3>${title}</h3>
          <button class="secret-auth-close">&times;</button>
        </div>
        
        <div class="secret-auth-body">
          ${showPlayerInfo ? `
            <div class="secret-auth-player-info">
              <div class="secret-auth-avatar">
                ${this.getPlayerIcon(playerName)}
              </div>
              <h4>${playerName}</h4>
              <p class="secret-auth-subtitle">Enter your secret answer to access this profile</p>
            </div>
          ` : ''}
          
          <div class="secret-auth-question-section">
            <div class="secret-auth-question">
              <label>Your Secret Question:</label>
              <div class="secret-auth-question-text">${session.secretQuestion}</div>
            </div>
            
            <div class="secret-auth-answer-section">
              <input type="text" 
                     class="secret-auth-answer-input" 
                     placeholder="Enter your answer..." 
                     ${isLockedOut ? 'disabled' : ''} />
              
              <div class="secret-auth-attempts" ${attemptsLeft === 3 ? 'style="display: none;"' : ''}>
                <span class="attempts-text">Attempts remaining: </span>
                <span class="attempts-count">${attemptsLeft}</span>
              </div>
              
              ${isLockedOut ? `
                <div class="secret-auth-lockout">
                  <span class="lockout-icon">🔒</span>
                  <span class="lockout-text">Account temporarily locked due to too many failed attempts</span>
                </div>
              ` : ''}
            </div>
          </div>
          
          <div class="secret-auth-error" style="display: none;"></div>
        </div>
        
        <div class="secret-auth-footer">
          ${allowViewOnly ? `
            <button class="secret-auth-btn secret-auth-btn-secondary view-only-btn">
              👁️ View Only
            </button>
          ` : ''}
          <button class="secret-auth-btn secret-auth-btn-primary auth-btn" ${isLockedOut ? 'disabled' : ''}>
            ${isLockedOut ? '🔒 Locked' : '🔓 Authenticate'}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const input = modal.querySelector('.secret-auth-answer-input');
    const authBtn = modal.querySelector('.auth-btn');
    const viewOnlyBtn = modal.querySelector('.view-only-btn');
    const errorDiv = modal.querySelector('.secret-auth-error');
    const attemptsDiv = modal.querySelector('.secret-auth-attempts');
    const attemptsCount = modal.querySelector('.attempts-count');

    // Focus on input if not locked out
    if (!isLockedOut) {
      setTimeout(() => input.focus(), 100);
    }

    // Event listeners
    modal.querySelector('.secret-auth-close').onclick = () => modal.onCancel();
    
    if (viewOnlyBtn) {
      viewOnlyBtn.onclick = () => modal.onViewOnly();
    }
    
    authBtn.onclick = () => {
      const answer = input.value.trim();
      if (answer && modal.onAuthenticate && !authBtn.disabled) {
        // Show loading state
        const originalText = authBtn.innerHTML;
        authBtn.innerHTML = '<div class="auth-spinner"></div> Verifying...';
        authBtn.disabled = true;
        
        // Process authentication
        modal.onAuthenticate(answer).finally(() => {
          authBtn.innerHTML = originalText;
          authBtn.disabled = false;
        });
      }
    };

    // Handle Enter key
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !authBtn.disabled) {
        authBtn.click();
      }
    });

    // Modal methods
    modal.showError = (message) => {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
      
      // Clear input and refocus
      input.value = '';
      if (!input.disabled) {
        input.focus();
      }
      
      // Shake animation
      modal.querySelector('.secret-auth-modal').style.animation = 'shake 0.5s ease-in-out';
      setTimeout(() => {
        modal.querySelector('.secret-auth-modal').style.animation = '';
      }, 500);
    };

    modal.updateAttemptsDisplay = (attemptsRemaining) => {
      if (attemptsCount) {
        attemptsCount.textContent = attemptsRemaining;
        attemptsDiv.style.display = attemptsRemaining < 3 ? 'block' : 'none';
        
        // Change color based on attempts left
        if (attemptsRemaining <= 1) {
          attemptsDiv.style.color = '#ef4444';
        } else if (attemptsRemaining <= 2) {
          attemptsDiv.style.color = '#f59e0b';
        }
      }
    };

    modal.disableAuthentication = () => {
      input.disabled = true;
      authBtn.disabled = true;
      authBtn.innerHTML = '🔒 Locked';
      
      // Show lockout message
      const lockoutDiv = document.createElement('div');
      lockoutDiv.className = 'secret-auth-lockout';
      lockoutDiv.innerHTML = `
        <span class="lockout-icon">🔒</span>
        <span class="lockout-text">Too many failed attempts. Account temporarily locked.</span>
      `;
      
      const answerSection = modal.querySelector('.secret-auth-answer-section');
      answerSection.appendChild(lockoutDiv);
    };

    modal.triggerViewOnly = () => {
      if (viewOnlyBtn && modal.onViewOnly) {
        modal.onViewOnly();
      }
    };

    modal.close = () => {
      if (modal.parentNode) {
        document.body.removeChild(modal);
      }
    };

    return modal;
  }

  /**
   * Create player not found modal
   * @param {string} playerName - Player name
   * @returns {Object} Modal object
   */
  createPlayerNotFoundModal(playerName) {
    const modal = document.createElement('div');
    modal.className = 'secret-auth-modal-overlay';
    
    modal.innerHTML = `
      <div class="secret-auth-modal">
        <div class="secret-auth-header">
          <h3>Player Not Found</h3>
          <button class="secret-auth-close">&times;</button>
        </div>
        
        <div class="secret-auth-body">
          <div class="secret-auth-not-found">
            <div class="not-found-icon">❓</div>
            <h4>${playerName}</h4>
            <p>This player hasn't registered for this event yet.</p>
            <p>You can still view any photos they may have uploaded.</p>
          </div>
        </div>
        
        <div class="secret-auth-footer">
          <button class="secret-auth-btn secret-auth-btn-secondary">Cancel</button>
          <button class="secret-auth-btn secret-auth-btn-primary view-only-btn">
            👁️ View Photos Only
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    modal.querySelector('.secret-auth-close').onclick = () => modal.onCancel();
    modal.querySelector('.secret-auth-btn-secondary').onclick = () => modal.onCancel();
    modal.querySelector('.view-only-btn').onclick = () => modal.onViewOnly();

    modal.close = () => {
      if (modal.parentNode) {
        document.body.removeChild(modal);
      }
    };

    return modal;
  }

  /**
   * Cache successful authentication
   * @param {string} playerName - Player name
   * @param {Object} authResult - Authentication result
   */
  cacheAuthentication(playerName, authResult) {
    const cacheKey = `${this.currentEventCode}:${playerName}`;
    this.authenticationCache.set(cacheKey, {
      ...authResult,
      timestamp: Date.now(),
      expiresAt: Date.now() + (30 * 60 * 1000) // 30 minutes
    });
  }

  /**
   * Check if cached authentication is still valid
   * @param {Object} cachedAuth - Cached authentication
   * @returns {boolean} Validity status
   */
  isAuthenticationValid(cachedAuth) {
    return cachedAuth && cachedAuth.expiresAt > Date.now();
  }

  /**
   * Record failed authentication attempt
   * @param {string} playerName - Player name
   */
  recordFailedAttempt(playerName) {
    const key = `${this.currentEventCode}:${playerName}`;
    const attempts = this.authenticationAttempts.get(key) || [];
    attempts.push(Date.now());
    this.authenticationAttempts.set(key, attempts);
  }

  /**
   * Clear failed attempts for a player
   * @param {string} playerName - Player name
   */
  clearFailedAttempts(playerName) {
    const key = `${this.currentEventCode}:${playerName}`;
    this.authenticationAttempts.delete(key);
  }

  /**
   * Clear all authentication cache and attempts
   */
  clearAllAuthentication() {
    this.authenticationCache.clear();
    this.authenticationAttempts.clear();
  }

  /**
   * Get player icon
   * @param {string} playerName - Player name
   * @returns {string} Player icon
   */
  getPlayerIcon(playerName) {
    return playerName ? playerName.charAt(0).toUpperCase() : '?';
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for authentication requests
    document.addEventListener('requestPlayerAuthentication', async (event) => {
      const { playerName, options = {} } = event.detail;
      const result = await this.authenticateForSwitching(playerName, options);
      
      // Dispatch result
      const resultEvent = new CustomEvent('playerAuthenticationResult', {
        detail: result
      });
      document.dispatchEvent(resultEvent);
    });

    // Clear cache on event change
    document.addEventListener('eventCodeChanged', () => {
      this.clearAllAuthentication();
    });
  }

  /**
   * Add authentication styles
   */
  addAuthStyles() {
    if (document.getElementById('secret-question-auth-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'secret-question-auth-styles';
    styles.textContent = `
      .secret-auth-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.75);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
      }

      .secret-auth-modal {
        background: white;
        border-radius: 16px;
        max-width: 450px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        animation: slideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        position: relative;
      }

      .secret-auth-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 24px 24px 0 24px;
        border-bottom: 1px solid #f0f0f0;
        margin-bottom: 24px;
      }

      .secret-auth-header h3 {
        margin: 0;
        color: #1f2937;
        font-size: 1.4rem;
        font-weight: 600;
      }

      .secret-auth-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: #9ca3af;
        padding: 4px;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.2s ease;
      }

      .secret-auth-close:hover {
        background: #f3f4f6;
        color: #374151;
      }

      .secret-auth-body {
        padding: 0 24px 24px 24px;
      }

      .secret-auth-player-info {
        text-align: center;
        margin-bottom: 32px;
      }

      .secret-auth-avatar {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: white;
        border: 4px solid transparent;
        background-image: linear-gradient(white, white), linear-gradient(45deg, #E4405F, #833AB4, #F77737, #FCAF45);
        background-origin: border-box;
        background-clip: content-box, border-box;
        color: #333;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 2rem;
        margin: 0 auto 16px auto;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
      }

      .secret-auth-player-info h4 {
        margin: 0 0 8px 0;
        color: #1f2937;
        font-size: 1.5rem;
        font-weight: 600;
      }

      .secret-auth-subtitle {
        margin: 0;
        color: #6b7280;
        font-size: 0.95rem;
      }

      .secret-auth-question-section {
        margin-bottom: 24px;
      }

      .secret-auth-question {
        margin-bottom: 20px;
      }

      .secret-auth-question label {
        display: block;
        font-weight: 600;
        margin-bottom: 8px;
        color: #374151;
        font-size: 0.95rem;
      }

      .secret-auth-question-text {
        background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
        padding: 16px;
        border-radius: 12px;
        border-left: 4px solid #4f46e5;
        font-style: italic;
        color: #1f2937;
        font-size: 1rem;
        line-height: 1.5;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      }

      .secret-auth-answer-section {
        position: relative;
      }

      .secret-auth-answer-input {
        width: 100%;
        padding: 16px;
        border: 2px solid #e5e7eb;
        border-radius: 12px;
        font-size: 1rem;
        outline: none;
        transition: all 0.2s ease;
        background: #fafafa;
      }

      .secret-auth-answer-input:focus {
        border-color: #4f46e5;
        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        background: white;
      }

      .secret-auth-answer-input:disabled {
        background: #f3f4f6;
        color: #9ca3af;
        cursor: not-allowed;
      }

      .secret-auth-attempts {
        margin-top: 12px;
        padding: 8px 12px;
        background: #fef3c7;
        border: 1px solid #f59e0b;
        border-radius: 8px;
        font-size: 0.9rem;
        color: #92400e;
      }

      .attempts-count {
        font-weight: 600;
      }

      .secret-auth-lockout {
        margin-top: 12px;
        padding: 12px;
        background: #fee2e2;
        border: 1px solid #ef4444;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 8px;
        color: #dc2626;
        font-size: 0.9rem;
      }

      .lockout-icon {
        font-size: 1.2rem;
      }

      .secret-auth-not-found {
        text-align: center;
        padding: 32px 16px;
      }

      .not-found-icon {
        font-size: 4rem;
        margin-bottom: 16px;
        opacity: 0.7;
      }

      .secret-auth-not-found h4 {
        margin: 0 0 16px 0;
        color: #1f2937;
        font-size: 1.4rem;
        font-weight: 600;
      }

      .secret-auth-not-found p {
        margin: 0 0 12px 0;
        color: #6b7280;
        line-height: 1.6;
      }

      .secret-auth-error {
        background: #fee2e2;
        color: #dc2626;
        padding: 12px 16px;
        border-radius: 8px;
        margin: 16px 0;
        font-size: 0.9rem;
        border: 1px solid #fecaca;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .secret-auth-error::before {
        content: '⚠️';
        font-size: 1.1rem;
      }

      .secret-auth-footer {
        display: flex;
        gap: 12px;
        padding: 24px;
        border-top: 1px solid #f0f0f0;
        background: #fafafa;
        border-radius: 0 0 16px 16px;
      }

      .secret-auth-btn {
        flex: 1;
        padding: 14px 20px;
        border: none;
        border-radius: 10px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        position: relative;
        overflow: hidden;
      }

      .secret-auth-btn-primary {
        background: linear-gradient(135deg, #4f46e5, #7c3aed);
        color: white;
        box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
      }

      .secret-auth-btn-primary:hover:not(:disabled) {
        background: linear-gradient(135deg, #4338ca, #6d28d9);
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(79, 70, 229, 0.4);
      }

      .secret-auth-btn-primary:disabled {
        background: #d1d5db;
        color: #9ca3af;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }

      .secret-auth-btn-secondary {
        background: white;
        color: #374151;
        border: 2px solid #e5e7eb;
      }

      .secret-auth-btn-secondary:hover {
        background: #f9fafb;
        border-color: #d1d5db;
        transform: translateY(-1px);
      }

      .auth-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top: 2px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        display: inline-block;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes slideIn {
        from { 
          opacity: 0;
          transform: translateY(-30px) scale(0.9);
        }
        to { 
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      /* Dark mode support */
      body.dark-mode .secret-auth-modal {
        background: #1f2937;
        color: #f9fafb;
      }

      body.dark-mode .secret-auth-header {
        border-bottom-color: #374151;
      }

      body.dark-mode .secret-auth-header h3 {
        color: #f9fafb;
      }

      body.dark-mode .secret-auth-question-text {
        background: linear-gradient(135deg, #374151, #4b5563);
        color: #f9fafb;
        border-left-color: #6366f1;
      }

      body.dark-mode .secret-auth-answer-input {
        background: #374151;
        border-color: #4b5563;
        color: #f9fafb;
      }

      body.dark-mode .secret-auth-answer-input:focus {
        border-color: #6366f1;
        background: #4b5563;
      }

      body.dark-mode .secret-auth-footer {
        background: #111827;
        border-top-color: #374151;
      }

      body.dark-mode .secret-auth-btn-secondary {
        background: #374151;
        color: #f9fafb;
        border-color: #4b5563;
      }

      body.dark-mode .secret-auth-btn-secondary:hover {
        background: #4b5563;
        border-color: #6b7280;
      }

      /* Mobile responsiveness */
      @media (max-width: 768px) {
        .secret-auth-modal {
          margin: 20px;
          max-width: none;
          width: calc(100% - 40px);
        }

        .secret-auth-header,
        .secret-auth-body,
        .secret-auth-footer {
          padding-left: 20px;
          padding-right: 20px;
        }

        .secret-auth-avatar {
          width: 60px;
          height: 60px;
          font-size: 1.5rem;
        }

        .secret-auth-player-info h4 {
          font-size: 1.3rem;
        }

        .secret-auth-btn {
          padding: 12px 16px;
          font-size: 0.95rem;
        }
      }
    `;

    document.head.appendChild(styles);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SecretQuestionAuth;
}

// Make available globally for browser use
if (typeof window !== 'undefined') {
  window.SecretQuestionAuth = SecretQuestionAuth;
}