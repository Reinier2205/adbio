/**
 * Performance Dashboard - Visual interface for performance monitoring
 * Provides real-time performance metrics display and alerts
 */
class PerformanceDashboard {
  constructor(performanceMonitor) {
    this.monitor = performanceMonitor;
    this.isVisible = false;
    this.updateInterval = null;
    this.dashboardElement = null;
    
    // Subscribe to performance events
    this.unsubscribe = this.monitor.addObserver((type, data) => {
      this.handlePerformanceEvent(type, data);
    });
    
    this.createDashboard();
  }

  /**
   * Create the performance dashboard UI
   */
  createDashboard() {
    // Create dashboard container
    this.dashboardElement = document.createElement('div');
    this.dashboardElement.id = 'performance-dashboard';
    this.dashboardElement.className = 'performance-dashboard hidden';
    
    this.dashboardElement.innerHTML = `
      <div class="dashboard-header">
        <h3>🚀 Performance Monitor</h3>
        <div class="dashboard-controls">
          <button class="dashboard-btn" onclick="this.closest('.performance-dashboard').performanceDashboard.exportMetrics()">
            📊 Export
          </button>
          <button class="dashboard-btn" onclick="this.closest('.performance-dashboard').performanceDashboard.clearMetrics()">
            🗑️ Clear
          </button>
          <button class="dashboard-btn dashboard-close" onclick="this.closest('.performance-dashboard').performanceDashboard.hide()">
            ✕
          </button>
        </div>
      </div>
      
      <div class="dashboard-content">
        <div class="metrics-grid">
          <div class="metric-card">
            <h4>Session Operations</h4>
            <div class="metric-value" id="session-ops-count">0</div>
            <div class="metric-detail" id="session-ops-avg">Avg: 0ms</div>
            <div class="metric-chart" id="session-ops-chart"></div>
          </div>
          
          <div class="metric-card">
            <h4>Memory Usage</h4>
            <div class="metric-value" id="memory-used">0 MB</div>
            <div class="metric-detail" id="memory-percentage">0%</div>
            <div class="metric-chart" id="memory-chart"></div>
          </div>
          
          <div class="metric-card">
            <h4>Page Performance</h4>
            <div class="metric-value" id="page-load-time">0ms</div>
            <div class="metric-detail" id="dom-ready-time">DOM: 0ms</div>
            <div class="metric-chart" id="page-chart"></div>
          </div>
          
          <div class="metric-card">
            <h4>User Interactions</h4>
            <div class="metric-value" id="interactions-count">0</div>
            <div class="metric-detail" id="interactions-types">Types: 0</div>
            <div class="metric-chart" id="interactions-chart"></div>
          </div>
        </div>
        
        <div class="alerts-section">
          <h4>Performance Alerts</h4>
          <div class="alerts-container" id="alerts-container">
            <div class="no-alerts">No performance issues detected</div>
          </div>
        </div>
        
        <div class="details-section">
          <h4>Recent Operations</h4>
          <div class="operations-list" id="operations-list"></div>
        </div>
      </div>
    `;
    
    // Add dashboard to page
    document.body.appendChild(this.dashboardElement);
    
    // Store reference for event handlers
    this.dashboardElement.performanceDashboard = this;
    
    // Add styles
    this.addDashboardStyles();
    
    // Create toggle button
    this.createToggleButton();
  }

  /**
   * Show the performance dashboard
   */
  show() {
    this.isVisible = true;
    this.dashboardElement.classList.remove('hidden');
    
    // Start updating metrics
    this.startUpdating();
    
    // Initial update
    this.updateMetrics();
  }

  /**
   * Hide the performance dashboard
   */
  hide() {
    this.isVisible = false;
    this.dashboardElement.classList.add('hidden');
    
    // Stop updating
    this.stopUpdating();
  }

  /**
   * Toggle dashboard visibility
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Start automatic metrics updating
   */
  startUpdating() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.updateInterval = setInterval(() => {
      this.updateMetrics();
    }, 2000); // Update every 2 seconds
  }

  /**
   * Stop automatic metrics updating
   */
  stopUpdating() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Update all metrics displays
   */
  updateMetrics() {
    const summary = this.monitor.getPerformanceSummary();
    
    this.updateSessionOperations(summary.sessionOperations);
    this.updateMemoryUsage(summary.memoryUsage);
    this.updatePagePerformance(summary.pageLoad);
    this.updateUserInteractions(summary.userInteractions);
    this.updateAlerts();
    this.updateRecentOperations();
  }

  /**
   * Update session operations display
   * @param {Object} sessionOps - Session operations summary
   */
  updateSessionOperations(sessionOps) {
    const countEl = document.getElementById('session-ops-count');
    const avgEl = document.getElementById('session-ops-avg');
    const chartEl = document.getElementById('session-ops-chart');
    
    if (countEl) countEl.textContent = sessionOps.count || 0;
    if (avgEl) avgEl.textContent = `Avg: ${sessionOps.averageDuration || 0}ms`;
    
    // Simple chart representation
    if (chartEl && sessionOps.recentOperations) {
      this.renderMiniChart(chartEl, sessionOps.recentOperations.map(op => op.duration));
    }
  }

  /**
   * Update memory usage display
   * @param {Object} memoryUsage - Memory usage summary
   */
  updateMemoryUsage(memoryUsage) {
    const usedEl = document.getElementById('memory-used');
    const percentageEl = document.getElementById('memory-percentage');
    const chartEl = document.getElementById('memory-chart');
    
    if (!memoryUsage.available) {
      if (usedEl) usedEl.textContent = 'N/A';
      if (percentageEl) percentageEl.textContent = 'Not available';
      return;
    }
    
    if (usedEl) usedEl.textContent = `${memoryUsage.current.used} MB`;
    if (percentageEl) {
      percentageEl.textContent = `${memoryUsage.current.percentage}%`;
      percentageEl.className = `metric-detail ${this.getMemoryClass(memoryUsage.current.percentage)}`;
    }
    
    // Memory trend chart
    if (chartEl) {
      const memoryHistory = this.monitor.metrics.memoryUsage.slice(-10);
      this.renderMiniChart(chartEl, memoryHistory.map(m => m.used / 1024 / 1024));
    }
  }

  /**
   * Update page performance display
   * @param {Object} pageLoad - Page load summary
   */
  updatePagePerformance(pageLoad) {
    const loadTimeEl = document.getElementById('page-load-time');
    const domTimeEl = document.getElementById('dom-ready-time');
    
    if (loadTimeEl) loadTimeEl.textContent = `${pageLoad.averageLoadTime || 0}ms`;
    if (domTimeEl) domTimeEl.textContent = `DOM: ${pageLoad.averageDomReady || 0}ms`;
  }

  /**
   * Update user interactions display
   * @param {Object} interactions - User interactions summary
   */
  updateUserInteractions(interactions) {
    const countEl = document.getElementById('interactions-count');
    const typesEl = document.getElementById('interactions-types');
    
    if (countEl) countEl.textContent = interactions.count || 0;
    if (typesEl) {
      const typeCount = Object.keys(interactions.types || {}).length;
      typesEl.textContent = `Types: ${typeCount}`;
    }
  }

  /**
   * Update performance alerts display
   */
  updateAlerts() {
    const alertsContainer = document.getElementById('alerts-container');
    if (!alertsContainer) return;
    
    const summary = this.monitor.getPerformanceSummary();
    const memoryAlerts = summary.memoryUsage.alerts || [];
    const recentErrors = summary.errors.recent || [];
    
    const allAlerts = [
      ...memoryAlerts,
      ...recentErrors.map(error => ({
        level: 'error',
        message: error.error,
        context: error.context
      }))
    ];
    
    if (allAlerts.length === 0) {
      alertsContainer.innerHTML = '<div class="no-alerts">No performance issues detected</div>';
      return;
    }
    
    alertsContainer.innerHTML = allAlerts.map(alert => `
      <div class="alert alert-${alert.level}">
        <span class="alert-icon">${this.getAlertIcon(alert.level)}</span>
        <span class="alert-message">${alert.message}</span>
        ${alert.context ? `<span class="alert-context">(${alert.context})</span>` : ''}
      </div>
    `).join('');
  }

  /**
   * Update recent operations display
   */
  updateRecentOperations() {
    const operationsList = document.getElementById('operations-list');
    if (!operationsList) return;
    
    const recentOps = this.monitor.metrics.sessionOperations.slice(-5);
    
    if (recentOps.length === 0) {
      operationsList.innerHTML = '<div class="no-operations">No recent operations</div>';
      return;
    }
    
    operationsList.innerHTML = recentOps.map(op => `
      <div class="operation-item ${op.duration > this.monitor.thresholds.slowOperation ? 'slow' : ''}">
        <span class="operation-name">${op.operation}</span>
        <span class="operation-duration">${Math.round(op.duration)}ms</span>
        <span class="operation-source">${op.source}</span>
        <span class="operation-time">${new Date(op.timestamp).toLocaleTimeString()}</span>
      </div>
    `).join('');
  }

  /**
   * Handle performance events
   * @param {string} type - Event type
   * @param {Object} data - Event data
   */
  handlePerformanceEvent(type, data) {
    if (!this.isVisible) return;
    
    // Update specific metrics based on event type
    switch (type) {
      case 'sessionOperation':
        this.updateSessionOperations(this.monitor.getSessionOperationsSummary());
        this.updateRecentOperations();
        break;
      case 'memoryUsage':
        this.updateMemoryUsage(this.monitor.getMemoryUsageSummary());
        break;
      case 'error':
        this.updateAlerts();
        break;
    }
  }

  /**
   * Export performance metrics
   */
  exportMetrics() {
    const metrics = this.monitor.exportMetrics();
    const dataStr = JSON.stringify(metrics, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `eventbingo-performance-${Date.now()}.json`;
    link.click();
    
    console.log('Performance metrics exported');
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    if (confirm('Clear all performance metrics?')) {
      this.monitor.clearMetrics();
      this.updateMetrics();
      console.log('Performance metrics cleared');
    }
  }

  /**
   * Create toggle button for dashboard
   */
  createToggleButton() {
    const toggleButton = document.createElement('button');
    toggleButton.id = 'performance-toggle';
    toggleButton.className = 'performance-toggle';
    toggleButton.innerHTML = '📊';
    toggleButton.title = 'Toggle Performance Monitor';
    
    toggleButton.addEventListener('click', () => {
      this.toggle();
    });
    
    document.body.appendChild(toggleButton);
  }

  /**
   * Render a mini chart
   * @param {HTMLElement} container - Chart container
   * @param {Array} data - Data points
   */
  renderMiniChart(container, data) {
    if (!data || data.length === 0) {
      container.innerHTML = '<div class="no-data">No data</div>';
      return;
    }
    
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    const bars = data.slice(-10).map((value, index) => {
      const height = ((value - min) / range) * 100;
      return `<div class="chart-bar" style="height: ${height}%" title="${Math.round(value)}"></div>`;
    }).join('');
    
    container.innerHTML = `<div class="mini-chart">${bars}</div>`;
  }

  /**
   * Get CSS class for memory usage level
   * @param {number} percentage - Memory usage percentage
   * @returns {string} CSS class
   */
  getMemoryClass(percentage) {
    if (percentage > 80) return 'memory-high';
    if (percentage > 60) return 'memory-medium';
    return 'memory-low';
  }

  /**
   * Get icon for alert level
   * @param {string} level - Alert level
   * @returns {string} Icon
   */
  getAlertIcon(level) {
    switch (level) {
      case 'alert': return '🚨';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  }

  /**
   * Add dashboard styles
   */
  addDashboardStyles() {
    if (document.getElementById('performance-dashboard-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'performance-dashboard-styles';
    styles.textContent = `
      .performance-dashboard {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 600px;
        max-height: 80vh;
        background: white;
        border: 1px solid #ddd;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        overflow: hidden;
        transition: all 0.3s ease;
      }
      
      .performance-dashboard.hidden {
        transform: translateX(100%);
        opacity: 0;
        pointer-events: none;
      }
      
      .dashboard-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 15px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .dashboard-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }
      
      .dashboard-controls {
        display: flex;
        gap: 8px;
      }
      
      .dashboard-btn {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        padding: 6px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        transition: background 0.2s ease;
      }
      
      .dashboard-btn:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      
      .dashboard-close {
        padding: 6px 10px;
        font-weight: bold;
      }
      
      .dashboard-content {
        padding: 20px;
        max-height: calc(80vh - 80px);
        overflow-y: auto;
      }
      
      .metrics-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
        margin-bottom: 20px;
      }
      
      .metric-card {
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        padding: 15px;
        text-align: center;
      }
      
      .metric-card h4 {
        margin: 0 0 10px 0;
        font-size: 12px;
        color: #666;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .metric-value {
        font-size: 24px;
        font-weight: bold;
        color: #333;
        margin-bottom: 5px;
      }
      
      .metric-detail {
        font-size: 12px;
        color: #666;
        margin-bottom: 10px;
      }
      
      .metric-detail.memory-high { color: #e74c3c; }
      .metric-detail.memory-medium { color: #f39c12; }
      .metric-detail.memory-low { color: #27ae60; }
      
      .metric-chart {
        height: 40px;
        display: flex;
        align-items: end;
        justify-content: center;
      }
      
      .mini-chart {
        display: flex;
        align-items: end;
        gap: 2px;
        height: 100%;
        width: 100%;
      }
      
      .chart-bar {
        background: linear-gradient(to top, #667eea, #764ba2);
        width: 8px;
        min-height: 2px;
        border-radius: 1px;
        transition: all 0.2s ease;
      }
      
      .chart-bar:hover {
        background: linear-gradient(to top, #5a6fd8, #6a4190);
      }
      
      .no-data {
        color: #999;
        font-size: 12px;
        font-style: italic;
      }
      
      .alerts-section, .details-section {
        margin-bottom: 20px;
      }
      
      .alerts-section h4, .details-section h4 {
        margin: 0 0 10px 0;
        font-size: 14px;
        color: #333;
      }
      
      .alerts-container {
        max-height: 120px;
        overflow-y: auto;
      }
      
      .alert {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        margin-bottom: 5px;
        border-radius: 6px;
        font-size: 12px;
      }
      
      .alert-error {
        background: #fee;
        border: 1px solid #fcc;
        color: #c33;
      }
      
      .alert-warning {
        background: #fff3cd;
        border: 1px solid #ffeaa7;
        color: #856404;
      }
      
      .alert-alert {
        background: #f8d7da;
        border: 1px solid #f5c6cb;
        color: #721c24;
      }
      
      .alert-context {
        font-style: italic;
        opacity: 0.8;
      }
      
      .no-alerts {
        color: #27ae60;
        font-style: italic;
        text-align: center;
        padding: 20px;
      }
      
      .operations-list {
        max-height: 150px;
        overflow-y: auto;
      }
      
      .operation-item {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr 1fr;
        gap: 10px;
        padding: 8px 12px;
        border-bottom: 1px solid #eee;
        font-size: 12px;
        align-items: center;
      }
      
      .operation-item.slow {
        background: #fff3cd;
        border-left: 3px solid #ffc107;
      }
      
      .operation-name {
        font-weight: 500;
        color: #333;
      }
      
      .operation-duration {
        font-weight: bold;
        color: #667eea;
      }
      
      .operation-source {
        color: #666;
        font-size: 11px;
      }
      
      .operation-time {
        color: #999;
        font-size: 11px;
      }
      
      .no-operations {
        color: #999;
        font-style: italic;
        text-align: center;
        padding: 20px;
      }
      
      .performance-toggle {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 9999;
        transition: all 0.3s ease;
      }
      
      .performance-toggle:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
      }
      
      /* Dark mode support */
      body.dark-mode .performance-dashboard {
        background: #2d2d2d;
        border-color: #555;
        color: #fff;
      }
      
      body.dark-mode .metric-card {
        background: #333;
        border-color: #555;
      }
      
      body.dark-mode .metric-value {
        color: #fff;
      }
      
      body.dark-mode .operation-item {
        border-bottom-color: #555;
      }
      
      body.dark-mode .operation-item.slow {
        background: #3d3d2d;
      }
    `;
    
    document.head.appendChild(styles);
  }

  /**
   * Destroy the dashboard
   */
  destroy() {
    this.stopUpdating();
    
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    
    if (this.dashboardElement) {
      this.dashboardElement.remove();
    }
    
    const toggleButton = document.getElementById('performance-toggle');
    if (toggleButton) {
      toggleButton.remove();
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceDashboard;
}

// Make available globally for browser use
if (typeof window !== 'undefined') {
  window.PerformanceDashboard = PerformanceDashboard;
}