/**
 * PerformanceMonitor - Monitors and optimizes performance for the Bingo Board
 * Handles photo loading optimization, memory management, and performance tracking
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      photoLoadTimes: [],
      gridRenderTimes: [],
      memoryUsage: [],
      cacheHitRates: [],
      apiCallTimes: []
    };
    
    this.photoCache = new Map();
    this.photoCacheSize = 0;
    this.maxCacheSize = 50 * 1024 * 1024; // 50MB cache limit
    this.maxCacheEntries = 200; // Maximum number of cached photos
    
    this.imageLoadQueue = [];
    this.maxConcurrentLoads = 6; // Limit concurrent image loads
    this.currentLoads = 0;
    
    this.intersectionObserver = null;
    this.setupIntersectionObserver();
    
    this.performanceObserver = null;
    this.setupPerformanceObserver();
    
    // Debounced functions for performance
    this.debouncedMemoryCheck = this.debounce(this.checkMemoryUsage.bind(this), 5000);
    this.debouncedCacheCleanup = this.debounce(this.cleanupCache.bind(this), 10000);
  }

  /**
   * Setup intersection observer for lazy loading
   */
  setupIntersectionObserver() {
    if ('IntersectionObserver' in window) {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              this.loadImageLazily(entry.target);
              this.intersectionObserver.unobserve(entry.target);
            }
          });
        },
        {
          rootMargin: '50px 0px', // Start loading 50px before entering viewport
          threshold: 0.1
        }
      );
    }
  }

  /**
   * Setup performance observer for monitoring
   */
  setupPerformanceObserver() {
    if ('PerformanceObserver' in window) {
      try {
        this.performanceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.name.includes('photo-load')) {
              this.metrics.photoLoadTimes.push({
                duration: entry.duration,
                timestamp: entry.startTime,
                name: entry.name
              });
            } else if (entry.name.includes('grid-render')) {
              this.metrics.gridRenderTimes.push({
                duration: entry.duration,
                timestamp: entry.startTime,
                name: entry.name
              });
            }
          });
          
          // Keep only recent metrics (last 100 entries)
          Object.keys(this.metrics).forEach(key => {
            if (Array.isArray(this.metrics[key]) && this.metrics[key].length > 100) {
              this.metrics[key] = this.metrics[key].slice(-100);
            }
          });
        });
        
        this.performanceObserver.observe({ entryTypes: ['measure'] });
      } catch (error) {
        console.warn('Performance Observer not supported:', error);
      }
    }
  }

  /**
   * Optimize photo loading with batching and prioritization
   * @param {Array} photoUrls - Array of photo URLs to load
   * @param {Object} options - Loading options
   */
  async optimizePhotoLoading(photoUrls, options = {}) {
    const {
      priority = 'normal', // 'high', 'normal', 'low'
      batchSize = 6,
      preload = false
    } = options;

    const startTime = performance.now();
    performance.mark('photo-batch-start');

    try {
      // Filter out already cached photos
      const uncachedUrls = photoUrls.filter(url => !this.photoCache.has(url));
      
      if (uncachedUrls.length === 0) {
        this.recordCacheHit(photoUrls.length, 0);
        return Promise.resolve();
      }

      // Sort by priority
      const prioritizedUrls = this.prioritizePhotoUrls(uncachedUrls, priority);
      
      // Load in batches to avoid overwhelming the browser
      const batches = this.createBatches(prioritizedUrls, batchSize);
      const loadPromises = [];

      for (const batch of batches) {
        const batchPromise = this.loadPhotoBatch(batch, preload);
        loadPromises.push(batchPromise);
        
        // Add small delay between batches to prevent browser lockup
        if (batches.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      await Promise.allSettled(loadPromises);
      
      performance.mark('photo-batch-end');
      performance.measure('photo-batch-load', 'photo-batch-start', 'photo-batch-end');
      
      this.recordCacheHit(photoUrls.length - uncachedUrls.length, uncachedUrls.length);
      this.debouncedMemoryCheck();
      
    } catch (error) {
      console.error('Photo loading optimization failed:', error);
    }
  }

  /**
   * Load a batch of photos with concurrency control
   * @param {Array} urls - URLs to load
   * @param {boolean} preload - Whether to preload or fully load
   */
  async loadPhotoBatch(urls, preload = false) {
    const loadPromises = urls.map(url => this.loadSinglePhoto(url, preload));
    return Promise.allSettled(loadPromises);
  }

  /**
   * Load a single photo with caching and error handling
   * @param {string} url - Photo URL
   * @param {boolean} preload - Whether to preload only
   */
  async loadSinglePhoto(url, preload = false) {
    if (this.photoCache.has(url)) {
      return this.photoCache.get(url);
    }

    // Wait for available slot if at max concurrent loads
    while (this.currentLoads >= this.maxConcurrentLoads) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    this.currentLoads++;
    const startTime = performance.now();
    performance.mark(`photo-load-start-${url}`);

    try {
      const img = new Image();
      
      const loadPromise = new Promise((resolve, reject) => {
        img.onload = () => {
          const loadTime = performance.now() - startTime;
          performance.mark(`photo-load-end-${url}`);
          performance.measure(`photo-load-${url}`, `photo-load-start-${url}`, `photo-load-end-${url}`);
          
          // Cache the loaded image
          this.cachePhoto(url, img, loadTime);
          resolve(img);
        };
        
        img.onerror = () => {
          console.warn(`Failed to load photo: ${url}`);
          reject(new Error(`Failed to load photo: ${url}`));
        };
        
        // Set timeout for slow loading images
        setTimeout(() => {
          if (!img.complete) {
            reject(new Error(`Photo load timeout: ${url}`));
          }
        }, 10000);
      });

      // Set source after setting up event handlers
      img.src = url;
      
      if (preload) {
        // For preloading, we don't need to wait for the image to fully load
        return Promise.resolve();
      }
      
      return await loadPromise;
      
    } catch (error) {
      console.error(`Error loading photo ${url}:`, error);
      throw error;
    } finally {
      this.currentLoads--;
    }
  }

  /**
   * Cache a loaded photo with size tracking
   * @param {string} url - Photo URL
   * @param {Image} img - Loaded image
   * @param {number} loadTime - Time taken to load
   */
  cachePhoto(url, img, loadTime) {
    // Estimate image size (rough approximation)
    const estimatedSize = (img.naturalWidth || 800) * (img.naturalHeight || 600) * 4; // 4 bytes per pixel
    
    // Check if adding this image would exceed cache limits
    if (this.photoCacheSize + estimatedSize > this.maxCacheSize || 
        this.photoCache.size >= this.maxCacheEntries) {
      this.debouncedCacheCleanup();
    }

    this.photoCache.set(url, {
      image: img,
      size: estimatedSize,
      loadTime: loadTime,
      lastAccessed: Date.now(),
      accessCount: 1
    });
    
    this.photoCacheSize += estimatedSize;
  }

  /**
   * Cleanup cache using LRU strategy
   */
  cleanupCache() {
    if (this.photoCache.size === 0) return;

    // Convert to array and sort by last accessed time and access count
    const cacheEntries = Array.from(this.photoCache.entries()).map(([url, data]) => ({
      url,
      ...data,
      score: data.accessCount * 0.7 + (Date.now() - data.lastAccessed) * 0.3
    }));

    // Sort by score (lower score = more likely to be removed)
    cacheEntries.sort((a, b) => a.score - b.score);

    // Remove entries until we're under limits
    const targetSize = this.maxCacheSize * 0.8; // Clean to 80% of max
    const targetEntries = Math.floor(this.maxCacheEntries * 0.8);

    let removedSize = 0;
    let removedCount = 0;

    for (const entry of cacheEntries) {
      if (this.photoCacheSize - removedSize <= targetSize && 
          this.photoCache.size - removedCount <= targetEntries) {
        break;
      }

      this.photoCache.delete(entry.url);
      removedSize += entry.size;
      removedCount++;
    }

    this.photoCacheSize -= removedSize;
    
    console.log(`Cache cleanup: removed ${removedCount} entries, freed ${(removedSize / 1024 / 1024).toFixed(2)}MB`);
  }

  /**
   * Prioritize photo URLs based on priority and context
   * @param {Array} urls - Photo URLs
   * @param {string} priority - Priority level
   */
  prioritizePhotoUrls(urls, priority) {
    // For now, simple prioritization - could be enhanced with viewport detection
    if (priority === 'high') {
      return urls; // Keep original order for high priority
    } else if (priority === 'low') {
      return urls.reverse(); // Reverse for low priority
    }
    return urls; // Normal priority keeps original order
  }

  /**
   * Create batches from array
   * @param {Array} array - Array to batch
   * @param {number} batchSize - Size of each batch
   */
  createBatches(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Setup lazy loading for an image element
   * @param {HTMLElement} imgElement - Image element to lazy load
   */
  setupLazyLoading(imgElement) {
    if (this.intersectionObserver && imgElement.dataset.src) {
      imgElement.classList.add('lazy-loading');
      this.intersectionObserver.observe(imgElement);
    }
  }

  /**
   * Load image lazily when it enters viewport
   * @param {HTMLElement} imgElement - Image element
   */
  async loadImageLazily(imgElement) {
    const src = imgElement.dataset.src;
    if (!src) return;

    try {
      imgElement.classList.add('loading');
      
      // Check cache first
      if (this.photoCache.has(src)) {
        const cached = this.photoCache.get(src);
        cached.lastAccessed = Date.now();
        cached.accessCount++;
        imgElement.src = src;
        imgElement.classList.remove('loading', 'lazy-loading');
        imgElement.classList.add('loaded');
        return;
      }

      // Load the image
      await this.loadSinglePhoto(src);
      imgElement.src = src;
      imgElement.classList.remove('loading', 'lazy-loading');
      imgElement.classList.add('loaded');
      
    } catch (error) {
      console.error('Lazy loading failed:', error);
      imgElement.classList.remove('loading', 'lazy-loading');
      imgElement.classList.add('error');
    }
  }

  /**
   * Monitor grid rendering performance
   * @param {Function} renderFunction - Function that renders the grid
   * @param {string} renderType - Type of render (card/player)
   */
  async monitorGridRender(renderFunction, renderType = 'unknown') {
    const startTime = performance.now();
    const markStart = `grid-render-start-${renderType}`;
    const markEnd = `grid-render-end-${renderType}`;
    
    performance.mark(markStart);
    
    try {
      const result = await renderFunction();
      
      performance.mark(markEnd);
      performance.measure(`grid-render-${renderType}`, markStart, markEnd);
      
      const renderTime = performance.now() - startTime;
      
      // Log slow renders
      if (renderTime > 100) {
        console.warn(`Slow grid render detected: ${renderType} took ${renderTime.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      performance.mark(markEnd);
      performance.measure(`grid-render-${renderType}-error`, markStart, markEnd);
      throw error;
    }
  }

  /**
   * Check memory usage and trigger cleanup if needed
   */
  checkMemoryUsage() {
    if ('memory' in performance) {
      const memInfo = performance.memory;
      const memoryUsage = {
        used: memInfo.usedJSHeapSize,
        total: memInfo.totalJSHeapSize,
        limit: memInfo.jsHeapSizeLimit,
        timestamp: Date.now()
      };
      
      this.metrics.memoryUsage.push(memoryUsage);
      
      // Trigger cleanup if memory usage is high
      const usageRatio = memoryUsage.used / memoryUsage.limit;
      if (usageRatio > 0.8) {
        console.warn('High memory usage detected, triggering cache cleanup');
        this.cleanupCache();
      }
    }
  }

  /**
   * Record cache hit/miss statistics
   * @param {number} hits - Number of cache hits
   * @param {number} misses - Number of cache misses
   */
  recordCacheHit(hits, misses) {
    const total = hits + misses;
    if (total > 0) {
      const hitRate = (hits / total) * 100;
      this.metrics.cacheHitRates.push({
        hitRate,
        hits,
        misses,
        total,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Get performance metrics summary
   */
  getPerformanceMetrics() {
    const summary = {
      photoCache: {
        size: this.photoCache.size,
        memoryUsage: `${(this.photoCacheSize / 1024 / 1024).toFixed(2)}MB`,
        maxSize: `${(this.maxCacheSize / 1024 / 1024).toFixed(2)}MB`,
        hitRate: this.getAverageHitRate()
      },
      averageLoadTime: this.getAverageLoadTime(),
      averageRenderTime: this.getAverageRenderTime(),
      memoryTrend: this.getMemoryTrend(),
      recommendations: this.getPerformanceRecommendations()
    };
    
    return summary;
  }

  /**
   * Get average cache hit rate
   */
  getAverageHitRate() {
    if (this.metrics.cacheHitRates.length === 0) return 0;
    
    const totalHitRate = this.metrics.cacheHitRates.reduce((sum, entry) => sum + entry.hitRate, 0);
    return (totalHitRate / this.metrics.cacheHitRates.length).toFixed(1);
  }

  /**
   * Get average photo load time
   */
  getAverageLoadTime() {
    if (this.metrics.photoLoadTimes.length === 0) return 0;
    
    const totalTime = this.metrics.photoLoadTimes.reduce((sum, entry) => sum + entry.duration, 0);
    return (totalTime / this.metrics.photoLoadTimes.length).toFixed(2);
  }

  /**
   * Get average grid render time
   */
  getAverageRenderTime() {
    if (this.metrics.gridRenderTimes.length === 0) return 0;
    
    const totalTime = this.metrics.gridRenderTimes.reduce((sum, entry) => sum + entry.duration, 0);
    return (totalTime / this.metrics.gridRenderTimes.length).toFixed(2);
  }

  /**
   * Get memory usage trend
   */
  getMemoryTrend() {
    if (this.metrics.memoryUsage.length < 2) return 'stable';
    
    const recent = this.metrics.memoryUsage.slice(-5);
    const trend = recent[recent.length - 1].used - recent[0].used;
    
    if (trend > 10 * 1024 * 1024) return 'increasing'; // 10MB increase
    if (trend < -10 * 1024 * 1024) return 'decreasing'; // 10MB decrease
    return 'stable';
  }

  /**
   * Get performance recommendations
   */
  getPerformanceRecommendations() {
    const recommendations = [];
    
    const avgLoadTime = parseFloat(this.getAverageLoadTime());
    if (avgLoadTime > 1000) {
      recommendations.push('Consider reducing image sizes or implementing progressive loading');
    }
    
    const avgRenderTime = parseFloat(this.getAverageRenderTime());
    if (avgRenderTime > 100) {
      recommendations.push('Grid rendering is slow - consider virtualization for large datasets');
    }
    
    const hitRate = parseFloat(this.getAverageHitRate());
    if (hitRate < 50) {
      recommendations.push('Low cache hit rate - consider increasing cache size or improving cache strategy');
    }
    
    const memoryTrend = this.getMemoryTrend();
    if (memoryTrend === 'increasing') {
      recommendations.push('Memory usage is increasing - monitor for memory leaks');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Performance looks good!');
    }
    
    return recommendations;
  }

  /**
   * Debounce utility function
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    this.photoCache.clear();
    this.photoCacheSize = 0;
    this.imageLoadQueue = [];
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceMonitor;
}