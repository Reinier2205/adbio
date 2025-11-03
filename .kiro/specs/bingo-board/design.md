# Bingo Board Feature Design

## Overview

The Bingo Board feature transforms the existing carousel into a progress-focused interface that provides comprehensive visualization of player completion across all bingo challenges. The design leverages the existing carousel infrastructure while adding bingo-specific functionality and removing non-essential features.

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Main Game     │◄──►│   Bingo Board    │◄──►│   Worker API    │
│   (index.html)  │    │   (board.html)   │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Player Context  │    │ Board State Mgmt │    │ Photo Data      │
│ Authentication  │    │ View Switching   │    │ Player Data     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Component Structure

1. **Board Controller**: Main orchestration logic
2. **Player Selection Component**: Player circles interface
3. **Grid Renderer**: Handles both card view and player view rendering
4. **Progress Calculator**: Computes completion statistics
5. **Photo Manager**: Handles photo loading and display
6. **Navigation Manager**: Manages view state and transitions

## Components and Interfaces

### 1. Board Controller (`BoardController`)

**Purpose**: Central coordination of board functionality

**Key Methods**:
- `initialize(eventCode, initialPlayer)`: Setup board with event context
- `switchToPlayerView(playerName)`: Display individual player's board
- `switchToCardView()`: Display all players completion overview
- `updateProgress()`: Refresh completion statistics

**State Management**:
```javascript
{
  currentView: 'card' | 'player',
  selectedPlayer: string | null,
  eventCode: string,
  players: Player[],
  squares: Square[],
  photos: PhotoData,
  completionStats: CompletionStats
}
```

### 2. Player Selection Component (`PlayerSelector`)

**Purpose**: Render and manage player circle selection interface

**Key Methods**:
- `renderPlayerCircles(players)`: Create player circle UI
- `selectPlayer(playerName)`: Handle player selection
- `highlightActivePlayer(playerName)`: Update visual selection state

**Interface**:
```javascript
interface PlayerCircle {
  name: string;
  icon: string;
  isActive: boolean;
  completionCount: number;
}
```

### 3. Grid Renderer (`GridRenderer`)

**Purpose**: Render both card view and player view grids

**Key Methods**:
- `renderCardView(completionStats, toggleState)`: Render completion overview
- `renderPlayerView(playerName, playerPhotos, squares)`: Render individual board
- `renderSquare(squareData, viewType)`: Render individual square content

**Square Rendering Logic**:
- **Card View**: Show completion count + toggle for who completed/outstanding
- **Player View**: Show photo if completed, challenge text if incomplete

### 4. Progress Calculator (`ProgressCalculator`)

**Purpose**: Compute completion statistics and progress metrics

**Key Methods**:
- `calculateCompletionStats(players, photos, squares)`: Overall statistics
- `getPlayerProgress(playerName, photos, squares)`: Individual progress
- `getSquareCompletionRate(squareIndex)`: Per-square completion rate

**Data Structures**:
```javascript
interface CompletionStats {
  totalPlayers: number;
  totalSquares: number;
  overallCompletion: number;
  squareStats: SquareCompletionStat[];
}

interface SquareCompletionStat {
  squareIndex: number;
  challengeText: string;
  completedBy: string[];
  outstandingPlayers: string[];
  completionRate: number;
}
```

## Data Models

### Core Data Models

```javascript
// Player data structure
interface Player {
  name: string;
  icon: string;
  completionCount: number;
  photos: { [squareIndex: string]: string };
}

// Square/Challenge data
interface Square {
  index: number;
  challengeText: string;
  position: { row: number, col: number };
}

// Photo data organization
interface PhotoData {
  [playerName: string]: {
    [squareIndex: string]: string; // URL
  }
}

// View state management
interface BoardState {
  currentView: 'card' | 'player';
  selectedPlayer: string | null;
  toggleState: 'completed' | 'outstanding';
  eventCode: string;
}
```

### API Integration

**Existing Endpoints Used**:
- `GET /players?event=${eventCode}`: Get all players and completion counts
- `GET /player?name=${playerName}&event=${eventCode}`: Get individual player photos
- `GET /squares?event=${eventCode}`: Get bingo squares/challenges

**Data Flow**:
1. Load all players and their completion counts
2. Load squares/challenges for the event
3. For card view: Calculate completion statistics
4. For player view: Load specific player's photos

## Error Handling

### Error Scenarios and Responses

1. **Network Failures**:
   - Show loading states during API calls
   - Display error messages for failed requests
   - Graceful degradation to cached data when available

2. **Missing Data**:
   - Handle events with no players gracefully
   - Show empty states for incomplete data
   - Default to challenge text when photos unavailable

3. **Authentication Issues**:
   - Respect view-only mode from main game
   - Handle authentication context properly
   - Maintain consistent auth state across navigation

### Error UI Components

```javascript
// Error state rendering
interface ErrorState {
  type: 'network' | 'nodata' | 'auth';
  message: string;
  retryAction?: () => void;
}
```

## Testing Strategy

### Unit Testing Focus

1. **Progress Calculator**: Test completion statistics accuracy
2. **Grid Renderer**: Test correct square content rendering
3. **Player Selection**: Test player switching logic
4. **State Management**: Test view transitions and data consistency

### Integration Testing

1. **API Integration**: Test data loading and error handling
2. **Navigation Flow**: Test transitions between main game and board
3. **Authentication**: Test view-only mode and player context preservation

### User Acceptance Testing

1. **Progress Visualization**: Verify completion statistics accuracy
2. **Player Switching**: Test smooth transitions between player views
3. **Challenge Display**: Verify incomplete squares show challenge text
4. **Performance**: Test with multiple players and photos

## Implementation Approach

### Phase 1: Core Infrastructure
1. Create `board.html` based on existing `carousel.html`
2. Implement `BoardController` and basic state management
3. Set up player selection interface
4. Implement basic grid rendering

### Phase 2: View Implementation
1. Implement card view with completion statistics
2. Implement player view with photo/challenge display
3. Add completion toggles (who completed/outstanding)
4. Integrate progress calculation

### Phase 3: Polish and Integration
1. Update main game navigation to link to board
2. Implement smooth transitions and loading states
3. Add error handling and empty states
4. Performance optimization and testing

### File Structure

```
EventBingo/
├── board.html              # Main board interface (based on carousel.html)
├── js/
│   ├── board-controller.js  # Main board logic
│   ├── player-selector.js   # Player circle management
│   ├── grid-renderer.js     # Grid rendering logic
│   └── progress-calc.js     # Progress calculations
├── css/
│   └── board-styles.css     # Board-specific styling
└── index.html              # Updated with board navigation
```

### Technology Considerations

- **Reuse Existing**: Leverage carousel's photo loading, modal, and styling
- **Remove Unused**: Strip out search, list view, and pagination
- **Enhance**: Add bingo-specific progress visualization
- **Maintain**: Keep consistent authentication and event handling

This design provides a solid foundation for implementing the Bingo Board feature while reusing existing infrastructure and maintaining consistency with the main game interface.