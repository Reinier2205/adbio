/**
 * Integration test for error handling system
 * Tests the comprehensive error handling and recovery functionality
 */

// Test configuration
const TEST_CONFIG = {
  eventCode: 'test-error-123',
  playerName: 'Test User',
  secretQuestion: 'What is your favorite color?',
  secretAnswer: 'blue'
};

/**
 * Run comprehensive error handling tests
 */
async function runErrorHandlingTests() {
  console.log('🧪 Starting Error Handling Integration Tests...');
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Initialize components
  const errorHandler = new ErrorHandler();
  const sessionManager = new SessionManager(errorHandler);
  const playerAuthenticator = new PlayerAuthenticator(sessionManager, errorHandler);
  const flowController = new FlowController(sessionManager, playerAuthenticator, null, errorHandler);

  // Test 1: Storage Error Handling
  await runTest('Storage Error Handling', async () => {
    // Test safe storage operation
    const result = await errorHandler.safeStorageOperation('setItem', 'test-key', 'test-value');
    if (!result.success) {
      throw new Error(`Storage operation failed: ${result.error}`);
    }

    // Test retrieval
    const getResult = await errorHandler.safeStorageOperation('getItem', 'test-key');
    if (!getResult.success || getResult.value !== 'test-value') {
      throw new Error('Storage retrieval failed');
    }

    return 'Storage operations working correctly';
  }, results);

  // Test 2: Corrupted Data Detection
  await runTest('Corrupted Data Detection', async () => {
    const corruptedData = '{"playerName":"John","incomplete';
    const result = await errorHandler.detectCorruptedData('test-corrupted', corruptedData);
    
    if (result.success) {
      return 'Data recovery successful';
    } else if (result.action === 'corruption_recovery_needed') {
      return 'Corruption detected correctly, recovery options provided';
    } else {
      throw new Error('Corrupted data detection failed');
    }
  }, results);

  // Test 3: Network Connectivity Handling
  await runTest('Network Connectivity Handling', async () => {
    const networkResult = errorHandler.handleNetworkConnectivity();
    
    if (!networkResult.success) {
      throw new Error('Network connectivity check failed');
    }

    // Test action queueing
    const queued = errorHandler.queueActionForOnline('test_action', { data: 'test' });
    if (!queued) {
      throw new Error('Action queueing failed');
    }

    return `Network status: ${networkResult.isOnline ? 'online' : 'offline'}, action queued`;
  }, results);

  // Test 4: Error Logging
  await runTest('Error Logging', async () => {
    const initialCount = errorHandler.errorLog.length;
    
    // Generate test errors
    errorHandler._logError('test_error_1', { message: 'Test error 1' });
    errorHandler._logError('test_error_2', { message: 'Test error 2' });
    
    if (errorHandler.errorLog.length !== initialCount + 2) {
      throw new Error('Error logging failed');
    }

    // Test analytics
    const analytics = errorHandler.getErrorAnalytics();
    if (!analytics.totalErrors || !analytics.errorsByType) {
      throw new Error('Error analytics failed');
    }

    return `Logged ${errorHandler.errorLog.length} errors, analytics generated`;
  }, results);

  // Test 5: SessionManager Integration
  await runTest('SessionManager Integration', async () => {
    const { eventCode, playerName, secretQuestion, secretAnswer } = TEST_CONFIG;
    
    // Test session save with error handling
    const saveSuccess = await sessionManager.savePlayerSession(eventCode, playerName, secretQuestion, secretAnswer);
    if (!saveSuccess) {
      throw new Error('Session save failed');
    }

    // Test session retrieval with error handling
    const session = await sessionManager.getPlayerSession(eventCode);
    if (!session || session.playerName !== playerName) {
      throw new Error('Session retrieval failed');
    }

    return 'SessionManager integration successful';
  }, results);

  // Test 6: PlayerAuthenticator Integration
  await runTest('PlayerAuthenticator Integration', async () => {
    const { eventCode, playerName, secretQuestion, secretAnswer } = TEST_CONFIG;
    
    // Test authentication with error handling
    const authResult = await playerAuthenticator.authenticatePlayer(eventCode, playerName, secretAnswer);
    if (!authResult.success) {
      throw new Error(`Authentication failed: ${authResult.error}`);
    }

    return 'PlayerAuthenticator integration successful';
  }, results);

  // Test 7: FlowController Integration
  await runTest('FlowController Integration', async () => {
    const result = await flowController.determineUserIntent();
    
    if (!result || !result.action) {
      throw new Error('FlowController intent determination failed');
    }

    return `FlowController integration successful, action: ${result.action}`;
  }, results);

  // Test 8: Error Recovery Suggestions
  await runTest('Error Recovery Suggestions', async () => {
    const suggestions = errorHandler.getErrorRecoverySuggestions('storage_operation_failed');
    
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      throw new Error('Error recovery suggestions failed');
    }

    return `Generated ${suggestions.length} recovery suggestions`;
  }, results);

  // Print results
  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

  if (results.failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.tests.filter(t => !t.passed).forEach(test => {
      console.log(`  - ${test.name}: ${test.error}`);
    });
  }

  return results;
}

/**
 * Run a single test
 */
async function runTest(name, testFn, results) {
  try {
    console.log(`🔍 Testing: ${name}`);
    const result = await testFn();
    console.log(`✅ ${name}: ${result}`);
    
    results.passed++;
    results.tests.push({ name, passed: true, result });
  } catch (error) {
    console.error(`❌ ${name}: ${error.message}`);
    
    results.failed++;
    results.tests.push({ name, passed: false, error: error.message });
  }
}

/**
 * Test error notification system
 */
function testErrorNotifications() {
  console.log('🔔 Testing Error Notifications...');
  
  const errorHandler = new ErrorHandler();
  
  // Test different notification types
  const notifications = [
    { type: 'localStorage_unavailable', message: 'Testing localStorage unavailable notification' },
    { type: 'quota_exceeded', message: 'Testing quota exceeded notification' },
    { type: 'storage_fallback', storageType: 'sessionStorage' },
    { type: 'corrupted_data', message: 'Testing corrupted data notification' }
  ];

  notifications.forEach((config, index) => {
    setTimeout(() => {
      errorHandler.createStorageNotification(config.type, config);
      console.log(`📢 Created notification: ${config.type}`);
    }, index * 2000); // Stagger notifications
  });
}

// Export functions for use in browser
if (typeof window !== 'undefined') {
  window.runErrorHandlingTests = runErrorHandlingTests;
  window.testErrorNotifications = testErrorNotifications;
}

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runErrorHandlingTests,
    testErrorNotifications
  };
}