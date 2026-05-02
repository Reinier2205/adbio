# Design Document — LevelVan Voice Call

## Overview

This feature adds integrated two-way voice calling to LevelVan. The Sensor phone (inside the caravan) and the Display phone (held by the driver outside) can call each other without leaving the leveling screen. Voice uses PeerJS WebRTC audio — the same relay infrastructure already used for tilt data — keyed to the same 4-digit PIN.

The design is additive: a single `VoiceManager` class is dropped into the existing single-file app. It owns all voice state and DOM mutations. The rest of the app touches `VoiceManager` at exactly three points: `showPanel()`, `goHome()`, and the data-connection reconnect path.

### Key design decisions

- **Separate Voice_Peer from data Peer.** The data peer uses a fixed ID (`levelvan-XXXX-sensor` / `levelvan-XXXX-display-…`). Mixing audio into that peer would require renegotiating existing connections. A dedicated voice peer with its own ID keeps the two concerns independent and makes teardown clean.
- **Role negotiation mirrors VoiceLink.html.** Both phones try `-voice-A` first; the second one to arrive gets `-voice-B`. This is the same `unavailable-id` fallback pattern already proven in the prototype.
- **Lazy mic permission.** `getUserMedia` is not called until the user taps TALK. This avoids a permission prompt appearing before the user has any context for why the mic is needed.
- **Footer-only UI.** The Voice_Footer_Row lives inside the existing `sensor-footer` / `display-footer` elements. No new fixed-position layers are introduced, so the leveling data is never obscured.
- **Solo mode is invisible.** `VoiceManager.init()` is a no-op when `mode === 'solo'`.

---

## Architecture

### Component overview

```
levelvan.html
│
├── Existing globals
│   ├── peer          (data PeerJS instance)
│   ├── conns[]       (data DataConnections)
│   ├── mode          ('sensor' | 'display' | 'solo' | null)
│   └── _pin          (4-digit PIN string)
│
├── VoiceManager      ← NEW (single instance: window.voiceMgr)
│   ├── _voicePeer    (PeerJS Peer for audio)
│   ├── _localStream  (cached MediaStream)
│   ├── _activeCall   (PeerJS MediaConnection)
│   ├── _callState    ('idle'|'calling'|'ringing'|'connected')
│   ├── _localRole    ('A' | 'B' | null)
│   └── _audioEl      (Audio element for remote stream)
│
└── DOM additions
    ├── #sensor-footer > .voice-footer-row   ← NEW
    └── #display-footer > .voice-footer-row  ← NEW
```

### Integration points (existing code touched)

| Location | Change |
|---|---|
| `showPanel(id)` | After footer show/hide logic: call `voiceMgr.onPanelChange(id)` |
| `goHome()` | Before `cleanup()`: call `voiceMgr.destroy()` |
| `conn.on('open')` in `connectWithPin()` | After `showPanel('d3')`: call `voiceMgr.reconnect()` |
| `conn.on('open')` in `setupSensorConn()` | After `showPanel('s3')`: call `voiceMgr.reconnect()` |
| `cleanup()` | Already called by `goHome()` — no change needed here |

No existing functions are modified beyond these four call-site additions.

---

## State Machine

### Call_State transitions

```
                    ┌─────────────────────────────────────────────┐
                    │                                             │
                    ▼                                             │
              ┌──────────┐                                        │
    ┌────────▶│   IDLE   │◀──────────────────────────────────┐   │
    │         └──────────┘                                   │   │
    │               │                                        │   │
    │         tap TALK (idle)                                │   │
    │               │                                        │   │
    │               ▼                                        │   │
    │         ┌──────────┐   remote answers (stream event)   │   │
    │         │ CALLING  │──────────────────────────────────▶│   │
    │         └──────────┘                                   │   │
    │               │                                        │   │
    │         tap END / 30s timeout                          │   │
    │               │                                        │   │
    │               └────────────────────────────────────────┘   │
    │                                                             │
    │         incoming call (peer.on('call'))                     │
    │               │                                             │
    │               ▼                                             │
    │         ┌──────────┐   tap TALK (ringing)                   │
    │         │ RINGING  │──────────────────────────────────────▶ │
    │         └──────────┘                                        │
    │               │                                             │
    │         tap END                                             │
    │               │                                             │
    │               └─────────────────────────────────────────────┘
    │
    │         ┌───────────┐
    └─────────│ CONNECTED │◀── (from CALLING or RINGING via stream event / answer)
              └───────────┘
                    │
              tap END / remote closes / goHome()
                    │
                    └──────────────────────────────────────────▶ IDLE
```

### Button states per Call_State

| State | TALK label | TALK style | MUTE | END |
|---|---|---|---|---|
| `idle` | TALK | accent2, enabled | disabled (0.3) | disabled (0.3) |
| `calling` | CALLING… | warn, pulsing amber | disabled (0.3) | enabled |
| `ringing` | ANSWER | accent2, pulsing green | disabled (0.3) | enabled |
| `connected` | LIVE | accent2, pulsing green ring | enabled | enabled |

---

## Components and Interfaces

### VoiceManager class

```javascript
class VoiceManager {
  // ── Lifecycle ──────────────────────────────────────────────
  
  /**
   * Called when entering a live panel (s3 or d3).
   * Creates the Voice_Peer and wires up incoming-call handler.
   * No-op in solo mode.
   * @param {string} pin   - 4-digit PIN
   * @param {string} role  - 'sensor' (always tries A) | 'display' (tries A, falls back to B)
   */
  init(pin, role) {}

  /**
   * Called by goHome() before cleanup().
   * Closes active call, destroys Voice_Peer, stops all Local_Stream tracks.
   */
  destroy() {}

  /**
   * Called when the data connection re-establishes (conn.on('open')).
   * If Call_State is idle, attempts to re-initiate the voice call.
   * If Call_State is connected, does nothing (call survived).
   */
  reconnect() {}

  /**
   * Called by showPanel() whenever the active panel changes.
   * Shows/hides the correct Voice_Footer_Row.
   * @param {string} panelId - e.g. 's3', 'd3', 's2', 'd1', …
   */
  onPanelChange(panelId) {}

  // ── Button handlers (wired to onclick in HTML) ─────────────

  onTalkTap() {}   // handles idle→calling, ringing→connected
  onMuteTap() {}   // toggles track.enabled
  onEndTap()  {}   // closes call, returns to idle

  // ── Internal helpers (private by convention) ───────────────

  _tryRegisterPeer(targetId, fallbackId) {}
  _getPartnerVoiceId() {}          // returns opposite role ID
  _ensureLocalStream()  {}         // lazy getUserMedia, returns Promise<MediaStream>
  _setCallState(newState) {}       // updates _callState and refreshes all button UI
  _playRemoteStream(stream) {}     // creates Audio element, sets srcObject, calls play()
  _showEchoWarning() {}
  _dismissEchoWarning() {}
  _applyButtonStyles() {}          // called by _setCallState to sync DOM
}
```

### Properties

| Property | Type | Description |
|---|---|---|
| `_voicePeer` | `Peer \| null` | PeerJS Peer instance for audio |
| `_localStream` | `MediaStream \| null` | Cached mic stream (null until first TALK tap) |
| `_activeCall` | `MediaConnection \| null` | Current PeerJS call object |
| `_callState` | `string` | One of `idle`, `calling`, `ringing`, `connected` |
| `_localRole` | `'A' \| 'B' \| null` | Negotiated role after peer registration |
| `_pin` | `string \| null` | 4-digit PIN |
| `_audioEl` | `HTMLAudioElement \| null` | Audio element playing remote stream |
| `_echoShown` | `boolean` | Tracks whether echo warning has been shown this session |
| `_reconnectTimer` | `number \| null` | setTimeout handle for 10s reconnect timeout |
| `_callTimeout` | `number \| null` | setTimeout handle for 30s unanswered call timeout |

---

## HTML Structure

### Voice_Footer_Row (added inside both footers)

The same structure is injected into `#sensor-footer` and `#display-footer`. The sensor row uses IDs prefixed `sv-`, the display row uses `dv-`.

```html
<!-- Inside #sensor-footer, after existing content -->
<div class="voice-footer-row" id="sv-voice-row" style="display:none">
  <div class="voice-echo-warn" id="sv-echo-warn" style="display:none"
       onclick="voiceMgr._dismissEchoWarning()">
    📢 Echo? Mute when phones are close together.
  </div>
  <div class="voice-btns">
    <button class="vbtn vbtn--talk" id="sv-talk" onclick="voiceMgr.onTalkTap()"
            disabled>
      <span class="vbtn-wave" id="sv-wave" style="display:none">
        <span></span><span></span><span></span><span></span><span></span>
      </span>
      <span class="vbtn-label">TALK</span>
    </button>
    <button class="vbtn vbtn--mute" id="sv-mute" onclick="voiceMgr.onMuteTap()"
            disabled>
      <span class="vbtn-label">MUTE</span>
    </button>
    <button class="vbtn vbtn--end" id="sv-end" onclick="voiceMgr.onEndTap()"
            disabled>
      <span class="vbtn-label">END</span>
    </button>
  </div>
  <div class="voice-error" id="sv-voice-err" style="display:none"></div>
</div>

<!-- Inside #display-footer, after existing content -->
<div class="voice-footer-row" id="dv-voice-row" style="display:none">
  <div class="voice-echo-warn" id="dv-echo-warn" style="display:none"
       onclick="voiceMgr._dismissEchoWarning()">
    📢 Echo? Mute when phones are close together.
  </div>
  <div class="voice-btns">
    <button class="vbtn vbtn--talk" id="dv-talk" onclick="voiceMgr.onTalkTap()"
            disabled>
      <span class="vbtn-wave" id="dv-wave" style="display:none">
        <span></span><span></span><span></span><span></span><span></span>
      </span>
      <span class="vbtn-label">TALK</span>
    </button>
    <button class="vbtn vbtn--mute" id="dv-mute" onclick="voiceMgr.onMuteTap()"
            disabled>
      <span class="vbtn-label">MUTE</span>
    </button>
    <button class="vbtn vbtn--end" id="dv-end" onclick="voiceMgr.onEndTap()"
            disabled>
      <span class="vbtn-label">END</span>
    </button>
  </div>
  <div class="voice-error" id="dv-voice-err" style="display:none"></div>
</div>
```

### Active row reference

`VoiceManager` tracks which row is currently active via `_activeRow` (set by `onPanelChange`). All button/label mutations go through `_activeRow` so the same code path serves both sensor and display.

```javascript
// Inside VoiceManager
get _talkBtn() { return this._activeRow?.querySelector('.vbtn--talk'); }
get _muteBtn() { return this._activeRow?.querySelector('.vbtn--mute'); }
get _endBtn()  { return this._activeRow?.querySelector('.vbtn--end');  }
get _waveEl()  { return this._activeRow?.querySelector('.vbtn-wave');  }
get _echoEl()  { return this._activeRow?.querySelector('.voice-echo-warn'); }
get _errEl()   { return this._activeRow?.querySelector('.voice-error'); }
```

---

## CSS Additions

All new rules use existing CSS variables. No new colour values are introduced.

```css
/* ── Voice Footer Row ─────────────────────────────────────── */
.voice-footer-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}

.voice-btns {
  display: flex;
  gap: 8px;
  height: 56px;          /* fixed — never changes */
}

/* ── Voice Buttons ────────────────────────────────────────── */
.vbtn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  border-radius: 12px;
  border: 2px solid;
  background: var(--panel);
  font-family: 'Orbitron', monospace;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 2px;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: opacity 0.15s, background 0.15s, border-color 0.15s;
  position: relative;
  overflow: hidden;
}

.vbtn:disabled,
.vbtn[disabled] {
  opacity: 0.3;
  pointer-events: none;
}

.vbtn:active:not(:disabled) { transform: scale(0.94); }

/* Default colour schemes */
.vbtn--talk {
  border-color: var(--accent2);
  color: var(--accent2);
}
.vbtn--mute {
  border-color: var(--dim);
  color: var(--dim);
}
.vbtn--end {
  border-color: var(--danger);
  color: var(--danger);
}

/* ── State modifiers ──────────────────────────────────────── */

/* CALLING state — amber pulse */
.vbtn--talk.is-calling {
  border-color: var(--warn);
  color: var(--warn);
  animation: vbtn-amber-pulse 1s ease-in-out infinite;
}

/* RINGING state — green pulse */
.vbtn--talk.is-ringing {
  border-color: var(--accent2);
  color: var(--accent2);
  animation: vbtn-green-pulse 0.8s ease-in-out infinite;
}

/* CONNECTED state — green ring */
.vbtn--talk.is-live {
  border-color: var(--accent2);
  color: var(--accent2);
  background: rgba(0, 255, 136, 0.08);
}
.vbtn--talk.is-live::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 14px;
  border: 3px solid var(--accent2);
  animation: vbtn-ring-pulse 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
  pointer-events: none;
}

/* MUTED state */
.vbtn--mute.is-muted {
  border-color: var(--danger);
  color: var(--danger);
  background: rgba(255, 68, 68, 0.08);
}

/* ── Keyframe animations ──────────────────────────────────── */
@keyframes vbtn-amber-pulse {
  0%, 100% { background: rgba(255, 170, 0, 0.05); }
  50%       { background: rgba(255, 170, 0, 0.18); }
}

@keyframes vbtn-green-pulse {
  0%, 100% { background: rgba(0, 255, 136, 0.05); }
  50%       { background: rgba(0, 255, 136, 0.18); }
}

@keyframes vbtn-ring-pulse {
  0%        { transform: scale(1);   opacity: 0.8; }
  80%, 100% { transform: scale(1.4); opacity: 0;   }
}

/* ── Waveform icon ────────────────────────────────────────── */
.vbtn-wave {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 12px;
}
.vbtn-wave span {
  display: block;
  width: 3px;
  border-radius: 2px;
  background: var(--accent2);
  animation: vbtn-wave-bar 0.8s ease-in-out infinite;
}
.vbtn-wave span:nth-child(1) { height: 4px;  animation-delay: 0s;    }
.vbtn-wave span:nth-child(2) { height: 8px;  animation-delay: 0.1s;  }
.vbtn-wave span:nth-child(3) { height: 12px; animation-delay: 0.2s;  }
.vbtn-wave span:nth-child(4) { height: 8px;  animation-delay: 0.3s;  }
.vbtn-wave span:nth-child(5) { height: 4px;  animation-delay: 0.4s;  }

@keyframes vbtn-wave-bar {
  0%, 100% { transform: scaleY(0.4); }
  50%       { transform: scaleY(1);   }
}

/* ── Echo warning banner ──────────────────────────────────── */
.voice-echo-warn {
  font-size: 0.75rem;
  color: var(--warn);
  background: rgba(255, 170, 0, 0.08);
  border: 1px solid rgba(255, 170, 0, 0.3);
  border-radius: 8px;
  padding: 6px 10px;
  text-align: center;
  cursor: pointer;
  font-family: 'Share Tech Mono', monospace;
}

/* ── Voice error label ────────────────────────────────────── */
.voice-error {
  font-size: 0.72rem;
  color: var(--danger);
  text-align: center;
  font-family: 'Share Tech Mono', monospace;
  min-height: 1em;
}
```

---

## Data Models

### Call_State enum (string union)

```
'idle' | 'calling' | 'ringing' | 'connected'
```

### Voice_Peer_ID format

```
'levelvan-' + PIN + '-voice-A'   (sensor always; display first attempt)
'levelvan-' + PIN + '-voice-B'   (display fallback on unavailable-id)
```

### Partner ID derivation

```javascript
// Pure function — no side effects
function getPartnerVoiceId(localId) {
  if (localId.endsWith('-voice-A')) return localId.replace('-voice-A', '-voice-B');
  if (localId.endsWith('-voice-B')) return localId.replace('-voice-B', '-voice-A');
  return null;
}
```

This function is an involution: `getPartnerVoiceId(getPartnerVoiceId(id)) === id` for any valid voice ID.

### Session flag

```javascript
// Echo warning shown at most once per browser session
sessionStorage.getItem('lv_echo_shown')  // '1' if shown, absent otherwise
sessionStorage.setItem('lv_echo_shown', '1')
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Partner ID is an involution

*For any* valid voice peer ID (ending in `-voice-A` or `-voice-B`), applying `getPartnerVoiceId` twice returns the original ID.

**Validates: Requirements 3.5**

### Property 2: Role negotiation produces correct IDs

*For any* 4-digit PIN string, the voice peer ID constructed for role A is `levelvan-{PIN}-voice-A` and for role B is `levelvan-{PIN}-voice-B`, and these two IDs are distinct.

**Validates: Requirements 1.1, 1.2**

### Property 3: Mic stream is requested at most once per session

*For any* number N ≥ 1 of TALK taps after the first successful `getUserMedia` grant, `getUserMedia` is called exactly once total across all N taps.

**Validates: Requirements 2.3**

### Property 4: Mute toggle is an involution

*For any* initial mute state (muted or unmuted), applying `onMuteTap()` twice returns the microphone track to its original `enabled` state.

**Validates: Requirements 6.1, 6.2**

### Property 5: Local stream is preserved across call end

*For any* call end event (local END tap or remote close), all tracks in `_localStream` remain in a non-stopped state (`readyState !== 'ended'`) after the call ends.

**Validates: Requirements 7.3**

### Property 6: Echo warning shown at most once per session

*For any* number N ≥ 1 of `connected` state transitions within a single browser session, the echo warning is displayed exactly once.

**Validates: Requirements 8.5**

### Property 7: Voice footer height is invariant across state changes

*For any* `Call_State` value, the rendered height of `.voice-btns` is exactly 56px.

**Validates: Requirements 9.5**

### Property 8: Disabled buttons always have opacity 0.3 and pointer-events none

*For any* button (TALK, MUTE, or END) in a disabled state, the computed `opacity` is `0.3` and `pointer-events` is `none`.

**Validates: Requirements 11.6**

### Property 9: END button always uses --danger colour

*For any* `Call_State` value, the END button's border colour and text colour are `var(--danger)` (`#ff4444`).

**Validates: Requirements 11.3**

### Property 10: destroy() fully releases all resources

*For any* `Call_State` when `destroy()` is called, the result is: `_activeCall` is closed, `_voicePeer` is destroyed, and all `_localStream` tracks are stopped (`readyState === 'ended'`).

**Validates: Requirements 10.4**

---

## Error Handling

### Peer registration errors

| Error type | Handling |
|---|---|
| `unavailable-id` | Display role only: retry with `-voice-B`. Sensor role: retry same ID after 3s (sensor always owns A). |
| Any other error | Show error label below Voice_Footer_Row. Retry after 5s. Max 3 retries, then show permanent error. |

### Microphone permission errors

| Scenario | Handling |
|---|---|
| `NotAllowedError` / `PermissionDeniedError` | Show "Mic access required — check browser settings". Do not attempt call. |
| `NotFoundError` | Show "No microphone found on this device". |
| Any other `getUserMedia` error | Show error message. Do not attempt call. |

### Call errors

| Scenario | Handling |
|---|---|
| Outgoing call not answered in 30s | `_callTimeout` fires → `_setCallState('idle')`. |
| Remote peer closes call | `call.on('close')` → `_setCallState('idle')`. |
| `call.on('error')` | Log error, `_setCallState('idle')`, show brief error label. |
| Audio `play()` rejected (autoplay policy) | Add one-time `touchstart` listener to retry `play()`. |

### Data connection drop during active call

When the data connection drops while `_callState === 'connected'`:
1. Keep `_localStream` active and retain `connected` visual state.
2. Start `_reconnectTimer` (10s).
3. When `reconnect()` is called (data reconnected): cancel timer, attempt `_voicePeer.call(partnerVoiceId, _localStream)`.
4. If timer fires before reconnect: `_setCallState('idle')`.

---

## Testing Strategy

### Unit tests (example-based)

Focus on specific state transitions and edge cases:

- `getPartnerVoiceId()` with `-voice-A` and `-voice-B` inputs
- `_setCallState()` produces correct button labels and CSS classes for each state
- `onTalkTap()` in each state (idle, calling, ringing, connected)
- `onEndTap()` in each non-idle state
- `onMuteTap()` toggles `track.enabled` and button style
- `destroy()` closes call, destroys peer, stops stream tracks
- Echo warning shown on first `connected` transition, not on second
- Error label shown when `getUserMedia` rejects
- `_tryRegisterPeer` falls back to B on `unavailable-id`

### Property-based tests

Use a property-based testing library (e.g. [fast-check](https://github.com/dubzzz/fast-check) for JavaScript). Each test runs a minimum of 100 iterations.

**Tag format:** `// Feature: levelvan-voice-call, Property {N}: {property_text}`

- **Property 1** — Generate arbitrary valid voice IDs; verify `getPartnerVoiceId` is an involution.
- **Property 2** — Generate arbitrary 4-digit PIN strings; verify constructed IDs match pattern and are distinct.
- **Property 3** — Generate N ≥ 1 TALK taps with mocked `getUserMedia`; verify call count is always 1.
- **Property 4** — Generate arbitrary initial mute states; verify double-toggle restores original state.
- **Property 5** — Generate arbitrary call end sequences; verify stream tracks are never stopped.
- **Property 6** — Generate N ≥ 1 connected transitions; verify echo warning shown exactly once.
- **Property 7** — Generate arbitrary state transitions; verify `.voice-btns` height remains 56px.
- **Property 8** — Generate arbitrary (button, state) pairs where button is disabled; verify opacity and pointer-events.
- **Property 9** — Generate arbitrary `Call_State` values; verify END button always has danger colour.
- **Property 10** — Generate arbitrary `Call_State` values; call `destroy()`; verify all resources released.

### Integration / smoke tests

- Verify `VoiceManager` does not throw when `mode === 'solo'` (no-op path).
- Verify `VoiceManager` does not interfere with existing data connection flow.
- Manual end-to-end: two devices on same WiFi, full call lifecycle (initiate → answer → mute → unmute → end).

---

## Data Flow Diagram

```
SENSOR PHONE                          DISPLAY PHONE
────────────────────────────────────────────────────────────────

[enters s3]                           [enters d3]
    │                                     │
    ▼                                     ▼
voiceMgr.init('1234','sensor')        voiceMgr.init('1234','display')
    │                                     │
    ▼                                     ▼
new Peer('levelvan-1234-voice-A')     new Peer('levelvan-1234-voice-A')
    │                                     │ ← unavailable-id error
    │                                     ▼
    │                               new Peer('levelvan-1234-voice-B')
    │                                     │
    ▼                                     ▼
peer.on('open') → enable TALK         peer.on('open') → enable TALK
    │                                     │
    │                                     │
    │   [user taps TALK on Display]       │
    │                                     ▼
    │                               getUserMedia({audio:true})
    │                                     │
    │                                     ▼
    │                               _localStream cached
    │                                     │
    │                                     ▼
    │                               peer.call('levelvan-1234-voice-A',
    │                                         localStream)
    │                                     │
    │◀────── PeerJS signalling ───────────┘
    │        (via 0.peerjs.com)
    ▼
peer.on('call', incomingCall)
    │
    ▼
_setCallState('ringing')
TALK → "ANSWER" (green pulse)
    │
    │   [user taps TALK on Sensor]
    ▼
getUserMedia({audio:true})
    │
    ▼
incomingCall.answer(localStream)
    │
    ▼
call.on('stream', remoteStream) ──────────────────────────────▶
    │                                                    call.on('stream')
    ▼                                                          │
_playRemoteStream(remoteStream)                                ▼
Audio.srcObject = remoteStream                         _playRemoteStream()
Audio.play()                                           Audio.play()
    │                                                          │
    ▼                                                          ▼
_setCallState('connected')                         _setCallState('connected')
TALK → "LIVE" (green ring)                         TALK → "LIVE" (green ring)
Echo warning shown (once)                          Echo warning shown (once)
    │                                                          │
    │◀══════════ LIVE AUDIO (P2P WebRTC) ══════════════════════▶│
    │                                                          │
    │   [user taps END on either phone]
    ▼
call.close()
    │
    ▼
call.on('close') fires on both sides
    │
    ▼
_setCallState('idle')
TALK → "TALK" (default)
_localStream tracks remain active (NOT stopped)
```
