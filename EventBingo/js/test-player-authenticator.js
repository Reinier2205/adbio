/**
 * Test PlayerAuthenticator functionality
 */

// Test the PlayerAuthenticator class
async function testPlayerAuthenticator() {
  console.log('Testing PlayerAuthenticator...');
  
  try {
    // Create instances
    const sessionManager = new SessionManager();
    const authenticator = new PlayerAuthenticator(sessionManager);
    
    const testEventCode = 'test123';
    const testPlayerName = 'TestPlayer';
    const testQuestion = 'What is your favorite color?';
    const testAnswer = 'blue';
    
    console.log('1. Testing profile creation...');
    
    // Test profile creation
    const createResult = await authenticator.createPlayerProfile(
      testEventCode,
      testPlayerName,
      testQuestion,
      testAnswer
    );
    
    console.log('Profile creation result:', createResult);
    
    if (!createResult.success) {
      throw new Error('Profile creation failed: ' + createResult.error);
    }
    
    console.log('2. Testing authentication with correct answer...');
    
    // Test authentication with correct answer
    const authResult = await authenticator.authenticatePlayer(
      testEventCode,
      testPlayerName,
      testAnswer
    );
    
    console.log('Authentication result:', authResult);
    
    if (!authResult.success) {
      throw new Error('Authentication failed: ' + authResult.error);
    }
    
    console.log('3. Testing authentication with wrong answer...');
    
    // Test authentication with wrong answer
    const wrongAuthResult = await authenticator.authenticatePlayer(
      testEventCode,
      testPlayerName,
      'wrong answer'
    );
    
    console.log('Wrong authentication result:', wrongAuthResult);
    
    if (wrongAuthResult.success) {
      throw new Error('Authentication should have failed with wrong answer');
    }
    
    console.log('4. Testing authentication status...');
    
    // Test authentication status
    const authStatus = authenticator.getAuthenticationStatus(testPlayerName);
    console.log('Authentication status:', authStatus);
    
    console.log('5. Testing rate limiting...');
    
    // Test rate limiting by making multiple failed attempts
    for (let i = 0; i < 3; i++) {
      const failResult = await authenticator.authenticatePlayer(
        testEventCode,
        testPlayerName,
        'wrong' + i
      );
      console.log(`Attempt ${i + 1}:`, failResult);
    }
    
    // Check if player is locked out
    const lockedStatus = authenticator.getAuthenticationStatus(testPlayerName);
    console.log('Locked status:', lockedStatus);
    
    if (!lockedStatus.isLockedOut) {
      console.warn('Player should be locked out after 3 failed attempts');
    }
    
    console.log('6. Cleaning up...');
    
    // Clean up
    sessionManager.clearPlayerSession(testEventCode);
    authenticator.clearAuthenticationAttempts(testPlayerName);
    
    console.log('✅ All PlayerAuthenticator tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ PlayerAuthenticator test failed:', error);
    return false;
  }
}

// Run tests if in browser
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', testPlayerAuthenticator);
  } else {
    testPlayerAuthenticator();
  }
}

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testPlayerAuthenticator };
}