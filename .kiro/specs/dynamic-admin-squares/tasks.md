# Implementation Plan

- [x] 1. Extend backend data model and API endpoints





  - Modify event data structure to include squares array and lock status
  - Add validation functions for square configuration
  - Implement event lock mechanism in photo upload endpoint
  - Create new admin API endpoints for square management
  - _Requirements: 1.1, 1.4, 2.1, 2.2_

- [x] 1.1 Update event data structure in worker.js


  - Add isLocked, lockedAt, lockReason fields to event model
  - Add eventContext field for AI prompt generation data
  - Modify existing event creation to include new fields
  - _Requirements: 1.1, 4.1, 4.2_

- [x] 1.2 Implement square validation logic


  - Create validateSquares function to check count, content, and duplicates
  - Add error message generation for validation failures
  - Implement server-side validation for all square inputs
  - _Requirements: 1.4, 1.5_

- [x] 1.3 Add event lock mechanism to photo upload


  - Modify photo upload endpoint to check and set event lock status
  - Update event data when first photo is uploaded
  - Add lock status checks before allowing square modifications
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 1.4 Create admin API endpoints for square management


  - Add POST /admin/update-squares endpoint with validation
  - Add GET /admin/event-status/{eventCode} endpoint
  - Add POST /admin/lock-event endpoint for manual lock control
  - Implement admin authentication checks for all new endpoints
  - _Requirements: 1.1, 1.2, 1.5, 2.2, 5.2, 5.3_

- [x] 2. Create AI prompt generator interface





  - Add context input form for names, theme, location, and activities
  - Implement prompt template generation with event-specific details
  - Add copy-to-clipboard functionality for generated prompts
  - Create clear instructions for using AI tools
  - _Requirements: 1.1, 5.4_

- [x] 2.1 Design AI context input form


  - Create form fields for event names (comma-separated input)
  - Add theme/type selection or text input
  - Add location and activities text areas
  - Style form to match existing admin interface design
  - _Requirements: 1.1, 5.4_

- [x] 2.2 Implement prompt generation logic


  - Create AIPromptGenerator class with template method
  - Generate personalized prompts using event context
  - Include clear formatting instructions for AI tools
  - Add quality guidelines and example format in prompt
  - _Requirements: 1.1_

- [x] 2.3 Add copy-to-clipboard functionality


  - Implement clipboard API for prompt copying
  - Add visual feedback when prompt is copied
  - Include fallback for browsers without clipboard API
  - Add clear usage instructions for external AI tools
  - _Requirements: 1.1, 5.4_

- [x] 3. Extend admin interface with squares configuration





  - Add squares management section to existing admin.html
  - Implement real-time validation and error display
  - Create live preview of 5x5 bingo grid layout
  - Add event lock status indicators and controls
  - _Requirements: 1.1, 1.2, 1.3, 2.3, 5.1, 5.2_

- [x] 3.1 Add squares configuration panel to admin.html


  - Create new section in existing admin interface
  - Add large textarea for 25 squares input (one per line)
  - Integrate with AI prompt generator section
  - Style to match existing admin interface theme
  - _Requirements: 1.1, 1.2, 5.1_

- [x] 3.2 Implement real-time validation and preview


  - Add JavaScript validation for square count and content
  - Display validation errors with specific messages
  - Create live 5x5 grid preview showing squares layout
  - Update preview immediately when squares are modified
  - _Requirements: 1.3, 1.4, 1.5_

- [x] 3.3 Add event lock status display and controls


  - Show current lock status with clear visual indicators
  - Display lock reason and timestamp when applicable
  - Add manual lock/unlock controls for admins
  - Disable square editing when event is locked
  - _Requirements: 2.2, 2.3, 5.2, 5.3_

- [x] 3.4 Integrate squares management with existing event selection


  - Modify existing event selection dropdown to load squares
  - Add squares configuration to event details panel
  - Update event management workflow to include squares
  - Ensure backward compatibility with existing events
  - _Requirements: 4.1, 4.2, 4.3, 5.1_

- [x] 4. Update main game interface for custom squares





  - Modify index.html to load and display custom squares
  - Update squares loading logic to use event-specific squares
  - Maintain backward compatibility with hardcoded squares
  - Ensure proper fallback behavior for missing squares
  - _Requirements: 1.1, 4.1, 4.2, 4.4_

- [x] 4.1 Update squares loading in index.html


  - Modify loadEventInfo function to handle custom squares
  - Update squares variable assignment from event data
  - Ensure proper fallback to defaultSquaresList when needed
  - Add error handling for malformed squares data
  - _Requirements: 1.1, 4.1, 4.2_

- [x] 4.2 Maintain backward compatibility


  - Ensure existing events without custom squares continue working
  - Handle events with missing or invalid squares gracefully
  - Preserve existing game functionality and URLs
  - Test with existing event codes and player data
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 5. Add comprehensive error handling and user feedback





  - Implement proper error messages for all validation scenarios
  - Add loading states for all admin operations
  - Create confirmation dialogs for destructive actions
  - Add success notifications for completed operations
  - _Requirements: 1.4, 1.5, 2.2, 2.3, 5.1, 5.2_

- [x] 5.1 Implement validation error handling


  - Add specific error messages for invalid square count
  - Display errors for empty or duplicate squares
  - Show clear messages when event is locked
  - Provide helpful guidance for fixing validation issues
  - _Requirements: 1.4, 1.5, 2.2_

- [x] 5.2 Add loading states and user feedback


  - Show loading spinners during save/load operations
  - Add success notifications for completed actions
  - Implement retry mechanisms for failed network requests
  - Provide clear feedback for all user interactions
  - _Requirements: 5.1, 5.2, 5.4_

- [x] 5.3 Add confirmation dialogs for critical actions











  - Confirm before locking events manually
  - Warn when modifying squares after players have joined
  - Confirm before overwriting existing squares
  - Add undo functionality where appropriate
  - _Requirements: 2.2, 5.2_

- [x] 6. Testing and integration




  - Test complete admin workflow from context input to square configuration
  - Verify event lock mechanism works correctly with photo uploads
  - Test backward compatibility with existing events and players
  - Validate all error scenarios and edge cases
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4_

- [x] 6.1 Test AI prompt generation workflow


  - Verify prompt generation with various event contexts
  - Test copy-to-clipboard functionality across browsers
  - Validate generated prompts produce good AI results
  - Test integration between prompt generator and squares input
  - _Requirements: 1.1, 5.4_

- [x] 6.2 Test squares configuration and validation


  - Test all validation scenarios (count, empty, duplicates)
  - Verify real-time preview updates correctly
  - Test save/load functionality for custom squares
  - Validate error handling and user feedback
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 6.3 Test event lock mechanism


  - Verify lock triggers on first photo upload
  - Test manual lock/unlock functionality
  - Validate squares cannot be modified when locked
  - Test lock status display and messaging
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 6.4 Test backward compatibility and migration










  - Test existing events continue working unchanged
  - Verify fallback to default squares when needed
  - Test existing player data and photo uploads
  - Validate URL compatibility and navigation
  - _Requirements: 4.1, 4.2, 4.3, 4.4_