# HRD Dice Roll Debug

## Current Issue
- Dice roll button is clickable
- Button shows visual feedback (click animation)
- But dice do not actually roll or change values
- Need to identify where the roll logic is failing

## Debugging Added

### Console Logging
Added comprehensive logging to `handleRoll()` function to track:
- Function entry with current state
- Early returns (if any)
- Guest vs Host execution paths
- Dice value changes
- Animation execution
- UI updates
- State broadcasting

### Debug Output
When roll button is clicked, console will show:
```
handleRoll called: { rollsLeft, isRolling, mpMode, myPlayerIndex, activePlayer }
Executing roll locally (or Guest sending roll action)
New dice values: [1,2,3,4,5]
Found dice elements: 5
Animation complete, updating UI
Broadcasting state (if host)
```

## Testing Steps

### 1. Open Browser Console
- Press F12 or right-click → Inspect → Console tab
- Clear console for clean output

### 2. Test Roll Button
- Click "Roll Dice" button
- Watch console output
- Note what messages appear

### 3. Expected Scenarios

#### Scenario A: Function Not Called
- **Console**: No messages
- **Issue**: Button click handler not working
- **Fix**: Check button onclick attribute

#### Scenario B: Early Return
- **Console**: "handleRoll early return: ..."
- **Issue**: rollsLeft=0 or isRolling=true
- **Fix**: Check button state logic

#### Scenario C: Guest Mode Issue
- **Console**: "Guest sending roll action"
- **Issue**: Guest action not reaching host
- **Fix**: Check multiplayer connection

#### Scenario D: Animation Issue
- **Console**: Shows execution but no visual change
- **Issue**: DOM manipulation not working
- **Fix**: Check dice element selection

#### Scenario E: State Issue
- **Console**: Shows execution but state corrupted
- **Issue**: State synchronization problem
- **Fix**: Check applyState logic

## Current State Management

### Host Flow
1. Host clicks roll → `handleRoll()` executes locally
2. Dice values change, animation plays
3. UI updates with new values
4. State broadcasts to guests

### Guest Flow
1. Guest clicks roll → sends action to host
2. Host's `executeRoll()` method called
3. Host broadcasts new state
4. Guest's `applyState()` updates UI

### Potential Issues
- Host's `applyState()` is disabled (might be causing problems)
- `onStateChange` callback might interfere
- Animation and state updates might be out of sync

## Next Steps

1. **Test with console open** to see debug output
2. **Identify which scenario** matches the behavior
3. **Apply targeted fix** based on debug results
4. **Remove debug logging** once issue is resolved

## Quick Fixes to Try

If debugging shows specific issues:

### Fix 1: Button Handler
```javascript
// Check if onclick is properly set
<button id="roll-btn" onclick="handleRoll()">Roll Dice</button>
```

### Fix 2: State Corruption
```javascript
// Ensure host can apply its own state
applyState(state) {
    // Remove the host check temporarily
    // if (mpMode === 'host') return;
}
```

### Fix 3: Animation Elements
```javascript
// Ensure dice elements exist
const els = document.querySelectorAll('.die');
if (els.length === 0) {
    console.error('No dice elements found!');
    return;
}
```