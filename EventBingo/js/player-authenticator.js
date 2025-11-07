/**
 * PlayerAuthenticator - Handle player authentication with proper secret question management
 * Manages player profiles, authentication, and secure player switching
 */
class PlayerAuthenticator {
  constructor(sessionManager, errorHandler) {
    this.sessionManager = sessionManager || new SessionManager();
    this.errorHandler = errorHandler || (typeof ErrorHandler !== 'undefined' ? new ErrorHandler() : null);
    this.maxAuthAttempts = 3;
    this.authAttempts = new Map(); // Track attempts per player
    this.lockoutDuration = 5 * 60 * 1000; // 5 minutes in milliseconds
  }

  /**
   * Authenticate a player using their secret question and answer
   * @param {string} eventCode - Event identifier
   * @param {string} playerName - Player's name
   * @param {string} providedAnswer - Answer provided by user
   * @returns {Promise<Object>} Authentication result
   */
  async authenticatePlayer(eventCode, playerName, providedAnswer) {
    try {
      if (!eventCode || !playerName || !providedAnswer) {
        return {
          success: false,
          error: 'Missing required authentication data',
          canRetry: true
        };
      }

      // Check if player is locked out
      if (this._isPlayerLockedOut(playerName)) {
        const lockoutEnd = this._getLockoutEndTime(playerName);
        const remainingTime = Math.ceil((lockoutEnd - Date.now()) / 1000 / 60);
        return {
          success: false,
          error: `Too many failed attempts. Try again in ${remainingTime} minutes.`,
          canRetry: false,
          lockedOut: true
        };
      }

      // Authenticate against backend worker
      let isValid = false;
      try {
        const workerURL = window.workerURL 
          || (window.boardController && window.boardController.workerURL)
          || 'https://shy-recipe-5fb1.reinier-olivier.workers.dev/';
        
        const response = await fetch(`${workerURL}auth/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventCode,
            playerName,
            answer: providedAnswer
          })
        });

        if (!response.ok) {
          return {
            success: false,
            error: 'Authentication service unavailable',
            canRetry: true
          };
        }

        const result = await response.json();
        isValid = result.authenticated;
      } catch (error) {
        console.error('Backend authentication error:', error);
        // Fallback to local session validation
        const session = await this.sessionManager.getPlayerSession(eventCode);
        if (!session || session.playerName !== playerName) {
          return {
            success: false,
            error: 'Player session not found',
            canRetry: false
          };
        }
        
        isValid = await this.sessionManager.validateSecretAnswer(
          providedAnswer,
          session.secretAnswerHash
        );
      }

      if (isValid) {
        // Clear any failed attempts
        this.authAttempts.delete(playerName);
        
        // Create minimal player data object
        const playerData = {
          playerName: playerName,
          eventCode: eventCode,
          authenticated: true
        };
        
        return {
          success: true,
          playerData: playerData,
          authenticationLevel: 'full'
        };
      } else {
        // Track failed attempt
        this._recordFailedAttempt(playerName);
        const attemptsLeft = this.maxAuthAttempts - this._getAttemptCount(playerName);
        
        if (attemptsLeft <= 0) {
          this._lockoutPlayer(playerName);
          return {
            success: false,
            error: 'Too many failed attempts. Player locked out for 5 minutes.',
            canRetry: false,
            lockedOut: true
          };
        }

        return {
          success: false,
          error: `Incorrect answer. ${attemptsLeft} attempts remaining.`,
          canRetry: true,
          attemptsLeft
        };
      }
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
   * Create a new player profile
   * @param {string} eventCode - Event identifier
   * @param {string} playerName - Player's name
   * @param {string} secretQuestion - Player's secret question
   * @param {string} secretAnswer - Player's secret answer
   * @returns {Promise<Object>} Creation result
   */
  async createPlayerProfile(eventCode, playerName, secretQuestion, secretAnswer) {
    try {
      if (!eventCode || !playerName || !secretQuestion || !secretAnswer) {
        return {
          success: false,
          error: 'All fields are required'
        };
      }

      // Validate input lengths
      if (playerName.trim().length < 2) {
        return {
          success: false,
          error: 'Player name must be at least 2 characters'
        };
      }

      if (secretQuestion.trim().length < 5) {
        return {
          success: false,
          error: 'Secret question must be at least 5 characters'
        };
      }

      if (secretAnswer.trim().length < 2) {
        return {
          success: false,
          error: 'Secret answer must be at least 2 characters'
        };
      }

      // Check if player already exists for this event
      const existingSession = await this.sessionManager.getPlayerSession(eventCode);
      if (existingSession && existingSession.playerName === playerName.trim()) {
        return {
          success: false,
          error: 'Player already exists for this event',
          existingPlayer: true
        };
      }

      // Register with backend worker first
      try {
        // Get worker URL from window or BoardController or use default
        let workerURL = window.workerURL 
          || (window.boardController && window.boardController.workerURL)
          || 'https://shy-recipe-5fb1.reinier-olivier.workers.dev/';
        // Ensure workerURL ends with a slash
        if (!workerURL.endsWith('/')) {
          workerURL += '/';
        }
        const response = await fetch(`${workerURL}auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventCode,
            playerName: playerName.trim(),
            question: secretQuestion.trim(),
            answer: secretAnswer.trim()
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Backend registration failed:', errorText);
          return {
            success: false,
            error: 'Failed to register with server'
          };
        }
      } catch (error) {
        console.error('Backend registration error:', error);
        return {
          success: false,
          error: 'Network error during registration'
        };
      }

      // Save the player session locally
      const success = await this.sessionManager.savePlayerSession(
        eventCode,
        playerName,
        secretQuestion,
        secretAnswer
      );

      if (success) {
        return {
          success: true,
          playerName: playerName.trim(),
          eventCode
        };
      } else {
        return {
          success: false,
          error: 'Failed to save player profile locally'
        };
      }
    } catch (error) {
      console.error('Profile creation error:', error);
      return {
        success: false,
        error: 'Failed to create player profile due to system error'
      };
    }
  }

  /**
   * Prompt for authentication with options
   * @param {string} eventCode - Event identifier
   * @param {string} targetPlayerName - Player to authenticate as
   * @param {Object} options - Authentication options
   * @returns {Promise<Object>} Authentication prompt result
   */
  async promptForAuthentication(targetPlayerName, options = {}) {
    const { viewOnly = true, title = 'Player Authentication' } = options;

    try {
      // Fetch the player's question from backend
      let secretQuestion = null;
      try {
        const workerURL = window.workerURL 
          || (window.boardController && window.boardController.workerURL)
          || 'https://shy-recipe-5fb1.reinier-olivier.workers.dev/';
        
        const response = await fetch(
          `${workerURL}auth/question/${encodeURIComponent(options.eventCode)}/${encodeURIComponent(targetPlayerName)}`
        );
        
        if (response.ok) {
          const data = await response.json();
          secretQuestion = data.question;
        }
      } catch (error) {
        console.error('Failed to fetch question from backend:', error);
      }
      
      // Fallback to local session if backend fails
      if (!secretQuestion) {
        const session = await this.sessionManager.getPlayerSession(options.eventCode);
        if (!session) {
          return {
            success: false,
            error: 'Player session not found'
          };
        }
        secretQuestion = session.secretQuestion;
      }

      // Create authentication modal
      const modal = this._createAuthModal(targetPlayerName, secretQuestion, {
        viewOnly,
        title,
        attemptsLeft: this.maxAuthAttempts - this._getAttemptCount(targetPlayerName)
      });

      return new Promise((resolve) => {
        modal.onAuthenticate = async (answer) => {
          const result = await this.authenticatePlayer(
            options.eventCode,
            targetPlayerName,
            answer
          );
          
          if (result.success) {
            modal.close();
            resolve(result);
          } else {
            modal.showError(result.error);
            if (!result.canRetry) {
              modal.disableInput();
            }
          }
        };

        modal.onViewOnly = () => {
          modal.close();
          resolve({
            success: true,
            authenticationLevel: 'viewOnly',
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
    } catch (error) {
      console.error('Authentication prompt error:', error);
      return {
        success: false,
        error: 'Failed to show authentication prompt'
      };
    }
  }

  /**
   * Get authentication status for a player
   * @param {string} playerName - Player name to check
   * @returns {Object} Authentication status
   */
  getAuthenticationStatus(playerName) {
    const isLockedOut = this._isPlayerLockedOut(playerName);
    const attemptCount = this._getAttemptCount(playerName);
    const attemptsLeft = this.maxAuthAttempts - attemptCount;

    return {
      isLockedOut,
      attemptCount,
      attemptsLeft: Math.max(0, attemptsLeft),
      lockoutEndTime: isLockedOut ? this._getLockoutEndTime(playerName) : null
    };
  }

  /**
   * Clear authentication attempts for a player
   * @param {string} playerName - Player name
   */
  clearAuthenticationAttempts(playerName) {
    this.authAttempts.delete(playerName);
  }

  /**
   * Clear all authentication attempts
   */
  clearAllAuthenticationAttempts() {
    this.authAttempts.clear();
  }

  // Private methods

  /**
   * Record a failed authentication attempt
   * @param {string} playerName - Player name
   */
  _recordFailedAttempt(playerName) {
    const now = Date.now();
    const attempts = this.authAttempts.get(playerName) || [];
    
    // Remove attempts older than lockout duration
    const recentAttempts = attempts.filter(
      timestamp => now - timestamp < this.lockoutDuration
    );
    
    recentAttempts.push(now);
    this.authAttempts.set(playerName, recentAttempts);
  }

  /**
   * Get the number of recent failed attempts
   * @param {string} playerName - Player name
   * @returns {number} Attempt count
   */
  _getAttemptCount(playerName) {
    const attempts = this.authAttempts.get(playerName) || [];
    const now = Date.now();
    
    // Count only recent attempts
    return attempts.filter(
      timestamp => now - timestamp < this.lockoutDuration
    ).length;
  }

  /**
   * Check if a player is currently locked out
   * @param {string} playerName - Player name
   * @returns {boolean} Lockout status
   */
  _isPlayerLockedOut(playerName) {
    return this._getAttemptCount(playerName) >= this.maxAuthAttempts;
  }

  /**
   * Lock out a player
   * @param {string} playerName - Player name
   */
  _lockoutPlayer(playerName) {
    const now = Date.now();
    const attempts = this.authAttempts.get(playerName) || [];
    
    // Ensure we have enough attempts to trigger lockout
    while (attempts.length < this.maxAuthAttempts) {
      attempts.push(now);
    }
    
    this.authAttempts.set(playerName, attempts);
  }

  /**
   * Get the time when lockout ends
   * @param {string} playerName - Player name
   * @returns {number} Lockout end timestamp
   */
  _getLockoutEndTime(playerName) {
    const attempts = this.authAttempts.get(playerName) || [];
    if (attempts.length === 0) return 0;
    
    const lastAttempt = Math.max(...attempts);
    return lastAttempt + this.lockoutDuration;
  }

  /**
   * Create authentication modal
   * @param {string} playerName - Player name
   * @param {string} secretQuestion - Secret question
   * @param {Object} options - Modal options
   * @returns {Object} Modal object
   */
  _createAuthModal(playerName, secretQuestion, options = {}) {
    const { viewOnly = true, title = 'Player Authentication', attemptsLeft = 3 } = options;

    // Create modal HTML
    const modal = document.createElement('div');
    modal.className = 'auth-modal-overlay';
    modal.innerHTML = `
      <div class="auth-modal">
        <div class="auth-modal-header">
          <h3>${title}</h3>
          <button class="auth-modal-close" onclick="this.closest('.auth-modal-overlay').onCancel()">&times;</button>
        </div>
        <div class="auth-modal-body">
          <p>To access <strong>${playerName}</strong>'s profile:</p>
          <div class="auth-question">
            <label>${secretQuestion}</label>
            <input type="text" class="auth-answer-input" placeholder="Enter your answer" />
          </div>
          <div class="auth-error" style="display: none;"></div>
          <div class="auth-attempts">Attempts remaining: <span class="attempts-count">${attemptsLeft}</span></div>
        </div>
        <div class="auth-modal-footer">
          <button class="auth-btn auth-btn-secondary" onclick="this.closest('.auth-modal-overlay').onViewOnly()">
            👁️ View Only
          </button>
          <button class="auth-btn auth-btn-primary" onclick="this.closest('.auth-modal-overlay').authenticate()">
            🔓 Authenticate
          </button>
        </div>
      </div>
    `;

    // Add styles
    this._addAuthModalStyles();

    // Add modal to page
    document.body.appendChild(modal);

    // Focus on input
    const input = modal.querySelector('.auth-answer-input');
    setTimeout(() => input.focus(), 100);

    // Handle Enter key
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        modal.authenticate();
      }
    });

    // Modal methods
    modal.authenticate = () => {
      const answer = input.value.trim();
      if (answer && modal.onAuthenticate) {
        modal.onAuthenticate(answer);
      }
    };

    modal.showError = (message) => {
      const errorDiv = modal.querySelector('.auth-error');
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
      
      // Update attempts count
      const attemptsSpan = modal.querySelector('.attempts-count');
      const currentAttempts = parseInt(attemptsSpan.textContent) - 1;
      attemptsSpan.textContent = Math.max(0, currentAttempts);
    };

    modal.disableInput = () => {
      input.disabled = true;
      modal.querySelector('.auth-btn-primary').disabled = true;
    };

    modal.close = () => {
      document.body.removeChild(modal);
    };

    // Hide view-only option if not allowed
    if (!viewOnly) {
      modal.querySelector('.auth-btn-secondary').style.display = 'none';
    }

    return modal;
  }

  /**
   * Add authentication modal styles
   */
  _addAuthModalStyles() {
    if (document.getElementById('auth-modal-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'auth-modal-styles';
    styles.textContent = `
      .auth-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
      }

      .auth-modal {
        background: white;
        border-radius: 12px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        animation: slideIn 0.3s ease;
      }

      .auth-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 20px 0 20px;
        border-bottom: 1px solid #eee;
        margin-bottom: 20px;
      }

      .auth-modal-header h3 {
        margin: 0;
        color: #333;
        font-size: 1.2rem;
      }

      .auth-modal-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: #999;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.2s ease;
      }

      .auth-modal-close:hover {
        background: #f0f0f0;
        color: #333;
      }

      .auth-modal-body {
        padding: 0 20px 20px 20px;
      }

      .auth-question {
        margin: 15px 0;
      }

      .auth-question label {
        display: block;
        font-weight: 600;
        margin-bottom: 8px;
        color: #333;
      }

      .auth-answer-input {
        width: 100%;
        padding: 12px;
        border: 2px solid #ddd;
        border-radius: 8px;
        font-size: 1rem;
        outline: none;
        transition: border-color 0.2s ease;
      }

      .auth-answer-input:focus {
        border-color: #4a90e2;
        box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
      }

      .auth-error {
        background: #fee;
        color: #c33;
        padding: 10px;
        border-radius: 6px;
        margin: 10px 0;
        font-size: 0.9rem;
        border: 1px solid #fcc;
      }

      .auth-attempts {
        font-size: 0.9rem;
        color: #666;
        margin-top: 10px;
      }

      .attempts-count {
        font-weight: 600;
        color: #e74c3c;
      }

      .auth-modal-footer {
        display: flex;
        gap: 10px;
        padding: 20px;
        border-top: 1px solid #eee;
      }

      .auth-btn {
        flex: 1;
        padding: 12px 20px;
        border: none;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      .auth-btn-primary {
        background: #4a90e2;
        color: white;
      }

      .auth-btn-primary:hover {
        background: #357abd;
        transform: translateY(-1px);
      }

      .auth-btn-primary:disabled {
        background: #ccc;
        cursor: not-allowed;
        transform: none;
      }

      .auth-btn-secondary {
        background: #f8f9fa;
        color: #333;
        border: 1px solid #ddd;
      }

      .auth-btn-secondary:hover {
        background: #e9ecef;
        transform: translateY(-1px);
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes slideIn {
        from { 
          opacity: 0;
          transform: translateY(-20px) scale(0.95);
        }
        to { 
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      /* Dark mode support */
      body.dark-mode .auth-modal {
        background: #2d2d2d;
        color: #fff;
      }

      body.dark-mode .auth-modal-header {
        border-bottom-color: #555;
      }

      body.dark-mode .auth-modal-header h3 {
        color: #fff;
      }

      body.dark-mode .auth-question label {
        color: #fff;
      }

      body.dark-mode .auth-answer-input {
        background: #333;
        border-color: #555;
        color: #fff;
      }

      body.dark-mode .auth-answer-input:focus {
        border-color: #4a90e2;
      }

      body.dark-mode .auth-modal-footer {
        border-top-color: #555;
      }

      body.dark-mode .auth-btn-secondary {
        background: #333;
        color: #fff;
        border-color: #555;
      }

      body.dark-mode .auth-btn-secondary:hover {
        background: #444;
      }
    `;

    document.head.appendChild(styles);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PlayerAuthenticator;
}

// Make available globally for browser use
if (typeof window !== 'undefined') {
  window.PlayerAuthenticator = PlayerAuthenticator;
}