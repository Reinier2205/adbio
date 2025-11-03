/**
 * GridRenderer - Handles rendering of both card view and player view grids
 * Manages the visual display of bingo squares with completion statistics
 */
class GridRenderer {
  constructor() {
    this.toggleState = 'count'; // 'count' | 'completed' | 'outstanding'
    this.performanceMonitor = typeof PerformanceMonitor !== 'undefined' ? new PerformanceMonitor() : null;
    this.renderCache = new Map();
    this.maxRenderCacheSize = 10; // Cache last 10 renders
  }

  /**
   * Render card view showing completion statistics for all players
   * @param {Object} completionStats - Statistics from BoardController
   * @param {string} toggleState - Current toggle state
   */
  async renderCardView(completionStats, toggleState = 'count') {
    const renderFunction = async () => {
      this.toggleState = toggleState;
      const grid = document.getElementById('photoGrid');
      const emptyState = document.getElementById('emptyState');

      // Check render cache first
      const cacheKey = this.generateRenderCacheKey('card', completionStats, toggleState);
      if (this.renderCache.has(cacheKey)) {
        const cachedRender = this.renderCache.get(cacheKey);
        grid.innerHTML = cachedRender.html;
        grid.className = cachedRender.className;
        grid.style.display = cachedRender.display;
        emptyState.style.display = cachedRender.emptyDisplay;
        this.setupEventHandlersForCachedRender(grid);
        return;
      }

      // Validate input data
      if (!completionStats || typeof completionStats !== 'object') {
        this.showEmptyState('Invalid completion data', '⚠️');
        return;
      }

      if (!completionStats.squareStats || completionStats.squareStats.length === 0) {
        this.showEmptyState('No bingo squares found', '🎯', 'This event may not have any challenges set up yet.');
        return;
      }

      // Check if we have any players
      if (completionStats.totalPlayers === 0) {
        this.showEmptyState('No players found', '👥', 'No one has joined this event yet. Share the event code to get started!');
        return;
      }

      grid.style.display = 'grid';
      emptyState.style.display = 'none';

      // Update grid to 5x5 layout for bingo board
      grid.className = 'bingo-grid';
      
      // Use document fragment for better performance
      const fragment = document.createDocumentFragment();

      // Sort squares by position (1-25) instead of chronological order
      const sortedSquares = [...completionStats.squareStats].sort((a, b) => a.squareIndex - b.squareIndex);

      // Render each square with error handling
      sortedSquares.forEach((squareStat, index) => {
        try {
          const squareElement = this.createCardViewSquare(squareStat, index + 1);
          fragment.appendChild(squareElement);
        } catch (error) {
          console.error(`Failed to render square ${index + 1}:`, error);
          // Create a fallback square
          const fallbackSquare = this.createFallbackSquare(index + 1, 'Failed to load square');
          fragment.appendChild(fallbackSquare);
        }
      });

      // Single DOM update
      grid.innerHTML = '';
      grid.appendChild(fragment);

      // Cache the render result
      this.cacheRenderResult(cacheKey, {
        html: grid.innerHTML,
        className: grid.className,
        display: grid.style.display,
        emptyDisplay: emptyState.style.display
      });

      // Setup lazy loading for photo thumbnails
      this.setupLazyLoadingForGrid(grid);
    };

    if (this.performanceMonitor) {
      await this.performanceMonitor.monitorGridRender(renderFunction, 'card');
    } else {
      try {
        await renderFunction();
      } catch (error) {
        console.error('Failed to render card view:', error);
        this.showEmptyState('Failed to load board', '❌', 'There was an error loading the board. Please try refreshing the page.');
      }
    }
  }

  /**
   * Create a square element for card view
   * @param {Object} squareStat - Square completion statistics
   * @param {number} position - Position in grid (1-25)
   */
  createCardViewSquare(squareStat, position) {
    const square = document.createElement('div');
    square.className = 'bingo-square card-view';
    square.dataset.squareIndex = squareStat.squareIndex;
    square.dataset.position = position;

    const completionRate = squareStat.completionRate || 0;
    const completedCount = squareStat.completedBy.length;
    const outstandingCount = squareStat.outstandingPlayers.length;

    // Add completion rate as CSS custom property for styling
    square.style.setProperty('--completion-rate', `${completionRate}%`);

    let content = '';
    
    // Challenge text (always shown)
    content += `<div class="square-challenge">${squareStat.challengeText}</div>`;

    // Content based on toggle state
    if (this.toggleState === 'count') {
      content += `
        <div class="square-stats">
          <div class="completion-count">${completedCount}/${completedCount + outstandingCount}</div>
          <div class="completion-rate">${completionRate.toFixed(0)}%</div>
        </div>
      `;
    } else if (this.toggleState === 'completed') {
      content += `<div class="square-players completed-players">`;
      if (squareStat.completedBy.length > 0) {
        squareStat.completedBy.forEach(playerName => {
          const playerPhoto = this.getPlayerPhotoForChallenge(playerName, squareStat.challengeText);
          if (playerPhoto) {
            // Show clickable photo thumbnail
            content += `<div class="player-photo-indicator" data-photo-url="${playerPhoto}" data-player="${playerName}" data-challenge="${squareStat.challengeText}">
              <img src="${playerPhoto}" alt="${playerName}" loading="lazy">
              <div class="player-photo-overlay">${this.getPlayerIcon(playerName)}</div>
            </div>`;
          } else {
            // Fallback to icon if no photo available
            content += `<div class="player-indicator completed">${this.getPlayerIcon(playerName)}</div>`;
          }
        });
      } else {
        content += `<div class="no-players">No completions</div>`;
      }
      content += `</div>`;
    } else if (this.toggleState === 'outstanding') {
      content += `<div class="square-players outstanding-players">`;
      if (squareStat.outstandingPlayers.length > 0) {
        squareStat.outstandingPlayers.forEach(playerName => {
          content += `<div class="player-indicator outstanding">${this.getPlayerIcon(playerName)}</div>`;
        });
      } else {
        content += `<div class="no-players">All completed!</div>`;
      }
      content += `</div>`;
    }

    square.innerHTML = content;

    // Add click handlers for photo thumbnails in completed mode
    if (this.toggleState === 'completed') {
      square.querySelectorAll('.player-photo-indicator').forEach(photoIndicator => {
        photoIndicator.addEventListener('click', (e) => {
          e.stopPropagation(); // Prevent square click
          const photoUrl = photoIndicator.dataset.photoUrl;
          const playerName = photoIndicator.dataset.player;
          const challengeText = photoIndicator.dataset.challenge;
          this.onPhotoClick(photoUrl, challengeText, position, playerName);
        });
      });
    }

    // Add click handler for general square functionality
    square.addEventListener('click', () => {
      this.onSquareClick(squareStat, position);
    });

    return square;
  }

  /**
   * Render player view showing individual player's 5x5 grid
   * @param {string} playerName - Name of the player
   * @param {Object} playerPhotos - Player's photos keyed by challenge text
   * @param {Array} squares - Array of square definitions
   */
  async renderPlayerView(playerName, playerPhotos, squares) {
    const renderFunction = async () => {
      const grid = document.getElementById('photoGrid');
      const emptyState = document.getElementById('emptyState');

      // Check render cache first
      const cacheKey = this.generateRenderCacheKey('player', { playerName, playerPhotos, squares });
      if (this.renderCache.has(cacheKey)) {
        const cachedRender = this.renderCache.get(cacheKey);
        grid.innerHTML = cachedRender.html;
        grid.className = cachedRender.className;
        grid.style.display = cachedRender.display;
        emptyState.style.display = cachedRender.emptyDisplay;
        this.setupEventHandlersForCachedRender(grid);
        return;
      }

      // Validate input data
      if (!playerName) {
        this.showEmptyState('No player selected', '👤', 'Please select a player to view their board.');
        return;
      }

      if (!squares || squares.length === 0) {
        this.showEmptyState('No challenges found', '🎯', 'This event doesn\'t have any bingo challenges set up yet.');
        return;
      }

      if (!playerPhotos) {
        console.warn(`No photos data for player: ${playerName}`);
        playerPhotos = {}; // Use empty object as fallback
      }

      grid.style.display = 'grid';
      emptyState.style.display = 'none';

      // Update grid to 5x5 layout for bingo board
      grid.className = 'bingo-grid';
      
      // Use document fragment for better performance
      const fragment = document.createDocumentFragment();

      // Sort squares by position (1-25)
      const sortedSquares = [...squares].sort((a, b) => a.index - b.index);

      // Render each square with error handling
      sortedSquares.forEach((square, index) => {
        try {
          const squareElement = this.createPlayerViewSquare(square, playerPhotos, index + 1);
          fragment.appendChild(squareElement);
        } catch (error) {
          console.error(`Failed to render square ${index + 1} for ${playerName}:`, error);
          // Create a fallback square
          const fallbackSquare = this.createFallbackSquare(index + 1, 'Failed to load square');
          fragment.appendChild(fallbackSquare);
        }
      });

      // Single DOM update
      grid.innerHTML = '';
      grid.appendChild(fragment);

      // Cache the render result
      this.cacheRenderResult(cacheKey, {
        html: grid.innerHTML,
        className: grid.className,
        display: grid.style.display,
        emptyDisplay: emptyState.style.display
      });

      // Setup lazy loading for photos
      this.setupLazyLoadingForGrid(grid);
    };

    if (this.performanceMonitor) {
      await this.performanceMonitor.monitorGridRender(renderFunction, 'player');
    } else {
      try {
        await renderFunction();
      } catch (error) {
        console.error(`Failed to render player view for ${playerName}:`, error);
        this.showEmptyState('Failed to load player board', '❌', `There was an error loading ${playerName}'s board. Please try again.`);
      }
    }
  }

  /**
   * Create a square element for player view
   * @param {Object} square - Square definition
   * @param {Object} playerPhotos - Player's photos
   * @param {number} position - Position in grid (1-25)
   */
  createPlayerViewSquare(square, playerPhotos, position) {
    const squareElement = document.createElement('div');
    squareElement.className = 'bingo-square player-view';
    squareElement.dataset.squareIndex = square.index;
    squareElement.dataset.position = position;

    const photoUrl = playerPhotos[square.challengeText];
    const isCompleted = photoUrl && photoUrl.trim() !== '';

    if (isCompleted) {
      squareElement.classList.add('completed');
      squareElement.innerHTML = `
        <img src="${photoUrl}" alt="${square.challengeText}" loading="lazy">
        <div class="square-overlay">
          <div class="completion-indicator">✓</div>
        </div>
      `;
      
      // Add click handler for fullscreen view
      squareElement.addEventListener('click', () => {
        this.onPhotoClick(photoUrl, square.challengeText, position);
      });
    } else {
      squareElement.classList.add('incomplete');
      squareElement.innerHTML = `
        <div class="square-challenge">${square.challengeText}</div>
        <div class="incomplete-indicator">○</div>
      `;
    }

    return squareElement;
  }

  /**
   * Update toggle state and re-render if in card view
   * @param {string} newToggleState - New toggle state
   * @param {Object} completionStats - Current completion statistics
   */
  updateToggleState(newToggleState, completionStats) {
    if (this.toggleState !== newToggleState) {
      this.toggleState = newToggleState;
      // Re-render card view with new toggle state
      this.renderCardView(completionStats, newToggleState);
    }
  }

  /**
   * Handle square click in card view
   * @param {Object} squareStat - Square statistics
   * @param {number} position - Position in grid
   */
  onSquareClick(squareStat, position) {
    // For now, just log the click - could be extended for drill-down functionality
    console.log('Square clicked:', { squareStat, position });
  }

  /**
   * Handle photo click in both player view and card view
   * @param {string} photoUrl - URL of the photo
   * @param {string} challengeText - Challenge text
   * @param {number} position - Position in grid
   * @param {string} playerName - Player name (optional, for card view)
   */
  onPhotoClick(photoUrl, challengeText, position, playerName = null) {
    // Trigger fullscreen modal (integrate with existing modal system)
    if (typeof openFullscreenFromGrid === 'function') {
      openFullscreenFromGrid(photoUrl, challengeText, position, playerName);
    } else {
      console.log('Photo clicked:', { photoUrl, challengeText, position, playerName });
    }
  }

  /**
   * Get photo URL for a specific player and challenge
   * @param {string} playerName - Player name
   * @param {string} challengeText - Challenge text
   * @returns {string|null} Photo URL or null if not found
   */
  getPlayerPhotoForChallenge(playerName, challengeText) {
    // Access global state through boardController if available
    if (typeof boardController !== 'undefined' && boardController.getState) {
      const state = boardController.getState();
      const playerPhotos = state.photos[playerName];
      return playerPhotos ? playerPhotos[challengeText] : null;
    }
    return null;
  }

  /**
   * Show empty state with custom message and icon
   * @param {string} title - Title for empty state
   * @param {string} icon - Icon to display
   * @param {string} message - Optional detailed message
   */
  showEmptyState(title, icon = '🎯', message = '') {
    const grid = document.getElementById('photoGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (grid) grid.style.display = 'none';
    if (emptyState) {
      emptyState.innerHTML = `
        <div class="empty-state-icon">${icon}</div>
        <h3>${title}</h3>
        ${message ? `<p>${message}</p>` : ''}
      `;
      emptyState.style.display = 'block';
    }
  }

  /**
   * Create a fallback square when rendering fails
   * @param {number} position - Position in grid
   * @param {string} errorMessage - Error message to display
   */
  createFallbackSquare(position, errorMessage) {
    const square = document.createElement('div');
    square.className = 'bingo-square fallback-square';
    square.dataset.position = position;
    square.style.background = 'rgba(255, 107, 107, 0.1)';
    square.style.border = '2px solid rgba(255, 107, 107, 0.3)';
    
    square.innerHTML = `
      <div class="square-challenge" style="color: #ff6b6b; font-size: 0.6rem;">
        ⚠️ ${errorMessage}
      </div>
      <div style="font-size: 0.7rem; color: #999; margin-top: 4px;">
        Square ${position}
      </div>
    `;
    
    return square;
  }

  /**
   * Generate cache key for render results
   * @param {string} type - Render type (card/player)
   * @param {Object} data - Data to hash
   */
  generateRenderCacheKey(type, data, toggleState = null) {
    const dataString = JSON.stringify({ type, data, toggleState });
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `${type}_${Math.abs(hash)}`;
  }

  /**
   * Cache render result
   * @param {string} key - Cache key
   * @param {Object} renderData - Render data to cache
   */
  cacheRenderResult(key, renderData) {
    // Implement LRU cache
    if (this.renderCache.size >= this.maxRenderCacheSize) {
      const firstKey = this.renderCache.keys().next().value;
      this.renderCache.delete(firstKey);
    }
    
    this.renderCache.set(key, {
      ...renderData,
      timestamp: Date.now()
    });
  }

  /**
   * Setup lazy loading for grid images
   * @param {HTMLElement} grid - Grid container
   */
  setupLazyLoadingForGrid(grid) {
    if (!this.performanceMonitor) return;

    const images = grid.querySelectorAll('img[src]');
    images.forEach(img => {
      // Convert to lazy loading if performance monitor is available
      if (img.src && !img.classList.contains('lazy-loading')) {
        const src = img.src;
        img.dataset.src = src;
        img.src = ''; // Clear src to prevent immediate loading
        img.classList.add('lazy-loading');
        this.performanceMonitor.setupLazyLoading(img);
      }
    });
  }

  /**
   * Setup event handlers for cached render
   * @param {HTMLElement} grid - Grid container
   */
  setupEventHandlersForCachedRender(grid) {
    // Re-setup click handlers for photo thumbnails
    grid.querySelectorAll('.player-photo-indicator').forEach(photoIndicator => {
      photoIndicator.addEventListener('click', (e) => {
        e.stopPropagation();
        const photoUrl = photoIndicator.dataset.photoUrl;
        const playerName = photoIndicator.dataset.player;
        const challengeText = photoIndicator.dataset.challenge;
        const position = photoIndicator.closest('.bingo-square').dataset.position;
        this.onPhotoClick(photoUrl, challengeText, position, playerName);
      });
    });

    // Re-setup click handlers for squares
    grid.querySelectorAll('.bingo-square').forEach(square => {
      square.addEventListener('click', () => {
        const squareIndex = square.dataset.squareIndex;
        const position = square.dataset.position;
        this.onSquareClick({ squareIndex }, position);
      });
    });

    // Re-setup lazy loading
    this.setupLazyLoadingForGrid(grid);
  }

  /**
   * Clear render cache
   */
  clearRenderCache() {
    this.renderCache.clear();
  }

  /**
   * Get player icon (same logic as main app)
   * @param {string} name - Player name
   */
  getPlayerIcon(name) {
    const bingoIcons = [
      '🎯', '🎲', '🎪', '🎨', '🎭', '🎸', '🎺', '🎻', 
      '🎮', '🎳', '🎰', '🎊', '🎉', '🎈', '🎁', '🎀',
      '🏆', '🏅', '🥇', '🥈', '🥉', '⭐', '🌟', '✨',
      '🔥', '💎', '👑', '🎖️', '🏵️', '🎗️', '🎫', '🎟️'
    ];
    
    if (!name) return '❓';
    
    let hash = 0;
    const cleanName = name.toLowerCase().trim();
    
    for (let i = 0; i < cleanName.length; i++) {
      const char = cleanName.charCodeAt(i);
      hash = ((hash << 5) - hash + char) & 0xffffffff;
    }
    
    const nameLength = cleanName.length;
    const firstChar = cleanName.charCodeAt(0) || 0;
    const lastChar = cleanName.charCodeAt(nameLength - 1) || 0;
    
    const combinedHash = Math.abs(hash + nameLength * 7 + firstChar * 13 + lastChar * 17);
    const iconIndex = combinedHash % bingoIcons.length;
    
    return bingoIcons[iconIndex];
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GridRenderer;
}