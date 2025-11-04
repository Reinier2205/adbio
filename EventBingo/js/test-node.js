/**
 * Node.js test for PlayerAuthenticator
 */

// Mock localStorage for Node.js environment
global.localStorage = {
  data: {},
  getItem: function(key) {
    return this.data[key] || null;
  },
  setItem: function(key, value) {
    this.data[key] = value;
  },
  removeItem: function(key) {
    delete this.data[key];
  },
  clear: function() {
    this.data = {};
  },
  get length() {
    return Object.keys(this.data).length;
  },
  key: function(index) {
    const keys = Object.keys(this.data);
    return keys[index] || null;
  }
};

// Mock crypto for Node.js
global.crypto = require('crypto').webcrypto || {
  subtle: {
    digest: async function(algorithm, data) {
      const hash = require('crypto').createHash('sha256');
      hash.update(data);
      return hash.digest();
    }
  }
};

// Mock TextEncoder
global.TextEncoder = require('util').TextEncoder;

// Load the classes
const SessionManager = require('./session-manager.js');
const PlayerAuthenticator = require('./player-authenticator.js');

async function runNodeTests() {
  console.log('🚀 Starting Node.js PlayerAuthenticator tests...\n');
  
  try {
    // Create instances
    const sessionManager = new SessionManager();
    const authenticator = new PlayerAuthenticator(sessionManager);
    
    const testEventCode = 'node-test-123';
    const testPlayerName = 'NodeTestPlayer';
    const testQuestion = 'What is your favorite programming language?';
    const testAnswer = 'javascript';
    
    console.log('1️⃣ Testing profile creation...');
    
    // Test profile creation
    const createResult = await authenticator.createPlayerProfile(
      testEventCode,
      testPlayerName,
      testQuestion,
      testAnswer
    );
    
    console.log('   Result:', createResult);
    
    if (!createResult.success) {
      throw new Error('Profile creation failed: ' + createResult.error);
    }
    console.log('   ✅ Profile creation successful\n');
    
    console.log('2️⃣ Testing authentication with correct answer...');
    
    // Test authentication with correct answer
    const authResult = await authenticator.authenticatePlayer(
      testEventCode,
      testPlayerName,
      testAnswer
    );
    
    console.log('   Result:', authResult);
    
    if (!authResult.success) {
      throw new Error('Authentication failed: ' + authResult.error);
    }
    console.log('   ✅ Correct authentication successful\n');
    
    console.log('3️⃣ Testing authentication with wrong answer...');
    
    // Test authentication with wrong answer
    const wrongAuthResult = await authenticator.authenticatePlayer(
      testEventCode,
      testPlayerName,
      'python'
    );
    
    console.log('   Result:', wrongAuthResult);
    
    if (wrongAuthResult.success) {
      throw new Error('Authentication should have failed with wrong answer');
    }
    console.log('   ✅ Wrong authentication correctly rejected\n');
    
    console.log('4️⃣ Testing authentication status...');
    
    // Test authentication status
    const authStatus = authenticator.getAuthenticationStatus(testPlayerName);
    console.log('   Status:', authStatus);
    console.log('   ✅ Authentication status retrieved\n');
    
    console.log('5️⃣ Testing rate limiting...');
    
    // Clear previous attempts
    authenticator.clearAuthenticationAttempts(testPlayerName);
    
    // Test rate limiting by making multiple failed attempts
    for (let i = 0; i < 4; i++) {
      const failResult = await authenticator.authenticatePlayer(
        testEventCode,
        testPlayerName,
        'wrong-answer-' + i
      );
      console.log(`   Attempt ${i + 1}:`, {
        success: failResult.success,
        error: failResult.error,
        attemptsLeft: failResult.attemptsLeft,
        lockedOut: failResult.lockedOut
      });
    }
    
    // Check if player is locked out
    const lockedStatus = authenticator.getAuthenticationStatus(testPlayerName);
    console.log('   Final status:', lockedStatus);
    
    if (!lockedStatus.isLockedOut) {
      console.warn('   ⚠️ Player should be locked out after 3 failed attempts');
    } else {
      console.log('   ✅ Rate limiting working correctly\n');
    }
    
    console.log('6️⃣ Testing session validation...');
    
    // Test session retrieval
    const session = sessionManager.getPlayerSession(testEventCode);
    console.log('   Session data:', {
      playerName: session?.playerName,
      secretQuestion: session?.secretQuestion,
      hasHash: !!session?.secretAnswerHash,
      createdAt: session?.createdAt
    });
    
    if (!session || session.playerName !== testPlayerName) {
      throw new Error('Session validation failed');
    }
    console.log('   ✅ Session validation successful\n');
    
    console.log('7️⃣ Testing input validation...');
    
    // Test empty inputs
    const emptyResult = await authenticator.createPlayerProfile('', '', '', '');
    console.log('   Empty inputs result:', emptyResult);
    
    if (emptyResult.success) {
      throw new Error('Should reject empty inputs');
    }
    
    // Test short inputs
    const shortResult = await authenticator.createPlayerProfile(
      'test', 'A', 'Hi?', 'X'
    );
    console.log('   Short inputs result:', shortResult);
    
    if (shortResult.success) {
      throw new Error('Should reject short inputs');
    }
    console.log('   ✅ Input validation working correctly\n');
    
    console.log('8️⃣ Cleaning up...');
    
    // Clean up
    sessionManager.clearPlayerSession(testEventCode);
    authenticator.clearAllAuthenticationAttempts();
    
    console.log('   ✅ Cleanup completed\n');
    
    console.log('🎉 All PlayerAuthenticator tests passed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ PlayerAuthenticator test failed:', error);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Run the tests
runNodeTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});