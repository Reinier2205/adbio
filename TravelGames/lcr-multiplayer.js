/**
 * lcr-multiplayer.js
 * Shared multiplayer module for LCR Casino and Rogue LCR.
 *
 * Provides:
 *   - loadPeerJS()       — lazy PeerJS script loader
 *   - MultiplayerHost    — host-authority peer (creates session, processes actions)
 *   - MultiplayerGuest   — guest peer (joins session, renders state)
 *
 * Usage:
 *   window.LCRMultiplayer.loadPeerJS()
 *   new window.LCRMultiplayer.MultiplayerHost(gameAdapter, maxPlayers)
 *   new window.LCRMultiplayer.MultiplayerGuest(gameAdapter)
 *
 * No build step required — plain vanilla JS, loaded via <script src="lcr-multiplayer.js">.
 * PeerJS itself is loaded lazily only when Multi Device mode is selected.
 */

'use strict';

// ---------------------------------------------------------------------------
// 1.1  loadPeerJS — lazy loader
// ---------------------------------------------------------------------------

/**
 * Lazily loads PeerJS 1.5.4 from unpkg.
 * Resolves immediately if window.Peer already exists.
 * Rejects with an Error if the script fails to load.
 *
 * @returns {Promise<void>}
 */
async function loadPeerJS() {
  if (window.Peer) return;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load PeerJS from CDN. Check your connection.'));
    document.head.appendChild(script);
  });
}

// ---------------------------------------------------------------------------
// Helper — generate a random 4-digit PIN string (1000–9999)
// ---------------------------------------------------------------------------

function _generatePin() {
  return String(Math.floor(Math.random() * 9000) + 1000);
}

// ---------------------------------------------------------------------------
// 1.2  MultiplayerHost
// ---------------------------------------------------------------------------

/**
 * Host-authority peer for an LCR multiplayer session.
 *
 * The host owns the authoritative game state. All dice rolls and chip
 * transfers happen here; results are broadcast to every connected guest.
 *
 * @param {object} gameAdapter  — game-specific adapter (see GameAdapter interface)
 * @param {number} [maxPlayers=10] — maximum number of player slots
 */
class MultiplayerHost {
  constructor(gameAdapter, maxPlayers = 10) {
    this.gameAdapter = gameAdapter;
    this.maxPlayers = maxPlayers;

    /** @type {string} 4-digit PIN string */
    this.pin = '';

    /**
     * Active guest connections.
     * Each entry: { conn: DataConnection, playerIndex: number }
     * @type {Array<{conn: object, playerIndex: number}>}
     */
    this.connections = [];

    /** @type {object|null} The PeerJS Peer instance */
    this._peer = null;

    /** Tracks how many player slots have been assigned so far (host = 0, guests start at 1) */
    this._nextPlayerIndex = 1;
  }

  // -------------------------------------------------------------------------
  // open() — register peer, accept connections
  // -------------------------------------------------------------------------

  /**
   * Generates a PIN, loads PeerJS, and registers the host peer.
   * Retries automatically if the peer ID is already taken.
   *
   * @returns {Promise<void>} Resolves when the peer is open and ready.
   */
  async open() {
    await loadPeerJS();
    return this._tryOpen();
  }

  /**
   * Internal: attempt to register `lcr-XXXX-host`. Retries on collision.
   * @private
   */
  _tryOpen() {
    return new Promise((resolve, reject) => {
      this.pin = _generatePin();
      const peerId = `lcr-${this.pin}-host`;

      const peer = new window.Peer(peerId, {
        host: '0.peerjs.com',
        port: 443,
        secure: true,
      });

      peer.on('open', () => {
        this._peer = peer;
        this._listenForConnections();
        resolve();
      });

      peer.on('error', (err) => {
        if (err.type === 'unavailable-id') {
          // PIN collision — destroy this peer and retry with a new PIN
          peer.destroy();
          this._tryOpen().then(resolve).catch(reject);
        } else {
          reject(err);
        }
      });
    });
  }

  // -------------------------------------------------------------------------
  // Connection handling
  // -------------------------------------------------------------------------

  /**
   * Start listening for incoming guest connections.
   * @private
   */
  _listenForConnections() {
    this._peer.on('connection', (conn) => {
      conn.on('open', () => {
        if (this._nextPlayerIndex >= this.maxPlayers) {
          conn.send({ type: 'error', message: 'Game is full' });
          conn.close();
          return;
        }

        const playerIndex = this._nextPlayerIndex++;
        this.connections.push({ conn, playerIndex, picked: false });

        // Tell the guest which slot they own + current taken list
        conn.send({ type: 'assigned', playerIndex });
        conn.send({ type: 'lobby_state', takenNames: this._takenNames() });

        // Notify host of new connection
        if (this.onGuestConnected) this.onGuestConnected(this.connections.length);

        // Listen for actions from this guest
        conn.on('data', (data) => {
          this._handleAction(data, conn);
        });

        conn.on('close', () => {
          this._onGuestDisconnect(conn);
        });
      });
    });
  }

  // -------------------------------------------------------------------------
  // _handleAction — process incoming guest messages
  // -------------------------------------------------------------------------

  /**
   * Handles an action message from a guest connection.
   *
   * Validates that the sender is the current turn player before executing.
   * Silently ignores messages from wrong-turn players.
   *
   * @param {object} msg  — the message object sent by the guest
   * @param {object} conn — the DataConnection the message arrived on
   */
  _handleAction(msg, conn) {
    const entry = this.connections.find((e) => e.conn === conn);
    if (!entry) return;

    const { playerIndex } = entry;
    const state = this.gameAdapter.getState();

    if (msg.type === 'roll') {
      // Only the current turn player may roll
      if (playerIndex !== state.turnIndex) return;

      const newState = this.gameAdapter.executeRoll();
      this.broadcastState(newState);
      if (this.onStateChange) this.onStateChange(newState);

    } else if (msg.type === 'target') {
      // Only the current turn player may select a target
      if (playerIndex !== state.turnIndex) return;

      const newState = this.gameAdapter.executeTarget(msg.targetIndex, msg.mode);
      this.broadcastState(newState);
      if (this.onStateChange) this.onStateChange(newState);

    } else if (msg.type === 'reconnect') {
      // Send current state only to the reconnecting guest
      const currentState = this.gameAdapter.getState();
      conn.send({ type: 'game_state', ...currentState });

    } else if (msg.type === 'pick') {
      // Guest picked a character during lobby
      const entry = this.connections.find((e) => e.conn === conn);
      if (entry) {
        entry.picked = true;
        entry.pickedName = msg.name;
        entry.pickedIcon = msg.icon;
      }
      // Broadcast updated taken list to all guests
      const taken = this._takenNames();
      for (const { conn: c } of this.connections) {
        if (c.open) c.send({ type: 'lobby_state', takenNames: taken });
      }
      // Notify host
      if (this.onGuestPicked) this.onGuestPicked(this.connections);
    }
  }

  /** Returns array of character names already picked (host + guests). */
  _takenNames() {
    const taken = [];
    if (this._hostPickedName) taken.push(this._hostPickedName);
    for (const e of this.connections) {
      if (e.pickedName) taken.push(e.pickedName);
    }
    return taken;
  }

  /** Call this when the host picks their character. */
  hostPick(name, icon) {
    this._hostPickedName = name;
    this._hostPickedIcon = icon;
    const taken = this._takenNames();
    for (const { conn } of this.connections) {
      if (conn.open) conn.send({ type: 'lobby_state', takenNames: taken });
    }
  }

  /** Returns true when all connected guests have picked AND there are at least 2 guests (3 total). */
  allPicked() {
    return this.connections.length >= 2 &&
           this.connections.every(e => e.picked) &&
           !!this._hostPickedName;
  }

  /** Build the ordered players array from picks (host first, then guests by slot). */
  buildPlayersFromPicks() {
    const result = [{ name: this._hostPickedName, icon: this._hostPickedIcon }];
    const sorted = [...this.connections].sort((a, b) => a.playerIndex - b.playerIndex);
    for (const e of sorted) {
      if (e.pickedName) result.push({ name: e.pickedName, icon: e.pickedIcon });
    }
    return result;
  }

  // -------------------------------------------------------------------------
  // broadcastState — send game_state to all open connections
  // -------------------------------------------------------------------------

  /**
   * Sends a full game_state snapshot to every connected guest.
   *
   * @param {object} state — the authoritative game state to broadcast
   */
  broadcastState(state) {
    const message = { type: 'game_state', ...state };
    for (const { conn } of this.connections) {
      if (conn.open) {
        conn.send(message);
      }
    }
  }

  // -------------------------------------------------------------------------
  // kickPlayer — remove a player from the session
  // -------------------------------------------------------------------------

  /**
   * Kicks a player: closes their connection, moves their chips to the pot,
   * and broadcasts the updated state.
   *
   * @param {number} playerIndex — the slot index of the player to kick
   */
  kickPlayer(playerIndex) {
    const idx = this.connections.findIndex((e) => e.playerIndex === playerIndex);
    if (idx !== -1) {
      const { conn } = this.connections[idx];
      conn.close();
      this.connections.splice(idx, 1);
    }

    const newState = this.gameAdapter.handleDisconnect(playerIndex);
    this.broadcastState(newState);
  }

  // -------------------------------------------------------------------------
  // _onGuestDisconnect — internal handler for unexpected guest close
  // -------------------------------------------------------------------------

  /**
   * Called when a guest's DataConnection closes unexpectedly.
   * Removes the connection entry and delegates chip handling to the adapter.
   *
   * @param {object} conn — the closed DataConnection
   * @private
   */
  _onGuestDisconnect(conn) {
    const idx = this.connections.findIndex((e) => e.conn === conn);
    if (idx === -1) return;

    const { playerIndex } = this.connections[idx];
    this.connections.splice(idx, 1);

    const newState = this.gameAdapter.handleDisconnect(playerIndex);
    this.broadcastState(newState);
  }

  // -------------------------------------------------------------------------
  // close — tear down the peer
  // -------------------------------------------------------------------------

  /**
   * Destroys the PeerJS peer and cleans up all connections.
   */
  close() {
    if (this._peer) {
      this._peer.destroy();
      this._peer = null;
    }
    this.connections = [];
  }
}

// ---------------------------------------------------------------------------
// 1.3  MultiplayerGuest
// ---------------------------------------------------------------------------

/**
 * Guest peer for an LCR multiplayer session.
 *
 * Connects to a host via PIN, receives game_state broadcasts, and sends
 * roll/target actions on the player's turn.
 *
 * @param {object} gameAdapter — game-specific adapter (see GameAdapter interface)
 */
class MultiplayerGuest {
  constructor(gameAdapter) {
    this.gameAdapter = gameAdapter;

    /** @type {number|null} Assigned player slot index (set after 'assigned' message) */
    this.myPlayerIndex = null;

    /** @type {object|null} The PeerJS Peer instance */
    this._peer = null;

    /** @type {object|null} The DataConnection to the host */
    this._conn = null;

    /** @type {string[]} Character names already taken in the lobby */
    this._lobbyTakenNames = [];
  }

  // -------------------------------------------------------------------------
  // connect(pin) — join a host session
  // -------------------------------------------------------------------------

  /**
   * Loads PeerJS, creates a guest peer, and connects to the host.
   *
   * Rejects with 'Host not found' if no 'assigned' message is received
   * within 5 seconds of the connection opening.
   *
   * @param {string} pin — the 4-digit session PIN
   * @returns {Promise<void>} Resolves when the 'assigned' message is received.
   */
  async connect(pin) {
    await loadPeerJS();

    return new Promise((resolve, reject) => {
      const guestId = `lcr-${pin}-guest-${Date.now()}`;

      const peer = new window.Peer(guestId, {
        host: '0.peerjs.com',
        port: 443,
        secure: true,
      });

      this._peer = peer;

      peer.on('open', () => {
        const hostId = `lcr-${pin}-host`;
        const conn = peer.connect(hostId);
        this._conn = conn;

        // 5-second timeout — if no 'assigned' arrives, the host wasn't found
        const timeout = setTimeout(() => {
          conn.close();
          peer.destroy();
          reject(new Error('Host not found'));
        }, 5000);

        conn.on('open', () => {
          // Connection is open; wait for 'assigned' or 'error' from host
        });

        conn.on('data', (data) => {
          if (data.type === 'assigned') {
            clearTimeout(timeout);
            this.myPlayerIndex = data.playerIndex;
            this.gameAdapter.onAssigned(data.playerIndex);
            resolve();

          } else if (data.type === 'lobby_state') {
            this._lobbyTakenNames = data.takenNames || [];
            if (this.onLobbyState) this.onLobbyState(this._lobbyTakenNames);

          } else if (data.type === 'game_state') {
            this.gameAdapter.applyState(data);

          } else if (data.type === 'error') {
            clearTimeout(timeout);
            conn.close();
            peer.destroy();
            reject(new Error(data.message || 'Connection rejected by host'));

          } else if (data.type === 'host_disconnecting') {
            this._handleHostDisconnect();
          }
        });

        conn.on('close', () => {
          clearTimeout(timeout);
          this._handleHostDisconnect();
        });

        conn.on('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      peer.on('error', (err) => {
        reject(err);
      });
    });
  }

  // -------------------------------------------------------------------------
  // sendAction — send a roll or target message to the host
  // -------------------------------------------------------------------------

  /**
   * Sends an action message to the host over the DataConnection.
   *
   * @param {object} msg — e.g. { type: 'roll' } or { type: 'target', targetIndex: N }
   */
  sendAction(msg) {
    if (this._conn && this._conn.open) {
      this._conn.send(msg);
    }
  }

  // -------------------------------------------------------------------------
  // isMyTurn — turn check helper
  // -------------------------------------------------------------------------

  /**
   * Returns true if the current turn belongs to this guest's player slot.
   *
   * @param {number} turnIndex — the current turnIndex from game state
   * @returns {boolean}
   */
  isMyTurn(turnIndex) {
    return this.myPlayerIndex === turnIndex;
  }

  // -------------------------------------------------------------------------
  // _handleHostDisconnect — internal
  // -------------------------------------------------------------------------

  /**
   * Called when the host connection closes (gracefully or unexpectedly).
   * Delegates to the game adapter to show the disconnection overlay.
   * @private
   */
  _handleHostDisconnect() {
    this.gameAdapter.onHostDisconnected();
  }

  // -------------------------------------------------------------------------
  // close — tear down the peer
  // -------------------------------------------------------------------------

  /**
   * Destroys the PeerJS peer and cleans up the connection.
   */
  close() {
    if (this._peer) {
      this._peer.destroy();
      this._peer = null;
    }
    this._conn = null;
  }
}

// ---------------------------------------------------------------------------
// 2. UI Overlay Module — LCRMultiplayerUI
// ---------------------------------------------------------------------------

/**
 * Shared UI panels for LCR multiplayer mode.
 * All panels inject into the casino container (.casino-container or #game-table).
 * Styling matches the casino aesthetic: dark wood, felt green, gold, Bungee/Lato fonts.
 */
const LCRMultiplayerUI = (() => {

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  /** Find the casino container element (works for both games). */
  function _getContainer() {
    return document.querySelector('.casino-container') ||
           document.getElementById('game-table') ||
           document.body;
  }

  /** Create a full-screen overlay div styled like the existing .modal class. */
  function _createOverlay(zIndex = 200) {
    const el = document.createElement('div');
    el.style.cssText = [
      'position:absolute',
      'inset:0',
      'background:rgba(0,0,0,0.95)',
      'backdrop-filter:blur(8px)',
      `z-index:${zIndex}`,
      'display:flex',
      'flex-direction:column',
      'justify-content:center',
      'align-items:center',
      'border-radius:50%',
      'padding:1.5rem',
      'gap:0.75rem',
    ].join(';');
    return el;
  }

  /** Shared CSS injected once. */
  function _injectStyles() {
    if (document.getElementById('lcr-mp-ui-styles')) return;
    const style = document.createElement('style');
    style.id = 'lcr-mp-ui-styles';
    style.textContent = `
      .lcr-mp-title {
        font-family: 'Bungee', cursive;
        color: #d4af37;
        text-align: center;
        margin: 0;
        line-height: 1.1;
      }
      .lcr-mp-subtitle {
        font-family: 'Lato', sans-serif;
        color: rgba(255,255,255,0.6);
        font-size: 0.65rem;
        text-transform: uppercase;
        letter-spacing: 0.15em;
        text-align: center;
        margin: 0;
      }
      .lcr-mp-btn {
        background: linear-gradient(145deg, #d4af37, #b8860b);
        color: #fff;
        font-family: 'Bungee', cursive;
        padding: 10px 24px;
        border-radius: 50px;
        border: 3px solid #222;
        box-shadow: 0 4px 0 #111;
        cursor: pointer;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-size: 0.9rem;
        transition: all 0.1s;
        -webkit-tap-highlight-color: transparent;
      }
      .lcr-mp-btn:active { transform: translateY(2px); box-shadow: 0 2px 0 #111; }
      .lcr-mp-btn:disabled { opacity: 0.3; filter: grayscale(1); cursor: not-allowed; transform: none; box-shadow: 0 4px 0 #111; }
      .lcr-mp-btn-lg {
        padding: 14px 28px;
        font-size: 1rem;
        min-width: 130px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }
      .lcr-mp-btn-sub {
        font-family: 'Lato', sans-serif;
        font-size: 0.55rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: rgba(255,255,255,0.7);
        display: block;
      }
      .lcr-mp-pin-display {
        font-family: 'Bungee', cursive;
        font-size: 2.2rem;
        color: #ffd700;
        text-shadow: 0 0 20px rgba(255,215,0,0.5);
        letter-spacing: 0.15em;
        text-align: center;
      }
      .lcr-mp-count {
        font-family: 'Lato', sans-serif;
        font-size: 0.75rem;
        color: rgba(255,255,255,0.7);
        text-align: center;
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }
      .lcr-mp-pin-dots {
        display: flex;
        gap: 10px;
        justify-content: center;
        margin: 4px 0;
      }
      .lcr-mp-pin-dot {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 2px solid #d4af37;
        background: transparent;
        transition: background 0.15s;
      }
      .lcr-mp-pin-dot.filled { background: #ffd700; }
      .lcr-mp-keypad {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;
        width: 180px;
      }
      .lcr-mp-key {
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(212,175,55,0.4);
        color: #fff8e1;
        font-family: 'Bungee', cursive;
        font-size: 1.1rem;
        padding: 10px 0;
        border-radius: 8px;
        cursor: pointer;
        text-align: center;
        -webkit-tap-highlight-color: transparent;
        transition: background 0.1s;
      }
      .lcr-mp-key:active { background: rgba(212,175,55,0.3); }
      .lcr-mp-error {
        font-family: 'Lato', sans-serif;
        font-size: 0.7rem;
        color: #f87171;
        text-align: center;
        min-height: 1em;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .lcr-mp-spinner {
        width: 32px;
        height: 32px;
        border: 3px solid rgba(212,175,55,0.3);
        border-top-color: #d4af37;
        border-radius: 50%;
        animation: lcr-spin 0.8s linear infinite;
      }
      @keyframes lcr-spin { to { transform: rotate(360deg); } }
      .lcr-mp-banner {
        display: block;
        text-align: center;
        background: rgba(0,0,0,0.75);
        border: 1px solid rgba(212,175,55,0.5);
        border-radius: 50px;
        padding: 6px 16px;
        font-family: 'Lato', sans-serif;
        font-size: 0.7rem;
        font-weight: 700;
        color: rgba(255,255,255,0.85);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        white-space: nowrap;
        pointer-events: none;
        margin-bottom: 6px;
      }
      .lcr-mp-banner-active {
        color: #ffd700;
        border-color: #ffd700;
        text-shadow: 0 0 8px rgba(255,215,0,0.6);
      }
      .lcr-mp-toast {
        position: fixed;
        top: 16px;
        left: 50%;
        transform: translateX(-50%) translateY(-60px);
        background: rgba(10,72,33,0.95);
        border: 1px solid #d4af37;
        border-radius: 50px;
        padding: 8px 20px;
        font-family: 'Lato', sans-serif;
        font-size: 0.75rem;
        font-weight: 700;
        color: #fff8e1;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        z-index: 9999;
        white-space: nowrap;
        pointer-events: none;
        transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      .lcr-mp-toast.show { transform: translateX(-50%) translateY(0); }
      .lcr-mp-host-dc {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.97);
        z-index: 9999;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 1rem;
      }
      .lcr-mp-targeting-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 100%;
        max-width: 200px;
        max-height: 200px;
        overflow-y: auto;
      }
      .lcr-mp-target-btn {
        background: rgba(255,255,255,0.07);
        border: 1px solid rgba(74,222,128,0.5);
        color: #fff8e1;
        font-family: 'Lato', sans-serif;
        font-size: 0.8rem;
        font-weight: 700;
        padding: 8px 12px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        text-align: left;
        -webkit-tap-highlight-color: transparent;
        transition: background 0.1s;
      }
      .lcr-mp-target-btn:active { background: rgba(74,222,128,0.2); }
    `;
    document.head.appendChild(style);
  }

  // -------------------------------------------------------------------------
  // 2.1  showModeSelection
  // -------------------------------------------------------------------------

  /**
   * Shows a full-screen mode selection overlay inside the casino container.
   *
   * @param {Function} onSingleDevice — called when "ONE DEVICE" is tapped
   * @param {Function} onMultiDevice  — called when "MULTI DEVICE" is tapped
   */
  function showModeSelection(onSingleDevice, onMultiDevice) {
    _injectStyles();
    const container = _getContainer();
    const overlay = _createOverlay(200);
    overlay.id = 'lcr-mp-mode-overlay';

    const title = document.createElement('h2');
    title.className = 'lcr-mp-title';
    title.style.fontSize = '1.4rem';
    title.textContent = 'HOW TO PLAY?';

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:8px';

    function makeBtn(emoji, label, sub, handler) {
      const btn = document.createElement('button');
      btn.className = 'lcr-mp-btn lcr-mp-btn-lg';
      btn.innerHTML = `${emoji} ${label}<span class="lcr-mp-btn-sub">${sub}</span>`;
      btn.addEventListener('click', () => {
        overlay.remove();
        handler();
      });
      return btn;
    }

    row.appendChild(makeBtn('📱', 'ONE DEVICE', 'Pass the phone', onSingleDevice));
    row.appendChild(makeBtn('📡', 'MULTI DEVICE', "Each player's own phone", onMultiDevice));

    overlay.appendChild(title);
    overlay.appendChild(row);
    container.appendChild(overlay);

    return overlay;
  }

  /**
   * Three-button variant: Single Device / Host Game / Join Game.
   * Used by lcrrogue so players can choose host or guest without an extra step.
   *
   * @param {Function} onSingleDevice — "ONE DEVICE"
   * @param {Function} onHost         — "HOST GAME"
   * @param {Function} onJoin         — "JOIN GAME"
   */
  function showModeSelectionThree(onSingleDevice, onHost, onJoin) {
    _injectStyles();
    const container = _getContainer();
    const overlay = _createOverlay(200);
    overlay.id = 'lcr-mp-mode-overlay';

    const title = document.createElement('h2');
    title.className = 'lcr-mp-title';
    title.style.fontSize = '1.4rem';
    title.textContent = 'HOW TO PLAY?';

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:8px';

    function makeBtn(emoji, label, sub, handler) {
      const btn = document.createElement('button');
      btn.className = 'lcr-mp-btn lcr-mp-btn-lg';
      btn.innerHTML = `${emoji} ${label}<span class="lcr-mp-btn-sub">${sub}</span>`;
      btn.addEventListener('click', () => {
        overlay.remove();
        handler();
      });
      return btn;
    }

    row.appendChild(makeBtn('📱', 'ONE DEVICE', 'Pass the phone', onSingleDevice));
    row.appendChild(makeBtn('👑', 'HOST GAME', 'Start & share PIN', onHost));
    row.appendChild(makeBtn('🎮', 'JOIN GAME', 'Enter PIN to join', onJoin));

    overlay.appendChild(title);
    overlay.appendChild(row);
    container.appendChild(overlay);

    return overlay;
  }

  // -------------------------------------------------------------------------
  // 2.2  showHostLobby
  // -------------------------------------------------------------------------

  /**
   * Shows the host lobby panel with PIN, share button, guest count, and Deal In.
   *
   * @param {object} opts
   * @param {string}   opts.pin          — 4-digit PIN string
   * @param {Function} opts.onShareLink  — called when Share Link is tapped
   * @param {Function} opts.onDealIn     — called when Deal In is tapped
   * @param {string}   [opts.gameType]   — 'lcrdice' | 'lcrrogue'
   * @returns {{ updateCount(n: number): void, remove(): void }}
   */
  function showHostLobby({ pin, onShareLink, onDealIn, gameType }) {
    _injectStyles();
    const container = _getContainer();
    const overlay = _createOverlay(200);
    overlay.id = 'lcr-mp-host-lobby';

    const title = document.createElement('h2');
    title.className = 'lcr-mp-title';
    title.style.fontSize = '1rem';
    title.textContent = 'WAITING FOR PLAYERS';

    const pinLabel = document.createElement('p');
    pinLabel.className = 'lcr-mp-subtitle';
    pinLabel.textContent = 'GAME PIN';

    const pinDisplay = document.createElement('div');
    pinDisplay.className = 'lcr-mp-pin-display';
    pinDisplay.textContent = pin;

    const shareBtn = document.createElement('button');
    shareBtn.className = 'lcr-mp-btn';
    shareBtn.style.fontSize = '0.75rem';
    shareBtn.style.padding = '7px 18px';
    shareBtn.textContent = '📤 Share Link';
    shareBtn.addEventListener('click', onShareLink);

    const countEl = document.createElement('p');
    countEl.className = 'lcr-mp-count';
    countEl.textContent = 'Players connected: 1';

    const dealBtn = document.createElement('button');
    dealBtn.className = 'lcr-mp-btn';
    dealBtn.disabled = true;
    dealBtn.textContent = 'DEAL IN';
    dealBtn.addEventListener('click', () => {
      overlay.remove();
      onDealIn();
    });

    overlay.appendChild(title);
    overlay.appendChild(pinLabel);
    overlay.appendChild(pinDisplay);
    overlay.appendChild(shareBtn);
    overlay.appendChild(countEl);
    overlay.appendChild(dealBtn);
    container.appendChild(overlay);

    return {
      /** Update the displayed player count. Enables Deal In when total >= 3. */
      updateCount(n) {
        countEl.textContent = `Players connected: ${n}`;
        // Deal In is enabled via enableDealIn() once all players have picked
      },
      enableDealIn() {
        dealBtn.disabled = false;
      },
      remove() {
        overlay.remove();
      },
    };
  }

  // -------------------------------------------------------------------------
  // 2.3  showGuestPinEntry
  // -------------------------------------------------------------------------

  /**
   * Shows the guest PIN entry panel with a numeric keypad.
   *
   * @param {object} opts
   * @param {string}   [opts.prefillPin] — pre-fill digits (e.g. from URL hash)
   * @param {Function} opts.onConnect    — called with the 4-digit PIN string when complete
   * @param {Function} opts.onBack       — called when Back is tapped
   * @returns {{ remove(): void, showError(msg: string): void }}
   */
  function showGuestPinEntry({ prefillPin = '', onConnect, onBack }) {
    _injectStyles();
    const container = _getContainer();
    const overlay = _createOverlay(200);
    overlay.id = 'lcr-mp-guest-pin';

    const title = document.createElement('h2');
    title.className = 'lcr-mp-title';
    title.style.fontSize = '1.1rem';
    title.textContent = 'ENTER PIN';

    // PIN dots
    const dotsRow = document.createElement('div');
    dotsRow.className = 'lcr-mp-pin-dots';
    const dots = [];
    for (let i = 0; i < 4; i++) {
      const dot = document.createElement('div');
      dot.className = 'lcr-mp-pin-dot';
      dotsRow.appendChild(dot);
      dots.push(dot);
    }

    // Error message
    const errorEl = document.createElement('p');
    errorEl.className = 'lcr-mp-error';
    errorEl.textContent = '';

    // Keypad
    const keypad = document.createElement('div');
    keypad.className = 'lcr-mp-keypad';

    let digits = prefillPin.slice(0, 4).split('');

    function refreshDots() {
      dots.forEach((d, i) => {
        d.classList.toggle('filled', i < digits.length);
      });
    }

    function pressKey(val) {
      errorEl.textContent = '';
      if (val === '⌫') {
        digits.pop();
        refreshDots();
        return;
      }
      if (val === '*') return; // unused key
      if (digits.length >= 4) return;
      digits.push(val);
      refreshDots();
      if (digits.length === 4) {
        const pin = digits.join('');
        onConnect(pin);
      }
    }

    const keys = ['1','2','3','4','5','6','7','8','9','*','0','⌫'];
    keys.forEach(k => {
      const btn = document.createElement('button');
      btn.className = 'lcr-mp-key';
      btn.textContent = k;
      if (k === '*') btn.style.opacity = '0'; // placeholder key
      btn.addEventListener('click', () => pressKey(k));
      keypad.appendChild(btn);
    });

    // Back button
    const backBtn = document.createElement('button');
    backBtn.className = 'lcr-mp-btn';
    backBtn.style.fontSize = '0.75rem';
    backBtn.style.padding = '7px 18px';
    backBtn.textContent = '← Back';
    backBtn.addEventListener('click', () => {
      overlay.remove();
      onBack();
    });

    overlay.appendChild(title);
    overlay.appendChild(dotsRow);
    overlay.appendChild(errorEl);
    overlay.appendChild(keypad);
    overlay.appendChild(backBtn);
    container.appendChild(overlay);

    // Pre-fill and auto-connect if 4 digits provided
    refreshDots();
    if (digits.length === 4) {
      setTimeout(() => onConnect(digits.join('')), 50);
    }

    return {
      remove() {
        overlay.remove();
      },
      showError(msg) {
        errorEl.textContent = msg;
        // Reset digits so user can retry
        digits = [];
        refreshDots();
      },
    };
  }

  // -------------------------------------------------------------------------
  // 2.4  showGuestWaiting / showSpectatorBanner / showActiveTurnBanner / showTargetingPanel
  // -------------------------------------------------------------------------

  /**
   * Shows a "Waiting for host to start…" overlay.
   * @returns {{ remove(): void }}
   */
  function showGuestWaiting() {
    _injectStyles();
    const container = _getContainer();
    const overlay = _createOverlay(200);
    overlay.id = 'lcr-mp-guest-waiting';

    const spinner = document.createElement('div');
    spinner.className = 'lcr-mp-spinner';

    const msg = document.createElement('p');
    msg.className = 'lcr-mp-title';
    msg.style.fontSize = '0.9rem';
    msg.textContent = 'Waiting for host to start…';

    overlay.appendChild(spinner);
    overlay.appendChild(msg);
    container.appendChild(overlay);

    return {
      remove() {
        overlay.remove();
      },
    };
  }

  /**
   * Shows a small spectator banner between the table and roll button.
   *
   * @param {string} playerName — name of the player whose turn it is
   * @returns {{ updateMessage(msg: string): void, remove(): void }}
   */
  function showSpectatorBanner(playerName) {
    _injectStyles();
    // Remove any existing banner first
    document.getElementById('lcr-mp-spectator-banner')?.remove();
    document.getElementById('lcr-mp-active-banner')?.remove();

    const banner = document.createElement('div');
    banner.className = 'lcr-mp-banner';
    banner.id = 'lcr-mp-spectator-banner';
    banner.textContent = `⏳ Waiting for ${playerName}…`;

    // Insert before roll button if possible, else append to body
    const rollBtn = document.getElementById('roll-btn');
    if (rollBtn && rollBtn.parentNode) {
      rollBtn.parentNode.insertBefore(banner, rollBtn);
    } else {
      document.body.appendChild(banner);
    }

    return {
      updateMessage(msg) {
        banner.textContent = msg;
      },
      remove() {
        banner.remove();
      },
    };
  }

  /**
   * Shows a small "YOUR TURN!" banner between the table and roll button.
   * @returns {{ remove(): void }}
   */
  function showActiveTurnBanner() {
    _injectStyles();
    // Remove any existing banner first
    document.getElementById('lcr-mp-spectator-banner')?.remove();
    document.getElementById('lcr-mp-active-banner')?.remove();

    const banner = document.createElement('div');
    banner.className = 'lcr-mp-banner lcr-mp-banner-active';
    banner.id = 'lcr-mp-active-banner';
    banner.textContent = '🎲 YOUR TURN!';

    const rollBtn = document.getElementById('roll-btn');
    if (rollBtn && rollBtn.parentNode) {
      rollBtn.parentNode.insertBefore(banner, rollBtn);
    } else {
      document.body.appendChild(banner);
    }

    return {
      remove() {
        banner.remove();
      },
    };
  }

  /**
   * Shows a targeting panel for Rogue LCR (vertical list of eligible players).
   *
   * @param {object} opts
   * @param {Array}    opts.players   — full players array from game state
   * @param {number}   opts.myIndex   — index of the active player (excluded from list)
   * @param {string}   opts.mode      — 'PASS' | 'STEAL' | 'SHINE_ALL'
   * @param {Function} opts.onSelect  — called with targetIndex when a player is tapped
   * @returns {{ remove(): void }}
   */
  function showTargetingPanel({ players, myIndex, mode, onSelect }) {
    _injectStyles();
    const container = _getContainer();
    const overlay = _createOverlay(210);
    overlay.id = 'lcr-mp-targeting';

    const modeLabel = mode === 'PASS' ? 'GIVE A CHIP TO' :
                      mode === 'STEAL' ? 'STEAL A CHIP FROM' :
                      'STEAL ENTIRE PILE FROM';

    const title = document.createElement('h2');
    title.className = 'lcr-mp-title';
    title.style.fontSize = '0.85rem';
    title.textContent = `Choose a player to ${modeLabel}`;

    const list = document.createElement('div');
    list.className = 'lcr-mp-targeting-list';

    players.forEach((p, i) => {
      if (i === myIndex) return; // exclude active player
      if (mode === 'STEAL' && p.chips <= 0) return; // STEAL: only players with chips

      const btn = document.createElement('button');
      btn.className = 'lcr-mp-target-btn';
      btn.innerHTML = `<span style="font-size:1.2rem">${p.icon || p.i || '🎲'}</span>
        <span style="flex:1">${p.name || p.n}</span>
        <span style="color:#d4af37;font-size:0.7rem">${p.chips} chip${p.chips !== 1 ? 's' : ''}</span>`;
      btn.addEventListener('click', () => {
        overlay.remove();
        onSelect(i);
      });
      list.appendChild(btn);
    });

    overlay.appendChild(title);
    overlay.appendChild(list);
    container.appendChild(overlay);

    return {
      remove() {
        overlay.remove();
      },
    };
  }

  // -------------------------------------------------------------------------
  // 2.5  showHostDisconnected / showToast
  // -------------------------------------------------------------------------

  /**
   * Shows a full-screen fixed overlay indicating the host has disconnected.
   * [New Game] button reloads the page.
   */
  function showHostDisconnected() {
    _injectStyles();
    const overlay = document.createElement('div');
    overlay.className = 'lcr-mp-host-dc';
    overlay.id = 'lcr-mp-host-dc';

    const emoji = document.createElement('div');
    emoji.style.fontSize = '3rem';
    emoji.textContent = '😔';

    const title = document.createElement('h2');
    title.className = 'lcr-mp-title';
    title.style.fontSize = '1.4rem';
    title.textContent = 'Host Disconnected';

    const sub = document.createElement('p');
    sub.className = 'lcr-mp-subtitle';
    sub.style.fontSize = '0.8rem';
    sub.textContent = 'The game has ended.';

    const btn = document.createElement('button');
    btn.className = 'lcr-mp-btn';
    btn.textContent = 'New Game';
    btn.addEventListener('click', () => location.reload());

    overlay.appendChild(emoji);
    overlay.appendChild(title);
    overlay.appendChild(sub);
    overlay.appendChild(btn);
    document.body.appendChild(overlay);
  }

  /**
   * Shows a small toast notification at the top of the screen.
   * Auto-dismisses after 3 seconds.
   *
   * @param {string} message — the message to display
   */
  function showToast(message) {
    _injectStyles();
    const toast = document.createElement('div');
    toast.className = 'lcr-mp-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    // Trigger slide-in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => toast.classList.add('show'));
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 350);
    }, 3000);
  }

  // -------------------------------------------------------------------------
  // showGuestCharacterPicker — guest picks their character during lobby
  // -------------------------------------------------------------------------

  /**
   * Shows a character picker for guests during the lobby phase.
   *
   * @param {object} opts
   * @param {Array}    opts.pool        — array of { name, icon } or { n, i }
   * @param {Array}    opts.takenNames  — names already picked (shown greyed out)
   * @param {Function} opts.onPick      — called with { name, icon } when picked
   * @returns {{ updateTaken(names: string[]): void, remove(): void }}
   */
  function showGuestCharacterPicker({ pool, takenNames = [], onPick }) {
    _injectStyles();
    const container = _getContainer();
    const overlay = _createOverlay(200);
    overlay.id = 'lcr-mp-guest-picker';
    overlay.style.borderRadius = '12px';
    overlay.style.overflowY = 'auto';

    const title = document.createElement('h2');
    title.className = 'lcr-mp-title';
    title.style.fontSize = '1rem';
    title.textContent = 'CHOOSE YOUR CHARACTER';

    const sub = document.createElement('p');
    sub.className = 'lcr-mp-subtitle';
    sub.textContent = 'Greyed out = already taken';

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:6px;width:100%;max-width:280px;margin-top:4px';

    let currentTaken = [...takenNames];

    function renderGrid() {
      grid.innerHTML = '';
      pool.forEach(char => {
        const name = char.name || char.n;
        const icon = char.icon || char.i;
        const taken = currentTaken.includes(name);
        const btn = document.createElement('button');
        btn.style.cssText = [
          'display:flex', 'flex-direction:column', 'align-items:center',
          'gap:2px', 'padding:6px 4px', 'border-radius:8px', 'border:1px solid',
          taken ? 'border-color:rgba(255,255,255,0.1);opacity:0.3;cursor:not-allowed'
                : 'border-color:rgba(212,175,55,0.5);cursor:pointer',
          'background:rgba(255,255,255,0.05)',
          'color:#fff8e1', 'font-family:Lato,sans-serif',
          '-webkit-tap-highlight-color:transparent',
        ].join(';');
        btn.innerHTML = `<span style="font-size:1.4rem">${icon}</span><span style="font-size:0.5rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em">${name}</span>`;
        if (!taken) {
          btn.addEventListener('click', () => {
            overlay.remove();
            onPick({ name, icon });
          });
        }
        grid.appendChild(btn);
      });
    }

    renderGrid();

    overlay.appendChild(title);
    overlay.appendChild(sub);
    overlay.appendChild(grid);
    container.appendChild(overlay);

    return {
      updateTaken(names) {
        currentTaken = names;
        renderGrid();
      },
      remove() {
        overlay.remove();
      },
    };
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  return {
    showModeSelection,
    showModeSelectionThree,
    showHostLobby,
    showGuestPinEntry,
    showGuestWaiting,
    showGuestCharacterPicker,
    showSpectatorBanner,
    showActiveTurnBanner,
    showTargetingPanel,
    showHostDisconnected,
    showToast,
  };

})();

// ---------------------------------------------------------------------------
// Exports — attach to window as a single namespace
// ---------------------------------------------------------------------------

window.LCRMultiplayer = {
  loadPeerJS,
  MultiplayerHost,
  MultiplayerGuest,
  UI: LCRMultiplayerUI,
};
