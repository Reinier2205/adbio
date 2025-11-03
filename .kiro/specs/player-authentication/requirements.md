# Player Authentication Requirements

## Introduction

Implement a fun, password-free authentication system using personal secret questions to ensure players can only upload photos for themselves while maintaining the social and playful nature of EventBingo.

## Glossary

- **Player**: A participant in an EventBingo event who can view and potentially upload photos
- **Secret Question**: A randomly assigned personal question used for player verification
- **Upload Mode**: Full access allowing photo uploads for the authenticated player
- **View-Only Mode**: Limited access allowing photo viewing but no uploads
- **Local Secret**: Player's answer stored in browser localStorage for auto-verification
- **Player Registry**: KV storage containing question/answer pairs per player per event

## Requirements

### Requirement 1: Player Selection and Authentication

**User Story:** As a player, I want to select myself from the player list and authenticate with a fun personal question so that I can upload photos for myself without using passwords.

#### Acceptance Criteria

1. WHEN a player selects their name from the player list, THE system SHALL check for existing local authentication data
2. IF local authentication exists, THE system SHALL offer "Continue as {player}" and "Re-enter secret" options
3. IF no local authentication exists, THE system SHALL display the player's assigned secret question
4. WHEN a player answers their secret question correctly, THE system SHALL grant upload mode access
5. WHEN a player answers incorrectly or skips, THE system SHALL grant view-only mode access

### Requirement 2: New Player Registration

**User Story:** As a new player, I want to register with my name and answer a fun question so that I can participate in the event with upload privileges.

#### Acceptance Criteria

1. WHEN a user chooses "Register as new player", THE system SHALL prompt for a player name
2. WHEN a valid name is entered, THE system SHALL randomly assign a secret question from the predefined list
3. WHEN the player provides an answer, THE system SHALL store the question/answer pair in KV storage
4. WHEN registration completes, THE system SHALL save the answer locally and grant upload mode
5. THE system SHALL prevent duplicate player names within the same event

### Requirement 3: Returning Player Authentication

**User Story:** As a returning player, I want to quickly continue where I left off or re-authenticate if needed so that I can seamlessly access my upload privileges.

#### Acceptance Criteria

1. WHEN a player has local authentication data, THE system SHALL display "Continue as {player}" option
2. WHEN "Continue" is selected, THE system SHALL immediately grant upload mode without re-asking the question
3. WHEN "Re-enter answer" is selected, THE system SHALL display the stored question for verification
4. WHEN the answer matches the stored answer, THE system SHALL grant upload mode and update local storage
5. WHEN the answer doesn't match, THE system SHALL grant view-only mode only

### Requirement 4: View-Only Mode Implementation

**User Story:** As a user who cannot authenticate, I want to still view all photos and enjoy the social aspect so that I'm not completely excluded from the experience.

#### Acceptance Criteria

1. WHEN a player is in view-only mode, THE system SHALL display all photos and player progress
2. WHEN a player is in view-only mode, THE system SHALL hide all upload buttons and interfaces
3. WHEN a player is in view-only mode, THE system SHALL display a friendly message explaining the limitation
4. THE system SHALL allow view-only users to access carousel, leaderboard, and all viewing features
5. THE system SHALL prevent view-only users from accessing any upload or modification functions

### Requirement 5: Upload API Security

**User Story:** As the system, I want to validate player authentication on every upload so that only authenticated players can upload photos for themselves.

#### Acceptance Criteria

1. WHEN an upload request is received, THE system SHALL require player name and secret answer parameters
2. WHEN the secret answer matches the stored answer for that player, THE system SHALL process the upload
3. WHEN the secret answer doesn't match or is missing, THE system SHALL reject the upload with appropriate error
4. THE system SHALL maintain existing upload functionality for authenticated requests
5. THE system SHALL log authentication failures for monitoring purposes

### Requirement 6: Data Storage and Management

**User Story:** As the system, I want to securely store and manage player authentication data so that the authentication system works reliably across sessions and devices.

#### Acceptance Criteria

1. THE system SHALL store player questions and answers in KV storage with key format `auth_{eventCode}_{playerName}`
2. THE system SHALL store local authentication in localStorage with keys `secret_answer_{eventCode}_{playerName}` and `secret_verified_{eventCode}_{playerName}`
3. THE system SHALL randomly assign questions from the predefined list ensuring no duplicates per player
4. THE system SHALL handle localStorage unavailability gracefully by falling back to question prompts
5. THE system SHALL clear local authentication data when explicitly requested by the user

### Requirement 7: Question Management

**User Story:** As the system, I want to use engaging personal questions that are memorable but not sensitive so that authentication is fun and accessible.

#### Acceptance Criteria

1. THE system SHALL use the predefined question list: "What is your go-to snack?", "Favourite song right now?", "Favourite colour?", "What time of day do you like most?", "Your comfort food?", "Your favourite drink?", "Your favourite cartoon growing up?", "Your happy place?", "What is your lucky number?", "Coffee or tea?", "Your favourite weekend activity?", "What animal do you like most?", "Your favourite season?", "Your favourite movie or series?", "Cats, dogs, or both?", "Sweet or savoury?", "Your favourite treat as a child?", "Your favourite pizza topping?", "A word that describes you today?"
2. THE system SHALL randomly select one question per player and never change it
3. THE system SHALL treat answers as case-insensitive for comparison
4. THE system SHALL trim whitespace from answers before storage and comparison
5. THE system SHALL allow answers of reasonable length (1-100 characters)

### Requirement 8: User Experience Flow

**User Story:** As a player, I want the authentication process to be smooth and intuitive so that it doesn't disrupt the fun game experience.

#### Acceptance Criteria

1. THE system SHALL integrate authentication seamlessly into the existing player selection flow
2. THE system SHALL provide clear visual feedback for upload mode vs view-only mode
3. THE system SHALL remember authentication state throughout the session
4. THE system SHALL provide easy options to switch players or re-authenticate
5. THE system SHALL maintain all existing game features and UI elements for authenticated users