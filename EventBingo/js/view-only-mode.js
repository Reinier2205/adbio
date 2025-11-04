/**
 * ViewOnlyMode - Implements read-only display for other players' boards
 * Provides visual indicators and prevents editing in view-only state
 */
class ViewOnlyMode {
  constructor() {
    this.isViewOnlyActive = false;
    this.currentViewOnlyPlayer = null;
    this.originalEditingCapabilities = {};
    
    this.initializeViewOnlyMode();
  }

  /**
   * Initialize view-only mode functionality
   */
  initializeViewOnlyMode() {
    this.addViewOnlyStyles();
    this.setupEventListeners();
  }

  /**
   * Activate view-only mode for a specific player
   * @param {string} playerName - Player whose board to view
   * @param {Object} options - View-only options
   */
  activateViewOnlyMode(playerName, options = {}) {
    try {
      this.isViewOnlyActive = true;
      this.currentViewOnlyPlayer = playerName;
      
      // Store original editing capabilities
      this.storeOriginalCapabilities();
      
      // Apply view-only restrictions
      this.applyViewOnlyRestrictions();
      
      // Add visual indicators
      this.addViewOnlyIndicators(playerName, options);
      
      // Update UI elements
      this.updateUIForViewOnlyMode();
      
      // Dispatch event
      this.dispatchViewOnlyEvent('activated', { playerName, options });
      
      console.log(`View-only mode activated for player: ${playerName}`);
      
      return {
        success: true,
        playerName,
        mode: 'viewOnly'
      };
    } catch (error) {
      console.error('Failed to activate view-only mode:', error);
      return {
        success: false,
        error: 'Failed to activate view-only mode'
      };
    }
  }

  /**
   * Deactivate view-only mode and restore editing capabilities
   */
  deactivateViewOnlyMode() {
    try {
      if (!this.isViewOnlyActive) {
        return { success: true, message: 'View-only mode was not active' };
      }

      const previousPlayer = this.currentViewOnlyPlayer;
      
      // Restore original capabilities
      this.restoreOriginalCapabilities();
      
      // Remove visual indicators
      this.removeViewOnlyIndicators();
      
      // Update UI elements
      this.updateUIForEditMode();
      
      // Reset state
      this.isViewOnlyActive = false;
      this.currentViewOnlyPlayer = null;
      
      // Dispatch event
      this.dispatchViewOnlyEvent('deactivated', { previousPlayer });
      
      console.log('View-only mode deactivated');
      
      return {
        success: true,
        previousPlayer,
        mode: 'edit'
      };
    } catch (error) {
      console.error('Failed to deactivate view-only mode:', error);
      return {
        success: false,
        error: 'Failed to deactivate view-only mode'
      };
    }
  }

  /**
   * Check if view-only mode is currently active
   * @returns {boolean} View-only status
   */
  isActive() {
    return this.isViewOnlyActive;
  }

  /**
   * Get current view-only player
   * @returns {string|null} Current player name or null
   */
  getCurrentViewOnlyPlayer() {
    return this.currentViewOnlyPlayer;
  }

  /**
   * Store original editing capabilities before applying restrictions
   */
  storeOriginalCapabilities() {
    // Store file input states
    const fileInputs = document.querySelectorAll('input[type="file"]');
    this.originalEditingCapabilities.fileInputs = Array.from(fileInputs).map(input => ({
      element: input,
      disabled: input.disabled,
      style: input.style.cssText
    }));

    // Store button states
    const editButtons = document.querySelectorAll('.add-photo-btn, button[onclick*="addPhoto"], button[onclick*="uploadPhoto"]');
    this.originalEditingCapabilities.editButtons = Array.from(editButtons).map(button => ({
      element: button,
      disabled: button.disabled,
      onclick: button.onclick,
      style: button.style.cssText
    }));

    // Store form states
    const forms = document.querySelectorAll('form');
    this.originalEditingCapabilities.forms = Array.from(forms).map(form => ({
      element: form,
      onsubmit: form.onsubmit
    }));

    // Store drag and drop handlers
    const dropZones = document.querySelectorAll('.card, .bingo-square, .photo-upload-area');
    this.originalEditingCapabilities.dropZones = Array.from(dropZones).map(zone => ({
      element: zone,
      ondrop: zone.ondrop,
      ondragover: zone.ondragover,
      ondragenter: zone.ondragenter
    }));
  }

  /**
   * Apply view-only restrictions to prevent editing
   */
  applyViewOnlyRestrictions() {
    // Disable file inputs
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => {
      input.disabled = true;
      input.style.display = 'none';
    });

    // Disable edit buttons
    const editButtons = document.querySelectorAll('.add-photo-btn, button[onclick*="addPhoto"], button[onclick*="uploadPhoto"]');
    editButtons.forEach(button => {
      button.disabled = true;
      button.onclick = (e) => {
        e.preventDefault();
        this.showViewOnlyMessage();
      };
      button.style.opacity = '0.5';
      button.style.cursor = 'not-allowed';
    });

    // Disable forms
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      form.onsubmit = (e) => {
        e.preventDefault();
        this.showViewOnlyMessage();
        return false;
      };
    });

    // Disable drag and drop
    const dropZones = document.querySelectorAll('.card, .bingo-square, .photo-upload-area');
    dropZones.forEach(zone => {
      zone.ondrop = (e) => {
        e.preventDefault();
        this.showViewOnlyMessage();
      };
      zone.ondragover = (e) => {
        e.preventDefault();
      };
      zone.ondragenter = (e) => {
        e.preventDefault();
      };
    });

    // Add view-only class to body
    document.body.classList.add('view-only-mode');
  }

  /**
   * Restore original editing capabilities
   */
  restoreOriginalCapabilities() {
    // Restore file inputs
    if (this.originalEditingCapabilities.fileInputs) {
      this.originalEditingCapabilities.fileInputs.forEach(({ element, disabled, style }) => {
        if (element && element.parentNode) {
          element.disabled = disabled;
          element.style.cssText = style;
        }
      });
    }

    // Restore edit buttons
    if (this.originalEditingCapabilities.editButtons) {
      this.originalEditingCapabilities.editButtons.forEach(({ element, disabled, onclick, style }) => {
        if (element && element.parentNode) {
          element.disabled = disabled;
          element.onclick = onclick;
          element.style.cssText = style;
        }
      });
    }

    // Restore forms
    if (this.originalEditingCapabilities.forms) {
      this.originalEditingCapabilities.forms.forEach(({ element, onsubmit }) => {
        if (element && element.parentNode) {
          element.onsubmit = onsubmit;
        }
      });
    }

    // Restore drag and drop
    if (this.originalEditingCapabilities.dropZones) {
      this.originalEditingCapabilities.dropZones.forEach(({ element, ondrop, ondragover, ondragenter }) => {
        if (element && element.parentNode) {
          element.ondrop = ondrop;
          element.ondragover = ondragover;
          element.ondragenter = ondragenter;
        }
      });
    }

    // Remove view-only class from body
    document.body.classList.remove('view-only-mode');

    // Clear stored capabilities
    this.originalEditingCapabilities = {};
  }

  /**
   * Add visual indicators for view-only mode
   * @param {string} playerName - Player name
   * @param {Object} options - Display options
   */
  addViewOnlyIndicators(playerName, options = {}) {
    // Add persistent header indicator
    this.addHeaderIndicator(playerName);
    
    // Add overlay to upload areas
    this.addUploadAreaOverlays();
    
    // Add tooltips to disabled elements
    this.addDisabledTooltips();
    
    // Add view-only badge to player circles
    this.addPlayerBadge(playerName);
  }

  /**
   * Remove all view-only visual indicators
   */
  removeViewOnlyIndicators() {
    // Remove header indicator
    const headerIndicator = document.getElementById('viewOnlyHeaderIndicator');
    if (headerIndicator && headerIndicator.parentNode) {
      headerIndicator.parentNode.removeChild(headerIndicator);
    }

    // Remove upload area overlays
    const overlays = document.querySelectorAll('.view-only-overlay');
    overlays.forEach(overlay => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    });

    // Remove tooltips
    const tooltips = document.querySelectorAll('.view-only-tooltip');
    tooltips.forEach(tooltip => {
      if (tooltip.parentNode) {
        tooltip.parentNode.removeChild(tooltip);
      }
    });

    // Remove player badges
    const badges = document.querySelectorAll('.view-only-badge');
    badges.forEach(badge => {
      if (badge.parentNode) {
        badge.parentNode.removeChild(badge);
      }
    });
  }

  /**
   * Add header indicator showing current view-only status
   * @param {string} playerName - Player name
   */
  addHeaderIndicator(playerName) {
    const indicator = document.createElement('div');
    indicator.id = 'viewOnlyHeaderIndicator';
    indicator.innerHTML = `
      <div class="view-only-header">
        <div class="view-only-icon">👁️</div>
        <div class="view-only-text">
          <span class="view-only-title">Viewing ${playerName}'s Board</span>
          <span class="view-only-subtitle">Read-only mode - Cannot edit photos</span>
        </div>
        <button class="view-only-exit" onclick="viewOnlyMode.deactivateViewOnlyMode()">
          ✕ Exit View Mode
        </button>
      </div>
    `;

    // Insert after top bar or at beginning of body
    const topBar = document.querySelector('.top-bar');
    if (topBar && topBar.parentNode) {
      topBar.parentNode.insertBefore(indicator, topBar.nextSibling);
    } else {
      document.body.insertBefore(indicator, document.body.firstChild);
    }
  }

  /**
   * Add overlays to upload areas to prevent interaction
   */
  addUploadAreaOverlays() {
    const uploadAreas = document.querySelectorAll('.upload-section, .add-photo-btn, .card:not(.completed)');
    
    uploadAreas.forEach(area => {
      const overlay = document.createElement('div');
      overlay.className = 'view-only-overlay';
      overlay.innerHTML = `
        <div class="view-only-overlay-content">
          <div class="view-only-overlay-icon">🔒</div>
          <div class="view-only-overlay-text">View Only</div>
        </div>
      `;
      
      // Position overlay
      const rect = area.getBoundingClientRect();
      overlay.style.position = 'absolute';
      overlay.style.top = area.offsetTop + 'px';
      overlay.style.left = area.offsetLeft + 'px';
      overlay.style.width = area.offsetWidth + 'px';
      overlay.style.height = area.offsetHeight + 'px';
      
      // Insert overlay
      if (area.parentNode) {
        area.parentNode.style.position = 'relative';
        area.parentNode.appendChild(overlay);
      }
    });
  }

  /**
   * Add tooltips to disabled elements
   */
  addDisabledTooltips() {
    const disabledElements = document.querySelectorAll('input[disabled], button[disabled]');
    
    disabledElements.forEach(element => {
      element.title = 'Editing disabled in view-only mode';
      element.addEventListener('click', (e) => {
        e.preventDefault();
        this.showViewOnlyMessage();
      });
    });
  }

  /**
   * Add view-only badge to player circle
   * @param {string} playerName - Player name
   */
  addPlayerBadge(playerName) {
    const playerCircles = document.querySelectorAll('.player-circle');
    
    playerCircles.forEach(circle => {
      if (circle.title === playerName || circle.textContent.toLowerCase() === playerName.charAt(0).toLowerCase()) {
        const badge = document.createElement('div');
        badge.className = 'view-only-badge';
        badge.textContent = '👁️';
        badge.title = 'Viewing in read-only mode';
        
        circle.style.position = 'relative';
        circle.appendChild(badge);
      }
    });
  }

  /**
   * Update UI elements for view-only mode
   */
  updateUIForViewOnlyMode() {
    // Update page title if it exists
    const pageTitle = document.querySelector('.page-title, h1');
    if (pageTitle) {
      const originalTitle = pageTitle.textContent;
      pageTitle.setAttribute('data-original-title', originalTitle);
      pageTitle.textContent = `👁️ ${originalTitle} (View Only)`;
    }

    // Update navigation if needed
    const navIcons = document.querySelectorAll('.nav-icon');
    navIcons.forEach(icon => {
      if (icon.onclick && icon.onclick.toString().includes('edit')) {
        icon.style.opacity = '0.5';
        icon.style.pointerEvents = 'none';
      }
    });
  }

  /**
   * Update UI elements for edit mode
   */
  updateUIForEditMode() {
    // Restore page title
    const pageTitle = document.querySelector('.page-title, h1');
    if (pageTitle && pageTitle.hasAttribute('data-original-title')) {
      pageTitle.textContent = pageTitle.getAttribute('data-original-title');
      pageTitle.removeAttribute('data-original-title');
    }

    // Restore navigation
    const navIcons = document.querySelectorAll('.nav-icon');
    navIcons.forEach(icon => {
      icon.style.opacity = '';
      icon.style.pointerEvents = '';
    });
  }

  /**
   * Show view-only message when user tries to edit
   */
  showViewOnlyMessage() {
    // Remove existing message
    const existingMessage = document.getElementById('viewOnlyMessage');
    if (existingMessage && existingMessage.parentNode) {
      existingMessage.parentNode.removeChild(existingMessage);
    }

    const message = document.createElement('div');
    message.id = 'viewOnlyMessage';
    message.innerHTML = `
      <div class="view-only-message">
        <div class="view-only-message-icon">🔒</div>
        <div class="view-only-message-text">
          <strong>View-Only Mode</strong><br>
          You cannot edit ${this.currentViewOnlyPlayer}'s photos
        </div>
        <button class="view-only-message-close" onclick="this.parentNode.parentNode.remove()">✕</button>
      </div>
    `;

    document.body.appendChild(message);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (message.parentNode) {
        message.parentNode.removeChild(message);
      }
    }, 3000);
  }

  /**
   * Setup event listeners for view-only mode
   */
  setupEventListeners() {
    // Listen for player switch events
    document.addEventListener('playerSwitched', (event) => {
      const { authenticationLevel, playerName } = event.detail;
      
      if (authenticationLevel === 'viewOnly') {
        this.activateViewOnlyMode(playerName);
      } else if (this.isViewOnlyActive) {
        this.deactivateViewOnlyMode();
      }
    });

    // Listen for authentication state changes
    document.addEventListener('authenticationStateChange', (event) => {
      const { authenticationLevel, playerName } = event.detail;
      
      if (authenticationLevel === 'viewOnly' && !this.isViewOnlyActive) {
        this.activateViewOnlyMode(playerName);
      } else if (authenticationLevel === 'full' && this.isViewOnlyActive) {
        this.deactivateViewOnlyMode();
      }
    });

    // Prevent context menu on view-only elements
    document.addEventListener('contextmenu', (event) => {
      if (this.isViewOnlyActive && event.target.closest('.view-only-mode')) {
        event.preventDefault();
        this.showViewOnlyMessage();
      }
    });
  }

  /**
   * Dispatch view-only mode events
   * @param {string} type - Event type
   * @param {Object} detail - Event detail
   */
  dispatchViewOnlyEvent(type, detail) {
    const event = new CustomEvent(`viewOnlyMode${type.charAt(0).toUpperCase() + type.slice(1)}`, {
      detail: {
        ...detail,
        timestamp: new Date().toISOString(),
        isActive: this.isViewOnlyActive,
        currentPlayer: this.currentViewOnlyPlayer
      }
    });
    document.dispatchEvent(event);
  }

  /**
   * Add view-only mode styles
   */
  addViewOnlyStyles() {
    if (document.getElementById('view-only-mode-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'view-only-mode-styles';
    styles.textContent = `
      /* View-Only Mode Styles */
      .view-only-mode {
        --view-only-primary: #f59e0b;
        --view-only-secondary: #fbbf24;
        --view-only-accent: #92400e;
      }

      .view-only-header {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 12px 20px;
        background: linear-gradient(135deg, var(--view-only-primary), var(--view-only-secondary));
        color: white;
        box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
        position: sticky;
        top: 0;
        z-index: 1001;
        animation: slideDown 0.3s ease;
      }

      .view-only-icon {
        font-size: 1.5rem;
        animation: pulse 2s infinite;
      }

      .view-only-text {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .view-only-title {
        font-weight: 600;
        font-size: 1rem;
      }

      .view-only-subtitle {
        font-size: 0.8rem;
        opacity: 0.9;
      }

      .view-only-exit {
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 0.9rem;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .view-only-exit:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: translateY(-1px);
      }

      .view-only-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(245, 158, 11, 0.1);
        border: 2px dashed var(--view-only-primary);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
        cursor: not-allowed;
        transition: all 0.2s ease;
      }

      .view-only-overlay:hover {
        background: rgba(245, 158, 11, 0.2);
      }

      .view-only-overlay-content {
        text-align: center;
        color: var(--view-only-accent);
        font-weight: 600;
      }

      .view-only-overlay-icon {
        font-size: 2rem;
        margin-bottom: 5px;
      }

      .view-only-overlay-text {
        font-size: 0.9rem;
      }

      .view-only-badge {
        position: absolute;
        top: -5px;
        right: -5px;
        background: var(--view-only-primary);
        color: white;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.7rem;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        animation: pulse 2s infinite;
      }

      .view-only-message {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border: 2px solid var(--view-only-primary);
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        z-index: 10001;
        display: flex;
        align-items: center;
        gap: 15px;
        max-width: 400px;
        animation: popIn 0.3s ease;
      }

      .view-only-message-icon {
        font-size: 2rem;
        color: var(--view-only-primary);
      }

      .view-only-message-text {
        flex: 1;
        color: #333;
        line-height: 1.4;
      }

      .view-only-message-close {
        background: none;
        border: none;
        font-size: 1.2rem;
        cursor: pointer;
        color: #999;
        padding: 5px;
        border-radius: 50%;
        transition: all 0.2s ease;
      }

      .view-only-message-close:hover {
        background: #f0f0f0;
        color: #333;
      }

      /* View-only mode body modifications */
      .view-only-mode .add-photo-btn {
        pointer-events: none;
        opacity: 0.5;
        filter: grayscale(50%);
      }

      .view-only-mode input[type="file"] {
        display: none !important;
      }

      .view-only-mode .upload-section {
        position: relative;
        pointer-events: none;
      }

      .view-only-mode .card:not(.completed) {
        position: relative;
      }

      .view-only-mode .card:not(.completed)::after {
        content: '🔒';
        position: absolute;
        top: 10px;
        right: 10px;
        background: rgba(245, 158, 11, 0.9);
        color: white;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.8rem;
        z-index: 5;
      }

      /* Animations */
      @keyframes pulse {
        0%, 100% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.7;
          transform: scale(1.1);
        }
      }

      @keyframes popIn {
        from {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.8);
        }
        to {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
      }

      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* Dark mode support */
      body.dark-mode .view-only-message {
        background: #2d2d2d;
        border-color: var(--view-only-primary);
        color: #fff;
      }

      body.dark-mode .view-only-message-text {
        color: #fff;
      }

      body.dark-mode .view-only-overlay {
        background: rgba(245, 158, 11, 0.15);
      }

      body.dark-mode .view-only-overlay-content {
        color: var(--view-only-secondary);
      }

      /* Mobile responsiveness */
      @media (max-width: 768px) {
        .view-only-header {
          padding: 10px 15px;
          gap: 10px;
        }

        .view-only-title {
          font-size: 0.9rem;
        }

        .view-only-subtitle {
          font-size: 0.7rem;
        }

        .view-only-exit {
          padding: 4px 8px;
          font-size: 0.8rem;
        }

        .view-only-message {
          margin: 0 15px;
          padding: 15px;
        }

        .view-only-message-icon {
          font-size: 1.5rem;
        }
      }
    `;

    document.head.appendChild(styles);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ViewOnlyMode;
}

// Make available globally for browser use
if (typeof window !== 'undefined') {
  window.ViewOnlyMode = ViewOnlyMode;
}