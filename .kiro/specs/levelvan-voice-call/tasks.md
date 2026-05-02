# Implementation Plan: LevelVan Voice Call

## Overview

All changes go into the single file `TravelGames/levelvan.html`. The implementation follows a strict layered order: CSS first, then HTML structure, then the `VoiceManager` class, then integration hooks into the existing app functions, then footer padding adjustments, and finally property-based tests in a separate test file.

The `VoiceManager` is a self-contained class that owns all voice state and DOM mutations. The rest of the app touches it at exactly four call sites: `showPanel()`, `goHome()`, and the two `conn.on('open')` handlers in `connectWithPin()` and `setupSensorConn()`.

## Tasks

- [x] 1. Add CSS for voice footer row, buttons, state modifiers, animations, waveform, echo warning, and error label
  - Inside the `<style>` block in `<head>`, append all new CSS rules after the existing `.cloud-status` rule
  - Add `.voice-footer-row`, `.voice-btns`, `.vbtn`, `.vbtn:disabled`, `.vbtn:active`, `.vbtn--talk`, `.vbtn--mute`, `.vbtn--end` base rules
  - Add state modifier classes: `.vbtn--talk.is-calling` (amber pulse), `.vbtn--talk.is-ringing` (green pulse), `.vbtn--talk.is-live` (green ring with `::before` pseudo-element), `.vbtn--mute.is-muted` (danger colour)
  - Add `@keyframes` blocks: `vbtn-amber-pulse`, `vbtn-green-pulse`, `vbtn-ring-pulse`
  - Add `.vbtn-wave` and `.vbtn-wave span` rules with `vbtn-wave-bar` keyframes and per-child `animation-delay` values
  - Add `.voice-echo-warn` and `.voice-error` rules
  - All colours must use existing CSS variables (`--accent2`, `--warn`, `--danger`, `--dim`, `--panel`, `--border`) — no new colour literals
  - _Requirements: 5.1, 5.4, 6.1, 6.2, 8.2, 9.5, 9.6, 11.1–11.6_

- [x] 2. Add HTML for voice-footer-row inside sensor-footer and display-footer
  - [x] 2.1 Add sensor voice row inside `#sensor-footer`
    - Append the `<div class="voice-footer-row" id="sv-voice-row" style="display:none">` block after the existing `.conn-count` div inside `#sensor-footer`
    - Include `#sv-echo-warn` div with `onclick="voiceMgr._dismissEchoWarning()"`
    - Include `.voice-btns` div containing three `<button>` elements: `#sv-talk` (`.vbtn--talk`, `onclick="voiceMgr.onTalkTap()"`, `disabled`), `#sv-mute` (`.vbtn--mute`, `onclick="voiceMgr.onMuteTap()"`, `disabled`), `#sv-end` (`.vbtn--end`, `onclick="voiceMgr.onEndTap()"`, `disabled`)
    - Each TALK button must contain a `<span class="vbtn-wave" id="sv-wave" style="display:none">` with five child `<span>` elements, plus a `<span class="vbtn-label">TALK</span>`
    - MUTE and END buttons contain only a `<span class="vbtn-label">` with their respective labels
    - Include `<div class="voice-error" id="sv-voice-err" style="display:none"></div>`
    - _Requirements: 9.1, 9.2, 9.6, 9.7_
  - [x] 2.2 Add display voice row inside `#display-footer`
    - Append the `<div class="voice-footer-row" id="dv-voice-row" style="display:none">` block after the existing `.angles` div inside `#display-footer`
    - Mirror the exact same structure as the sensor row but with `dv-` prefixed IDs: `#dv-voice-row`, `#dv-echo-warn`, `#dv-talk`, `#dv-wave`, `#dv-mute`, `#dv-end`, `#dv-voice-err`
    - _Requirements: 9.1, 9.3, 9.6, 9.7_

- [x] 3. Implement the VoiceManager class
  - Add the `VoiceManager` class inside the `<script>` block, before the `const LT=1.0` line at the top of the script section
  - [x] 3.1 Implement class skeleton, properties, and computed getters
    - Declare all instance properties: `_voicePeer`, `_localStream`, `_activeCall`, `_callState` (default `'idle'`), `_localRole`, `_pin`, `_audioEl`, `_echoShown`, `_reconnectTimer`, `_callTimeout`, `_activeRow`
    - Add computed getters `_talkBtn`, `_muteBtn`, `_endBtn`, `_waveEl`, `_echoEl`, `_errEl` that query `this._activeRow` using the class selectors from the design
    - Add the standalone pure function `getPartnerVoiceId(localId)` immediately before the class definition — this is the function tested by Properties 1 and 2
    - _Requirements: 1.6, 3.5_
  - [x] 3.2 Implement `_tryRegisterPeer(targetId, fallbackId)` and `init(pin, role)`
    - `_tryRegisterPeer` creates a `new Peer(targetId, { host, port, path, secure })` using the same constants as the existing data peer (`PEER_HOST`, `PEER_PORT`, `PEER_PATH`, `PEER_SECURE`)
    - On `peer.on('open')`: set `_localRole`, enable TALK button, clear any error label
    - On `peer.on('error')` with `unavailable-id`: if `fallbackId` is provided, call `_tryRegisterPeer(fallbackId, null)`; otherwise retry `targetId` after 3 seconds (sensor always owns A)
    - On any other error: show error label via `_errEl`, retry after 5 seconds, max 3 retries
    - Wire `_voicePeer.on('call', ...)` inside `_tryRegisterPeer`'s `open` handler to call `_handleIncomingCall(call)`
    - `init(pin, role)`: no-op if `mode === 'solo'`; store `_pin`; call `_tryRegisterPeer('levelvan-'+pin+'-voice-A', role==='display' ? 'levelvan-'+pin+'-voice-B' : null)`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  - [x] 3.3 Implement `_ensureLocalStream()` and `_playRemoteStream(stream)`
    - `_ensureLocalStream()`: if `_localStream` is already set, return `Promise.resolve(_localStream)`; otherwise call `navigator.mediaDevices.getUserMedia({ audio: true })`, cache result in `_localStream`, and return the promise; on `NotAllowedError`/`PermissionDeniedError` show "Mic access required — check browser settings" in `_errEl`; on `NotFoundError` show "No microphone found on this device"; on any other error show the error message
    - `_playRemoteStream(stream)`: create `new Audio()`, set `srcObject = stream`, call `setSinkId('speaker')` if available, call `play()`; on autoplay rejection add a one-time `touchstart` listener to retry `play()`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.4_
  - [x] 3.4 Implement `_setCallState(newState)` and `_applyButtonStyles()`
    - `_setCallState` updates `_callState` and calls `_applyButtonStyles()`
    - `_applyButtonStyles` reads `_callState` and applies the correct label text, CSS classes (`is-calling`, `is-ringing`, `is-live`, `is-muted`), `disabled` attribute, and waveform visibility to all three buttons according to the button-state table in the design
    - TALK label: `'TALK'` (idle), `'CALLING…'` (calling), `'ANSWER'` (ringing), `'LIVE'` (connected)
    - MUTE and END disabled when `_callState === 'idle'` or `'calling'` (END enabled in calling/ringing/connected; MUTE enabled only in connected)
    - Waveform `#sv-wave` / `#dv-wave` visible only when `_callState === 'connected'`
    - _Requirements: 3.2, 4.1, 5.1, 5.2, 5.3, 5.5, 6.3, 6.4, 7.4, 11.1–11.6_
  - [x] 3.5 Implement `onTalkTap()` and `_handleIncomingCall(call)`
    - `onTalkTap()` when `_callState === 'idle'`: call `_ensureLocalStream()`, then `_setCallState('calling')`, then `_voicePeer.call(_getPartnerVoiceId(), _localStream)`; start `_callTimeout` (30 s) that calls `_setCallState('idle')` if not answered; wire `call.on('stream')` → `_playRemoteStream`, `_setCallState('connected')`, `_showEchoWarning`; wire `call.on('close')` → `_setCallState('idle')`; wire `call.on('error')` → log, `_setCallState('idle')`, show error label
    - `onTalkTap()` when `_callState === 'ringing'`: answer the pending incoming call with `_localStream`, `_setCallState('connected')`
    - `_handleIncomingCall(call)`: if `_callState` is `'calling'` or `'connected'`, close existing call first; call `_ensureLocalStream()` (to have stream ready), `_setCallState('ringing')`, store call in `_pendingCall`; wire `call.on('close')` → `_setCallState('idle')`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3_
  - [x] 3.6 Implement `onMuteTap()`, `onEndTap()`, `_showEchoWarning()`, `_dismissEchoWarning()`
    - `onMuteTap()`: toggle `track.enabled` on the first audio track of `_localStream`; call `_applyButtonStyles()` to sync muted CSS class
    - `onEndTap()`: close `_activeCall` if set; clear `_callTimeout` and `_reconnectTimer`; `_setCallState('idle')`; re-enable mic track so next call starts unmuted (Req 7.5); do NOT stop `_localStream` tracks
    - `_showEchoWarning()`: if `sessionStorage.getItem('lv_echo_shown')` is set, return; set the flag; show `_echoEl`; auto-dismiss after 6 s via `setTimeout`
    - `_dismissEchoWarning()`: hide `_echoEl`; clear the auto-dismiss timer
    - _Requirements: 6.1, 6.2, 6.5, 7.1, 7.2, 7.3, 8.1, 8.3, 8.4, 8.5_
  - [x] 3.7 Implement `onPanelChange(panelId)`, `destroy()`, and `reconnect()`
    - `onPanelChange(panelId)`: set `_activeRow` to `$('sv-voice-row')` when `panelId === 's3'`, `$('dv-voice-row')` when `panelId === 'd3'`, `null` otherwise; show the active row (`style.display = ''`), hide the other; call `_applyButtonStyles()` to sync button state to the new row
    - `destroy()`: close `_activeCall`; destroy `_voicePeer`; stop all `_localStream` tracks (`track.stop()`); clear `_callTimeout` and `_reconnectTimer`; reset all properties to null/idle
    - `reconnect()`: if `_callState === 'connected'`, do nothing (call survived); if `_callState === 'idle'` and `_localStream` is set, attempt `_voicePeer.call(_getPartnerVoiceId(), _localStream)`; cancel `_reconnectTimer` if running
    - _Requirements: 9.2, 9.3, 9.4, 10.1, 10.2, 10.3, 10.4_
  - [x] 3.8 Instantiate VoiceManager as `window.voiceMgr`
    - After the class definition, add `const voiceMgr = new VoiceManager(); window.voiceMgr = voiceMgr;`
    - _Requirements: 1.1_

- [x] 4. Integrate VoiceManager into existing app functions
  - [x] 4.1 Hook `voiceMgr.onPanelChange(id)` into `showPanel()`
    - In the `showPanel(id)` function, after the existing footer `classList.toggle` lines, add: `if (window.voiceMgr) voiceMgr.onPanelChange(id);`
    - _Requirements: 9.2, 9.3, 9.4_
  - [x] 4.2 Hook `voiceMgr.destroy()` into `goHome()`
    - In `window.goHome`, before the `cleanup()` call, add: `if (window.voiceMgr) voiceMgr.destroy();`
    - _Requirements: 10.4_
  - [x] 4.3 Hook `voiceMgr.init()` and `voiceMgr.reconnect()` into the sensor `conn.on('open')` handler
    - In `setupSensorConn`, inside `conn.on('open', () => { ... })`, after `showPanel('s3')` (i.e., after `if (conns.length === 1) showPanel('s3')`), add:
      ```javascript
      if (window.voiceMgr && mode === 'sensor' && _pin) {
        if (conns.length === 1) voiceMgr.init(_pin, 'sensor');
        else voiceMgr.reconnect();
      }
      ```
    - _Requirements: 1.1, 10.2_
  - [x] 4.4 Hook `voiceMgr.init()` and `voiceMgr.reconnect()` into the display `conn.on('open')` handler
    - In `connectWithPin`, inside `conn.on('open', () => { ... })`, after `showPanel('d3')`, add:
      ```javascript
      if (window.voiceMgr && mode === 'display' && pin) {
        if (!voiceMgr._voicePeer) voiceMgr.init(pin, 'display');
        else voiceMgr.reconnect();
      }
      ```
    - _Requirements: 1.2, 10.2_

- [x] 5. Checkpoint — verify integration compiles and voice row appears
  - Open `TravelGames/levelvan.html` in a browser, tap SENSOR, confirm the voice footer row is visible in `#sensor-footer` when panel `s3` is active and hidden on all other panels
  - Confirm the voice row is absent in Solo mode
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Adjust footer padding on sensor and display panels to accommodate the voice row
  - In the `#s3` panel div, increase `padding-bottom` from `180px` to `240px` to prevent the 3D caravan scene from being obscured by the taller footer
  - In the `#d3` panel div, increase `padding-bottom` from `220px` to `280px` for the same reason
  - Verify visually that the caravan SVG is not clipped by the footer on a 375px-wide viewport
  - _Requirements: 9.1, 9.5_

- [ ] 7. Property-based tests for VoiceManager correctness properties
  - Create a new file `TravelGames/levelvan-voice-tests.html` that loads fast-check from CDN (`https://cdn.jsdelivr.net/npm/fast-check/+esm`) and runs all 10 property tests in the browser console
  - [ ]* 7.1 Write property test for Property 1: getPartnerVoiceId is an involution
    - `// Feature: levelvan-voice-call, Property 1: Partner ID is an involution`
    - Generate arbitrary valid voice IDs by combining arbitrary 4-digit PIN strings with `-voice-A` or `-voice-B` suffix
    - Assert `getPartnerVoiceId(getPartnerVoiceId(id)) === id` for all generated IDs
    - **Property 1: Partner ID is an involution**
    - **Validates: Requirements 3.5**
  - [ ]* 7.2 Write property test for Property 2: Role negotiation produces correct IDs
    - `// Feature: levelvan-voice-call, Property 2: Role negotiation produces correct IDs`
    - Generate arbitrary 4-digit PIN strings (strings of exactly 4 decimal digits)
    - Assert that `'levelvan-'+pin+'-voice-A'` and `'levelvan-'+pin+'-voice-B'` are distinct and match the expected patterns
    - **Property 2: Role negotiation produces correct IDs**
    - **Validates: Requirements 1.1, 1.2**
  - [ ]* 7.3 Write property test for Property 3: Mic stream requested at most once per session
    - `// Feature: levelvan-voice-call, Property 3: Mic stream is requested at most once per session`
    - Create a mock `VoiceManager` instance with a stubbed `getUserMedia` that counts calls and returns a fake stream
    - Generate N ≥ 1 (up to 20) sequential calls to `_ensureLocalStream()`
    - Assert `getUserMedia` call count is exactly 1 regardless of N
    - **Property 3: Mic stream is requested at most once per session**
    - **Validates: Requirements 2.3**
  - [ ]* 7.4 Write property test for Property 4: Mute toggle is an involution
    - `// Feature: levelvan-voice-call, Property 4: Mute toggle is an involution`
    - Create a fake `MediaStreamTrack` with a mutable `enabled` boolean
    - Generate arbitrary initial `enabled` states (true or false)
    - Call `onMuteTap()` twice and assert `track.enabled` equals the original value
    - **Property 4: Mute toggle is an involution**
    - **Validates: Requirements 6.1, 6.2**
  - [ ]* 7.5 Write property test for Property 5: Local stream preserved across call end
    - `// Feature: levelvan-voice-call, Property 5: Local stream is preserved across call end`
    - Create a fake `MediaStream` with fake tracks that have a `readyState` property
    - Call `onEndTap()` (with a mock active call) and assert all tracks have `readyState !== 'ended'`
    - **Property 5: Local stream is preserved across call end**
    - **Validates: Requirements 7.3**
  - [ ]* 7.6 Write property test for Property 6: Echo warning shown at most once per session
    - `// Feature: levelvan-voice-call, Property 6: Echo warning shown at most once per session`
    - Clear `sessionStorage` before each run; mock `_echoEl` with a show-count counter
    - Generate N ≥ 1 (up to 20) calls to `_showEchoWarning()`
    - Assert the echo element was made visible exactly once
    - **Property 6: Echo warning shown at most once per session**
    - **Validates: Requirements 8.5**
  - [ ]* 7.7 Write property test for Property 7: Voice footer height is invariant across state changes
    - `// Feature: levelvan-voice-call, Property 7: Voice footer height is invariant across state changes`
    - Inject the voice row HTML into a hidden DOM fixture; call `_setCallState` with each of the four states
    - Assert `voiceBtnsEl.offsetHeight === 56` (or computed style height is `'56px'`) after each transition
    - **Property 7: Voice footer height is invariant across state changes**
    - **Validates: Requirements 9.5**
  - [ ]* 7.8 Write property test for Property 8: Disabled buttons have opacity 0.3 and pointer-events none
    - `// Feature: levelvan-voice-call, Property 8: Disabled buttons always have opacity 0.3 and pointer-events none`
    - Generate arbitrary (button selector, call state) pairs where the button should be disabled per the state table
    - Assert `getComputedStyle(btn).opacity === '0.3'` and `getComputedStyle(btn).pointerEvents === 'none'`
    - **Property 8: Disabled buttons always have opacity 0.3 and pointer-events none**
    - **Validates: Requirements 11.6**
  - [ ]* 7.9 Write property test for Property 9: END button always uses --danger colour
    - `// Feature: levelvan-voice-call, Property 9: END button always uses --danger colour`
    - Generate arbitrary `Call_State` values from the four valid states
    - After calling `_setCallState(state)`, assert the END button's computed `borderColor` and `color` resolve to `#ff4444`
    - **Property 9: END button always uses --danger colour**
    - **Validates: Requirements 11.3**
  - [ ]* 7.10 Write property test for Property 10: destroy() fully releases all resources
    - `// Feature: levelvan-voice-call, Property 10: destroy() fully releases all resources`
    - Generate arbitrary `Call_State` values; set up a mock `VoiceManager` with fake peer, call, and stream objects
    - Call `destroy()` and assert: `_activeCall.close()` was called, `_voicePeer.destroy()` was called, all `_localStream` tracks have `readyState === 'ended'`
    - **Property 10: destroy() fully releases all resources**
    - **Validates: Requirements 10.4**

- [x] 8. Final checkpoint — end-to-end smoke test
  - Ensure all tests pass, ask the user if questions arise.
  - Verify `VoiceManager` is a no-op when `mode === 'solo'` (voice row hidden, no peer created)
  - Verify the existing data connection flow is unaffected (tilt data still updates at ~15 Hz)
  - Verify `goHome()` destroys the voice peer and stops all stream tracks without errors in the console

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- All code changes are confined to `TravelGames/levelvan.html` (tasks 1–6) and the new test file `TravelGames/levelvan-voice-tests.html` (task 7)
- The `getPartnerVoiceId` pure function must be defined outside the class so it can be imported/tested independently
- Property tests use fast-check's `fc.property` and `fc.assert` with a minimum of 100 runs each
- The `_activeRow` pattern means all button mutations work identically for sensor and display — no duplicated logic
- Solo mode guard (`if (mode === 'solo') return`) must be the first line of `init()` to satisfy Requirement 9.4
