# Design Document: LCR Multiplayer

## Overview

This design adds a **Multi Device** mode to two existing single-file HTML games: `TravelGames/lcrdice.html` (LCR Casino) and `TravelGames/lcrrogue.html` (Rogue LCR). Both games currently run as pass-and-play on one phone. The new mode lets each player use their own phone, connected peer-to-peer via PeerJS (WebRTC).

The approach is **additive, not replacement**: the existing single-device game logic is left intact. A thin multiplayer layer is injected around it that intercepts user actions, routes them through the host-authority model, and re-renders state from authoritative broadcasts.

PeerJS is loaded lazily — only when the user selects Multi Device mode — so Single Device mode has zero network dependency.

The same multiplayer module is shared by both games. Game-specific differences (LCR dice symbols vs Rogue symbols, targeting flow) are handled via a small game-adapter interface.

---

## Architecture

### Host-Authority Model

```
┌─────────────────────────────────────────────────────────┐
│  HOST DEVICE                                            │
│  ┌──────────────┐    ┌──────────────────────────────┐  │
│  │  Game Logic  │◄───│  MultiplayerHost              │  │
│  │  (unchanged) │    │  - owns authoritative state   │  │
│  └──────────────┘    │  - processes all actions      │  │
│                      │  - broadcasts Game_State       │  │
│                      └──────────────┬─────────────────┘  │
└─────────────────────────────────────┼─────────────────────┘
                                      │ PeerJS DataChannel
              ┌───────────────────────┼───────────────────┐
              │                       │                   │
   ┌──────────▼──────┐    ┌──────────▼──────┐    ...
   │  GUEST 1        │    │  GUEST 2        │
   │  MultiplayerGuest│    │  MultiplayerGuest│
   │  - renders state │    │  - renders state │
   │  - sends actions │    │  - sends actions │
   └─────────────────┘    └─────────────────┘
```

**Key invariants:**
- Guests never mutate local game state. They only render what the host broadcasts.
- All dice rolls happen on the host. Guests send `roll` intent; host resolves and broadcasts result.
- Turn enforcement: the host ignores action messages from peers that don't match the current `turnIndex`.

### PeerJS Peer IDs

| Role | Peer ID format |
|------|---------------|
| Host | `lcr-XXXX-host` |
| Guest | `lcr-XXXX-guest-{timestamp}` |

Where `XXXX` is the 4-digit session PIN (1000–9999).

### Lazy PeerJS Loading

```javascript
async function loadPeerJS() {
  if (window.Peer) return;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}
```

Called only when the user taps "Multi Device". Single Device mode never triggers this.

---

## Components and Interfaces

### Game Adapter Interface

Each game file exposes a small adapter object so the shared multiplayer module can call into game-specific logic:

```javascript
// Implemented differently in lcrdice.html vs lcrrogue.html
const GameAdapter = {
  gameType: 'lcrdice' | 'lcrrogue',

  // Apply an authoritative Game_State snapshot to the local render
  applyState(state) { /* update players[], centerPot, turnIndex, re-render */ },

  // Execute a roll on the host side; returns { results, newState }
  executeRoll(state) { /* host-only: run dice logic, return updated state */ },

  // Execute a target selection on the host side; returns { newState }
  executeTarget(state, targetIndex, mode) { /* host-only */ },

  // Returns true if the current dice result requires targeting
  requiresTargeting(pendingDice) { /* lcrdice: never; lcrrogue: P or S */ },
};
```

### MultiplayerHost

Responsibilities:
- Generate PIN, register PeerJS peer `lcr-XXXX-host`
- Accept incoming guest connections, assign player slots
- Receive action messages, validate turn ownership, execute via GameAdapter
- Broadcast `game_state` after every state change
- Handle guest disconnection (chips → pot, advance turn if needed)
- Expose kick API

### MultiplayerGuest

Responsibilities:
- Connect to `lcr-XXXX-host` via PIN
- Receive `assigned` message, store `myPlayerIndex`
- Receive `game_state` broadcasts, call `GameAdapter.applyState()`
- Send `roll` and `target` action messages on the player's turn
- Handle host disconnection (show error overlay)

### UI Overlay Module

A shared set of UI panels injected into both game files:

- **Mode Selection Panel** — shown before character selection
- **Host Lobby Panel** — PIN display, share button, guest count, "Deal In"
- **Guest PIN Entry Panel** — numeric keypad, auto-connect on 4th digit
- **Guest Waiting Panel** — "Waiting for host to start..."
- **Spectator Banner** — shown on guest devices when not their turn
- **Active Turn Banner** — shown on the current player's device
- **Targeting Panel** (Rogue LCR only) — vertical list of player buttons
- **Disconnection Overlay** — host gone / player kicked notifications

---

## Data Models

### Game_State (broadcast payload)

```json
{
  "type": "game_state",
  "players": [
    { "name": "Mickey", "icon": "🐭", "chips": 3, "connected": true }
  ],
  "centerPot": 0,
  "turnIndex": 0,
  "lastDiceResults": ["L", "C", "•"],
  "pendingTargeting": null
}
```

`pendingTargeting` is non-null when the active player must choose a target:

```json
{
  "pendingTargeting": {
    "mode": "PASS" | "STEAL" | "SHINE_ALL",
    "activePlayerIndex": 2
  }
}
```

### Message Types

All messages are JSON objects sent over PeerJS DataChannels.

#### Host → Guest

| `type` | Payload fields | Description |
|--------|---------------|-------------|
| `assigned` | `playerIndex: number` | Tells guest which slot they own |
| `game_state` | See Game_State above | Full authoritative state snapshot |
| `error` | `message: string` | Rejection (e.g. game full) |
| `host_disconnecting` | — | Graceful host close |

#### Guest → Host

| `type` | Payload fields | Description |
|--------|---------------|-------------|
| `roll` | — | Request to roll dice (host validates turn) |
| `target` | `targetIndex: number` | Target selection for Rogue LCR |

#### JSON Schemas

**`game_state` message:**
```json
{
  "type": "game_state",
  "players": [{ "name": "string", "icon": "string", "chips": "integer ≥ 0", "connected": "boolean" }],
  "centerPot": "integer ≥ 0",
  "turnIndex": "integer ≥ 0",
  "lastDiceResults": ["string"],
  "pendingTargeting": { "mode": "string", "activePlayerIndex": "integer" } | null
}
```

**`roll` message:**
```json
{ "type": "roll" }
```

**`target` message:**
```json
{ "type": "target", "targetIndex": "integer ≥ 0" }
```

**`assigned` message:**
```json
{ "type": "assigned", "playerIndex": "integer ≥ 0" }
```

---

## UI Flow

### Mode Selection → Host Setup → Guest Join

```
Both games:
  Setup Screen loads
    └─► [Single Device] ──► existing character select ──► game (unchanged)
    └─► [Multi Device]
          ├─► load PeerJS (lazy)
          ├─► generate PIN
          ├─► register peer lcr-XXXX-host
          ├─► show Host Lobby Panel
          │     PIN: 1234  [Share Link]
          │     Guests connected: 0/N
          │     [character select grid]
          │     [Deal In] (enabled when ≥3 players configured)
          └─► on "Deal In" ──► broadcast initial game_state ──► game starts

Guest path:
  Open URL (with or without #LCP:XXXX hash)
    └─► [Multi Device] auto-selected if hash present
          ├─► load PeerJS (lazy)
          ├─► show PIN entry keypad (pre-filled if hash)
          ├─► on 4th digit ──► connect to lcr-XXXX-host
          ├─► on connect ──► receive "assigned" ──► show waiting screen
          └─► on game_state broadcast ──► render game table
```

### Active Turn View vs Spectator View

**Active Turn View** (shown on the device whose `myPlayerIndex === state.turnIndex`):
- Roll Dice button: **enabled**
- Status message: "Your turn!"
- For Rogue LCR with `pendingTargeting`: show Targeting Panel (see below)

**Spectator View** (all other devices):
- Roll Dice button: **hidden/disabled**
- Status message: "Waiting for [PlayerName]..."
- If `pendingTargeting` is set: "Waiting for [PlayerName] to choose a target..."

### Targeting Flow (Rogue LCR only)

When `pendingTargeting` is non-null and it is the active player's device:

```
┌─────────────────────────────────┐
│  Choose a player to [PASS/STEAL]│
│                                 │
│  [🐭 Mickey]  (3 chips)         │
│  [❄️ Elsa]    (1 chip)          │
│  [🦁 Simba]   (2 chips)         │
│                                 │
│  (active player's button hidden)│
└─────────────────────────────────┘
```

Each row is a `<button>` with the player's emoji + name + chip count. Tapping sends `{ type: "target", targetIndex: N }` to the host. The host resolves the transfer and broadcasts the updated `game_state`.

On spectator devices, the targeting panel is replaced by: "Waiting for [PlayerName] to choose a target..."

---

## How Existing Code Is Wrapped

The existing game logic in `lcrdice.html` and `lcrrogue.html` is **not refactored**. Instead:

1. The mode selection UI is prepended to the existing setup modal.
2. In Single Device mode, the existing `startActualGame()` / `startGame()` functions are called as-is.
3. In Multi Device mode:
   - On the **host**: the existing roll/targeting logic is called internally by `MultiplayerHost.executeRoll()` / `executeTarget()`, which then broadcasts the resulting state.
   - On **guests**: `GameAdapter.applyState()` directly sets `players`, `centerPot`, `turnIndex` and calls the existing `updateUI()` / `renderTable()` functions.
4. The existing `handleRoll()` function is wrapped: in Multi Device mode it sends a `roll` message to the host instead of executing locally.
5. The existing `handleSeatClick()` (Rogue LCR) is wrapped: in Multi Device mode it sends a `target` message instead of executing locally.

This means the diff to each HTML file is minimal: add the multiplayer module script block, add mode selection UI, and add 2–3 wrapper checks at the top of `handleRoll()` and `handleSeatClick()`.

### lcrdice vs lcrrogue Differences

| Concern | lcrdice | lcrrogue |
|---------|---------|----------|
| Dice symbols | L, R, C, • | P, S, C, • |
| Targeting required | Never | P (pass), S (steal), 2×S (SHINE_ALL) |
| Special combo rules | None | 2×C = banish all; 2×S = steal pile |
| `pendingTargeting` | Always null | Set when P or S resolved |
| Targeting UI | Not shown | Player list panel |

---

## Disconnection and Kick Handling

### Guest Disconnects

```
PeerJS fires conn.on('close') on host
  ├─► mark player as disconnected (connected: false)
  ├─► transfer player.chips → centerPot
  ├─► show "[Name] disconnected — chips added to pot" for 3s
  ├─► if disconnected player === turnIndex:
  │     advance turn after 3s notification
  └─► broadcast updated game_state to remaining guests
```

### Host Kick

The host UI shows a ⚡ kick button next to each player name in the lobby/game panel. Tapping it:

```
host.kickPlayer(playerIndex)
  ├─► close that guest's DataChannel
  ├─► transfer player.chips → centerPot
  ├─► remove player from active rotation (mark as kicked)
  ├─► if kicked player === turnIndex: advance turn
  └─► broadcast updated game_state
```

### Host Disconnects

```
Guest PeerJS fires peer.on('disconnected') or conn.on('close')
  └─► show full-screen overlay: "Host disconnected — game ended"
      [New Game] button → reload page
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Single Device mode is unaffected by multiplayer code

*For any* game session started in Single Device mode, the sequence of game states (chip counts, pot, turn order, win detection) SHALL be identical to the pre-multiplayer version for all possible dice roll sequences.

**Validates: Requirements 9.1, 9.3**

### Property 2: PeerJS is not loaded in Single Device mode

*For any* page load where the user selects Single Device mode and completes a full game, the PeerJS script SHALL NOT be present in the document at any point during that session.

**Validates: Requirements 9.2**

### Property 3: Chip conservation

*For any* game state broadcast, the sum of all player chip counts plus the center pot SHALL equal the initial total chip count (number of players × 3).

**Validates: Requirements 4.1, 4.2, 8.2, 8.4**

### Property 4: Guest state matches host state

*For any* game action processed by the host, after the resulting `game_state` broadcast is received by all guests, every guest's rendered chip counts, center pot, and turn index SHALL equal the host's authoritative values.

**Validates: Requirements 4.1, 4.2, 4.4**

### Property 5: Turn enforcement

*For any* `roll` or `target` message received by the host, if the sending peer's assigned `playerIndex` does not equal the current `turnIndex`, the host SHALL ignore the message and not modify game state.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

### Property 6: Guest assignment uniqueness

*For any* set of guests that connect to a host session, each guest SHALL be assigned a distinct `playerIndex`, and no two guests SHALL share the same index.

**Validates: Requirements 7.1, 7.2**

### Property 7: Disconnection chip conservation

*For any* guest disconnection or kick event, the chips that were held by the disconnected/kicked player SHALL appear in the center pot in the next broadcast `game_state`, and the total chip count invariant (Property 3) SHALL still hold.

**Validates: Requirements 8.2, 8.4, 8.5**

### Property 8: Targeting panel shows only eligible players

*For any* Rogue LCR targeting event (PASS, STEAL, SHINE_ALL), the player list shown on the active player's device SHALL contain exactly the players who are eligible targets (i.e., all players except the active player; for STEAL, only players with chips > 0).

**Validates: Requirements 6.1**

### Property 9: PIN uniqueness retry

*For any* PIN generation attempt where the peer ID `lcr-XXXX-host` is already registered, the system SHALL generate a new PIN and retry until a free peer ID is found, and the final registered peer ID SHALL differ from all previously attempted IDs in that session.

**Validates: Requirements 2.1, 2.5**

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| PIN collision on registration | Retry with new PIN (Req 2.5) |
| Host peer ID not found (guest connect) | Show "Host not found — check PIN and try again", return to PIN entry after 2s (Req 3.5) |
| Game full (too many guests) | Send `{ type: "error", message: "Game is full" }` and close connection (Req 7.4) |
| Host disconnects mid-game | Full-screen "Host disconnected — game ended" overlay on all guests (Req 8.1) |
| Guest disconnects mid-game | Chips → pot, notification, advance turn if needed (Req 8.2, 8.3) |
| PeerJS CDN unavailable | Show "Could not load multiplayer — check your connection" and fall back to Single Device mode |
| Web Share API unavailable | Fall back to clipboard copy with "Link copied!" toast (Req 2.4) |
| Action from wrong turn peer | Silently ignored by host; no state change |

---

## Testing Strategy

### Dual Testing Approach

Both unit tests and property-based tests are required. They are complementary:
- **Unit tests** cover specific examples, integration points, and error conditions.
- **Property tests** verify universal invariants across randomly generated inputs.

### Unit Tests (specific examples and edge cases)

- Mode selection: Single Device path calls existing `startGame()` without loading PeerJS
- PIN generation: generates a number in [1000, 9999]
- Guest auto-connect: URL with `#LCP:1234` pre-fills PIN and triggers connect
- Host-not-found: error message shown and cleared after 2s
- Game-full rejection: 11th guest receives error message
- Disconnection notification: correct player name appears in notification
- Kick flow: kicked player's chips appear in center pot in next broadcast
- Targeting panel: active player sees list; spectator sees waiting message

### Property-Based Tests

Use a property-based testing library appropriate for the target language. Since both games are vanilla JavaScript HTML files, use **fast-check** (loaded from CDN in test harness, or via npm in a test runner).

Each property test MUST run a minimum of **100 iterations**.

Each test MUST include a comment tag in the format:
`// Feature: lcr-multiplayer, Property N: <property text>`

**Property 1 — Single Device mode unchanged**
```
// Feature: lcr-multiplayer, Property 1: Single Device mode is unaffected by multiplayer code
fc.assert(fc.property(
  fc.array(fc.integer({min:0, max:5}), {minLength: 3, maxLength: 9}), // player count
  fc.array(fc.integer({min:0, max:5}), {minLength: 1, maxLength: 50}), // dice roll sequence
  (playerCounts, rollSequence) => {
    const legacyResult = runLegacyGame(playerCounts, rollSequence);
    const wrappedResult = runSingleDeviceGame(playerCounts, rollSequence);
    return deepEqual(legacyResult, wrappedResult);
  }
), { numRuns: 100 });
```

**Property 3 — Chip conservation**
```
// Feature: lcr-multiplayer, Property 3: Chip conservation
fc.assert(fc.property(
  fc.record({ players: fc.array(...), centerPot: fc.nat(), turnIndex: fc.nat() }),
  fc.array(fc.oneof(fc.constant('roll'), fc.record({type: fc.constant('target'), targetIndex: fc.nat()}))),
  (initialState, actions) => {
    const totalChips = initialState.players.reduce((s, p) => s + p.chips, 0) + initialState.centerPot;
    const finalState = applyActions(initialState, actions);
    const finalTotal = finalState.players.reduce((s, p) => s + p.chips, 0) + finalState.centerPot;
    return totalChips === finalTotal;
  }
), { numRuns: 100 });
```

**Property 4 — Guest state matches host state**
```
// Feature: lcr-multiplayer, Property 4: Guest state matches host state
// Simulate host processing N actions, capture each broadcast, verify guest render matches
fc.assert(fc.property(
  fc.array(randomAction(), {minLength: 1, maxLength: 20}),
  (actions) => {
    const { hostStates, guestStates } = simulateMultiplayerSession(actions);
    return hostStates.every((hs, i) => deepEqual(hs, guestStates[i]));
  }
), { numRuns: 100 });
```

**Property 5 — Turn enforcement**
```
// Feature: lcr-multiplayer, Property 5: Turn enforcement
fc.assert(fc.property(
  randomGameState(),
  fc.integer({min: 0, max: 8}), // sender index
  (state, senderIndex) => {
    if (senderIndex === state.turnIndex) return true; // valid turn, skip
    const stateBefore = deepClone(state);
    host.receiveAction({ type: 'roll' }, senderIndex, state);
    return deepEqual(state, stateBefore); // state unchanged
  }
), { numRuns: 100 });
```

**Property 7 — Disconnection chip conservation**
```
// Feature: lcr-multiplayer, Property 7: Disconnection chip conservation
fc.assert(fc.property(
  randomGameState(),
  fc.integer({min: 0}), // player to disconnect
  (state, disconnectIdx) => {
    const playerIdx = disconnectIdx % state.players.length;
    const totalBefore = state.players.reduce((s,p) => s+p.chips, 0) + state.centerPot;
    const newState = handleDisconnect(state, playerIdx);
    const totalAfter = newState.players.reduce((s,p) => s+p.chips, 0) + newState.centerPot;
    return totalBefore === totalAfter;
  }
), { numRuns: 100 });
```

**Property 8 — Targeting panel eligibility**
```
// Feature: lcr-multiplayer, Property 8: Targeting panel shows only eligible players
fc.assert(fc.property(
  randomGameState(),
  fc.constantFrom('PASS', 'STEAL', 'SHINE_ALL'),
  (state, mode) => {
    const shown = getTargetingList(state, mode);
    const activeIdx = state.turnIndex;
    const noneAreActive = shown.every(p => p.index !== activeIdx);
    const allHaveChipsIfSteal = mode !== 'STEAL' || shown.every(p => p.chips > 0);
    return noneAreActive && allHaveChipsIfSteal;
  }
), { numRuns: 100 });
```
