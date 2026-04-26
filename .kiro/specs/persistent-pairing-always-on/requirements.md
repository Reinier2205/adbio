# Requirements Document

## Introduction

This document specifies the requirements for implementing persistent pairing and always-on display functionality in the LevelVan caravan leveling system. The enhancement will replace the current localStorage-based session management with cloud-based persistent pairing and implement Netflix-like screen persistence to ensure devices remain active throughout the leveling process.

## Glossary

- **LevelVan_System**: The complete caravan leveling application including sensor and display modes
- **Sensor_Device**: A mobile device running LevelVan in sensor mode, placed in the caravan to measure tilt
- **Display_Device**: A mobile device running LevelVan in display mode, held by the user to view leveling instructions
- **Cloud_Storage**: Firebase Firestore database for persistent data storage
- **Device_Profile**: A cloud-stored record containing device identity and pairing information
- **Pairing_Bond**: A permanent association between two devices stored in cloud storage
- **Wake_Lock**: Browser API mechanism to prevent screen from turning off
- **Session_Recovery**: The ability to automatically reconnect devices after network interruption
- **Anonymous_Auth**: Firebase authentication without requiring user credentials
- **Active_Pair_ID**: Unique identifier linking two devices in a permanent pairing relationship

## Requirements

### Requirement 1: Cloud-Based Device Identity Management

**User Story:** As a user, I want my devices to have permanent cloud-based identities, so that they can reconnect automatically without re-pairing.

#### Acceptance Criteria

1. WHEN the LevelVan_System starts, THE System SHALL create or retrieve a Device_Profile from Cloud_Storage using Anonymous_Auth
2. THE Device_Profile SHALL contain a unique device identifier that persists across browser sessions
3. THE System SHALL store the Device_Profile in Cloud_Storage with automatic synchronization
4. WHEN a device reconnects to the internet, THE System SHALL retrieve the existing Device_Profile without user intervention
5. THE Device_Profile SHALL include device type (sensor or display), creation timestamp, and last active timestamp

### Requirement 2: Persistent Device Pairing

**User Story:** As a user, I want my sensor and display devices to be permanently paired, so that they automatically connect without entering PINs on subsequent uses.

#### Acceptance Criteria

1. WHEN two devices successfully pair for the first time, THE System SHALL create a Pairing_Bond in Cloud_Storage
2. THE Pairing_Bond SHALL contain both device identifiers and a shared Active_Pair_ID
3. WHEN a previously paired device starts, THE System SHALL automatically detect existing Pairing_Bond and initiate connection
4. THE System SHALL bypass PIN entry for devices with an existing Pairing_Bond
5. WHEN either device in a Pairing_Bond goes offline and returns, THE System SHALL automatically re-establish the connection
6. THE Pairing_Bond SHALL persist until explicitly broken by user action

### Requirement 3: Automatic Role Detection and Connection

**User Story:** As a user, I want my devices to automatically assume their previous roles (sensor or display), so that I don't need to select modes repeatedly.

#### Acceptance Criteria

1. WHEN a device with an existing Device_Profile starts, THE System SHALL automatically enter the previously used mode (sensor or display)
2. WHEN a Sensor_Device starts with an Active_Pair_ID, THE System SHALL immediately begin broadcasting for its paired Display_Device
3. WHEN a Display_Device starts with an Active_Pair_ID, THE System SHALL immediately attempt to connect to its paired Sensor_Device
4. THE System SHALL display connection status during automatic reconnection attempts
5. IF automatic connection fails after 30 seconds, THEN THE System SHALL offer manual PIN entry as fallback

### Requirement 4: Enhanced Screen Wake Lock Implementation

**User Story:** As a user, I want both devices to stay awake like Netflix, so that the screens remain active throughout the entire leveling process.

#### Acceptance Criteria

1. WHEN a device enters sensor or display mode, THE System SHALL immediately request and maintain a Wake_Lock
2. THE Wake_Lock SHALL prevent screen dimming, screen timeout, and device sleep
3. WHEN the browser tab loses focus and regains focus, THE System SHALL automatically re-request the Wake_Lock
4. WHEN the device orientation changes, THE System SHALL maintain the Wake_Lock without interruption
5. THE System SHALL display Wake_Lock status in the user interface
6. WHEN the user navigates away from sensor or display mode, THE System SHALL release the Wake_Lock
7. THE Wake_Lock SHALL remain active even during temporary network disconnections

### Requirement 5: Network Resilience and Automatic Reconnection

**User Story:** As a user, I want the devices to automatically reconnect when network connectivity is restored, so that temporary network issues don't interrupt the leveling process.

#### Acceptance Criteria

1. WHEN network connectivity is lost during an active session, THE System SHALL maintain local functionality and display connection status
2. WHEN network connectivity is restored, THE System SHALL automatically attempt to re-establish the peer connection
3. THE System SHALL retry connection attempts with exponential backoff (1s, 2s, 4s, 8s, max 30s intervals)
4. WHEN reconnection succeeds, THE System SHALL resume data transmission without user intervention
5. THE System SHALL display clear visual indicators for connection states: connected, reconnecting, offline
6. THE System SHALL maintain sensor data collection and display updates during network interruptions

### Requirement 6: Zero-Interaction Startup Experience

**User Story:** As a user, I want to open the app and have it immediately work without any setup, so that I can focus on leveling my caravan.

#### Acceptance Criteria

1. WHEN a previously paired device loads the application, THE System SHALL automatically enter the appropriate mode within 3 seconds
2. THE System SHALL display a loading indicator during automatic setup
3. WHEN automatic setup completes successfully, THE System SHALL proceed directly to the sensor or display interface
4. THE System SHALL not require any user input for devices with existing Pairing_Bonds
5. IF automatic setup fails, THEN THE System SHALL display the home screen with clear error messaging

### Requirement 7: Pairing Management and Reset Functionality

**User Story:** As a user, I want to be able to reset device pairing when needed, so that I can pair with different devices or troubleshoot connection issues.

#### Acceptance Criteria

1. THE System SHALL provide a "Reset Pairing" option in the settings or help interface
2. WHEN pairing reset is requested, THE System SHALL remove the Pairing_Bond from Cloud_Storage
3. WHEN pairing reset is requested, THE System SHALL clear the Active_Pair_ID from the Device_Profile
4. AFTER pairing reset, THE System SHALL return to the home screen requiring manual mode selection
5. THE System SHALL confirm pairing reset action with the user before execution
6. WHEN one device resets pairing, THE System SHALL notify the paired device of the disconnection

### Requirement 8: Cloud Storage Data Synchronization

**User Story:** As a developer, I want reliable cloud data synchronization, so that device pairing information is consistently available across network conditions.

#### Acceptance Criteria

1. THE System SHALL use Firebase Firestore for all persistent data storage
2. THE System SHALL implement offline data caching for Device_Profile and Pairing_Bond information
3. WHEN online, THE System SHALL synchronize local changes to Cloud_Storage within 5 seconds
4. WHEN offline, THE System SHALL queue data changes for synchronization when connectivity returns
5. THE System SHALL handle Cloud_Storage conflicts by preferring the most recent timestamp
6. THE System SHALL implement proper error handling for Cloud_Storage operations with user-friendly error messages

### Requirement 9: Enhanced Wake Lock Monitoring and Recovery

**User Story:** As a user, I want the app to aggressively maintain screen wake state, so that my screen never turns off during leveling operations.

#### Acceptance Criteria

1. THE System SHALL monitor Wake_Lock status every 10 seconds and re-request if released
2. WHEN the Wake_Lock is unexpectedly released, THE System SHALL immediately attempt to re-acquire it
3. THE System SHALL implement multiple wake-keeping strategies: Wake Lock API, user interaction simulation, and visibility API monitoring
4. THE System SHALL log Wake_Lock events for debugging purposes
5. WHEN Wake_Lock acquisition fails, THE System SHALL display a warning and provide manual re-activation option
6. THE System SHALL maintain wake state during device rotation, app switching, and notification interactions

### Requirement 10: Backward Compatibility and Migration

**User Story:** As an existing user, I want my current sessions to work normally while the new persistent features are being implemented, so that I can continue using the app without disruption.

#### Acceptance Criteria

1. THE System SHALL continue to support PIN-based pairing for new device pairs
2. WHEN localStorage data exists without cloud data, THE System SHALL offer to migrate to cloud storage
3. THE System SHALL maintain all existing functionality for users who decline cloud storage
4. THE System SHALL provide a clear upgrade path from localStorage to cloud-based persistence
5. THE System SHALL not break existing bookmarks or shared links during the upgrade
