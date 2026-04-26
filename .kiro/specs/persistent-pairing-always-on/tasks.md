# Implementation Plan: Persistent Pairing and Always-On Display

## Overview

This implementation plan transforms the existing `TravelGames/levelvan.html` file to add cloud-based persistent pairing and Netflix-like always-on display functionality. The approach follows a 5-phase strategy that preserves all existing functionality while adding Firebase integration, enhanced wake lock management, and automatic device pairing.

## Tasks

- [x] 1. Set up Firebase integration foundation
  - [x] 1.1 Add Firebase SDK and configuration to HTML head
    - Add Firebase v10 modular SDK imports for App, Auth, and Firestore
    - Configure Firebase project with authentication and Firestore enabled
    - Add offline persistence configuration for Firestore
    - _Requirements: 1.1, 8.1, 8.2_

  - [ ]* 1.2 Write property test for Firebase initialization
    - **Property 1: Device Profile Data Integrity**
    - **Validates: Requirements 1.2, 1.5, 2.2**

  - [x] 1.3 Implement FirebaseManager class
    - Create FirebaseManager with methods for authentication and device profile management
    - Add anonymous authentication initialization
    - Implement getOrCreateDeviceProfile() with proper error handling
    - _Requirements: 1.1, 1.2, 1.3, 8.1_

  - [ ]* 1.4 Write unit tests for FirebaseManager
    - Test authentication flow and device profile creation
    - Test error handling for network failures
    - _Requirements: 1.1, 1.2, 8.6_

- [x] 2. Implement enhanced wake lock management
  - [x] 2.1 Create WakeLockManager class
    - Implement aggressive wake lock acquisition and monitoring
    - Add 10-second interval monitoring with automatic re-acquisition
    - Handle visibility change events and wake lock release events
    - _Requirements: 4.1, 4.3, 4.4, 9.1_

  - [ ]* 2.2 Write property test for wake lock persistence
    - **Property 5: Wake Lock Persistence and Recovery**
    - **Validates: Requirements 4.1, 4.3, 4.4, 4.6, 4.7, 9.1, 9.2, 9.6**

  - [x] 2.3 Integrate WakeLockManager into sensor and display modes
    - Replace existing basic wake lock with comprehensive WakeLockManager
    - Add wake lock status indicators to UI
    - Implement wake lock recovery mechanisms
    - _Requirements: 4.2, 4.5, 4.6, 4.7_

  - [ ]* 2.4 Write unit tests for WakeLockManager
    - Test wake lock acquisition and release
    - Test monitoring and recovery mechanisms
    - Test UI status indicator updates
    - _Requirements: 4.1, 4.2, 4.5_

- [ ] 3. Checkpoint - Ensure Firebase and wake lock foundations work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement device identity and pairing bond management
  - [x] 4.1 Create DeviceIdentityManager class
    - Implement persistent device identification using Firebase
    - Add automatic role detection based on device profile
    - Create device profile schema with required fields
    - _Requirements: 1.2, 1.4, 2.1, 2.2_

  - [ ]* 4.2 Write property test for pairing bond creation
    - **Property 2: Pairing Bond Creation and Management**
    - **Validates: Requirements 2.1, 2.2, 2.6**

  - [x] 4.3 Implement pairing bond management functions
    - Add createPairingBond() and findExistingPairingBond() methods
    - Implement pairing bond persistence in Firestore
    - Add pairing bond validation and integrity checks
    - _Requirements: 2.1, 2.2, 2.6, 8.3_

  - [ ]* 4.4 Write unit tests for device identity management
    - Test device profile creation and retrieval
    - Test pairing bond creation and validation
    - Test role detection logic
    - _Requirements: 1.2, 2.1, 2.2_

- [x] 5. Implement automatic connection and startup flow
  - [x] 5.1 Create enhanced startup flow with automatic detection
    - Modify window load event to check for existing pairing bonds
    - Implement automatic role selection and mode entry
    - Add loading indicators during automatic setup
    - _Requirements: 2.3, 2.4, 3.1, 3.2, 6.1, 6.2_

  - [ ]* 5.2 Write property test for automatic connection behavior
    - **Property 3: Automatic Connection Behavior**
    - **Validates: Requirements 2.3, 2.4, 3.1, 3.2, 3.3, 6.4**

  - [x] 5.3 Implement connection timeout and fallback mechanisms
    - Add 30-second timeout for automatic connection attempts
    - Implement fallback to PIN entry when automatic connection fails
    - Add clear error messaging and recovery options
    - _Requirements: 3.5, 6.5, 8.5, 8.6_

  - [ ]* 5.4 Write property test for connection timeout and fallback
    - **Property 4: Connection Timeout and Fallback**
    - **Validates: Requirements 3.5**

- [ ] 6. Enhance connection management with network resilience
  - [ ] 6.1 Implement enhanced ConnectionManager class
    - Extend existing PeerJS functionality with cloud integration
    - Add automatic reconnection with exponential backoff
    - Implement connection status tracking and UI updates
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 6.2 Write property test for network resilience
    - **Property 6: Network Resilience and Reconnection**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.6**

  - [x] 6.3 Add connection status indicators to UI
    - Update sensor and display screens with connection status
    - Add visual indicators for connected, reconnecting, offline states
    - Implement connection count display for multiple displays
    - _Requirements: 5.5, 6.3_

  - [ ]* 6.4 Write unit tests for connection management
    - Test automatic reconnection logic
    - Test connection status UI updates
    - Test multiple display connection handling
    - _Requirements: 5.1, 5.2, 5.5_

- [ ] 7. Checkpoint - Ensure automatic pairing and connection work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement pairing reset and management features
  - [x] 8.1 Add pairing reset functionality to UI
    - Add "Reset Pairing" option to help screen or settings
    - Implement confirmation dialog for pairing reset
    - Add pairing reset to FirebaseManager class
    - _Requirements: 7.1, 7.2, 7.5_

  - [ ]* 8.2 Write property test for pairing reset completeness
    - **Property 8: Pairing Reset Completeness**
    - **Validates: Requirements 7.2, 7.3, 7.4, 7.6**

  - [x] 8.3 Implement pairing reset coordination between devices
    - Add notification system for pairing reset events
    - Ensure both devices return to home screen after reset
    - Clear Active_Pair_ID from both device profiles
    - _Requirements: 7.3, 7.4, 7.6_

  - [ ]* 8.4 Write unit tests for pairing reset functionality
    - Test pairing reset UI and confirmation
    - Test cross-device reset notification
    - Test cleanup of pairing bonds and device profiles
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 9. Implement comprehensive error handling and user communication
  - [ ] 9.1 Add error handling for all Firebase operations
    - Implement graceful handling of authentication failures
    - Add retry logic with exponential backoff for Firestore operations
    - Handle quota exceeded and network unavailable scenarios
    - _Requirements: 8.1, 8.2, 8.4, 8.5, 8.6_

  - [ ]* 9.2 Write property test for error handling and user communication
    - **Property 9: Error Handling and User Communication**
    - **Validates: Requirements 8.5, 8.6, 9.5**

  - [ ] 9.3 Add user-friendly error messages and recovery options
    - Replace technical error messages with user-friendly alternatives
    - Add recovery options for common error scenarios
    - Implement offline mode indicators and functionality
    - _Requirements: 8.5, 8.6, 9.5_

  - [ ]* 9.4 Write unit tests for error handling
    - Test error message display and formatting
    - Test recovery option functionality
    - Test offline mode behavior
    - _Requirements: 8.5, 8.6_

- [ ] 10. Ensure backward compatibility and migration support
  - [x] 10.1 Implement backward compatibility for existing functionality
    - Ensure PIN-based pairing continues to work
    - Maintain support for shared links and bookmarks
    - Add migration path from localStorage to cloud storage
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [ ]* 10.2 Write property test for backward compatibility
    - **Property 10: Backward Compatibility Preservation**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**

  - [ ] 10.3 Add cloud storage migration and opt-in functionality
    - Detect existing localStorage data and offer migration
    - Provide clear opt-in for cloud features
    - Ensure graceful degradation when cloud features are declined
    - _Requirements: 10.2, 10.4, 10.5_

  - [ ]* 10.4 Write unit tests for backward compatibility
    - Test PIN-based pairing with cloud features disabled
    - Test shared link functionality preservation
    - Test localStorage to cloud migration
    - _Requirements: 10.1, 10.2, 10.3_

- [ ] 11. Implement zero-interaction startup performance optimization
  - [ ] 11.1 Optimize automatic startup performance
    - Ensure automatic mode entry completes within 3 seconds
    - Add performance monitoring for startup operations
    - Optimize Firebase queries for minimal latency
    - _Requirements: 6.1, 6.3, 6.5_

  - [ ]* 11.2 Write property test for startup performance
    - **Property 7: Zero-Interaction Startup Performance**
    - **Validates: Requirements 6.1, 6.3, 6.5**

  - [ ] 11.3 Add startup performance monitoring and optimization
    - Implement timing measurements for startup operations
    - Add performance indicators to UI during startup
    - Optimize Firebase configuration for faster initialization
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 11.4 Write integration tests for startup performance
    - Test startup timing under various network conditions
    - Test automatic mode entry performance
    - Test Firebase initialization performance
    - _Requirements: 6.1, 6.3, 6.5_

- [ ] 12. Final integration and comprehensive testing
  - [ ] 12.1 Integrate all components and test end-to-end functionality
    - Wire together all new components with existing PeerJS functionality
    - Test complete user workflows from startup to leveling completion
    - Verify all existing functionality remains intact
    - _Requirements: All requirements_

  - [ ]* 12.2 Write comprehensive integration tests
    - Test complete pairing and leveling workflows
    - Test network interruption and recovery scenarios
    - Test multiple device connection scenarios
    - _Requirements: All requirements_

  - [ ] 12.3 Add Firebase security rules and production configuration
    - Implement Firestore security rules for device profiles and pairing bonds
    - Add production Firebase configuration
    - Test security rule enforcement
    - _Requirements: 8.1, 8.2_

  - [ ]* 12.4 Write security and performance tests
    - Test Firebase security rule enforcement
    - Test performance under load with multiple devices
    - Test data synchronization across network interruptions
    - _Requirements: 8.1, 8.2, 8.3_

- [ ] 13. Final checkpoint - Ensure complete system works correctly
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout implementation
- Property tests validate universal correctness properties using fast-check library
- Unit tests validate specific examples and edge cases
- Integration tests verify external service interactions and complete workflows
- All implementation preserves existing functionality while adding new cloud-based features
- The single file `TravelGames/levelvan.html` will be enhanced incrementally
- Firebase configuration will need to be added with actual project credentials
- Wake lock implementation targets modern browsers with Screen Wake Lock API support
- Backward compatibility ensures existing users can continue using PIN-based pairing