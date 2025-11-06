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

    // Photos should be a key-value object where keys are challenge text and values are URLs
    let photoUrl = null;
    
    if (typeof playerPhotos === 'object' && playerPhotos !== null && !Array.isArray(playerPhotos)) {
      // Standard format: object with challenge text as keys and URLs as values
      photoUrl = playerPhotos[square.challengeText];
    } else if (Array.isArray(playerPhotos)) {
      // If we get an array (which seems wrong), try to find a matching photo object
      console.warn('GridRenderer: Received array instead of object for player photos');
      const photoObj = playerPhotos.find(photo => 
        photo.challengeText === square.challengeText || 
        photo.index === square.index
      );
      photoUrl = photoObj ? (photoObj.url || photoObj.photoUrl) : null;
    } else {
      console.warn('GridRenderer: Invalid photo data format:', typeof playerPhotos);
    }
    
    const isCompleted = photoUrl && photoUrl.trim() !== '';
    
    // Debug logging for photo lookup
    if (position <= 3) { // Only log first few squares to avoid spam
      console.log(`GridRenderer: Square ${position} - Challenge: "${square.challengeText}"`);
      console.log(`GridRenderer: Square index: ${square.index}`);
      console.log(`GridRenderer: Photo URL: "${photoUrl}"`);
      console.log(`GridRenderer: Is completed: ${isCompleted}`);
      
      if (Array.isArray(playerPhotos)) {
        console.log(`GridRenderer: Player photos is array with ${playerPhotos.length} items`);
        if (playerPhotos.length > 0) {
          console.log(`GridRenderer: First photo object:`, playerPhotos[0]);
          console.log(`GridRenderer: Photo object keys:`, Object.keys(playerPhotos[0]));
        }
      } else {
        console.log(`GridRenderer: Player photos is object with keys:`, Object.keys(playerPhotos));
      }
    }

    if (isCompleted) {
      squareElement.classList.add('completed');
      squareElement.style.position = 'relative'; // Ensure positioning context
      
      // Create image element with debugging
      const img = document.createElement('img');
      img.src = photoUrl;
      img.alt = square.challengeText;
      img.loading = 'lazy';
      img.style.cssText = 'width: 100% !important; height: 100% !important; object-fit: cover !important; display: block !important; position: absolute !important; top: 0 !important; left: 0 !important; z-index: 1 !important; border: 2px solid red !important;';
      
      // Add load/error handlers for debugging
      img.onload = () => {
        console.log(`GridRenderer: Image loaded successfully for square ${position}:`, photoUrl);
        console.log(`GridRenderer: Image dimensions:`, img.naturalWidth, 'x', img.naturalHeight);
      };
      
      // Also try loading with crossOrigin attribute
      img.crossOrigin = 'anonymous';
      img.onerror = (error) => {
        console.error(`GridRenderer: Image failed to load for square ${position}:`, photoUrl);
        console.error(`GridRenderer: Error details:`, error);
        console.error(`GridRenderer: Image element:`, img);
        console.error(`GridRenderer: Image naturalWidth:`, img.naturalWidth);
        console.error(`GridRenderer: Image naturalHeight:`, img.naturalHeight);
        
        // Try to fetch the URL directly to see what the server returns
        fetch(photoUrl)
          .then(response => {
            console.log(`GridRenderer: Direct fetch response:`, response.status, response.statusText);
            console.log(`GridRenderer: Response headers:`, [...response.headers.entries()]);
            return response.blob();
          })
          .then(blob => {
            console.log(`GridRenderer: Response blob:`, blob.type, blob.size);
          })
          .catch(fetchError => {
            console.error(`GridRenderer: Direct fetch failed:`, fetchError);
          });
          
        // Show a placeholder for failed images
        img.style.display = 'none';
        const placeholder = document.createElement('div');
        placeholder.style.cssText = `
          width: 100%; 
          height: 100%; 
          background: #f0f0f0; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-size: 2rem;
          color: #999;
        `;
        placeholder.innerHTML = '📷';
        placeholder.title = 'Photo failed to load: ' + photoUrl;
        squareElement.insertBefore(placeholder, overlay);
      };
      
      // Create overlay that doesn't interfere with clicks
      const overlay = document.createElement('div');
      overlay.className = 'square-overlay';
      overlay.style.cssText = 'pointer-events: none; z-index: 2; position: absolute; top: 0; left: 0; right: 0; bottom: 0;';
      overlay.innerHTML = '<div class="completion-indicator">✓</div>';
      
      // Add elements to square
      squareElement.appendChild(img);
      squareElement.appendChild(overlay);
      
      // Add click handler for fullscreen view
      squareElement.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log(`GridRenderer: Square clicked for photo:`, photoUrl);
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
    // Open fullscreen card modal for detailed view
    this.openFullscreenCard(squareStat, position);
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
        if (typeof this.performanceMonitor.setupLazyLoading === 'function') {
          this.performanceMonitor.setupLazyLoading(img);
        }
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
      square.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const squareIndex = parseInt(square.dataset.squareIndex);
        const position = parseInt(square.dataset.position);
        
        // Check if this is a completed square with a photo (player view)
        if (square.classList.contains('completed') && square.querySelector('img')) {
          const img = square.querySelector('img');
          const photoUrl = img.src;
          const challengeText = img.alt;
          console.log(`GridRenderer: Cached square clicked for photo:`, photoUrl);
          this.onPhotoClick(photoUrl, challengeText, position);
        } else {
          // For incomplete squares or card view, show stats
          if (typeof boardController !== 'undefined' && boardController.getState) {
            const state = boardController.getState();
            const squareStat = state.completionStats.squareStats.find(s => s.squareIndex === squareIndex);
            if (squareStat) {
              this.onSquareClick(squareStat, position);
            }
          }
        }
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
   * Open fullscreen card modal for detailed square view
   * @param {Object} squareStat - Square statistics
   * @param {number} position - Position in grid
   */
  openFullscreenCard(squareStat, position) {
    // Get or create fullscreen card modal
    let modal = document.getElementById('fullscreenCardModal');
    if (!modal) {
      modal = this.createFullscreenCardModal();
    }

    // Get all squares for navigation
    const allSquares = this.getAllSquaresForNavigation();
    const currentIndex = allSquares.findIndex(sq => sq.squareIndex === squareStat.squareIndex);

    // Update modal content
    this.updateFullscreenCardContent(modal, squareStat, position, currentIndex, allSquares);

    // Show modal
    modal.classList.add('show');
    modal.dataset.currentIndex = currentIndex;
    modal.dataset.totalSquares = allSquares.length;

    // Add keyboard focus for accessibility
    modal.focus();
  }

  /**
   * Create fullscreen card modal element
   * @returns {HTMLElement} Modal element
   */
  createFullscreenCardModal() {
    const modal = document.createElement('div');
    modal.id = 'fullscreenCardModal';
    modal.className = 'fullscreen-card-modal';
    modal.tabIndex = -1;

    modal.innerHTML = `
      <button class="nav-arrow left" id="prevCardBtn" onclick="gridRenderer.navigateFullscreenCard(-1)">‹</button>
      <button class="nav-arrow right" id="nextCardBtn" onclick="gridRenderer.navigateFullscreenCard(1)">›</button>
      <div class="fullscreen-card-content">
        <div class="card-header">
          <div class="card-position" id="cardPosition"></div>
          <div class="card-difficulty" id="cardDifficulty"></div>
        </div>
        <div class="card-challenge" id="cardChallenge"></div>
        <div class="card-stats" id="cardStats"></div>
        <div class="card-players" id="cardPlayers"></div>
        <div class="card-progress" id="cardProgress"></div>
      </div>
      <button class="fullscreen-close" onclick="gridRenderer.closeFullscreenCard()">Close</button>
    `;

    // Add to document
    document.body.appendChild(modal);

    // Add keyboard navigation
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeFullscreenCard();
      if (e.key === 'ArrowLeft') this.navigateFullscreenCard(-1);
      if (e.key === 'ArrowRight') this.navigateFullscreenCard(1);
    });

    // Add touch navigation
    let touchStartX = 0;
    modal.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
    });

    modal.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      const diff = touchStartX - touchEndX;
      
      if (Math.abs(diff) > 50) { // Minimum swipe distance
        if (diff > 0) {
          this.navigateFullscreenCard(1); // Swipe left = next
        } else {
          this.navigateFullscreenCard(-1); // Swipe right = previous
        }
      }
    });

    return modal;
  }

  /**
   * Update fullscreen card modal content
   * @param {HTMLElement} modal - Modal element
   * @param {Object} squareStat - Square statistics
   * @param {number} position - Position in grid
   * @param {number} currentIndex - Current square index
   * @param {Array} allSquares - All squares for navigation
   */
  updateFullscreenCardContent(modal, squareStat, position, currentIndex, allSquares) {
    // Update navigation buttons
    const prevBtn = modal.querySelector('#prevCardBtn');
    const nextBtn = modal.querySelector('#nextCardBtn');
    
    prevBtn.disabled = currentIndex <= 0;
    nextBtn.disabled = currentIndex >= allSquares.length - 1;

    // Update position and difficulty
    const cardPosition = modal.querySelector('#cardPosition');
    const cardDifficulty = modal.querySelector('#cardDifficulty');
    
    cardPosition.textContent = `Square ${position}`;
    
    const difficulty = this.calculateDifficulty(squareStat.completionRate);
    const difficultyIcon = this.getDifficultyIcon(difficulty);
    cardDifficulty.innerHTML = `${difficultyIcon} ${difficulty}`;
    cardDifficulty.className = `card-difficulty difficulty-${difficulty.toLowerCase().replace(' ', '-')}`;

    // Update challenge text
    const cardChallenge = modal.querySelector('#cardChallenge');
    cardChallenge.textContent = squareStat.challengeText;

    // Update statistics
    const cardStats = modal.querySelector('#cardStats');
    const totalPlayers = squareStat.completedBy.length + squareStat.outstandingPlayers.length;
    
    cardStats.innerHTML = `
      <div class="stat-row">
        <div class="stat-item">
          <div class="stat-value">${squareStat.completedBy.length}</div>
          <div class="stat-label">Completed</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${squareStat.outstandingPlayers.length}</div>
          <div class="stat-label">Outstanding</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${squareStat.completionRate.toFixed(1)}%</div>
          <div class="stat-label">Completion Rate</div>
        </div>
      </div>
    `;

    // Update progress bar
    const cardProgress = modal.querySelector('#cardProgress');
    cardProgress.innerHTML = `
      <div class="progress-bar-container">
        <div class="progress-bar-fill" style="width: ${squareStat.completionRate}%"></div>
      </div>
      <div class="progress-text">${squareStat.completedBy.length} of ${totalPlayers} players completed</div>
    `;

    // Update players list
    const cardPlayers = modal.querySelector('#cardPlayers');
    let playersHTML = '';

    if (squareStat.completedBy.length > 0) {
      playersHTML += `
        <div class="players-section">
          <h4>✅ Completed by:</h4>
          <div class="players-list completed">
            ${squareStat.completedBy.map(playerName => `
              <div class="player-item completed" title="${playerName}">
                <div class="player-icon">${this.getPlayerIcon(playerName)}</div>
                <div class="player-name">${playerName}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (squareStat.outstandingPlayers.length > 0) {
      playersHTML += `
        <div class="players-section">
          <h4>⏳ Still needed from:</h4>
          <div class="players-list outstanding">
            ${squareStat.outstandingPlayers.map(playerName => `
              <div class="player-item outstanding" title="${playerName}">
                <div class="player-icon">${this.getPlayerIcon(playerName)}</div>
                <div class="player-name">${playerName}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    cardPlayers.innerHTML = playersHTML;
  }

  /**
   * Navigate to next/previous card in fullscreen view
   * @param {number} direction - Direction to navigate (-1 for previous, 1 for next)
   */
  navigateFullscreenCard(direction) {
    const modal = document.getElementById('fullscreenCardModal');
    if (!modal || !modal.classList.contains('show')) return;

    const currentIndex = parseInt(modal.dataset.currentIndex);
    const totalSquares = parseInt(modal.dataset.totalSquares);
    const newIndex = currentIndex + direction;

    if (newIndex >= 0 && newIndex < totalSquares) {
      const allSquares = this.getAllSquaresForNavigation();
      const newSquareStat = allSquares[newIndex];
      const newPosition = newIndex + 1;

      // Add transition effect
      const content = modal.querySelector('.fullscreen-card-content');
      content.style.opacity = '0.7';
      content.style.transform = 'translateY(10px)';

      setTimeout(() => {
        this.updateFullscreenCardContent(modal, newSquareStat, newPosition, newIndex, allSquares);
        modal.dataset.currentIndex = newIndex;

        // Restore appearance
        content.style.opacity = '1';
        content.style.transform = 'translateY(0)';
      }, 150);
    }
  }

  /**
   * Close fullscreen card modal
   */
  closeFullscreenCard() {
    const modal = document.getElementById('fullscreenCardModal');
    if (modal) {
      modal.classList.remove('show');
    }
  }

  /**
   * Get all squares for navigation in fullscreen mode
   * @returns {Array} Array of square statistics
   */
  getAllSquaresForNavigation() {
    // Access global state through boardController if available
    if (typeof boardController !== 'undefined' && boardController.getState) {
      const state = boardController.getState();
      return state.completionStats.squareStats || [];
    }
    return [];
  }

  /**
   * Calculate difficulty based on completion rate
   * @param {number} completionRate - Completion rate percentage
   * @returns {string} Difficulty level
   */
  calculateDifficulty(completionRate) {
    if (completionRate >= 80) return 'Easy';
    if (completionRate >= 50) return 'Medium';
    if (completionRate >= 20) return 'Hard';
    return 'Very Hard';
  }

  /**
   * Get difficulty icon
   * @param {string} difficulty - Difficulty level
   * @returns {string} Icon for difficulty
   */
  getDifficultyIcon(difficulty) {
    switch (difficulty) {
      case 'Easy': return '🟢';
      case 'Medium': return '🟡';
      case 'Hard': return '🟠';
      case 'Very Hard': return '🔴';
      default: return '⚪';
    }
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