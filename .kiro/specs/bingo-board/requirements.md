# Bingo Board Feature Requirements

## Introduction

Transform the existing photo carousel into a comprehensive Bingo Board that provides progress-focused visualization of player completion across all bingo challenges. The board maintains the familiar 5x5 grid structure while offering both individual player views and collective progress overview.

## Glossary

- **Bingo Board**: The main progress visualization interface showing completion status
- **Player Circle**: Clickable avatar representing a player, similar to Instagram stories
- **Card View**: Overview showing completion statistics for all 25 bingo squares
- **Player View**: Individual player's 5x5 bingo board with their specific progress
- **Square Position**: The numbered position (1-25) of each bingo challenge in the 5x5 grid
- **Completion Toggle**: UI control to switch between showing completed vs outstanding items

## Requirements

### Requirement 1: Board Interface Transformation

**User Story:** As a player, I want to access a dedicated Bingo Board instead of a generic photo carousel, so that I can focus on game progress rather than just browsing photos.

#### Acceptance Criteria

1. WHEN accessing the board feature, THE Bingo Board SHALL display with the title "🎯 Bingo Board"
2. WHEN navigating from the main game, THE navigation icon SHALL be 🎯 instead of 📸
3. WHEN the board loads, THE URL SHALL be "board.html" instead of "carousel.html"
4. THE Bingo Board SHALL remove all non-progress related features including search and list view
5. THE Bingo Board SHALL maintain the existing grid layout optimized for progress visualization

### Requirement 2: Player Selection Interface

**User Story:** As a player, I want to select players using familiar player circles, so that I can easily switch between viewing different players' progress.

#### Acceptance Criteria

1. THE Bingo Board SHALL display player circles at the top of the interface
2. THE player circles SHALL use the same visual design as the main game interface
3. WHEN clicking on a player circle, THE board SHALL show that specific player's 5x5 grid
4. THE Bingo Board SHALL include an "All Players" circle as the default selection
5. WHEN "All Players" is selected, THE board SHALL show the card completion overview

### Requirement 3: Card Completion Overview (Default View)

**User Story:** As a player, I want to see completion statistics for each bingo square, so that I can understand which challenges are popular or difficult across all players.

#### Acceptance Criteria

1. WHEN "All Players" is selected, THE board SHALL organize content by square position (1-25)
2. THE board SHALL display completion count for each bingo square by default
3. THE board SHALL provide a toggle to "Show who completed" displaying player thumbnails or names
4. THE board SHALL provide a toggle to "Show who's outstanding" displaying missing players
5. THE completion toggles SHALL function similarly to the existing completed/outstanding filters

### Requirement 4: Individual Player Board View

**User Story:** As a player, I want to view a specific player's bingo board, so that I can see their individual progress in the familiar 5x5 grid layout.

#### Acceptance Criteria

1. WHEN a specific player is selected, THE board SHALL display their 5x5 bingo grid
2. THE player view SHALL maintain the exact square positioning from the main game
3. THE board SHALL show visual completion indicators for completed squares
4. THE board SHALL display the player's photos in their respective grid positions
5. WHEN a player has not completed a square, THE board SHALL display the challenge text in that square
6. THE player view SHALL allow clicking on photos to view them in fullscreen

### Requirement 5: Progress Visualization Features

**User Story:** As a player, I want to see clear progress indicators, so that I can quickly understand completion status across players and challenges.

#### Acceptance Criteria

1. THE board SHALL display completion statistics for each bingo square
2. THE board SHALL show visual progress indicators (completion percentages or counts)
3. THE board SHALL highlight completed vs incomplete squares with distinct visual styling
4. THE board SHALL maintain consistent visual design with the main bingo game interface
5. THE board SHALL update progress indicators in real-time when new photos are uploaded

### Requirement 6: Navigation and Integration

**User Story:** As a player, I want seamless navigation between the main game and the board, so that I can easily switch between playing and viewing progress.

#### Acceptance Criteria

1. THE main game navigation SHALL include a 🎯 icon linking to the Bingo Board
2. THE Bingo Board SHALL include a back button returning to the main game with player context preserved
3. WHEN navigating between views, THE current player selection SHALL be maintained
4. THE board SHALL support the same event code parameter system as the main game
5. THE board SHALL respect the same authentication and view-only modes as the main game