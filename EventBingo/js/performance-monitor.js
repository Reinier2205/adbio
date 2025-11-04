/**
 * Performance Monitor - Comprehensive performance monitoring for EventBingo
 * Tracks session operations, memory usage, and provides performance alerts
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      sessionOperations: [],
      memoryUsage: [],
      pageLoadTimes: [],
      userInteractions: [],
      errors: []
    };
    
    this.thresholds = {
      slowOperation: 100, // ms
      memoryWarning: 50 * 1024 * 1024, // 50MB
      memoryAlert: 100 * 1024 * 1024, // 100MB
      maxMetricsHistory: 1000
    };
    
    this.observers = [];
    this.isMonitoring = false;
    this.startTime = performance.now();
    
    // Initialize monitoring
    this.initializeMonitoring();
  }

  /**
   * Initialize performance monitoring
   */
  initializeMonitoring() {
    try {
      // Monitor page load performance
      this.monitorPageLoad();
      
      // Monitor memory usage
      this.startMemoryMonitoring();
      
      // Monitor user interactions
      this.monitorUserInteractions();
      
      // Monitor localStorage operations
      this.monitorStorageOperations();
      
      this.isMonitoring = true;
      console.log('Performance monitoring initialized');
    } catch (error) {
      console.error('Failed to initialize performance monitoring:', error);
    }
  }

  /**
   * Record a session operation timing
   * @param {string} operation - Operation name
   * @param {number} duration - Duration in milliseconds
   * @param {string} source - Data source (cache/storage/network)
   * @param {Object} metadata - Additional metadata
   */
  recordSessionOperation(operation, duration, source = 'unknown', metadata = {}) {
    const record = {
      operation,
      duration,
      source,
      metadata,
      timestamp: Date.now(),
      performanceNow: performance.now()
    };
    
    this.metrics.sessionOperations.push(record);
    
    // Trim history if too long
    if (this.metrics.sessionOperations.length > this.thresholds.maxMetricsHistory) {
      this.metrics.sessionOperations.shift();
    }
    
    // Check for slow operations
    if (duration > this.thresholds.slowOperation) {
      this.alertSlowOperation(operation, duration, source);
    }
    
    // Notify observers
    this.notifyObservers('sessionOperation', record);
  }

  /**
   * Record memory usage
   * @param {string} context - Context of memory measurement
   */
  recordMemoryUsage(context = 'general') {
    try {
      if (!performance.memory) {
        return null;
      }
      
      const memoryInfo = {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit,
        context,
        timestamp: Date.now(),
        performanceNow: performance.now()
      };
      
      this.metrics.memoryUsage.push(memoryInfo);
      
      // Trim history
      if (this.metrics.memoryUsage.length > this.thresholds.maxMetricsHistory) {
        this.metrics.memoryUsage.shift();
      }
      
      // Check memory thresholds
      if (memoryInfo.used > this.thresholds.memoryAlert) {
        this.alertHighMemoryUsage(memoryInfo, 'alert');
      } else if (memoryInfo.used > this.thresholds.memoryWarning) {
        this.alertHighMemoryUsage(memoryInfo, 'warning');
      }
      
      // Notify observers
      this.notifyObservers('memoryUsage', memoryInfo);
      
      return memoryInfo;
    } catch (error) {
      console.error('Failed to record memory usage:', error);
      return null;
    }
  }

  /**
   * Record page load timing
   * @param {string} page - Page identifier
   */
  recordPageLoad(page = window.location.pathname) {
    try {
      if (!performance.timing) {
        return null;
      }
      
      const timing = performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      const domReady = timing.domContentLoadedEventEnd - timing.navigationStart;
      
      const pageLoadInfo = {
        page,
        loadTime,
        domReady,
        navigationStart: timing.navigationStart,
        domContentLoaded: timing.domContentLoadedEventEnd,
        loadEventEnd: timing.loadEventEnd,
        timestamp: Date.now(),
        performanceNow: performance.now()
      };
      
      this.metrics.pageLoadTimes.push(pageLoadInfo);
      
      // Trim history
      if (this.metrics.pageLoadTimes.length > this.thresholds.maxMetricsHistory) {
        this.metrics.pageLoadTimes.shift();
      }
      
      // Notify observers
      this.notifyObservers('pageLoad', pageLoadInfo);
      
      return pageLoadInfo;
    } catch (error) {
      console.error('Failed to record page load timing:', error);
      return null;
    }
  }

  /**
   * Record user interaction timing
   * @param {string} interaction - Interaction type
   * @param {number} duration - Duration in milliseconds
   * @param {Object} metadata - Additional metadata
   */
  recordUserInteraction(interaction, duration, metadata = {}) {
    const record = {
      interaction,
      duration,
      metadata,
      timestamp: Date.now(),
      performanceNow: performance.now()
    };
    
    this.metrics.userInteractions.push(record);
    
    // Trim history
    if (this.metrics.userInteractions.length > this.thresholds.maxMetricsHistory) {
      this.metrics.userInteractions.shift();
    }
    
    // Notify observers
    this.notifyObservers('userInteraction', record);
  }

  /**
   * Record performance error
   * @param {string} error - Error description
   * @param {string} context - Error context
   * @param {Object} metadata - Additional metadata
   */
  recordError(error, context = 'unknown', metadata = {}) {
    const record = {
      error,
      context,
      metadata,
      timestamp: Date.now(),
      performanceNow: performance.now()
    };
    
    this.metrics.errors.push(record);
    
    // Trim history
    if (this.metrics.errors.length > this.thresholds.maxMetricsHistory) {
      this.metrics.errors.shift();
    }
    
    // Notify observers
    this.notifyObservers('error', record);
  }

  /**
   * Get performance summary
   * @returns {Object} Performance summary
   */
  getPerformanceSummary() {
    const now = performance.now();
    const sessionDuration = now - this.startTime;
    
    return {
      sessionDuration: Math.round(sessionDuration),
      sessionOperations: this.getSessionOperationsSummary(),
      memoryUsage: this.getMemoryUsageSummary(),
      pageLoad: this.getPageLoadSummary(),
      userInteractions: this.getUserInteractionsSummary(),
      errors: this.getErrorsSummary(),
      timestamp: Date.now()
    };
  }

  /**
   * Get session operations summary
   * @returns {Object} Session operations summary
   */
  getSessionOperationsSummary() {
    const operations = this.metrics.sessionOperations;
    
    if (operations.length === 0) {
      return { count: 0 };
    }
    
    const durations = operations.map(op => op.duration);
    const sources = operations.reduce((acc, op) => {
      acc[op.source] = (acc[op.source] || 0) + 1;
      return acc;
    }, {});
    
    return {
      count: operations.length,
      averageDuration: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      slowOperations: operations.filter(op => op.duration > this.thresholds.slowOperation).length,
      sourceBreakdown: sources,
      recentOperations: operations.slice(-10)
    };
  }

  /**
   * Get memory usage summary
   * @returns {Object} Memory usage summary
   */
  getMemoryUsageSummary() {
    const memoryRecords = this.metrics.memoryUsage;
    
    if (memoryRecords.length === 0) {
      return { available: false };
    }
    
    const latest = memoryRecords[memoryRecords.length - 1];
    const usedMB = Math.round(latest.used / 1024 / 1024);
    const totalMB = Math.round(latest.total / 1024 / 1024);
    const limitMB = Math.round(latest.limit / 1024 / 1024);
    
    return {
      available: true,
      current: {
        used: usedMB,
        total: totalMB,
        limit: limitMB,
        percentage: Math.round((latest.used / latest.limit) * 100)
      },
      trend: this.getMemoryTrend(),
      alerts: this.getMemoryAlerts()
    };
  }

  /**
   * Get page load summary
   * @returns {Object} Page load summary
   */
  getPageLoadSummary() {
    const pageLoads = this.metrics.pageLoadTimes;
    
    if (pageLoads.length === 0) {
      return { count: 0 };
    }
    
    const loadTimes = pageLoads.map(pl => pl.loadTime);
    const domTimes = pageLoads.map(pl => pl.domReady);
    
    return {
      count: pageLoads.length,
      averageLoadTime: Math.round(loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length),
      averageDomReady: Math.round(domTimes.reduce((a, b) => a + b, 0) / domTimes.length),
      latest: pageLoads[pageLoads.length - 1]
    };
  }

  /**
   * Get user interactions summary
   * @returns {Object} User interactions summary
   */
  getUserInteractionsSummary() {
    const interactions = this.metrics.userInteractions;
    
    if (interactions.length === 0) {
      return { count: 0 };
    }
    
    const interactionTypes = interactions.reduce((acc, int) => {
      acc[int.interaction] = (acc[int.interaction] || 0) + 1;
      return acc;
    }, {});
    
    return {
      count: interactions.length,
      types: interactionTypes,
      recent: interactions.slice(-5)
    };
  }

  /**
   * Get errors summary
   * @returns {Object} Errors summary
   */
  getErrorsSummary() {
    const errors = this.metrics.errors;
    
    return {
      count: errors.length,
      recent: errors.slice(-5),
      contexts: errors.reduce((acc, err) => {
        acc[err.context] = (acc[err.context] || 0) + 1;
        return acc;
      }, {})
    };
  }

  /**
   * Add performance observer
   * @param {Function} callback - Observer callback
   * @returns {Function} Unsubscribe function
   */
  addObserver(callback) {
    this.observers.push(callback);
    
    return () => {
      const index = this.observers.indexOf(callback);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics = {
      sessionOperations: [],
      memoryUsage: [],
      pageLoadTimes: [],
      userInteractions: [],
      errors: []
    };
    
    this.startTime = performance.now();
    console.log('Performance metrics cleared');
  }

  /**
   * Export metrics for analysis
   * @returns {Object} Exported metrics
   */
  exportMetrics() {
    return {
      ...this.metrics,
      summary: this.getPerformanceSummary(),
      thresholds: this.thresholds,
      exportTime: Date.now()
    };
  }

  // Private methods

  /**
   * Monitor page load performance
   */
  monitorPageLoad() {
    if (document.readyState === 'complete') {
      this.recordPageLoad();
    } else {
      window.addEventListener('load', () => {
        setTimeout(() => this.recordPageLoad(), 100);
      });
    }
  }

  /**
   * Start memory monitoring
   */
  startMemoryMonitoring() {
    if (!performance.memory) {
      console.warn('Memory monitoring not available in this browser');
      return;
    }
    
    // Record initial memory usage
    this.recordMemoryUsage('initialization');
    
    // Monitor memory every 30 seconds
    setInterval(() => {
      this.recordMemoryUsage('periodic');
    }, 30000);
  }

  /**
   * Monitor user interactions
   */
  monitorUserInteractions() {
    const interactionTypes = ['click', 'keydown', 'scroll', 'resize'];
    
    interactionTypes.forEach(type => {
      let startTime = null;
      
      document.addEventListener(type, (event) => {
        if (type === 'keydown' || type === 'click') {
          startTime = performance.now();
          
          // Record interaction after a short delay to capture processing time
          setTimeout(() => {
            const duration = performance.now() - startTime;
            this.recordUserInteraction(type, duration, {
              target: event.target.tagName,
              key: event.key || null
            });
          }, 10);
        } else {
          // For scroll and resize, just record the event
          this.recordUserInteraction(type, 0, {
            target: event.target.tagName || 'window'
          });
        }
      }, { passive: true });
    });
  }

  /**
   * Monitor localStorage operations
   */
  monitorStorageOperations() {
    const originalSetItem = localStorage.setItem;
    const originalGetItem = localStorage.getItem;
    const originalRemoveItem = localStorage.removeItem;
    
    localStorage.setItem = (key, value) => {
      const startTime = performance.now();
      const result = originalSetItem.call(localStorage, key, value);
      const duration = performance.now() - startTime;
      
      this.recordSessionOperation('localStorage.setItem', duration, 'storage', {
        keyLength: key.length,
        valueLength: value ? value.length : 0
      });
      
      return result;
    };
    
    localStorage.getItem = (key) => {
      const startTime = performance.now();
      const result = originalGetItem.call(localStorage, key);
      const duration = performance.now() - startTime;
      
      this.recordSessionOperation('localStorage.getItem', duration, 'storage', {
        keyLength: key.length,
        found: result !== null
      });
      
      return result;
    };
    
    localStorage.removeItem = (key) => {
      const startTime = performance.now();
      const result = originalRemoveItem.call(localStorage, key);
      const duration = performance.now() - startTime;
      
      this.recordSessionOperation('localStorage.removeItem', duration, 'storage', {
        keyLength: key.length
      });
      
      return result;
    };
  }

  /**
   * Get memory usage trend
   * @returns {string} Trend direction
   */
  getMemoryTrend() {
    const memoryRecords = this.metrics.memoryUsage;
    
    if (memoryRecords.length < 2) {
      return 'unknown';
    }
    
    const recent = memoryRecords.slice(-5);
    const first = recent[0].used;
    const last = recent[recent.length - 1].used;
    
    const change = ((last - first) / first) * 100;
    
    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }

  /**
   * Get memory alerts
   * @returns {Array} Active memory alerts
   */
  getMemoryAlerts() {
    const memoryRecords = this.metrics.memoryUsage;
    
    if (memoryRecords.length === 0) {
      return [];
    }
    
    const latest = memoryRecords[memoryRecords.length - 1];
    const alerts = [];
    
    if (latest.used > this.thresholds.memoryAlert) {
      alerts.push({
        level: 'alert',
        message: `High memory usage: ${Math.round(latest.used / 1024 / 1024)}MB`
      });
    } else if (latest.used > this.thresholds.memoryWarning) {
      alerts.push({
        level: 'warning',
        message: `Elevated memory usage: ${Math.round(latest.used / 1024 / 1024)}MB`
      });
    }
    
    return alerts;
  }

  /**
   * Alert for slow operations
   * @param {string} operation - Operation name
   * @param {number} duration - Duration in milliseconds
   * @param {string} source - Data source
   */
  alertSlowOperation(operation, duration, source) {
    console.warn(`Slow ${operation} operation (${source}): ${Math.round(duration)}ms`);
    
    this.recordError(`Slow operation: ${operation}`, 'performance', {
      duration,
      source,
      threshold: this.thresholds.slowOperation
    });
  }

  /**
   * Alert for high memory usage
   * @param {Object} memoryInfo - Memory information
   * @param {string} level - Alert level
   */
  alertHighMemoryUsage(memoryInfo, level) {
    const usedMB = Math.round(memoryInfo.used / 1024 / 1024);
    const message = `${level === 'alert' ? 'High' : 'Elevated'} memory usage: ${usedMB}MB`;
    
    console.warn(message);
    
    this.recordError(message, 'memory', {
      used: memoryInfo.used,
      total: memoryInfo.total,
      percentage: Math.round((memoryInfo.used / memoryInfo.limit) * 100)
    });
  }

  /**
   * Notify observers of performance events
   * @param {string} type - Event type
   * @param {Object} data - Event data
   */
  notifyObservers(type, data) {
    this.observers.forEach(callback => {
      try {
        callback(type, data);
      } catch (error) {
        console.error('Performance observer error:', error);
      }
    });
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceMonitor;
}

// Make available globally for browser use
if (typeof window !== 'undefined') {
  window.PerformanceMonitor = PerformanceMonitor;
}