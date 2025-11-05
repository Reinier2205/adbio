/**
 * FlowController - Orchestrate the seamless user experience across all entry points
 * Handles intelligent routing, user intent detection, and seamless navigation
 */
class FlowController {
  constructor(sessionManager, playerAuthenticator, statePreserver, errorHandler) {
    this.errorHandler = errorHandler || (typeof ErrorHandler !== 'undefined' ? new ErrorHandler() : null);
    this.sessionManager = sessionManager || new SessionManager(this.errorHandler);
    this.playerAuthenticator = playerAuthenticator || new PlayerAuthenticator(this.sessionManager, this.errorHandler);
    this.statePreserver = statePreserver || new StatePreserver(this.sessionManager);
    this.currentPage = this._detectCurrentPage();
    this.urlParams = new URLSearchParams(window.location.search);
    this.eventCode = this.urlParams.get('event');
    this.playerParam = this.urlParams.get('player');
  }

  /**
   * Handle page load and determine appropriate flow
   * @returns {Promise<Object>} Flow result
   */
  async handlePageLoad() {
    try {
      console.log(`FlowController: Handling page load for ${this.currentPage}`);
      
      // Determine user intent based on URL and session data
      const intent = await this.determineUserIntent();
      
      console.log('User intent determined:', intent);
      
      // Route based on intent
      switch (intent.action) {
        case 'continueWithSession':
          return await this.routeToGameInterface(intent.eventCode, intent.playerName);
          
        case 'firstTimeSetup':
          return await this.routeToFirstTimeSetup(intent.eventCode);
          
        case 'playerSwitching':
          return await this.routeToPlayerSwitching(intent.targetPlayer, intent.eventCode);
          
        case 'eventSelection':
          return await this.routeToEventSelection();
          
        case 'infoPage':
          return await this.routeToInfoPage(intent.eventCode);
          
        default:
          return await this.routeToEventSelection();
      }
    } catch (error) {
      console.error('FlowController: Page load handling failed:', error);
      return {
        success: false,
        error: 'Failed to determine appropriate flow',
        fallbackAction: 'showEventSelection'
      };
    }
  }

  /**
   * Determine user intent based on URL parameters and session data
   * @returns {Promise<Object>} User intent object
   */
  async determineUserIntent() {
    try {
      // If no event code in URL, check for saved event
      if (!this.eventCode) {
        const lastUsedEvent = await this.sessionManager.getLastUsedEvent();
        
        if (lastUsedEvent) {
          // Check if we have a session for the last used event
          const session = await this.sessionManager.getPlayerSession(lastUsedEvent);
          
          if (session) {
            return {
              action: 'continueWithSession',
              eventCode: lastUsedEvent,
              playerName: session.playerName,
              reason: 'Found saved session for last used event'
            };
          }
        }
        
        // No saved event or session, need event selection
        return {
          action: 'eventSelection',
          reason: 'No event code provided and no saved event'
        };
      }

      // We have an event code, check for existing session
      const session = await this.sessionManager.getPlayerSession(this.eventCode);
      
      if (session) {
        // Check if specific player was requested
        if (this.playerParam && this.playerParam !== session.playerName) {
          return {
            action: 'playerSwitching',
            eventCode: this.eventCode,
            currentPlayer: session.playerName,
            targetPlayer: this.playerParam,
            reason: 'Different player requested than current session'
          };
        }
        
        // Continue with existing session
        return {
          action: 'continueWithSession',
          eventCode: this.eventCode,
          playerName: session.playerName,
          reason: 'Found existing session for event'
        };
      }

      // No session for this event, check if it's info page
      if (this.currentPage === 'info.html') {
        return {
          action: 'infoPage',
          eventCode: this.eventCode,
          reason: 'Info page requested'
        };
      }

      // No session, need first-time setup
      return {
        action: 'firstTimeSetup',
        eventCode: this.eventCode,
        reason: 'No existing session for event'
      };
    } catch (error) {
      console.error('Error determining user intent:', error);
      return {
        action: 'eventSelection',
        reason: 'Error occurred, falling back to event selection'
      };
    }
  }

  /**
   * Route to first-time setup flow
   * @param {string} eventCode - Event identifier
   * @returns {Promise<Object>} Routing result
   */
  async routeToFirstTimeSetup(eventCode) {
    try {
      console.log(`Routing to first-time setup for event: ${eventCode}`);
      
      // Validate event code first
      const eventValid = await this._validateEventCode(eventCode);
      if (!eventValid) {
        return {
          success: false,
          error: 'Invalid event code',
          action: 'showEventCodePrompt'
        };
      }

      // Show first-time setup modal
      const setupResult = await this._showFirstTimeSetupModal(eventCode);
      
      if (setupResult.success) {
        // Navigate to game interface
        return await this.routeToGameInterface(eventCode, setupResult.playerName);
      }
      
      return setupResult;
    } catch (error) {
      console.error('First-time setup routing failed:', error);
      return {
        success: false,
        error: 'Failed to set up new player',
        action: 'showError'
      };
    }
  }

  /**
   * Route to game interface
   * @param {string} eventCode - Event identifier
   * @param {string} playerName - Player name
   * @returns {Promise<Object>} Routing result
   */
  async routeToGameInterface(eventCode, playerName) {
    try {
      console.log(`Routing to game interface: ${eventCode} / ${playerName}`);
      
      // Update URL if needed
      const targetUrl = `index.html?event=${encodeURIComponent(eventCode)}&player=${encodeURIComponent(playerName)}`;
      
      if (this.currentPage !== 'index.html' || window.location.search !== `?event=${encodeURIComponent(eventCode)}&player=${encodeURIComponent(playerName)}`) {
        // Preserve navigation context
        this._preserveNavigationContext({
          fromPage: this.currentPage,
          toPage: 'index.html',
          eventCode,
          playerName,
          action: 'routeToGameInterface'
        });
        
        window.location.href = targetUrl;
        return { success: true, action: 'navigating' };
      }
      
      // Already on correct page, just ensure session is loaded
      return {
        success: true,
        action: 'sessionLoaded',
        eventCode,
        playerName,
        currentPage: this.currentPage
      };
    } catch (error) {
      console.error('Game interface routing failed:', error);
      return {
        success: false,
        error: 'Failed to navigate to game interface'
      };
    }
  }

  /**
   * Route to player switching flow
   * @param {string} targetPlayer - Target player name
   * @param {string} eventCode - Event identifier
   * @returns {Promise<Object>} Routing result
   */
  async routeToPlayerSwitching(targetPlayer, eventCode) {
    try {
      console.log(`Routing to player switching: ${targetPlayer} in ${eventCode}`);
      
      // Show authentication prompt
      const authResult = await this.playerAuthenticator.promptForAuthentication(
        targetPlayer,
        { eventCode, viewOnly: true }
      );
      
      if (authResult.success) {
        if (authResult.authenticationLevel === 'full') {
          // Full access granted, navigate to player's interface
          return await this.routeToGameInterface(eventCode, targetPlayer);
        } else if (authResult.authenticationLevel === 'viewOnly') {
          // View-only access, navigate to board view
          const boardUrl = `board.html?event=${encodeURIComponent(eventCode)}&player=${encodeURIComponent(targetPlayer)}&viewOnly=true`;
          
          this._preserveNavigationContext({
            fromPage: this.currentPage,
            toPage: 'board.html',
            eventCode,
            playerName: targetPlayer,
            viewOnly: true,
            action: 'playerSwitchingViewOnly'
          });
          
          window.location.href = boardUrl;
          return { success: true, action: 'navigatingToViewOnly' };
        }
      }
      
      return authResult;
    } catch (error) {
      console.error('Player switching routing failed:', error);
      return {
        success: false,
        error: 'Failed to switch players'
      };
    }
  }

  /**
   * Route to event selection
   * @returns {Promise<Object>} Routing result
   */
  async routeToEventSelection() {
    try {
      console.log('Routing to event selection');
      
      if (this.currentPage !== 'info.html') {
        this._preserveNavigationContext({
          fromPage: this.currentPage,
          toPage: 'info.html',
          action: 'eventSelection'
        });
        
        window.location.href = 'info.html';
        return { success: true, action: 'navigatingToEventSelection' };
      }
      
      return {
        success: true,
        action: 'showEventSelection',
        currentPage: this.currentPage
      };
    } catch (error) {
      console.error('Event selection routing failed:', error);
      return {
        success: false,
        error: 'Failed to navigate to event selection'
      };
    }
  }

  /**
   * Route to info page
   * @param {string} eventCode - Event identifier
   * @returns {Promise<Object>} Routing result
   */
  async routeToInfoPage(eventCode) {
    try {
      console.log(`Routing to info page for event: ${eventCode}`);
      
      const targetUrl = eventCode ? `info.html?event=${encodeURIComponent(eventCode)}` : 'info.html';
      
      if (this.currentPage !== 'info.html') {
        this._preserveNavigationContext({
          fromPage: this.currentPage,
          toPage: 'info.html',
          eventCode,
          action: 'infoPage'
        });
        
        window.location.href = targetUrl;
        return { success: true, action: 'navigatingToInfo' };
      }
      
      return {
        success: true,
        action: 'showInfoPage',
        eventCode,
        currentPage: this.currentPage
      };
    } catch (error) {
      console.error('Info page routing failed:', error);
      return {
        success: false,
        error: 'Failed to navigate to info page'
      };
    }
  }

  /**
   * Preserve navigation context across page transitions
   * @param {Object} context - Navigation context
   */
  _preserveNavigationContext(context) {
    try {
      const navigationData = {
        ...context,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        referrer: document.referrer
      };
      
      // Use StatePreserver for robust context preservation
      this.statePreserver.saveNavigationState(navigationData);
      
      // Also track the user action
      this.statePreserver.trackUserAction('navigation', {
        fromPage: context.fromPage,
        toPage: context.toPage,
        action: context.action,
        eventCode: context.eventCode,
        playerName: context.playerName
      });
      
      console.log('Navigation context preserved:', navigationData);
    } catch (error) {
      console.error('Failed to preserve navigation context:', error);
    }
  }

  /**
   * Restore navigation context from previous page
   * @returns {Object|null} Restored context
   */
  restoreNavigationContext() {
    try {
      // Use StatePreserver to restore context
      const context = this.statePreserver.restoreNavigationState();
      
      if (context) {
        console.log('Navigation context restored:', context);
        return context;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to restore navigation context:', error);
      return null;
    }
  }

  // Private methods

  /**
   * Detect current page from URL
   * @returns {string} Current page name
   */
  _detectCurrentPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop() || 'index.html';
    return filename;
  }

  /**
   * Validate event code with server
   * @param {string} eventCode - Event code to validate
   * @returns {Promise<boolean>} Validation result
   */
  async _validateEventCode(eventCode) {
    try {
      // Use the same worker URL as the main app
      const workerURL = "https://shy-recipe-5fb1.reinier-olivier.workers.dev/";
      const response = await fetch(`${workerURL}event-info?event=${encodeURIComponent(eventCode)}`);
      return response.ok;
    } catch (error) {
      console.error('Event validation failed:', error);
      // Assume valid if we can't validate (offline mode)
      return true;
    }
  }

  /**
   * Show first-time setup modal
   * @param {string} eventCode - Event identifier
   * @returns {Promise<Object>} Setup result
   */
  async _showFirstTimeSetupModal(eventCode) {
    return new Promise((resolve) => {
      console.log('FlowController: Creating first-time setup modal for event:', eventCode);
      
      try {
        const modal = this._createFirstTimeSetupModal(eventCode);
        console.log('FlowController: Modal created successfully');
      
        modal.onSubmit = async (playerName, secretQuestion, secretAnswer) => {
          console.log('FlowController: Modal submit called with:', { playerName, secretQuestion });
          
          try {
            const result = await this.playerAuthenticator.createPlayerProfile(
              eventCode,
              playerName,
              secretQuestion,
              secretAnswer
            );
            
            console.log('FlowController: Player profile creation result:', result);
            
            if (result.success) {
              modal.close();
              resolve(result);
            } else {
              modal.showError(result.error);
            }
          } catch (error) {
            console.error('FlowController: Error creating player profile:', error);
            modal.showError('Failed to create player profile: ' + error.message);
          }
        };
      
        modal.onCancel = () => {
          console.log('FlowController: Modal cancelled');
          modal.close();
          resolve({
            success: false,
            cancelled: true
          });
        };
      } catch (error) {
        console.error('FlowController: Error creating modal:', error);
        
        // Fallback to simple prompt-based setup
        console.log('FlowController: Attempting fallback prompt-based setup');
        try {
          const playerName = prompt('Enter your name for EventBingo:');
          if (!playerName) {
            resolve({ success: false, cancelled: true });
            return;
          }
          
          const secretQuestion = prompt('Enter a secret question (for player verification):');
          if (!secretQuestion) {
            resolve({ success: false, cancelled: true });
            return;
          }
          
          const secretAnswer = prompt('Enter the answer to your secret question:');
          if (!secretAnswer) {
            resolve({ success: false, cancelled: true });
            return;
          }
          
          // Create player profile using fallback data
          this.playerAuthenticator.createPlayerProfile(
            eventCode,
            playerName,
            secretQuestion,
            secretAnswer
          ).then(result => {
            resolve(result);
          }).catch(profileError => {
            console.error('FlowController: Profile creation failed:', profileError);
            resolve({
              success: false,
              error: 'Profile creation failed: ' + profileError.message
            });
          });
        } catch (fallbackError) {
          console.error('FlowController: Fallback setup also failed:', fallbackError);
          resolve({
            success: false,
            error: 'Setup failed: ' + fallbackError.message
          });
        }
      }
    });
  }

  /**
   * Create first-time setup modal
   * @param {string} eventCode - Event identifier
   * @returns {Object} Modal object
   */
  _createFirstTimeSetupModal(eventCode) {
    console.log('FlowController: Creating modal DOM elements for event:', eventCode);
    
    try {
      const modal = document.createElement('div');
      modal.className = 'setup-modal-overlay';
    modal.innerHTML = `
      <div class="setup-modal">
        <div class="setup-modal-header">
          <h3>Welcome to EventBingo!</h3>
          <p>Set up your player profile for <strong>${eventCode}</strong></p>
        </div>
        <div class="setup-modal-body">
          <div class="setup-field">
            <label for="playerName">Your Name</label>
            <input type="text" id="playerName" placeholder="Enter your name" maxlength="50" autocomplete="off" data-form-type="other" data-lpignore="true" />
          </div>
          <div class="setup-field">
            <label for="secretQuestion">Secret Question</label>
            <input type="text" id="secretQuestion" placeholder="e.g., What's your favorite color?" maxlength="100" autocomplete="off" data-form-type="other" data-lpignore="true" />
            <small>This will be used to verify your identity when switching between players</small>
          </div>
          <div class="setup-field">
            <label for="secretAnswer">Secret Answer</label>
            <input type="text" id="secretAnswer" placeholder="Enter your answer" maxlength="50" autocomplete="off" data-form-type="other" data-lpignore="true" />
            <small>Keep this simple and memorable</small>
          </div>
          <div class="setup-error" style="display: none;"></div>
        </div>
        <div class="setup-modal-footer">
          <button class="setup-btn setup-btn-secondary" onclick="this.closest('.setup-modal-overlay').onCancel()">
            Cancel
          </button>
          <button class="setup-btn setup-btn-primary" onclick="this.closest('.setup-modal-overlay').submit()">
            🎯 Start Playing
          </button>
        </div>
      </div>
    `;

    // Add styles
    this._addSetupModalStyles();

    // Add modal to page
    document.body.appendChild(modal);

    // Focus on first input
    const nameInput = modal.querySelector('#playerName');
    setTimeout(() => nameInput.focus(), 100);

    // Handle Enter key navigation
    const inputs = modal.querySelectorAll('input');
    inputs.forEach((input, index) => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          if (index < inputs.length - 1) {
            inputs[index + 1].focus();
          } else {
            modal.submit();
          }
        }
      });
    });

    // Modal methods
    modal.submit = () => {
      const playerName = modal.querySelector('#playerName').value.trim();
      const secretQuestion = modal.querySelector('#secretQuestion').value.trim();
      const secretAnswer = modal.querySelector('#secretAnswer').value.trim();
      
      if (modal.onSubmit) {
        modal.onSubmit(playerName, secretQuestion, secretAnswer);
      }
    };

    modal.showError = (message) => {
      const errorDiv = modal.querySelector('.setup-error');
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    };

      modal.close = () => {
        console.log('FlowController: Closing modal');
        if (modal.parentNode) {
          document.body.removeChild(modal);
        }
      };

      console.log('FlowController: Modal setup complete, returning modal');
      return modal;
    } catch (error) {
      console.error('FlowController: Error in _createFirstTimeSetupModal:', error);
      throw error;
    }
  }

  /**
   * Add setup modal styles
   */
  _addSetupModalStyles() {
    if (document.getElementById('setup-modal-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'setup-modal-styles';
    styles.textContent = `
      .setup-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
      }

      .setup-modal {
        background: white;
        border-radius: 16px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        animation: slideIn 0.4s ease;
        max-height: 90vh;
        overflow-y: auto;
      }

      .setup-modal-header {
        text-align: center;
        padding: 30px 30px 20px 30px;
        background: linear-gradient(135deg, #4a90e2, #7b68ee);
        color: white;
        border-radius: 16px 16px 0 0;
      }

      .setup-modal-header h3 {
        margin: 0 0 10px 0;
        font-size: 1.5rem;
        font-weight: 700;
      }

      .setup-modal-header p {
        margin: 0;
        opacity: 0.9;
        font-size: 1rem;
      }

      .setup-modal-body {
        padding: 30px;
      }

      .setup-field {
        margin-bottom: 25px;
      }

      .setup-field label {
        display: block;
        font-weight: 600;
        margin-bottom: 8px;
        color: #333;
        font-size: 1rem;
      }

      .setup-field input {
        width: 100%;
        padding: 14px 16px;
        border: 2px solid #e1e5e9;
        border-radius: 10px;
        font-size: 1rem;
        outline: none;
        transition: all 0.2s ease;
        background: #fafbfc;
      }

      .setup-field input:focus {
        border-color: #4a90e2;
        background: white;
        box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
      }

      .setup-field small {
        display: block;
        margin-top: 6px;
        color: #666;
        font-size: 0.85rem;
        line-height: 1.3;
      }

      .setup-error {
        background: #fee;
        color: #c33;
        padding: 12px 16px;
        border-radius: 8px;
        margin: 15px 0;
        font-size: 0.9rem;
        border: 1px solid #fcc;
        border-left: 4px solid #e74c3c;
      }

      .setup-modal-footer {
        display: flex;
        gap: 15px;
        padding: 20px 30px 30px 30px;
      }

      .setup-btn {
        flex: 1;
        padding: 14px 24px;
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
      }

      .setup-btn-primary {
        background: linear-gradient(135deg, #4a90e2, #357abd);
        color: white;
        box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);
      }

      .setup-btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(74, 144, 226, 0.4);
      }

      .setup-btn-secondary {
        background: #f8f9fa;
        color: #495057;
        border: 2px solid #e9ecef;
      }

      .setup-btn-secondary:hover {
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
          transform: translateY(-30px) scale(0.9);
        }
        to { 
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      /* Dark mode support */
      body.dark-mode .setup-modal {
        background: #2d2d2d;
        color: #fff;
      }

      body.dark-mode .setup-field label {
        color: #fff;
      }

      body.dark-mode .setup-field input {
        background: #333;
        border-color: #555;
        color: #fff;
      }

      body.dark-mode .setup-field input:focus {
        background: #444;
        border-color: #4a90e2;
      }

      body.dark-mode .setup-field small {
        color: #ccc;
      }

      body.dark-mode .setup-btn-secondary {
        background: #333;
        color: #fff;
        border-color: #555;
      }

      body.dark-mode .setup-btn-secondary:hover {
        background: #444;
      }
    `;

    document.head.appendChild(styles);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FlowController;
}

// Make available globally for browser use
if (typeof window !== 'undefined') {
  window.FlowController = FlowController;
}