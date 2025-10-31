# Design Document

## Overview

The Dynamic Admin-Configurable Squares feature will extend the existing EventBingo system to allow administrators to customize the 25 bingo squares for each event instead of using hardcoded values. This feature builds upon the existing admin interface and event management system while maintaining backward compatibility.

## Architecture

### Current System Analysis

The EventBingo system currently has:
- **Frontend**: HTML/CSS/JavaScript single-page application (`index.html`)
- **Admin Interface**: Existing admin panel (`admin.html`) for event management
- **Backend**: Cloudflare Worker (`worker.js`) handling API requests
- **Storage**: Cloudflare KV for event data and R2 for photo storage
- **Event Structure**: Events stored with title, description, code, adminUser, and squares array

### Proposed Architecture Changes

The system will be enhanced with:
1. **Admin Interface Extension**: Add squares configuration to existing admin panel
2. **Event Lock Mechanism**: Implement game state tracking to prevent square modifications after gameplay begins
3. **Validation System**: Ensure exactly 25 valid squares are provided
4. **Preview System**: Real-time preview of bingo grid layout
5. **Migration Support**: Handle existing events with hardcoded squares

## AI Prompt Generation Feature

### Purpose
Many event organizers struggle to create exactly 25 relevant photo challenges. The AI prompt generator solves this by:
1. Collecting event context (names, theme, location, activities)
2. Generating a standardized prompt for AI tools (ChatGPT, Claude, etc.)
3. Providing clear instructions for using external AI services
4. Enabling easy import of AI-generated squares

### User Flow
1. Admin enters event context information
2. System generates customized AI prompt
3. Admin copies prompt to clipboard
4. Admin uses prompt with their preferred AI tool
5. Admin copies AI response back into squares textarea
6. System validates and previews the 25 squares

### Prompt Template Structure
- Event details (title, theme, location)
- Attendee names for personalization
- Expected activities and context
- Clear formatting requirements (25 lines, no numbering)
- Quality guidelines (fun, achievable, varied difficulty)

## Components and Interfaces

### 1. Admin Interface Components

#### AI Prompt Generator
- **Context Input**: Form fields for event names, context, and theme
- **Prompt Generation**: Creates standardized prompt for AI tools
- **Copy-to-Clipboard**: Easy copying of generated prompt
- **Instructions**: Clear guidance on using the prompt with AI tools

#### Squares Configuration Panel
- **Location**: New section in existing `admin.html`
- **Input Method**: Large textarea accepting one square per line
- **AI Integration**: Button to generate AI prompt based on context
- **Validation**: Real-time validation with error display
- **Preview**: Live 5x5 grid preview showing how squares will appear

#### Event Lock Status Display
- **Lock Indicator**: Visual indicator showing if event is locked/unlocked
- **Lock Trigger**: Display what action will lock the event
- **Lock Override**: Admin option to manually lock/unlock events

### 2. Backend API Extensions

#### New Endpoints
```
POST /admin/update-squares
- Updates squares for an event
- Validates event is not locked
- Validates exactly 25 squares provided

GET /admin/event-status/{eventCode}
- Returns event lock status and square count
- Provides lock trigger information

POST /admin/lock-event
- Manually locks/unlocks an event
- Admin authentication required
```

#### Modified Endpoints
```
GET /event-info (Enhanced)
- Returns event squares along with existing data
- Handles fallback to default squares

POST / (Photo Upload - Enhanced)
- Triggers event lock on first photo upload
- Updates event lock status in storage
```

### 3. Data Model Changes

#### Event Data Structure (Enhanced)
```javascript
{
  title: string,
  description: string,
  code: string,
  adminUser: string,
  squares: string[25], // Custom squares array
  createdAt: string,
  isLocked: boolean,    // NEW: Lock status
  lockedAt: string,     // NEW: When locked
  lockReason: string,   // NEW: Why locked ("first_photo", "manual")
  // AI Prompt Context (optional)
  eventContext: {
    names: string[],      // Names of people at event
    theme: string,        // Event theme/type
    activities: string,   // Expected activities
    location: string      // Event location
  }
}
```

#### Validation Rules
- Squares array must contain exactly 25 non-empty strings
- Each square must be 1-200 characters
- No duplicate squares allowed
- Squares cannot be modified when event is locked

## Data Models

### Square Configuration Model
```javascript
class SquareConfiguration {
  constructor(squares) {
    this.squares = squares;
    this.isValid = this.validate();
    this.errors = [];
  }
  
  validate() {
    // Validate count, content, duplicates
    return this.squares.length === 25 && 
           this.squares.every(s => s.trim().length > 0);
  }
  
  getErrors() {
    // Return specific validation errors
  }
}
```

### AI Prompt Generator Model
```javascript
class AIPromptGenerator {
  constructor(eventContext) {
    this.context = eventContext;
  }
  
  generatePrompt() {
    const template = `Create 25 photo challenge squares for a bingo-style game for the following event:

Event: ${this.context.title}
Theme: ${this.context.theme}
Location: ${this.context.location}
People attending: ${this.context.names.join(', ')}
Expected activities: ${this.context.activities}

Please create exactly 25 photo challenges that are:
1. Fun and engaging for the attendees
2. Achievable during the event
3. Specific to the people, location, and activities mentioned
4. Varied in difficulty (some easy, some challenging)
5. Appropriate for all ages

Format: Return exactly 25 lines, one challenge per line, no numbering or bullets.

Example format:
A photo with [person name] laughing
Someone trying the local food
A group photo by [location landmark]
[Person name] doing [activity]
...`;
    
    return template;
  }
}
```

### Event Lock Model
```javascript
class EventLock {
  constructor(eventCode, isLocked, reason) {
    this.eventCode = eventCode;
    this.isLocked = isLocked;
    this.reason = reason; // "first_photo", "manual", null
    this.lockedAt = isLocked ? new Date().toISOString() : null;
  }
  
  canModifySquares() {
    return !this.isLocked;
  }
  
  lock(reason) {
    this.isLocked = true;
    this.reason = reason;
    this.lockedAt = new Date().toISOString();
  }
}
```

## Error Handling

### Validation Errors
- **Invalid Square Count**: "Must provide exactly 25 squares (found {count})"
- **Empty Squares**: "Square {number} cannot be empty"
- **Duplicate Squares**: "Duplicate squares found: {list}"
- **Event Locked**: "Cannot modify squares - event is locked due to {reason}"

### Network Errors
- **Save Failures**: Retry mechanism with user notification
- **Load Failures**: Fallback to cached data or default squares
- **Authentication Errors**: Clear error messages for admin access

### User Experience
- **Progressive Enhancement**: Core functionality works without JavaScript
- **Loading States**: Clear indicators during save/load operations
- **Confirmation Dialogs**: Confirm destructive actions like locking events

## Testing Strategy

### Unit Testing Focus
- Square validation logic
- Event lock state management
- Data transformation functions
- Error handling scenarios

### Integration Testing
- Admin interface square configuration flow
- Event lock triggers (photo upload)
- Backward compatibility with existing events
- API endpoint validation

### User Acceptance Testing
- Admin can configure squares before event starts
- Players see custom squares in game
- Squares cannot be modified after first photo
- Existing events continue working unchanged

## Implementation Phases

### Phase 1: Backend Foundation
- Extend event data model with squares and lock fields
- Implement square validation logic
- Add event lock mechanism to photo upload
- Create admin API endpoints for square management

### Phase 2: Admin Interface
- Add AI prompt generator with context form
- Implement prompt generation and copy-to-clipboard functionality
- Add squares configuration section to admin.html
- Implement real-time validation and preview
- Add event lock status display
- Integrate with backend APIs

### Phase 3: Integration & Testing
- Update main game interface to use custom squares
- Implement backward compatibility handling
- Add comprehensive error handling
- Perform end-to-end testing

### Phase 4: Migration & Deployment
- Migrate existing events to new data structure
- Deploy with feature flags for gradual rollout
- Monitor system performance and user feedback
- Document admin procedures

## Security Considerations

### Admin Authentication
- Verify admin user matches event creator
- Implement session management for admin interface
- Add CSRF protection for admin actions

### Data Validation
- Server-side validation of all square inputs
- Sanitize square content to prevent XSS
- Rate limiting on admin API endpoints

### Event Integrity
- Immutable squares once event is locked
- Audit trail for square modifications
- Backup mechanism for event data

## Performance Considerations

### Caching Strategy
- Cache event squares in browser localStorage
- Implement efficient KV storage patterns
- Minimize API calls during game play

### Scalability
- Batch operations for multiple square updates
- Efficient storage of event data in KV
- Optimize admin interface for large event lists

## Backward Compatibility

### Existing Events
- Events without custom squares use defaultSquaresList
- Gradual migration path for existing events
- No breaking changes to existing URLs or APIs

### Client Compatibility
- Progressive enhancement for new features
- Fallback behavior for older browsers
- Maintain existing game functionality