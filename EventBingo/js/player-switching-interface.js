/**
 * PlayerSwitchingInterface - Enhanced player switching with authentication options
 * Integrates with existing authentication system to provide seamless player switching
 */
class PlayerSwitchingInterface {
  constructor(sessionManager, playerAuthenticator) {
    this.sessionManager = sessionManager;
    this.playerAuthenticator = playerAuthenticator;
    this.secretQuestionAuth = null; // Will be initialized when needed
    this.currentEventCode = null;
    this.currentPlayer = null;
    this.isViewOnlyMode = false;
    this.authenticationLevel = 'none'; // 'none', 'viewOnly', 'full'
    
    this.initializeInterface();
  }

  /**
   * Initialize the player switching interface
   */
  initializeInterface() {
    this.addInterfaceStyles();
    this.setupEventListeners();
  }

  /**
   * Set the current event context
   * @param {string} eventCode - Current event code
   */
  setEventContext(eventCode) {
    this.currentEventCode = eventCode;
    
    // Initialize secret question auth if available
    if (typeof SecretQuestionAuth !== 'undefined' && !this.secretQuestionAuth) {
      this.secretQuestionAuth = new SecretQuestionAuth(this.sessionManager, this.playerAuthenticator);
      this.secretQuestionAuth.setEventContext(eventCode);
    }
  }

  /**
   * Show enhanced player selection modal with authentication options
   * @param {Array} players - List of available players
   * @param {string} currentPlayer - Currently selected player
   * @returns {Promise<Object>} Selection result
   */
  async showPlayerSelection(players, currentPlayer = null) {
    return new Promise((resolve) => {
      const modal = this.createPlayerSelectionModal(players, currentPlayer);
      
      modal.onPlayerSelect = async (playerName) => {
        const result = await this.handlePlayerSelection(playerName);
        if (result.success) {
          modal.close();
          resolve(result);
        } else {
          modal.showError(result.error);
        }
      };

      modal.onCancel = () => {
        modal.close();
        resolve({ success: false, cancelled: true });
      };
    });
  }

  /**
   * Handle player selection with authentication flow
   * @param {string} playerName - Selected player name
   * @returns {Promise<Object>} Selection result
   */
  async handlePlayerSelection(playerName) {
    try {
      // Check if this is the current player's own profile
      if (playerName === this.currentPlayer && this.authenticationLevel === 'full') {
        return {
          success: true,
          playerName,
          authenticationLevel: 'full',
          requiresSwitch: false
        };
      }

      // Check if player has a session for this event
      const session = this.sessionManager.getPlayerSession(this.currentEventCode);
      
      if (!session || session.playerName !== playerName) {
        // Player not found - offer view-only mode
        return await this.showPlayerNotFoundOptions(playerName);
      }

      // Player exists - show authentication options
      return await this.showAuthenticationOptions(playerName, session);
    } catch (error) {
      console.error('Player selection error:', error);
      return {
        success: false,
        error: 'Failed to select player due to system error'
      };
    }
  }

  /**
   * Show authentication options for existing player
   * @param {string} playerName - Player name
   * @param {Object} session - Player session data
   * @returns {Promise<Object>} Authentication result
   */
  async showAuthenticationOptions(playerName, session) {
    // Use enhanced secret question auth if available
    if (this.secretQuestionAuth) {
      return await this.secretQuestionAuth.authenticateForSwitching(playerName, {
        allowViewOnly: true,
        showPlayerInfo: true,
        title: 'Access Player Profile'
      });
    }
    
    // Fallback to original implementation
    return new Promise((resolve) => {
      const modal = this.createAuthenticationModal(playerName, session);
      
      modal.onAuthenticate = async (answer) => {
        const result = await this.playerAuthenticator.authenticatePlayer(
          this.currentEventCode,
          playerName,
          answer
        );
        
        if (result.success) {
          modal.close();
          resolve({
            success: true,
            playerName,
            authenticationLevel: 'full',
            playerData: result.playerData
          });
        } else {
          modal.showError(result.error);
          if (!result.canRetry) {
            modal.disableAuthentication();
          }
        }
      };

      modal.onViewOnly = () => {
        modal.close();
        resolve({
          success: true,
          playerName,
          authenticationLevel: 'viewOnly',
          playerData: session
        });
      };

      modal.onCancel = () => {
        modal.close();
        resolve({ success: false, cancelled: true });
      };
    });
  }

  /**
   * Show options when player is not found
   * @param {string} playerName - Player name
   * @returns {Promise<Object>} Selection result
   */
  async showPlayerNotFoundOptions(playerName) {
    // Use enhanced secret question auth if available
    if (this.secretQuestionAuth) {
      return await this.secretQuestionAuth.handlePlayerNotFound(playerName, {
        allowViewOnly: true
      });
    }
    
    // Fallback to original implementation
    return new Promise((resolve) => {
      const modal = this.createPlayerNotFoundModal(playerName);
      
      modal.onViewOnly = () => {
        modal.close();
        resolve({
          success: true,
          playerName,
          authenticationLevel: 'viewOnly',
          playerData: null
        });
      };

      modal.onCancel = () => {
        modal.close();
        resolve({ success: false, cancelled: true });
      };
    });
  }

  /**
   * Create the main player selection modal
   * @param {Array} players - List of players
   * @param {string} currentPlayer - Current player
   * @returns {Object} Modal object
   */
  createPlayerSelectionModal(players, currentPlayer) {
    const modal = document.createElement('div');
    modal.className = 'player-switching-modal-overlay';
    
    const isDark = document.body.classList.contains('dark-mode');
    
    modal.innerHTML = `
      <div class="player-switching-modal">
        <div class="player-switching-header">
          <h3>Select Player</h3>
          <button class="player-switching-close">&times;</button>
        </div>
        <div class="player-switching-body">
          <div class="player-switching-grid">
            ${this.renderPlayerGrid(players, currentPlayer)}
          </div>
          <div class="player-switching-error" style="display: none;"></div>
        </div>
        <div class="player-switching-footer">
          <button class="player-switching-btn player-switching-btn-secondary">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add event listeners
    modal.querySelector('.player-switching-close').onclick = () => modal.onCancel();
    modal.querySelector('.player-switching-btn-secondary').onclick = () => modal.onCancel();

    // Player selection handlers
    modal.querySelectorAll('.player-switching-item').forEach(item => {
      item.onclick = () => {
        const playerName = item.dataset.playerName;
        if (playerName && modal.onPlayerSelect) {
          modal.onPlayerSelect(playerName);
        }
      };
    });

    // Modal methods
    modal.showError = (message) => {
      const errorDiv = modal.querySelector('.player-switching-error');
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    };

    modal.close = () => {
      if (modal.parentNode) {
        document.body.removeChild(modal);
      }
    };

    return modal;
  }

  /**
   * Create authentication modal for existing player
   * @param {string} playerName - Player name
   * @param {Object} session - Player session
   * @returns {Object} Modal object
   */
  createAuthenticationModal(playerName, session) {
    const modal = document.createElement('div');
    modal.className = 'player-switching-modal-overlay';
    
    const authStatus = this.playerAuthenticator.getAuthenticationStatus(playerName);
    
    modal.innerHTML = `
      <div class="player-switching-modal">
        <div class="player-switching-header">
          <h3>Access ${playerName}'s Profile</h3>
          <button class="player-switching-close">&times;</button>
        </div>
        <div class="player-switching-body">
          <div class="player-switching-player-info">
            <div class="player-switching-avatar">
              ${this.getPlayerIcon(playerName)}
            </div>
            <h4>${playerName}</h4>
          </div>
          
          <div class="player-switching-auth-section">
            <div class="player-switching-question">
              <label>Secret Question:</label>
              <p>${session.secretQuestion}</p>
            </div>
            
            <div class="player-switching-answer-input">
              <input type="text" placeholder="Enter your answer..." />
              ${authStatus.attemptsLeft < 3 ? `<div class="attempts-warning">Attempts remaining: ${authStatus.attemptsLeft}</div>` : ''}
            </div>
          </div>
          
          <div class="player-switching-error" style="display: none;"></div>
        </div>
        <div class="player-switching-footer">
          <button class="player-switching-btn player-switching-btn-secondary view-only-btn">
            👁️ View Only
          </button>
          <button class="player-switching-btn player-switching-btn-primary auth-btn">
            🔓 Enter Secret Answer
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const input = modal.querySelector('input');
    const authBtn = modal.querySelector('.auth-btn');
    const viewOnlyBtn = modal.querySelector('.view-only-btn');

    // Focus on input
    setTimeout(() => input.focus(), 100);

    // Event listeners
    modal.querySelector('.player-switching-close').onclick = () => modal.onCancel();
    
    viewOnlyBtn.onclick = () => modal.onViewOnly();
    
    authBtn.onclick = () => {
      const answer = input.value.trim();
      if (answer && modal.onAuthenticate) {
        modal.onAuthenticate(answer);
      }
    };

    // Handle Enter key
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        authBtn.click();
      }
    });

    // Modal methods
    modal.showError = (message) => {
      const errorDiv = modal.querySelector('.player-switching-error');
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
      
      // Clear input and refocus
      input.value = '';
      input.focus();
    };

    modal.disableAuthentication = () => {
      input.disabled = true;
      authBtn.disabled = true;
      authBtn.textContent = '🔒 Locked';
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
    modal.className = 'player-switching-modal-overlay';
    
    modal.innerHTML = `
      <div class="player-switching-modal">
        <div class="player-switching-header">
          <h3>Player Not Found</h3>
          <button class="player-switching-close">&times;</button>
        </div>
        <div class="player-switching-body">
          <div class="player-switching-not-found">
            <div class="not-found-icon">❓</div>
            <h4>${playerName}</h4>
            <p>This player hasn't been registered for this event yet.</p>
            <p>You can still view any photos they may have uploaded.</p>
          </div>
        </div>
        <div class="player-switching-footer">
          <button class="player-switching-btn player-switching-btn-secondary">Cancel</button>
          <button class="player-switching-btn player-switching-btn-primary view-only-btn">
            👁️ View Photos Only
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    modal.querySelector('.player-switching-close').onclick = () => modal.onCancel();
    modal.querySelector('.player-switching-btn-secondary').onclick = () => modal.onCancel();
    modal.querySelector('.view-only-btn').onclick = () => modal.onViewOnly();

    modal.close = () => {
      if (modal.parentNode) {
        document.body.removeChild(modal);
      }
    };

    return modal;
  }

  /**
   * Render the player grid for selection
   * @param {Array} players - List of players
   * @param {string} currentPlayer - Current player
   * @returns {string} HTML string
   */
  renderPlayerGrid(players, currentPlayer) {
    return players.map(player => {
      const isActive = player.name === currentPlayer;
      const icon = this.getPlayerIcon(player.name);
      
      return `
        <div class="player-switching-item ${isActive ? 'active' : ''}" data-player-name="${player.name}">
          <div class="player-switching-circle">
            ${icon}
          </div>
          <div class="player-switching-name">${player.name}</div>
          ${isActive ? '<div class="player-switching-current">Current</div>' : ''}
        </div>
      `;
    }).join('');
  }

  /**
   * Get player icon (first letter of name)
   * @param {string} playerName - Player name
   * @returns {string} Player icon
   */
  getPlayerIcon(playerName) {
    return playerName ? playerName.charAt(0).toUpperCase() : '?';
  }

  /**
   * Setup event listeners for the interface
   */
  setupEventListeners() {
    // Listen for player switching events
    document.addEventListener('playerSwitchRequest', (event) => {
      const { playerName } = event.detail;
      this.handlePlayerSelection(playerName);
    });

    // Listen for authentication state changes
    document.addEventListener('authenticationStateChange', (event) => {
      const { playerName, authenticationLevel } = event.detail;
      this.currentPlayer = playerName;
      this.authenticationLevel = authenticationLevel;
      this.isViewOnlyMode = authenticationLevel === 'viewOnly';
    });
  }

  /**
   * Dispatch player switch event
   * @param {Object} result - Switch result
   */
  dispatchPlayerSwitchEvent(result) {
    const event = new CustomEvent('playerSwitched', {
      detail: result
    });
    document.dispatchEvent(event);
  }

  /**
   * Add interface styles
   */
  addInterfaceStyles() {
    if (document.getElementById('player-switching-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'player-switching-styles';
    styles.textContent = `
      .player-switching-modal-overlay {
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

      .player-switching-modal {
        background: white;
        border-radius: 12px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        animation: slideIn 0.3s ease;
      }

      .player-switching-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid #eee;
      }

      .player-switching-header h3 {
        margin: 0;
        color: #333;
        font-size: 1.3rem;
      }

      .player-switching-close {
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

      .player-switching-close:hover {
        background: #f0f0f0;
        color: #333;
      }

      .player-switching-body {
        padding: 20px;
      }

      .player-switching-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 15px;
        margin-bottom: 20px;
      }

      .player-switching-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 15px;
        border: 2px solid #e0e0e0;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
      }

      .player-switching-item:hover {
        border-color: #4a90e2;
        background: rgba(74, 144, 226, 0.05);
        transform: translateY(-2px);
      }

      .player-switching-item.active {
        border-color: #4a90e2;
        background: rgba(74, 144, 226, 0.1);
      }

      .player-switching-circle {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: white;
        border: 3px solid transparent;
        background-image: linear-gradient(white, white), var(--story-gradient, linear-gradient(45deg, #E4405F, #833AB4, #F77737, #FCAF45));
        background-origin: border-box;
        background-clip: content-box, border-box;
        color: #333;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 1.2rem;
        margin-bottom: 8px;
      }

      .player-switching-name {
        font-size: 0.9rem;
        font-weight: 500;
        text-align: center;
        color: #333;
      }

      .player-switching-current {
        position: absolute;
        top: -5px;
        right: -5px;
        background: #10b981;
        color: white;
        font-size: 0.7rem;
        padding: 2px 6px;
        border-radius: 10px;
        font-weight: 600;
      }

      .player-switching-player-info {
        text-align: center;
        margin-bottom: 25px;
      }

      .player-switching-avatar {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: white;
        border: 4px solid transparent;
        background-image: linear-gradient(white, white), var(--story-gradient, linear-gradient(45deg, #E4405F, #833AB4, #F77737, #FCAF45));
        background-origin: border-box;
        background-clip: content-box, border-box;
        color: #333;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 2rem;
        margin: 0 auto 15px auto;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      }

      .player-switching-player-info h4 {
        margin: 0;
        color: #333;
        font-size: 1.3rem;
      }

      .player-switching-auth-section {
        margin-bottom: 20px;
      }

      .player-switching-question {
        margin-bottom: 15px;
      }

      .player-switching-question label {
        display: block;
        font-weight: 600;
        margin-bottom: 5px;
        color: #333;
      }

      .player-switching-question p {
        margin: 0;
        padding: 12px;
        background: rgba(74, 144, 226, 0.1);
        border-radius: 8px;
        border-left: 4px solid #4a90e2;
        font-style: italic;
      }

      .player-switching-answer-input input {
        width: 100%;
        padding: 12px;
        border: 2px solid #ddd;
        border-radius: 8px;
        font-size: 1rem;
        outline: none;
        transition: border-color 0.2s ease;
      }

      .player-switching-answer-input input:focus {
        border-color: #4a90e2;
        box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
      }

      .attempts-warning {
        margin-top: 8px;
        color: #e74c3c;
        font-size: 0.9rem;
        font-weight: 600;
      }

      .player-switching-not-found {
        text-align: center;
        padding: 20px;
      }

      .not-found-icon {
        font-size: 4rem;
        margin-bottom: 15px;
      }

      .player-switching-not-found h4 {
        margin: 0 0 15px 0;
        color: #333;
        font-size: 1.3rem;
      }

      .player-switching-not-found p {
        margin: 0 0 10px 0;
        color: #666;
        line-height: 1.5;
      }

      .player-switching-error {
        background: #fee;
        color: #c33;
        padding: 12px;
        border-radius: 8px;
        margin: 15px 0;
        font-size: 0.9rem;
        border: 1px solid #fcc;
      }

      .player-switching-footer {
        display: flex;
        gap: 10px;
        padding: 20px;
        border-top: 1px solid #eee;
      }

      .player-switching-btn {
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

      .player-switching-btn-primary {
        background: #4a90e2;
        color: white;
      }

      .player-switching-btn-primary:hover {
        background: #357abd;
        transform: translateY(-1px);
      }

      .player-switching-btn-primary:disabled {
        background: #ccc;
        cursor: not-allowed;
        transform: none;
      }

      .player-switching-btn-secondary {
        background: #f8f9fa;
        color: #333;
        border: 1px solid #ddd;
      }

      .player-switching-btn-secondary:hover {
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
      body.dark-mode .player-switching-modal {
        background: #2d2d2d;
        color: #fff;
      }

      body.dark-mode .player-switching-header {
        border-bottom-color: #555;
      }

      body.dark-mode .player-switching-header h3,
      body.dark-mode .player-switching-player-info h4,
      body.dark-mode .player-switching-not-found h4 {
        color: #fff;
      }

      body.dark-mode .player-switching-question label {
        color: #fff;
      }

      body.dark-mode .player-switching-question p {
        background: rgba(74, 144, 226, 0.2);
        color: #fff;
      }

      body.dark-mode .player-switching-answer-input input {
        background: #333;
        border-color: #555;
        color: #fff;
      }

      body.dark-mode .player-switching-answer-input input:focus {
        border-color: #4a90e2;
      }

      body.dark-mode .player-switching-footer {
        border-top-color: #555;
      }

      body.dark-mode .player-switching-btn-secondary {
        background: #333;
        color: #fff;
        border-color: #555;
      }

      body.dark-mode .player-switching-btn-secondary:hover {
        background: #444;
      }

      body.dark-mode .player-switching-item {
        border-color: #555;
      }

      body.dark-mode .player-switching-item:hover {
        border-color: #4a90e2;
        background: rgba(74, 144, 226, 0.1);
      }

      body.dark-mode .player-switching-name {
        color: #fff;
      }

      body.dark-mode .player-switching-circle {
        background-image: linear-gradient(#2d2d2d, #2d2d2d), var(--story-gradient, linear-gradient(45deg, #E4405F, #833AB4, #F77737, #FCAF45));
        color: #fff;
      }

      body.dark-mode .player-switching-avatar {
        background-image: linear-gradient(#2d2d2d, #2d2d2d), var(--story-gradient, linear-gradient(45deg, #E4405F, #833AB4, #F77737, #FCAF45));
        color: #fff;
      }
    `;

    document.head.appendChild(styles);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PlayerSwitchingInterface;
}

// Make available globally for browser use
if (typeof window !== 'undefined') {
  window.PlayerSwitchingInterface = PlayerSwitchingInterface;
}