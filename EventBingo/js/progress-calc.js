/**
 * ProgressCalculator - Handles completion metrics and statistics calculation
 * Provides comprehensive progress analysis for both card view and player view
 */
class ProgressCalculator {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30 seconds cache timeout
  }

  /**
   * Calculate overall completion statistics for card view
   * @param {Array} players - Array of player objects
   * @param {Object} photos - Photos data keyed by player name
   * @param {Array} squares - Array of square/challenge definitions
   * @returns {Object} Comprehensive completion statistics
   */
  calculateCompletionStats(players, photos, squares) {
    const cacheKey = this.generateCacheKey('completion', players, photos, squares);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const stats = {
      totalPlayers: players.length,
      totalSquares: squares.length,
      overallCompletion: 0,
      totalCompletions: 0,
      averagePlayerProgress: 0,
      squareStats: [],
      playerStats: [],
      completionTrends: this.calculateCompletionTrends(players, photos, squares)
    };

    if (players.length === 0 || squares.length === 0) {
      this.setCache(cacheKey, stats);
      return stats;
    }

    let totalCompletions = 0;
    let totalPlayerCompletions = 0;

    // Calculate per-square statistics
    stats.squareStats = squares.map(square => {
      const completedBy = [];
      const outstandingPlayers = [];
      
      players.forEach(player => {
        const playerPhotos = photos[player.name] || {};
        if (this.isSquareCompleted(playerPhotos, square.challengeText)) {
          completedBy.push(player.name);
          totalCompletions++;
        } else {
          outstandingPlayers.push(player.name);
        }
      });
      
      const completionRate = players.length > 0 ? (completedBy.length / players.length) * 100 : 0;
      
      return {
        squareIndex: square.index,
        challengeText: square.challengeText,
        completedBy,
        outstandingPlayers,
        completionRate,
        completionCount: completedBy.length,
        difficulty: this.calculateSquareDifficulty(completionRate),
        popularity: this.calculateSquarePopularity(completedBy.length, players.length)
      };
    });

    // Calculate per-player statistics
    stats.playerStats = players.map(player => {
      const playerProgress = this.getPlayerProgress(player.name, photos, squares);
      totalPlayerCompletions += playerProgress.completionCount;
      
      return {
        playerName: player.name,
        completionCount: playerProgress.completionCount,
        completionRate: playerProgress.completionRate,
        completedSquares: playerProgress.completedSquares,
        outstandingSquares: playerProgress.outstandingSquares,
        rank: 0 // Will be calculated after sorting
      };
    });

    // Sort players by completion rate and assign ranks
    stats.playerStats.sort((a, b) => b.completionRate - a.completionRate);
    stats.playerStats.forEach((player, index) => {
      player.rank = index + 1;
    });

    // Calculate overall statistics
    const totalPossibleCompletions = players.length * squares.length;
    stats.overallCompletion = totalPossibleCompletions > 0 
      ? (totalCompletions / totalPossibleCompletions) * 100 
      : 0;
    
    stats.totalCompletions = totalCompletions;
    stats.averagePlayerProgress = players.length > 0 
      ? (totalPlayerCompletions / players.length) 
      : 0;

    this.setCache(cacheKey, stats);
    return stats;
  }

  /**
   * Compute individual player progress for player view
   * @param {string} playerName - Name of the player
   * @param {Object} photos - Photos data keyed by player name
   * @param {Array} squares - Array of square/challenge definitions
   * @returns {Object} Individual player progress statistics
   */
  getPlayerProgress(playerName, photos, squares) {
    const cacheKey = this.generateCacheKey('player', playerName, photos, squares);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const playerPhotos = photos[playerName] || {};
    let completionCount = 0;
    const completedSquares = [];
    const outstandingSquares = [];

    squares.forEach(square => {
      if (this.isSquareCompleted(playerPhotos, square.challengeText)) {
        completionCount++;
        completedSquares.push({
          squareIndex: square.index,
          challengeText: square.challengeText,
          photoUrl: playerPhotos[square.challengeText]
        });
      } else {
        outstandingSquares.push({
          squareIndex: square.index,
          challengeText: square.challengeText
        });
      }
    });

    const progress = {
      playerName,
      completionCount,
      completionRate: squares.length > 0 ? (completionCount / squares.length) * 100 : 0,
      completedSquares,
      outstandingSquares,
      totalSquares: squares.length,
      progressLevel: this.calculateProgressLevel(completionCount, squares.length),
      recentActivity: this.calculateRecentActivity(playerPhotos, squares)
    };

    this.setCache(cacheKey, progress);
    return progress;
  }

  /**
   * Add completion rate calculations per square
   * @param {Array} players - Array of player objects
   * @param {Object} photos - Photos data keyed by player name
   * @param {Array} squares - Array of square/challenge definitions
   * @returns {Object} Square-specific completion rates and analysis
   */
  calculateSquareCompletionRates(players, photos, squares) {
    const cacheKey = this.generateCacheKey('square-rates', players, photos, squares);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const squareRates = squares.map(square => {
      const completions = players.filter(player => {
        const playerPhotos = photos[player.name] || {};
        return this.isSquareCompleted(playerPhotos, square.challengeText);
      });

      const completionRate = players.length > 0 ? (completions.length / players.length) * 100 : 0;
      
      return {
        squareIndex: square.index,
        challengeText: square.challengeText,
        completionRate,
        completionCount: completions.length,
        totalPlayers: players.length,
        difficulty: this.calculateSquareDifficulty(completionRate),
        category: this.categorizeSquare(square.challengeText),
        completedBy: completions.map(p => p.name)
      };
    });

    // Sort by completion rate for analysis
    const sortedByRate = [...squareRates].sort((a, b) => b.completionRate - a.completionRate);
    
    const analysis = {
      squareRates,
      mostPopular: sortedByRate.slice(0, 5),
      leastPopular: sortedByRate.slice(-5).reverse(),
      averageCompletionRate: squareRates.reduce((sum, sq) => sum + sq.completionRate, 0) / squareRates.length,
      completionDistribution: this.calculateCompletionDistribution(squareRates)
    };

    this.setCache(cacheKey, analysis);
    return analysis;
  }

  /**
   * Implement real-time progress updates when data changes
   * @param {Object} oldData - Previous data state
   * @param {Object} newData - New data state
   * @returns {Object} Progress update information
   */
  calculateProgressUpdates(oldData, newData) {
    const updates = {
      hasChanges: false,
      newCompletions: [],
      changedPlayers: [],
      affectedSquares: [],
      progressDelta: 0
    };

    if (!oldData || !newData) {
      updates.hasChanges = true;
      return updates;
    }

    // Compare photos data for changes
    const oldPhotos = oldData.photos || {};
    const newPhotos = newData.photos || {};

    Object.keys(newPhotos).forEach(playerName => {
      const oldPlayerPhotos = oldPhotos[playerName] || {};
      const newPlayerPhotos = newPhotos[playerName] || {};

      Object.keys(newPlayerPhotos).forEach(challengeText => {
        const oldPhoto = oldPlayerPhotos[challengeText];
        const newPhoto = newPlayerPhotos[challengeText];

        // Check for new completions
        if (!this.isSquareCompleted({ [challengeText]: oldPhoto }, challengeText) &&
            this.isSquareCompleted({ [challengeText]: newPhoto }, challengeText)) {
          
          updates.hasChanges = true;
          updates.newCompletions.push({
            playerName,
            challengeText,
            photoUrl: newPhoto,
            timestamp: Date.now()
          });

          if (!updates.changedPlayers.includes(playerName)) {
            updates.changedPlayers.push(playerName);
          }

          const square = newData.squares?.find(s => s.challengeText === challengeText);
          if (square && !updates.affectedSquares.includes(square.index)) {
            updates.affectedSquares.push(square.index);
          }
        }
      });
    });

    // Calculate progress delta
    if (updates.hasChanges) {
      const oldStats = this.calculateCompletionStats(oldData.players || [], oldPhotos, oldData.squares || []);
      const newStats = this.calculateCompletionStats(newData.players || [], newPhotos, newData.squares || []);
      updates.progressDelta = newStats.overallCompletion - oldStats.overallCompletion;
    }

    return updates;
  }

  /**
   * Get comprehensive progress summary
   * @param {Array} players - Array of player objects
   * @param {Object} photos - Photos data keyed by player name
   * @param {Array} squares - Array of square/challenge definitions
   * @returns {Object} Comprehensive progress summary
   */
  getProgressSummary(players, photos, squares) {
    const completionStats = this.calculateCompletionStats(players, photos, squares);
    const squareRates = this.calculateSquareCompletionRates(players, photos, squares);

    return {
      overview: {
        totalPlayers: completionStats.totalPlayers,
        totalSquares: completionStats.totalSquares,
        overallCompletion: completionStats.overallCompletion,
        totalCompletions: completionStats.totalCompletions,
        averagePlayerProgress: completionStats.averagePlayerProgress
      },
      topPerformers: completionStats.playerStats.slice(0, 3),
      challengingSquares: squareRates.leastPopular,
      popularSquares: squareRates.mostPopular,
      recentActivity: this.getRecentActivity(photos, squares),
      milestones: this.calculateMilestones(completionStats)
    };
  }

  // Private helper methods

  /**
   * Check if a square is completed by a player
   * @param {Object} playerPhotos - Player's photos
   * @param {string} challengeText - Challenge text to check
   * @returns {boolean} Whether the square is completed
   */
  isSquareCompleted(playerPhotos, challengeText) {
    const photoUrl = playerPhotos[challengeText];
    return photoUrl && photoUrl.trim() !== '';
  }

  /**
   * Calculate square difficulty based on completion rate
   * @param {number} completionRate - Completion rate percentage
   * @returns {string} Difficulty level
   */
  calculateSquareDifficulty(completionRate) {
    if (completionRate >= 80) return 'Easy';
    if (completionRate >= 50) return 'Medium';
    if (completionRate >= 20) return 'Hard';
    return 'Very Hard';
  }

  /**
   * Calculate square popularity
   * @param {number} completionCount - Number of completions
   * @param {number} totalPlayers - Total number of players
   * @returns {string} Popularity level
   */
  calculateSquarePopularity(completionCount, totalPlayers) {
    const rate = totalPlayers > 0 ? (completionCount / totalPlayers) * 100 : 0;
    if (rate >= 75) return 'Very Popular';
    if (rate >= 50) return 'Popular';
    if (rate >= 25) return 'Moderate';
    return 'Unpopular';
  }

  /**
   * Calculate player progress level
   * @param {number} completionCount - Number of completed squares
   * @param {number} totalSquares - Total number of squares
   * @returns {string} Progress level
   */
  calculateProgressLevel(completionCount, totalSquares) {
    const rate = totalSquares > 0 ? (completionCount / totalSquares) * 100 : 0;
    if (rate >= 90) return 'Expert';
    if (rate >= 70) return 'Advanced';
    if (rate >= 50) return 'Intermediate';
    if (rate >= 25) return 'Beginner';
    return 'Novice';
  }

  /**
   * Calculate completion trends
   * @param {Array} players - Array of player objects
   * @param {Object} photos - Photos data
   * @param {Array} squares - Array of squares
   * @returns {Object} Completion trends
   */
  calculateCompletionTrends(players, photos, squares) {
    // This would ideally use timestamp data, but for now return basic trends
    return {
      trending: 'stable',
      momentum: 'steady',
      projectedCompletion: 'unknown'
    };
  }

  /**
   * Calculate recent activity for a player
   * @param {Object} playerPhotos - Player's photos
   * @param {Array} squares - Array of squares
   * @returns {Object} Recent activity information
   */
  calculateRecentActivity(playerPhotos, squares) {
    // This would ideally use timestamp data
    return {
      recentCompletions: 0,
      lastActivity: null,
      activityLevel: 'unknown'
    };
  }

  /**
   * Categorize a square based on its challenge text
   * @param {string} challengeText - The challenge text
   * @returns {string} Category name
   */
  categorizeSquare(challengeText) {
    const text = challengeText.toLowerCase();
    if (text.includes('photo') || text.includes('selfie')) return 'Photography';
    if (text.includes('beer') || text.includes('drink')) return 'Social';
    if (text.includes('fire') || text.includes('camp')) return 'Outdoor';
    if (text.includes('cook') || text.includes('braai')) return 'Food';
    return 'General';
  }

  /**
   * Calculate completion distribution
   * @param {Array} squareRates - Array of square completion rates
   * @returns {Object} Distribution information
   */
  calculateCompletionDistribution(squareRates) {
    const ranges = { '0-25': 0, '26-50': 0, '51-75': 0, '76-100': 0 };
    
    squareRates.forEach(square => {
      const rate = square.completionRate;
      if (rate <= 25) ranges['0-25']++;
      else if (rate <= 50) ranges['26-50']++;
      else if (rate <= 75) ranges['51-75']++;
      else ranges['76-100']++;
    });

    return ranges;
  }

  /**
   * Get recent activity across all players
   * @param {Object} photos - Photos data
   * @param {Array} squares - Array of squares
   * @returns {Array} Recent activity items
   */
  getRecentActivity(photos, squares) {
    // This would ideally use timestamp data
    return [];
  }

  /**
   * Calculate milestones based on completion stats
   * @param {Object} completionStats - Completion statistics
   * @returns {Array} Milestone information
   */
  calculateMilestones(completionStats) {
    const milestones = [];
    
    if (completionStats.overallCompletion >= 25) {
      milestones.push({ type: 'progress', message: 'Quarter completion reached!', threshold: 25 });
    }
    if (completionStats.overallCompletion >= 50) {
      milestones.push({ type: 'progress', message: 'Half way there!', threshold: 50 });
    }
    if (completionStats.overallCompletion >= 75) {
      milestones.push({ type: 'progress', message: 'Three quarters complete!', threshold: 75 });
    }
    if (completionStats.overallCompletion >= 90) {
      milestones.push({ type: 'progress', message: 'Almost finished!', threshold: 90 });
    }

    return milestones;
  }

  // Cache management methods

  /**
   * Generate cache key for data
   * @param {string} type - Type of calculation
   * @param {...any} data - Data to hash
   * @returns {string} Cache key
   */
  generateCacheKey(type, ...data) {
    const dataString = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `${type}_${Math.abs(hash)}`;
  }

  /**
   * Get data from cache
   * @param {string} key - Cache key
   * @returns {any} Cached data or null
   */
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  /**
   * Set data in cache
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   */
  setCache(key, data) {
    this.cache.set(key, {
      data: JSON.parse(JSON.stringify(data)), // Deep copy
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp >= this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProgressCalculator;
}