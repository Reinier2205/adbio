/**
 * Simple test suite for SessionManager
 * Run this in browser console to verify functionality
 */
async function testSessionManager() {
  console.log('🧪 Testing SessionManager...');
  
  const sessionManager = new SessionManager();
  let testsPassed = 0;
  let testsTotal = 0;

  async function test(description, testFn) {
    testsTotal++;
    try {
      const result = await testFn();
      if (result) {
        console.log(`✅ ${description}`);
        testsPassed++;
      } else {
        console.log(`❌ ${description}`);
      }
    } catch (error) {
      console.log(`❌ ${description} - Error: ${error.message}`);
    }
  }

  // Clear any existing test data
  sessionManager.clearPlayerSession('test-event');
  
  // Test 1: Storage availability
  await test('Storage is available', async () => {
    return sessionManager.isStorageAvailable();
  });

  // Test 2: Save player session
  await test('Save player session', async () => {
    return await sessionManager.savePlayerSession(
      'test-event',
      'John Doe',
      'What is your favorite color?',
      'blue'
    );
  });

  // Test 3: Get player session
  await test('Get player session', async () => {
    const session = sessionManager.getPlayerSession('test-event');
    return session && 
           session.playerName === 'John Doe' && 
           session.secretQuestion === 'What is your favorite color?' &&
           session.secretAnswerHash;
  });

  // Test 4: Validate session data
  await test('Validate session data', async () => {
    const session = sessionManager.getPlayerSession('test-event');
    return sessionManager.validateSessionData(session);
  });

  // Test 5: Secret answer validation
  await test('Validate secret answer', async () => {
    const session = sessionManager.getPlayerSession('test-event');
    const isValid = await sessionManager.validateSecretAnswer('blue', session.secretAnswerHash);
    const isInvalid = await sessionManager.validateSecretAnswer('red', session.secretAnswerHash);
    return isValid && !isInvalid;
  });

  // Test 6: Last used event
  await test('Last used event tracking', async () => {
    const lastEvent = sessionManager.getLastUsedEvent();
    return lastEvent === 'test-event';
  });

  // Test 7: Get all sessions
  await test('Get all player sessions', async () => {
    const sessions = sessionManager.getAllPlayerSessions();
    return sessions.length >= 1 && sessions[0].eventCode === 'test-event';
  });

  // Test 8: Session expiration check
  await test('Session expiration check', async () => {
    const session = sessionManager.getPlayerSession('test-event');
    return !sessionManager.isSessionExpired(session);
  });

  // Test 9: Storage info
  await test('Get storage info', async () => {
    const info = sessionManager.getStorageInfo();
    return info.sessionCount >= 1 && info.isAvailable;
  });

  // Test 10: Clear specific session
  await test('Clear player session', async () => {
    return sessionManager.clearPlayerSession('test-event');
  });

  // Test 11: Verify session cleared
  await test('Verify session cleared', async () => {
    const session = sessionManager.getPlayerSession('test-event');
    return session === null;
  });

  // Summary
  console.log(`\n📊 Test Results: ${testsPassed}/${testsTotal} tests passed`);
  
  if (testsPassed === testsTotal) {
    console.log('🎉 All tests passed! SessionManager is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Check implementation.');
  }

  return testsPassed === testsTotal;
}

// Auto-run tests if in browser
if (typeof window !== 'undefined' && window.SessionManager) {
  // Run tests after a short delay to ensure DOM is ready
  setTimeout(() => {
    testSessionManager();
  }, 100);
}