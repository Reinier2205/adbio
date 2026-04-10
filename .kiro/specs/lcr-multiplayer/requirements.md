# Requirements Document

## Introduction

This feature adds multi-device multiplayer support to two existing travel games: **LCR Casino Disney Edition** (`lcrdice.html`) and **Rogue LCR Disney Edition** (`lcrrogue.html`). Both games currently operate as single-device pass-and-play, where one phone is shared between all players. The new feature preserves that mode while adding a **Multi Device** mode where each player uses their own phone. The host (Player 1) acts as the game state authority and broadcasts state to all peers via PeerJS (WebRTC peer-to-peer), following the same PIN/link sharing pattern used in `levelvan.html`.

## Glossary

- **Host**: The player who creates the game session; always Player 1. The Host's device is the game state authority.
- **Guest**: Any player who joins an existing session via PIN or shared link on their own device.
- **Session**: A single game instance identified by a 4-digit PIN.
- **PIN**: A randomly generated 4-digit code that uniquely identifies a Host's PeerJS peer ID for the session.
- **Single Device Mode**: The existing pass-and-play mode where all players share one phone.
- **Multi Device Mode**: The new mode where each player uses their own phone.
- **Game_State**: The authoritative snapshot of the game, including player chip counts, center pot, current turn index, and any pending dice results.
- **LCR_Game**: Either `lcrdice.html` (LCR Casino) or `lcrrogue.html` (Rogue LCR).
- **Setup_Screen**: The modal shown before the game starts where players are selected and mode is chosen.
- **Spectator_View**: The UI state shown on a Guest's device when it is not their turn.
- **Active_Turn_View**: The UI state shown on the current player's device when it is their turn.
- **PeerJS**: The WebRTC peer-to-peer library used for signalling and data transport, loaded from `https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js`.
- **Peer_ID**: The unique identifier used by PeerJS, formatted as `lcr-XXXX-host` for the Host and `lcr-XXXX-guest-[timestamp]` for each Guest.

---

## Requirements

### Requirement 1: Mode Selection on Setup Screen

**User Story:** As a player setting up a game, I want to choose between Single Device and Multi Device mode before the game starts, so that I can play either pass-and-play or on separate phones.

#### Acceptance Criteria

1. THE Setup_Screen SHALL display two mode options: "Single Device" and "Multi Device" before the character/player selection step.
2. WHEN the user selects "Single Device", THE LCR_Game SHALL proceed with the existing pass-and-play setup flow unchanged.
3. WHEN the user selects "Multi Device", THE Setup_Screen SHALL transition to the Host setup flow defined in Requirement 2.
4. THE Setup_Screen SHALL default to "Single Device" mode so that existing behaviour is preserved when no selection is made.

---

### Requirement 2: Host Session Creation

**User Story:** As the host player, I want to create a game session with a PIN so that other players can join on their own devices.

#### Acceptance Criteria

1. WHEN the Host selects "Multi Device" mode, THE LCR_Game SHALL generate a random 4-digit PIN between 1000 and 9999.
2. THE LCR_Game SHALL register a PeerJS peer with the ID `lcr-XXXX-host` where `XXXX` is the generated PIN.
3. WHEN the PeerJS peer is successfully registered, THE Setup_Screen SHALL display the 4-digit PIN prominently and a "Share Link" button.
4. WHEN the Host taps "Share Link", THE LCR_Game SHALL invoke the Web Share API with a URL containing the PIN encoded as a hash fragment (`#LCP:XXXX`), falling back to clipboard copy if the Web Share API is unavailable.
5. IF the generated PIN maps to an already-registered PeerJS peer ID, THEN THE LCR_Game SHALL generate a new PIN and retry registration automatically.
6. THE Setup_Screen SHALL allow the Host to select player characters and assign one character per expected player slot while waiting for Guests to join.
7. WHEN a Guest connects, THE Setup_Screen SHALL display the count of connected Guests to the Host.
8. WHEN the Host taps "Deal In" and at least 3 players are configured, THE LCR_Game SHALL broadcast the initial Game_State to all connected Guests and start the game.

---

### Requirement 3: Guest Session Joining

**User Story:** As a guest player, I want to join a game session by entering a PIN or opening a shared link, so that I can play on my own device.

#### Acceptance Criteria

1. WHEN a Guest opens the LCR_Game URL with a hash fragment matching `#LCP:XXXX`, THE LCR_Game SHALL automatically navigate to the PIN entry screen with the 4-digit PIN pre-filled and initiate connection.
2. WHEN a Guest opens the LCR_Game without a pre-filled PIN, THE LCR_Game SHALL display a numeric keypad PIN entry screen.
3. WHEN the Guest enters the 4th digit of the PIN, THE LCR_Game SHALL automatically attempt to connect to the peer ID `lcr-XXXX-host` without requiring an additional confirm tap.
4. WHEN the PeerJS connection to the Host is established, THE LCR_Game SHALL display a waiting screen until the Host starts the game.
5. IF the peer ID `lcr-XXXX-host` is not found, THEN THE LCR_Game SHALL display an error message "Host not found — check PIN and try again" and return to the PIN entry screen after 2 seconds.
6. WHEN the Host broadcasts the initial Game_State, THE LCR_Game SHALL render the full game table on the Guest's device.

---

### Requirement 4: Game State Synchronisation

**User Story:** As any player in a multi-device game, I want the game state to stay in sync across all devices after every action, so that everyone sees the same chip counts, pot, and turn order.

#### Acceptance Criteria

1. WHEN any game action changes the Game_State (chip transfer, pot update, turn advance), THE Host SHALL broadcast the complete Game_State to all connected Guests within 100ms of the state change.
2. WHEN a Guest receives a Game_State broadcast, THE LCR_Game SHALL update the Guest's rendered table to reflect the new chip counts, center pot, and active turn index.
3. THE Game_State broadcast SHALL include: player array (name, icon, chip count), centerPot value, turnIndex, and the most recent dice results.
4. THE Host SHALL be the sole authority for Game_State; Guests SHALL NOT modify local game state independently.
5. WHEN a Guest device reconnects after a brief disconnection, THE LCR_Game SHALL request the current Game_State from the Host and re-render the table.

---

### Requirement 5: Turn Enforcement in Multi Device Mode

**User Story:** As a player in a multi-device game, I want to only be able to interact with the game on my own turn, so that players cannot act out of turn.

#### Acceptance Criteria

1. WHILE it is a player's turn, THE LCR_Game SHALL display the Active_Turn_View with the Roll Dice button enabled on that player's device.
2. WHILE it is not a player's turn, THE LCR_Game SHALL display the Spectator_View with the Roll Dice button hidden or disabled and a message indicating whose turn it is.
3. WHEN the active player rolls dice, THE LCR_Game SHALL send the roll action to the Host for processing.
4. THE Host SHALL process all roll actions and resolve chip transfers before broadcasting the updated Game_State.
5. WHEN a targeting action is required (Rogue LCR: Pass or Steal), THE LCR_Game SHALL display the target selection UI only on the active player's device.
6. WHEN the active player selects a target, THE LCR_Game SHALL send the target selection to the Host for processing.

---

### Requirement 6: Rogue LCR Targeting in Multi Device Mode

**User Story:** As the active player in a Rogue LCR multi-device game, I want to select a target player on my own screen, so that I can pass or steal chips without needing to hand the phone to another player.

#### Acceptance Criteria

1. WHEN a Rogue LCR dice result requires targeting (P or S symbol), THE LCR_Game SHALL display a vertical list of eligible target players on the active player's device, where each player is shown as a tappable button containing their emoji icon and name.
2. WHEN the active player selects a target, THE LCR_Game SHALL send a `{ action: "target", targetIndex: N }` message to the Host.
3. WHEN the Host receives a target message from the active player's peer, THE LCR_Game SHALL resolve the chip transfer and broadcast the updated Game_State.
4. WHILE waiting for the active player to select a target, THE LCR_Game SHALL display "Waiting for [PlayerName] to choose a target..." on all Spectator_View devices.

---

### Requirement 7: Guest Identification

**User Story:** As a guest player, I want to be assigned to a specific player slot so that the game knows which turns are mine.

#### Acceptance Criteria

1. WHEN a Guest connects to the Host, THE Host SHALL assign the Guest's peer connection to the next available unassigned player slot in the player array.
2. THE Host SHALL send a `{ type: "assigned", playerIndex: N }` message to each Guest upon connection so the Guest knows which player slot they control.
3. WHEN the Host starts the game, THE LCR_Game SHALL include each Guest's assigned playerIndex in the initial Game_State broadcast.
4. IF more Guests attempt to connect than there are available player slots, THEN THE LCR_Game SHALL reject the connection and send a `{ type: "error", message: "Game is full" }` message to the rejected peer.

---

### Requirement 8: Disconnection and Kick Handling

**User Story:** As a player in a multi-device game, I want disconnections and removals to be handled gracefully so that the game can continue with the remaining players.

#### Acceptance Criteria

1. WHEN the Host's PeerJS connection closes unexpectedly, THE LCR_Game SHALL display a "Host disconnected — game ended" message on all Guest devices.
2. WHEN a Guest's PeerJS connection closes unexpectedly mid-game, THE Host SHALL transfer all of that Guest's chips to the center pot and display a "[PlayerName] disconnected — chips added to pot" notification.
3. IF a disconnected Guest was the active player, THEN THE Host SHALL advance the turn to the next player with chips after displaying the disconnection notification for 3 seconds.
4. WHEN the Host taps the kick button next to a disconnected player's name, THE LCR_Game SHALL remove that player from the active player list, transfer their remaining chips to the center pot, and continue the game with the remaining players.
5. WHEN a player is kicked, THE Host SHALL broadcast an updated Game_State reflecting the removed player and the updated center pot to all remaining connected Guests.

---

### Requirement 9: Single Device Mode Unchanged

**User Story:** As a player using a single shared phone, I want the existing pass-and-play experience to remain exactly as it was, so that the multiplayer feature does not break the original game.

#### Acceptance Criteria

1. WHEN Single Device mode is selected, THE LCR_Game SHALL execute the existing game logic without initialising any PeerJS connections.
2. THE LCR_Game SHALL NOT load the PeerJS library script until Multi Device mode is selected, so that Single Device mode has no dependency on network connectivity.
3. WHEN the game is played in Single Device mode, THE LCR_Game SHALL behave identically to the pre-multiplayer version for all game actions, chip transfers, win detection, and UI interactions.

---

### Requirement 10: Cross-Network Compatibility

**User Story:** As a player, I want multi-device mode to work on both mobile data and local WiFi, so that I can play anywhere.

#### Acceptance Criteria

1. THE LCR_Game SHALL configure PeerJS to use `0.peerjs.com` on port 443 with `secure: true` as the signalling server, matching the LevelVan implementation.
2. THE LCR_Game SHALL NOT restrict ICE candidates to local network only, so that connections over mobile data are supported.
3. WHEN two devices are on the same WiFi network, THE LCR_Game SHALL establish a peer-to-peer connection via the local network after the initial PeerJS handshake.
4. WHEN two devices are on different mobile data networks, THE LCR_Game SHALL establish a peer-to-peer connection via the internet after the initial PeerJS handshake.
