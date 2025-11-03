/**
 * Performance Optimization Validation Script
 * Tests the implemented performance optimizations
 */

// Test data generators
function generateTestData() {
  const players = [];
  const photos = {};
  const squares = [];

  // Generate test players
  for (let i = 1; i <= 20; i++) {
    const playerName = `TestPlayer${i}`;
    players.push({
      name: playerName,
      completionCount: Math.floor(Math.random() * 25)
    });

    // Generate photos for each player
    photos[playerName] = {};
    for (let j = 1; j <= 15; j++) {
      if (Math.random() > 0.4) { // 60% completion rate
        photos[playerName][`Challenge ${j}`] = `https://picsum.photos/400/400?random=${i}-${j}`;
      }
    }
  }

  // Generate squares
  for (let i = 0; i < 25; i++) {
    squares.push({
      index: i,
      challengeText: `Challenge ${i + 1}`,
      position: { row: Math.floor(i / 5), col: i % 5 }
    });
  }

  return { players, photos, squares };
}

// Validation tests
async function validatePerformanceOptimizations() {
  console.log('🚀 Starting Performance Optimization Validation...\n');

  try {
    // Test 1: PerformanceMonitor initialization
    console.log('1. Testing PerformanceMonitor initialization...');
    const performanceMonitor = new PerformanceMonitor();
    console.log('✅ PerformanceMonitor initialized successfully');

    // Test 2: Photo loading optimization
    console.log('\n2. Testing photo loading optimization...');
    const testUrls = [];
    for (let i = 1; i <= 10; i++) {
      testUrls.push(`https://picsum.photos/400/400?random=${i}`);
    }

    const loadStart = performance.now();
    await performanceMonitor.optimizePhotoLoading(testUrls, { priority: 'high' });
    const loadTime = performance.now() - loadStart;
    
    console.log(`✅ Photo loading optimization completed in ${loadTime.toFixed(2)}ms`);

    // Test 3: BoardController with performance monitoring
    console.log('\n3. Testing BoardController with performance monitoring...');
    const boardController = new BoardController();
    console.log('✅ BoardController with performance monitoring initialized');

    // Test 4: GridRenderer with caching
    console.log('\n4. Testing GridRenderer with caching...');
    const gridRenderer = new GridRenderer();
    const testData = generateTestData();
    
    // Mock DOM elements for testing
    if (typeof document === 'undefined') {
      global.document = {
        getElementById: () => ({
          style: { display: '' },
          innerHTML: '',
          className: '',
          appendChild: () => {},
          querySelectorAll: () => []
        }),
        createElement: () => ({
          className: '',
          innerHTML: '',
          appendChild: () => {},
          addEventListener: () => {},
          dataset: {},
          style: {}
        }),
        createDocumentFragment: () => ({
          appendChild: () => {}
        })
      };
    }

    // Test card view rendering
    const completionStats = {
      totalPlayers: testData.players.length,
      totalSquares: 25,
      overallCompletion: 65.5,
      squareStats: testData.squares.map((square, index) => ({
        squareIndex: index,
        challengeText: square.challengeText,
        completedBy: testData.players.slice(0, Math.floor(Math.random() * testData.players.length)).map(p => p.name),
        outstandingPlayers: [],
        completionRate: Math.random() * 100
      }))
    };

    const renderStart = performance.now();
    await gridRenderer.renderCardView(completionStats, 'count');
    const renderTime = performance.now() - renderStart;
    
    console.log(`✅ Grid rendering completed in ${renderTime.toFixed(2)}ms`);

    // Test 5: Cache performance
    console.log('\n5. Testing cache performance...');
    const metrics = performanceMonitor.getPerformanceMetrics();
    if (metrics) {
      console.log(`✅ Cache metrics available: ${metrics.photoCache.size} items cached`);
      console.log(`✅ Cache hit rate: ${metrics.photoCache.hitRate}%`);
    }

    // Test 6: Memory management
    console.log('\n6. Testing memory management...');
    performanceMonitor.checkMemoryUsage();
    performanceMonitor.cleanupCache();
    console.log('✅ Memory management functions working');

    // Test 7: Performance recommendations
    console.log('\n7. Testing performance recommendations...');
    const recommendations = metrics?.recommendations || [];
    console.log(`✅ Generated ${recommendations.length} performance recommendations`);
    recommendations.forEach(rec => console.log(`   - ${rec}`));

    console.log('\n🎉 All performance optimization validations passed!');
    
    // Summary
    console.log('\n📊 Performance Summary:');
    console.log(`   - Photo loading: ${loadTime.toFixed(2)}ms for 10 photos`);
    console.log(`   - Grid rendering: ${renderTime.toFixed(2)}ms`);
    console.log(`   - Cache items: ${metrics?.photoCache.size || 0}`);
    console.log(`   - Memory usage: ${metrics?.photoCache.memoryUsage || 'N/A'}`);

    // Cleanup
    performanceMonitor.destroy();
    boardController.destroy();

    return true;

  } catch (error) {
    console.error('❌ Performance optimization validation failed:', error);
    return false;
  }
}

// Run validation if this script is executed directly
if (typeof module !== 'undefined' && require.main === module) {
  // Node.js environment
  const { performance } = require('perf_hooks');
  global.performance = performance;
  
  // Mock browser APIs
  global.window = {};
  global.Image = class {
    constructor() {
      this.onload = null;
      this.onerror = null;
      setTimeout(() => {
        if (this.onload) this.onload();
      }, Math.random() * 100);
    }
    set src(value) {
      this._src = value;
    }
    get src() {
      return this._src;
    }
  };
  
  global.IntersectionObserver = class {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  
  global.PerformanceObserver = class {
    constructor() {}
    observe() {}
    disconnect() {}
  };

  // Load required modules
  const PerformanceMonitor = require('./js/performance-monitor.js');
  const ProgressCalculator = require('./js/progress-calc.js');
  const BoardController = require('./js/board-controller.js');
  const GridRenderer = require('./js/grid-renderer.js');

  global.PerformanceMonitor = PerformanceMonitor;
  global.ProgressCalculator = ProgressCalculator;
  global.BoardController = BoardController;
  global.GridRenderer = GridRenderer;

  validatePerformanceOptimizations().then(success => {
    process.exit(success ? 0 : 1);
  });
}

// Export for browser usage
if (typeof window !== 'undefined') {
  window.validatePerformanceOptimizations = validatePerformanceOptimizations;
}