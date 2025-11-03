# Player Authentication Design

## Overview

This design implements a fun, password-free authentication system using personal secret questions. The system provides seamless device persistence while ensuring players can only upload photos for themselves.

## Architecture

### Client-Side Components
- **Authentication Manager**: Handles localStorage operations and authentication state
- **Player Selection Modal**: Enhanced UI for player selection and authentication
- **Question Modal**: Interface for displaying questions and collecting answers
- **Upload Guard**: Validates authentication before allowing uploads

### Server-Side Components
- **Authentication API**: New endpoints for player registration and verification
- **Upload Validator**: Enhanced upload endpoint with authentication checks
- **Player Registry**: KV storage for player authentication data

## Components and Interfaces

### 1. Authentication Manager (Client)

```javascript
class AuthManager {
  // Check if player has local authentication
  hasLocalAuth(eventCode, playerName)
  
  // Get stored answer for auto-verification
  getStoredAnswer(eventCode, playerName)
  
  // Store authentication data locally
  storeAuth(eventCode, playerName, answer)
  
  // Clear local authentication
  clearAuth(eventCode, playerName)
  
  // Verify current authentication state
  isAuthenticated(eventCode, playerName)
}
```

### 2. Player Selection Modal (Client)

**Enhanced Modal States:**
- **Player List**: Shows existing players with authentication options
- **Continue Option**: For players with local auth
- **Question Prompt**: For authentication/re-authentication
- **Registration**: For new players

**Modal Actions:**
- `selectExistingPlayer(playerName)`
- `continueAsPlayer(playerName)`
- `reenterSecret(playerName)`
- `registerNewPlayer()`

### 3. Authentication API (Server)

**New Endpoints:**

```
POST /auth/register
- Body: { eventCode, playerName, question, answer }
- Response: { success, message }

POST /auth/verify  
- Body: { eventCode, playerName, answer }
- Response: { success, authenticated }

GET /auth/question/{eventCode}/{playerName}
- Response: { question }
```

### 4. Enhanced Upload Endpoint (Server)

**Modified Upload Logic:**
```
POST /upload
- Additional Body: { secretAnswer }
- Validation: Verify answer against stored data
- Response: Include authentication status
```

## Data Models

### Player Authentication (KV Storage)

```json
{
  "question": "What is your go-to snack?",
  "answer": "chocolate", 
  "createdAt": "2024-01-01T00:00:00Z",
  "lastVerified": "2024-01-01T00:00:00Z"
}
```

**Key Format:** `auth_{eventCode}_{playerName}`

### Local Storage (Client)

```javascript
// Answer storage
localStorage.setItem(`secret_answer_${eventCode}_${playerName}`, answer);

// Verification flag
localStorage.setItem(`secret_verified_${eventCode}_${playerName}`, 'true');

// Last authentication timestamp
localStorage.setItem(`secret_timestamp_${eventCode}_${playerName}`, Date.now());
```

## Error Handling

### Authentication Failures
- **Wrong Answer**: Graceful fallback to view-only mode with friendly message
- **Missing Data**: Prompt for re-authentication or new registration
- **Network Errors**: Allow offline viewing, queue uploads for retry

### Storage Failures
- **localStorage Unavailable**: Fall back to session-only authentication
- **KV Storage Errors**: Log errors, allow view-only access
- **Quota Exceeded**: Clear old authentication data automatically

## Testing Strategy

### Unit Tests
- Authentication manager functions
- Answer validation logic
- Local storage operations
- Question randomization

### Integration Tests
- Complete authentication flows
- Upload validation with authentication
- Cross-device authentication scenarios
- View-only mode restrictions

### User Experience Tests
- Authentication flow timing
- Modal interactions and transitions
- Error message clarity
- Mobile device compatibility

## Security Considerations

### Data Protection
- Answers stored as lowercase trimmed strings
- No sensitive personal information in questions
- Local storage cleared on explicit logout
- KV data scoped per event

### Attack Prevention
- Rate limiting on authentication attempts
- Input validation on all user data
- No enumeration of existing players
- Graceful handling of malicious inputs

### Privacy
- Questions are personal but not sensitive
- No tracking across events
- Local data stays on device
- Optional authentication (view-only fallback)

## Implementation Phases

### Phase 1: Core Authentication
- Authentication manager implementation
- Basic question/answer storage
- Simple verification flow

### Phase 2: Enhanced UX
- Polished modal interfaces
- Smooth transitions and animations
- Error handling and messaging

### Phase 3: Advanced Features
- Cross-device synchronization
- Authentication analytics
- Performance optimizations

## Performance Considerations

### Client-Side
- Lazy load authentication modals
- Cache authentication state in memory
- Minimize localStorage operations
- Debounce authentication checks

### Server-Side
- Efficient KV key structure for fast lookups
- Batch authentication operations where possible
- Cache frequently accessed authentication data
- Optimize upload validation performance

## Backward Compatibility

### Existing Players
- Existing players without authentication can continue in view-only mode
- Gradual migration to authenticated uploads
- No disruption to current game sessions

### API Compatibility
- Upload endpoint maintains existing functionality
- New authentication parameters are optional initially
- Graceful degradation for old clients