# Implementation Plan: LCR Multiplayer

## Overview

Additive multiplayer layer for `lcrdice.html` and `lcrrogue.html`. Shared module handles PeerJS host/guest logic and UI panels; game-specific adapters bridge into existing render functions. Single Device path is untouched.

## Tasks

- [-] 1. Create shared multiplayer module (`TravelGames/lcr-multiplayer.js`)
  - [-] 1.1 Implement `loadPeerJS()` lazy loader
    - Dynamically inject PeerJS 1.5.4 script tag; resolve when loaded, reject on error
    - _Requirements: 9.2_
  - [~] 1.2 Implement `MultiplayerHost` class
    - PIN generation (1000–9999), retry on collision (`lcr-XXXX-host` already taken)
    - `open()`: register PeerJS peer, accept connections, assign player slots, reject when full
    - `receiveAction(msg, senderPeerConn)`: validate `senderIndex === turnIndex`, call `GameAdapter.executeRoll()` or `executeTarget()`, broadcast result
    - `kickPlayer(playerIndex)`: close conn, chips → pot, advance turn if needed, broadcast
    - `broadcastState(state)`: send `game_state` to all open connections
    - _Requirements: 2.1, 2.2, 2.5, 2.7, 2.8, 7.1, 7.2, 7.4, 8.2, 8.3, 8.4, 8.5_
  - [~] 1.3 Implement `MultiplayerGuest` class
    - `connect(pin)`: connect to `lcr-XXXX-host`, handle `assigned`, `game_state`, `error`, `host_disconnecting`
    - On `game_state`: call `GameAdapter.applyState(state)`
    - On host disconnect: show disconnection overlay
    - `sendAction(msg)`: send `roll` or `target` to host
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 4.2, 4.5, 5.3, 5.6, 8.1_
  - [ ]* 1.4 Write unit tests for `MultiplayerHost` slot assignment and rejection
    - Test: first N guests get indices 0…N-1; (N+1)th guest receives `{ type: "error", message: "Game is full" }`
    - _Requirements: 7.1, 7.4_
  - [ ]* 1.5 Write unit tests for `MultiplayerGuest` host-not-found path
    - Test: error message shown, cleared after 2 s, returns to PIN entry
    - _Requirements: 3.5_

- [ ] 2. Implement UI overlay panels in `lcr-multiplayer.js`
  - [~] 2.1 Mode Selection Panel
    - Two buttons: "Single Device" / "Multi Device"; default selection is Single Device
    - Inject before character-select step in setup modal for both games
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [~] 2.2 Host Lobby Panel
    - Display PIN prominently; "Share Link" button (Web Share API → clipboard fallback)
    - Live guest-connected counter; character-select grid placeholder; "Deal In" button (enabled ≥ 3 players)
    - _Requirements: 2.3, 2.4, 2.6, 2.7, 2.8_
  - [~] 2.3 Guest PIN Entry Panel
    - Numeric keypad; auto-connect on 4th digit; pre-fill from `#LCP:XXXX` hash on load
    - _Requirements: 3.1, 3.2, 3.3_
  - [~] 2.4 Guest Waiting Panel, Spectator Banner, Active Turn Banner
    - Waiting: "Waiting for host to start…"
    - Spectator: "Waiting for [PlayerName]…" / "Waiting for [PlayerName] to choose a target…"
    - Active: "Your turn!"
    - _Requirements: 3.4, 5.1, 5.2, 6.4_
  - [~] 2.5 Disconnection Overlay
    - Full-screen "Host disconnected — game ended" with [New Game] reload button
    - In-game toast: "[PlayerName] disconnected — chips added to pot"
    - _Requirements: 8.1, 8.2_
  - [ ]* 2.6 Write unit tests for URL hash auto-fill
    - Test: `#LCP:1234` pre-fills PIN field and triggers connect attempt
    - _Requirements: 3.1_

- [ ] 3. Implement `GameAdapter` for `lcrdice.html`
  - [~] 3.1 Add `LcrDiceAdapter` object inside `lcrdice.html`
    - `gameType: 'lcrdice'`
    - `applyState(state)`: set `players`, `centerPot`, `turnIndex` from broadcast; call existing `updateUI()` / render function
    - `executeRoll(state)`: call existing dice-roll logic, return `{ results, newState }`
    - `executeTarget()`: no-op (lcrdice never targets); `requiresTargeting()`: always returns `false`
    - _Requirements: 4.2, 4.3, 5.4_
  - [ ]* 3.2 Write property test — chip conservation (lcrdice)
    - **Property 3: Chip conservation**
    - **Validates: Requirements 4.1, 4.2, 8.2, 8.4**

- [ ] 4. Implement `GameAdapter` for `lcrrogue.html`
  - [~] 4.1 Add `LcrRogueAdapter` object inside `lcrrogue.html`
    - `gameType: 'lcrrogue'`
    - `applyState(state)`: set `players`, `centerPot`, `turnIndex`, `pendingTargeting`; call existing render
    - `executeRoll(state)`: call existing Rogue dice logic, set `pendingTargeting` if P/S result, return `{ results, newState }`
    - `executeTarget(state, targetIndex, mode)`: resolve PASS / STEAL / SHINE_ALL chip transfer, clear `pendingTargeting`, return `{ newState }`
    - `requiresTargeting(pendingDice)`: return `true` when any die shows P or S
    - _Requirements: 4.2, 4.3, 5.4, 5.5, 6.2, 6.3_
  - [ ]* 4.2 Write property test — targeting panel eligibility (lcrrogue)
    - **Property 8: Targeting panel shows only eligible players**
    - **Validates: Requirements 6.1**
  - [ ]* 4.3 Write property test — chip conservation (lcrrogue)
    - **Property 3: Chip conservation** (Rogue variant including STEAL/SHINE_ALL)
    - **Validates: Requirements 4.1, 4.2, 8.2, 8.4**

- [ ] 5. Integrate multiplayer module into `lcrdice.html`
  - [~] 5.1 Add `<script src="lcr-multiplayer.js"></script>` tag (loaded unconditionally; PeerJS itself stays lazy)
    - _Requirements: 9.2_
  - [~] 5.2 Prepend Mode Selection Panel to existing setup modal
    - Single Device path calls existing `startGame()` unchanged
    - Multi Device path calls `MultiplayerHost.open()` or `MultiplayerGuest.connect()`
    - _Requirements: 1.1, 1.2, 1.3, 9.1, 9.3_
  - [~] 5.3 Wrap `handleRoll()` in `lcrdice.html`
    - If Multi Device + guest: send `{ type: "roll" }` to host instead of executing locally
    - If Multi Device + host: handled internally by `MultiplayerHost.receiveAction()`
    - If Single Device: execute as before
    - _Requirements: 5.3, 5.4, 9.3_
  - [ ]* 5.4 Write property test — Single Device mode unchanged (lcrdice)
    - **Property 1: Single Device mode is unaffected by multiplayer code**
    - **Validates: Requirements 9.1, 9.3**
  - [ ]* 5.5 Write property test — PeerJS not loaded in Single Device mode (lcrdice)
    - **Property 2: PeerJS is not loaded in Single Device mode**
    - **Validates: Requirements 9.2**

- [ ] 6. Integrate multiplayer module into `lcrrogue.html`
  - [~] 6.1 Add `<script src="lcr-multiplayer.js"></script>` tag
    - _Requirements: 9.2_
  - [~] 6.2 Prepend Mode Selection Panel to existing setup modal
    - Single Device path calls existing `startGame()` unchanged
    - Multi Device path calls `MultiplayerHost.open()` or `MultiplayerGuest.connect()`
    - _Requirements: 1.1, 1.2, 1.3, 9.1, 9.3_
  - [~] 6.3 Wrap `handleRoll()` in `lcrrogue.html`
    - Guest: send `{ type: "roll" }`; host: delegate to `MultiplayerHost`; single device: unchanged
    - _Requirements: 5.3, 5.4, 9.3_
  - [~] 6.4 Wrap `handleSeatClick()` / target selection in `lcrrogue.html`
    - Guest on active turn: send `{ type: "target", targetIndex: N }` to host
    - Host: handled by `MultiplayerHost.receiveAction()`
    - Single Device: unchanged
    - _Requirements: 5.5, 5.6, 6.2, 9.3_
  - [ ]* 6.5 Write property test — Single Device mode unchanged (lcrrogue)
    - **Property 1: Single Device mode is unaffected by multiplayer code**
    - **Validates: Requirements 9.1, 9.3**

- [ ] 7. Checkpoint — core integration complete
  - Ensure all unit tests pass; manually verify Single Device path in both games is unaffected; ask the user if questions arise.

- [ ] 8. Guest PIN entry and URL hash auto-connect
  - [~] 8.1 Parse `#LCP:XXXX` on page load; if present, auto-select Multi Device, pre-fill PIN, trigger connect
    - _Requirements: 3.1_
  - [~] 8.2 Implement numeric keypad PIN entry; auto-connect on 4th digit without extra confirm tap
    - _Requirements: 3.2, 3.3_
  - [~] 8.3 Implement "Host not found" error path: show message, clear after 2 s, return to PIN entry
    - _Requirements: 3.5_
  - [ ]* 8.4 Write property test — turn enforcement
    - **Property 5: Turn enforcement**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
  - [ ]* 8.5 Write property test — guest assignment uniqueness
    - **Property 6: Guest assignment uniqueness**
    - **Validates: Requirements 7.1, 7.2**
  - [ ]* 8.6 Write property test — PIN uniqueness retry
    - **Property 9: PIN uniqueness retry**
    - **Validates: Requirements 2.1, 2.5**

- [ ] 9. Disconnection and kick handling
  - [~] 9.1 Handle guest disconnect on host: chips → pot, toast notification, advance turn if disconnected player was active
    - _Requirements: 8.2, 8.3_
  - [~] 9.2 Handle host disconnect on guest: show full-screen overlay with [New Game] button
    - _Requirements: 8.1_
  - [~] 9.3 Implement kick button in host game panel: close conn, chips → pot, advance turn if needed, broadcast
    - _Requirements: 8.4, 8.5_
  - [~] 9.4 Handle guest reconnect: guest sends `{ type: "reconnect" }`, host replies with current `game_state`
    - _Requirements: 4.5_
  - [ ]* 9.5 Write property test — disconnection chip conservation
    - **Property 7: Disconnection chip conservation**
    - **Validates: Requirements 8.2, 8.4, 8.5**
  - [ ]* 9.6 Write property test — guest state matches host state
    - **Property 4: Guest state matches host state**
    - **Validates: Requirements 4.1, 4.2, 4.4**

- [ ] 10. Final checkpoint — Ensure all tests pass
  - Ensure all property tests and unit tests pass; verify chip conservation invariant holds across both game adapters; ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- All property tests use fast-check (CDN or npm); each runs ≥ 100 iterations
- Each property test includes the comment tag `// Feature: lcr-multiplayer, Property N: <text>`
- PeerJS is never loaded in Single Device mode — the lazy loader is only called from Multi Device paths
- `lcr-multiplayer.js` is a plain JS file with no build step; both HTML files load it via `<script src>`
