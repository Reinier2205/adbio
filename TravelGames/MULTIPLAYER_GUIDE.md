# Multi-Device Multiplayer Implementation Guide

This guide documents the peer-to-peer multiplayer architecture used in Travel Games, based on the implementation in `lcrrogue.html` and `lcr-multiplayer.js`.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Core Concepts](#core-concepts)
3. [Game Adapter Interface](#game-adapter-interface)
4. [Implementation Steps](#implementation-steps)
5. [UI Integration](#ui-integration)
6. [Testing Checklist](#testing-checklist)

---

## Architecture Overview

### Technology Stack
- **PeerJS 1.5.4** — WebRTC wrapper for peer-to-peer connections
- **Host-Authority Model** — Host owns game state, guests render and send actions
- **PIN-Based Discovery** — 4-digit PIN for easy session joining
- **Vanilla JavaScript** — No build step required

### Communication Flow
```
┌─────────────┐                    ┌─────────────┐
│   HOST      │◄──────────────────►│   GUEST 1   │
│  (Player 0) │   PeerJS WebRTC    │  (Player 1) │
└─────────────┘                    └─────────────┘
       │                                   │
       │  Broadcasts game_state            │  Sends actions
       │  Executes all game logic          │  (roll, target)
       │                                   │
       └───────────────────────────────────┘
                      │
                ┌─────────────┐
                │   GUEST 2   │
                │  (Player 2) │
                └─────────────┘
```

---

## Core Concepts

### 1. **Host-Authority**
- Host executes ALL game logic (dice rolls, chip transfers, turn advancement)
- Guests are "thin clients" that only render state and send action requests
- Host validates that actions come from the correct player's turn

### 2. **Game State Synchronization**
- Host broadcasts full game state after every action
- Guests apply state via `gameAdapter.applyState()`
- State includes: players, scores, turn index, pending actions

### 3. **Turn Validation**
- Only the player whose `turnIndex` matches their `playerIndex` can act
- Host silently ignores actions from wrong-turn players
- Guests disable their controls when it's not their turn

### 4. **Lobby Phase**
- Host picks character first, then shares PIN
- Guests connect and pick from remaining characters
- Game starts when all players have picked (minimum 3 total)

---

## Game Adapter Interface

Every game must implement a **Game Adapter** object with these methods:

### Required Methods

```javascript
const gameAdapter = {
  /**
   * Returns the current authoritative game state.
   * Called by host to broadcast to guests.
   */
  getState() {
    return {
      players: [{ name, icon, chips, connected }, ...],
      centerPot: number,
      turnIndex: number,
      lastDiceResults: [...],        // optional: for animation sync
      lastDiceIndices: [...],        // optional: exact die face indices
      lastChipMoves: [{from, to}],   // optional: for chip animations
      pendingTargeting: { mode, activePlayerIndex } | null
    };
  },

  /**
   * Applies a state snapshot received from the host.
   * Called by guests to update their local UI.
   */
  applyState(state) {
    // Update local variables from state
    players = state.players;
    centerPot = state.centerPot;
    turnIndex = state.turnIndex;
    
    // Trigger animations if needed
    if (state.lastDiceResults) _showDiceAnimation(state.lastDiceResults);
    if (state.lastChipMoves) _animateChipMoves(state.lastChipMoves);
    
    // Update UI
    renderTable();
    updateUI();
  },

  /**
   * Executes a dice roll for the current turn player.
   * Called by host only.
   * Returns updated state.
   */
  executeRoll() {
    const results = _rollDice();
    _processResults(results);
    return this.getState();
  },

  /**
   * Executes a target selection (pass/steal chip).
   * Called by host only.
   * Returns updated state.
   */
  executeTarget(targetIndex, mode) {
    if (mode === 'PASS') {
      players[turnIndex].chips--;
      players[targetIndex].chips++;
    } else if (mode === 'STEAL') {
      players[targetIndex].chips--;
      players[turnIndex].chips++;
    }
    _advanceTurn();
    return this.getState();
  },

  /**
   * Handles a player disconnection.
   * Called by host when a guest drops.
   * Returns updated state.
   */
  handleDisconnect(playerIndex) {
    centerPot += players[playerIndex].chips;
    players[playerIndex].chips = 0;
    players[playerIndex].connected = false;
    return this.getState();
  },

  /**
   * Called when guest is assigned a player slot.
   * Store myPlayerIndex for turn checking.
   */
  onAssigned(playerIndex) {
    myPlayerIndex = playerIndex;
  },

  /**
   * Called when host disconnects.
   * Show "Host Disconnected" overlay.
   */
  onHostDisconnected() {
    LCRMultiplayer.UI.showHostDisconnected();
  }
};
```

---

## Implementation Steps

### Step 1: Include the Multiplayer Library

```html
<script src="lcr-multiplayer.js"></script>
```

### Step 2: Add Mode Variables

```javascript
let mpMode = 'single';  // 'single' | 'host' | 'guest'
let mpHost = null;
let mpGuest = null;
let myPlayerIndex = null;
```

### Step 3: Show Mode Selection on Load

```javascript
window.onload = () => {
  // Check for PIN in URL hash (e.g., #LCP:1234)
  const hashPin = _parseHashPin();
  if (hashPin) {
    _startGuestFlow(hashPin);
    return;
  }

  // Show mode selection
  LCRMultiplayer.UI.showModeSelectionThree(
    () => { mpMode = 'single'; initGame(); },
    () => _startHostFlow(),
    () => _startGuestFlow(null)
  );
};

function _parseHashPin() {
  const m = window.location.hash.match(/^#LCP:(\d{4})$/);
  return m ? m[1] : null;
}
```

### Step 4: Implement Host Flow

```javascript
async function _startHostFlow() {
  mpMode = 'host';
  myPlayerIndex = 0;
  
  const adapter = _buildGameAdapter();
  mpHost = new LCRMultiplayer.MultiplayerHost(adapter, MAX_PLAYERS);
  
  try {
    await mpHost.open();
  } catch(e) {
    LCRMultiplayer.UI.showToast('Could not connect — check your internet');
    mpMode = 'single';
    initGame();
    return;
  }
  
  // Host picks character first
  _showHostCharacterPicker();
}

function _showHostCharacterPicker() {
  const pickerUI = LCRMultiplayer.UI.showGuestCharacterPicker({
    pool: CHARACTERS.map(c => ({ name: c.name, icon: c.icon })),
    takenNames: [],
    onPick: ({ name, icon }) => {
      mpHost.hostPick(name, icon);
      _showHostLobby();
    }
  });
}

function _showHostLobby() {
  const lobbyUI = LCRMultiplayer.UI.showHostLobby({
    pin: mpHost.pin,
    onShareLink: () => _shareLink(mpHost.pin),
    onDealIn: () => _dealIn()
  });
  
  mpHost.onGuestConnected = (count) => {
    lobbyUI.updateCount(count + 1);
  };
  
  mpHost.onGuestPicked = (connections) => {
    lobbyUI.updateCount(connections.length + 1);
    if (mpHost.allPicked()) lobbyUI.enableDealIn();
  };
}

function _dealIn() {
  const picks = mpHost.buildPlayersFromPicks();
  players = picks.map((p, i) => ({ name: p.name, icon: p.icon, score: 0, id: i }));
  
  // Start game
  startGame();
  
  // Broadcast initial state
  mpHost.broadcastState(mpHost.gameAdapter.getState());
  
  // Show PIN persistently
  _showGamePin(mpHost.pin);
  
  // Listen for state changes from guest actions
  mpHost.onStateChange = (newState) => {
    updateUI();
    checkWinner();
  };
}

function _shareLink(pin) {
  const url = window.location.href.split('#')[0] + '#LCP:' + pin;
  if (navigator.share) {
    navigator.share({ title: 'Join my game!', url });
  } else {
    navigator.clipboard.writeText(url).then(() => 
      LCRMultiplayer.UI.showToast('Link copied!')
    );
  }
}
```

### Step 5: Implement Guest Flow

```javascript
async function _startGuestFlow(pin) {
  mpMode = 'guest';
  
  const adapter = _buildGameAdapter();
  mpGuest = new LCRMultiplayer.MultiplayerGuest(adapter);
  
  const pinUI = LCRMultiplayer.UI.showGuestPinEntry({
    prefillPin: pin || '',
    onConnect: async (enteredPin) => {
      try {
        await mpGuest.connect(enteredPin);
        pinUI.remove();
        _showGuestCharacterPicker();
      } catch(e) {
        pinUI.showError('Host not found — check PIN');
      }
    },
    onBack: () => {
      pinUI.remove();
      location.reload();
    }
  });
}

function _showGuestCharacterPicker() {
  const pickerUI = LCRMultiplayer.UI.showGuestCharacterPicker({
    pool: CHARACTERS.map(c => ({ name: c.name, icon: c.icon })),
    takenNames: mpGuest._lobbyTakenNames || [],
    onPick: ({ name, icon }) => {
      mpGuest.sendAction({ type: 'pick', name, icon });
      LCRMultiplayer.UI.showGuestWaiting();
    }
  });
  
  mpGuest.onLobbyState = (takenNames) => {
    if (pickerUI) pickerUI.updateTaken(takenNames);
  };
}
```

### Step 6: Modify Game Actions

```javascript
function handleRoll() {
  if (isProcessing) return;
  
  // Guest sends action to host
  if (mpMode === 'guest' && mpGuest) {
    mpGuest.sendAction({ type: 'roll' });
    return;
  }
  
  // Host or single-device: execute locally
  isProcessing = true;
  const results = _rollDice();
  _processResults(results);
  
  // Host broadcasts new state
  if (mpMode === 'host' && mpHost) {
    mpHost.broadcastState(mpHost.gameAdapter.getState());
  }
  
  isProcessing = false;
}

function handleTarget(targetIndex) {
  // Guest sends action to host
  if (mpMode === 'guest' && mpGuest) {
    mpGuest.sendAction({ type: 'target', targetIndex, mode: targetingMode });
    return;
  }
  
  // Host or single-device: execute locally
  _executeTarget(targetIndex);
  
  // Host broadcasts new state
  if (mpMode === 'host' && mpHost) {
    mpHost.broadcastState(mpHost.gameAdapter.getState());
  }
}
```

### Step 7: Update Turn UI

```javascript
function _updateTurnUI() {
  if (mpMode === 'single') return;
  
  // Remove old banners
  document.getElementById('lcr-mp-spectator-banner')?.remove();
  document.getElementById('lcr-mp-active-banner')?.remove();
  
  const isMine = myPlayerIndex === turnIndex;
  
  // Disable/enable controls
  document.getElementById('roll-btn').disabled = !isMine;
  
  // Show appropriate banner
  if (isMine) {
    LCRMultiplayer.UI.showActiveTurnBanner();
  } else if (players[turnIndex]) {
    LCRMultiplayer.UI.showSpectatorBanner(players[turnIndex].name);
  }
}
```

---

## UI Integration

### Persistent PIN Display (Host Only)

```javascript
function _showGamePin(pin) {
  const existing = document.getElementById('lcr-game-pin');
  if (existing) existing.remove();
  
  const el = document.createElement('div');
  el.id = 'lcr-game-pin';
  el.style.cssText = 'position:fixed;top:8px;right:8px;background:rgba(0,0,0,0.75);border:1px solid #d4af37;border-radius:8px;padding:4px 10px;font-family:Bungee,cursive;font-size:0.65rem;color:#ffd700;z-index:500;pointer-events:none;letter-spacing:0.1em';
  el.textContent = `PIN: ${pin}`;
  document.body.appendChild(el);
}
```

### Player "YOU" Tag

```javascript
function updateUI() {
  players.forEach((p, i) => {
    const seat = document.getElementById(`seat-${i}`);
    const youTag = (mpMode !== 'single' && i === myPlayerIndex)
      ? `<span style="font-size:8px;background:#d4af37;color:#000;border-radius:4px;padding:0 3px;font-weight:900;display:block;margin-bottom:1px">YOU</span>`
      : '';
    seat.innerHTML = `${youTag}...`;
  });
}
```

### Targeting Panel (for games with target selection)

```javascript
function startTargeting(mode) {
  targetingMode = mode;
  
  LCRMultiplayer.UI.showTargetingPanel({
    players,
    myIndex: turnIndex,
    mode,
    onSelect: (idx) => {
      if (mpMode === 'guest' && mpGuest) {
        mpGuest.sendAction({ type: 'target', targetIndex: idx, mode });
      } else {
        handleTarget(idx);
      }
    }
  });
  
  // Host broadcasts pending targeting state
  if (mpMode === 'host' && mpHost) {
    const state = mpHost.gameAdapter.getState();
    state.pendingTargeting = { mode, activePlayerIndex: turnIndex };
    mpHost.broadcastState(state);
  }
}
```

---

## Testing Checklist

### Single Device Mode
- [ ] Game starts normally without multiplayer
- [ ] All game mechanics work as before
- [ ] No console errors

### Host Flow
- [ ] Mode selection appears on load
- [ ] Host can pick character
- [ ] PIN is generated and displayed
- [ ] Share link copies to clipboard
- [ ] Guest count updates when guests connect
- [ ] "Deal In" enables when all players picked
- [ ] Game starts correctly with all players
- [ ] PIN persists during game

### Guest Flow
- [ ] PIN entry works with keypad
- [ ] URL hash auto-fills PIN
- [ ] Error shows for invalid PIN
- [ ] Character picker shows taken characters greyed out
- [ ] Waiting screen appears after picking
- [ ] Game starts when host deals in

### Gameplay
- [ ] Only current turn player can roll/act
- [ ] Dice animations sync across devices
- [ ] Chip animations sync across devices
- [ ] Turn banners show correctly
- [ ] "YOU" tag appears on own player
- [ ] Targeting panel works (if applicable)
- [ ] Win screen appears for all players

### Disconnection Handling
- [ ] Guest disconnect: chips go to pot, game continues
- [ ] Host disconnect: guests see "Host Disconnected" screen
- [ ] Reconnect works (guest refreshes and rejoins)

### Edge Cases
- [ ] Game full (10 players): new guest rejected
- [ ] Wrong-turn actions ignored by host
- [ ] Multiple rapid actions don't break state
- [ ] Page refresh during lobby
- [ ] Page refresh during game

---

## Common Pitfalls

### 1. **Forgetting to Check mpMode**
Always check `mpMode` before executing game logic:
```javascript
// ❌ BAD
function rollDice() {
  const results = _roll();
  processResults(results);
}

// ✅ GOOD
function rollDice() {
  if (mpMode === 'guest') {
    mpGuest.sendAction({ type: 'roll' });
    return;
  }
  const results = _roll();
  processResults(results);
}
```

### 2. **Not Broadcasting State After Changes**
Host must broadcast after every state change:
```javascript
// ❌ BAD
function finishTurn() {
  turnIndex = (turnIndex + 1) % players.length;
  updateUI();
}

// ✅ GOOD
function finishTurn() {
  turnIndex = (turnIndex + 1) % players.length;
  if (mpMode === 'host') {
    mpHost.broadcastState(mpHost.gameAdapter.getState());
  }
  updateUI();
}
```

### 3. **Animations Out of Sync**
Include animation data in state:
```javascript
getState() {
  return {
    players,
    turnIndex,
    lastDiceResults: [...],  // ← Include for sync
    lastChipMoves: [...]     // ← Include for sync
  };
}
```

### 4. **Not Validating Turn**
Host adapter must validate turn:
```javascript
_handleAction(msg, conn) {
  const entry = this.connections.find(e => e.conn === conn);
  const state = this.gameAdapter.getState();
  
  // ✅ Validate turn
  if (entry.playerIndex !== state.turnIndex) return;
  
  // Execute action...
}
```

---

## Questions for Clarification

Before implementing multiplayer for a new game, consider:

1. **Turn Structure**
   - Is it turn-based or simultaneous?
   - Can players act out of turn?
   - Are there phases within a turn?

2. **State Complexity**
   - What needs to be synchronized?
   - Are there hidden information elements (cards in hand)?
   - Do animations need exact sync?

3. **Player Interactions**
   - Do players target each other?
   - Are there team mechanics?
   - Can players trade/negotiate?

4. **Disconnection**
   - What happens to a disconnected player's resources?
   - Can they rejoin mid-game?
   - Should the game pause or continue?

5. **Win Conditions**
   - Single winner or multiple?
   - Elimination-based or score-based?
   - Tie-breaker rules?

---

## Example: Converting a Simple Game

Let's convert a hypothetical "Coin Flip Duel" game:

**Original (Single Device):**
```javascript
let players = [{name:'P1', score:0}, {name:'P2', score:0}];
let turnIndex = 0;

function flipCoin() {
  const result = Math.random() < 0.5 ? 'H' : 'T';
  players[turnIndex].score++;
  turnIndex = (turnIndex + 1) % 2;
  updateUI();
  checkWinner();
}
```

**Multiplayer Version:**
```javascript
let mpMode = 'single';
let mpHost = null;
let mpGuest = null;
let myPlayerIndex = null;

// Add mode selection
window.onload = () => {
  LCRMultiplayer.UI.showModeSelectionThree(
    () => { mpMode = 'single'; startGame(); },
    () => _startHostFlow(),
    () => _startGuestFlow(null)
  );
};

// Build adapter
function _buildGameAdapter() {
  return {
    getState() {
      return { players, turnIndex, lastResult: '' };
    },
    applyState(state) {
      players = state.players;
      turnIndex = state.turnIndex;
      updateUI();
      checkWinner();
    },
    executeRoll() {
      const result = Math.random() < 0.5 ? 'H' : 'T';
      players[turnIndex].score++;
      turnIndex = (turnIndex + 1) % players.length;
      const s = this.getState();
      s.lastResult = result;
      return s;
    },
    handleDisconnect(idx) {
      players[idx].connected = false;
      return this.getState();
    },
    onAssigned(idx) { myPlayerIndex = idx; },
    onHostDisconnected() { LCRMultiplayer.UI.showHostDisconnected(); }
  };
}

// Modify flip action
function flipCoin() {
  if (mpMode === 'guest' && mpGuest) {
    mpGuest.sendAction({ type: 'roll' });
    return;
  }
  
  const result = Math.random() < 0.5 ? 'H' : 'T';
  players[turnIndex].score++;
  turnIndex = (turnIndex + 1) % players.length;
  
  if (mpMode === 'host' && mpHost) {
    const state = mpHost.gameAdapter.getState();
    state.lastResult = result;
    mpHost.broadcastState(state);
  }
  
  updateUI();
  checkWinner();
}
```

---

## Summary

To convert a game to multiplayer:

1. **Include** `lcr-multiplayer.js`
2. **Add** mode variables (`mpMode`, `mpHost`, `mpGuest`, `myPlayerIndex`)
3. **Show** mode selection on load
4. **Build** game adapter with required methods
5. **Implement** host and guest flows
6. **Modify** game actions to check `mpMode` and send/broadcast
7. **Update** UI to show turn indicators and player tags
8. **Test** all flows and edge cases

The multiplayer library handles all networking, lobby management, and UI overlays. Your game only needs to implement the adapter interface and route actions correctly.
