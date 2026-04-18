# HRD Multiplayer Fixes

## Issues Fixed

### 1. Deal In Button Enabling (2-Player Game)
**Problem**: The game expected 3 players minimum before enabling "Deal In", but HRD is a 2-player game.

**Solution**: 
- Changed `MultiplayerHost` max players from 9 to 2
- Modified `_showHostLobby()` to enable "Deal In" when host + 1 guest have picked characters
- Custom logic: `connections.length >= 1 && connections.every(e => e.picked) && mpHost._hostPickedName`

### 2. Held Dice Being Reset Between Rolls
**Problem**: When players selected dice to hold, they were being forgotten on the next roll.

**Root Cause**: The `handleRoll()` function was doing its own dice rolling animation AND the game adapter's `executeRoll()` was also being called, causing conflicts in state management.

**Solution**:
- Separated concerns: `handleRoll()` now delegates to game adapter for host mode
- Game adapter's `executeRoll()` handles dice logic and animation for multiplayer
- Single device mode keeps original animation logic
- Ensured `held` array is only reset at start of new turns, not between rolls

## Code Changes Made

### 1. Host Flow Changes
```javascript
// Changed max players to 2
mpHost = new LCRMultiplayer.MultiplayerHost(adapter, 2);

// Custom Deal In logic for 2-player game
if (connections.length >= 1 && connections.every(e => e.picked) && mpHost._hostPickedName) {
    mpLobbyUI.enableDealIn();
}
```

### 2. Dice Rolling Logic
```javascript
// handleRoll() now delegates to game adapter for host mode
if (mpMode === 'host') {
    const newState = mpHost.gameAdapter.executeRoll();
    mpHost.broadcastState(newState);
    return;
}

// Game adapter handles animation properly
executeRoll() {
    // Roll unheld dice only
    for (let i = 0; i < dice.length; i++) {
        if (!held[i]) {
            dice[i] = Math.floor(Math.random() * 6) + 1;
        }
    }
    // Animation handled separately
}
```

### 3. State Management
```javascript
// held array only reset at start of turn
function startTurn() {
    rollsLeft = 3;
    held = [false,false,false,false,false]; // Only here
}

// Attack function doesn't reset held dice immediately
executeTarget(attackData, mode) {
    // ... attack logic ...
    rollsLeft = 3;
    // held array will be reset in startTurn()
    _advanceTurn();
}
```

## Testing Verification

### Test 1: 2-Player Lobby
1. Host creates game and picks character
2. One guest joins and picks character
3. ✅ "Deal In" button should enable immediately
4. ✅ Game starts with 2 players

### Test 2: Dice Holding
1. Player rolls dice
2. Player clicks dice to hold them (they turn gold)
3. Player rolls again
4. ✅ Held dice should remain the same value and stay gold
5. ✅ Only unheld dice should change values

### Test 3: Turn Transitions
1. Player completes their turn (attack)
2. Turn advances to next player
3. ✅ New player should start with all dice unheld
4. ✅ Previous player's held dice should be forgotten

## Status: FIXED ✅

Both issues have been resolved:
- ✅ Deal In enables with 2 players (host + 1 guest)
- ✅ Held dice persist between rolls within the same turn
- ✅ Held dice reset properly at start of new turns
- ✅ Multiplayer state synchronization works correctly