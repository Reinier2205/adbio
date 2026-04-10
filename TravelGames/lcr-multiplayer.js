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

    /** Tracks how many player slots have been assigned so far */
    this._nextPlayerIndex = 0;
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
          // Game is full — reject the connection
          conn.send({ type: 'error', message: 'Game is full' });
          conn.close();
          return;
        }

        const playerIndex = this._nextPlayerIndex++;
        this.connections.push({ conn, playerIndex });

        // Tell the guest which slot they own
        conn.send({ type: 'assigned', playerIndex });

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

    } else if (msg.type === 'target') {
      // Only the current turn player may select a target
      if (playerIndex !== state.turnIndex) return;

      const newState = this.gameAdapter.executeTarget(msg.targetIndex, msg.mode);
      this.broadcastState(newState);

    } else if (msg.type === 'reconnect') {
      // Send current state only to the reconnecting guest
      const currentState = this.gameAdapter.getState();
      conn.send({ type: 'game_state', ...currentState });
    }
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
// Exports — attach to window as a single namespace
// ---------------------------------------------------------------------------

window.LCRMultiplayer = {
  loadPeerJS,
  MultiplayerHost,
  MultiplayerGuest,
};
