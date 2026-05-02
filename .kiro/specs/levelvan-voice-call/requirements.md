# Requirements Document

## Introduction

LevelVan is a caravan leveling app that pairs two phones via PeerJS WebRTC. This feature adds integrated two-way voice calling between the paired Sensor phone (inside the caravan) and the Display phone (held by the driver outside). Voice calls use the same 4-digit PIN pairing that already exists — no separate room or login concept. Either phone can initiate a call. The feature is invisible in Solo mode and is fixed in the footer of both live screens so the layout never shifts.

## Glossary

- **VoiceManager**: The JavaScript class responsible for managing the voice call lifecycle — peer creation, call initiation, answering, muting, and teardown.
- **Sensor_Phone**: The phone placed flat inside the caravan running in Sensor mode (panel `s3`).
- **Display_Phone**: The phone held by the driver outside the caravan running in Display mode (panel `d3`).
- **Voice_Peer**: A PeerJS `Peer` instance created specifically for audio calls, separate from the data `Peer` used for tilt data.
- **Voice_Peer_ID**: The PeerJS peer ID used for voice, following the pattern `levelvan-XXXX-voice-A` or `levelvan-XXXX-voice-B`, where `XXXX` is the 4-digit PIN.
- **PIN**: The 4-digit pairing code stored in `localStorage` under `lv_pin`, shared by both phones.
- **Local_Stream**: The `MediaStream` obtained from `getUserMedia({ audio: true })` on the local device.
- **Remote_Stream**: The `MediaStream` received from the remote peer during an active call.
- **Call_State**: One of four states — `idle`, `calling`, `ringing`, or `connected`.
- **TALK_Button**: The footer button used to initiate or answer a voice call.
- **MUTE_Button**: The footer button used to toggle the local microphone on and off during a call.
- **END_Button**: The footer button used to hang up an active or outgoing call.
- **Voice_Footer_Row**: The row of three voice control buttons (TALK, MUTE, END) fixed inside the `sensor-footer` and `display-footer` elements.
- **Echo_Warning**: A brief dismissible tip shown once per session when a call connects, warning users about audio feedback.
- **Active_Call_Indicator**: A visual element (pulsing ring or colour change on the TALK button) shown while a call is in the `connected` state.

---

## Requirements

### Requirement 1: Voice Peer Initialisation

**User Story:** As a paired Sensor or Display user, I want the voice system to initialise automatically when I enter the live screen, so that I am ready to make or receive calls without extra setup steps.

#### Acceptance Criteria

1. WHEN the Sensor_Phone enters panel `s3`, THE VoiceManager SHALL create a Voice_Peer with ID `levelvan-XXXX-voice-A` where `XXXX` is the current PIN.
2. WHEN the Display_Phone enters panel `d3`, THE VoiceManager SHALL attempt to register Voice_Peer ID `levelvan-XXXX-voice-A`; IF that ID is unavailable, THEN THE VoiceManager SHALL register `levelvan-XXXX-voice-B` instead.
3. WHILE the Voice_Peer is registering, THE VoiceManager SHALL keep the TALK_Button in a disabled state.
4. WHEN the Voice_Peer registration succeeds, THE VoiceManager SHALL enable the TALK_Button.
5. IF the Voice_Peer registration fails with an error other than `unavailable-id`, THEN THE VoiceManager SHALL display a brief error label below the Voice_Footer_Row and retry after 5 seconds.
6. THE VoiceManager SHALL use the same PeerJS host, port, path, and secure settings as the existing data `Peer` (`0.peerjs.com`, port 443, path `/`, secure `true`).

---

### Requirement 2: Microphone Permission

**User Story:** As a user on any platform, I want the app to request microphone access at the right moment, so that I am not surprised by a permission prompt mid-call.

#### Acceptance Criteria

1. WHEN the user taps the TALK_Button for the first time in a session, THE VoiceManager SHALL call `navigator.mediaDevices.getUserMedia({ audio: true })` to request microphone access before initiating or answering a call.
2. IF the user denies microphone permission, THEN THE VoiceManager SHALL display a message reading "Mic access required — check browser settings" below the Voice_Footer_Row and SHALL NOT attempt to place or answer the call.
3. WHEN microphone permission is granted, THE VoiceManager SHALL cache the Local_Stream for the remainder of the session so that subsequent calls do not re-prompt the user.
4. THE VoiceManager SHALL set the audio output of the Remote_Stream to the device speaker by creating an `Audio` element, assigning `srcObject`, and calling `play()`.
5. IF `setSinkId` is available on the audio element, THEN THE VoiceManager SHALL call `setSinkId('speaker')` to prefer the loudspeaker output.

---

### Requirement 3: Call Initiation

**User Story:** As either the Sensor or Display user, I want to tap TALK to start a voice call, so that I can communicate with the other person without leaving the leveling screen.

#### Acceptance Criteria

1. WHEN the user taps TALK_Button and Call_State is `idle`, THE VoiceManager SHALL set Call_State to `calling` and call the partner's Voice_Peer_ID using the Local_Stream.
2. WHEN Call_State is `calling`, THE VoiceManager SHALL update the TALK_Button label to "CALLING…" and apply a pulsing amber style.
3. WHEN the remote peer answers the call, THE VoiceManager SHALL set Call_State to `connected`.
4. IF the outgoing call is not answered within 30 seconds, THEN THE VoiceManager SHALL set Call_State to `idle` and restore the TALK_Button to its default state.
5. THE VoiceManager SHALL determine the partner's Voice_Peer_ID as the opposite role: if the local Voice_Peer_ID ends in `-voice-A`, the partner is `-voice-B`, and vice versa.

---

### Requirement 4: Call Answering

**User Story:** As either the Sensor or Display user, I want to be notified of an incoming call and answer it with one tap, so that I can respond quickly while leveling.

#### Acceptance Criteria

1. WHEN an incoming call arrives and Call_State is `idle`, THE VoiceManager SHALL set Call_State to `ringing` and update the TALK_Button label to "ANSWER" with a pulsing green style.
2. WHEN the user taps TALK_Button and Call_State is `ringing`, THE VoiceManager SHALL answer the call with the Local_Stream and set Call_State to `connected`.
3. IF an incoming call arrives while Call_State is `calling` or `connected`, THEN THE VoiceManager SHALL automatically answer the call and close any existing call first.
4. WHEN Call_State becomes `connected`, THE VoiceManager SHALL play the Remote_Stream through the device speaker.

---

### Requirement 5: Active Call Visual State

**User Story:** As a user with an active voice call, I want the UI to clearly show that a call is live, so that I always know the call is connected without having to listen for audio.

#### Acceptance Criteria

1. WHEN Call_State is `connected`, THE VoiceManager SHALL apply a pulsing green ring animation to the TALK_Button using CSS keyframe animation.
2. WHEN Call_State is `connected`, THE VoiceManager SHALL change the TALK_Button label to "LIVE" and apply the `--accent2` (green) colour scheme.
3. WHEN Call_State returns to `idle`, THE VoiceManager SHALL remove all active-call visual styles and restore the TALK_Button to its default label "TALK".
4. THE Active_Call_Indicator SHALL use the existing `--accent2` CSS variable (`#00ff88`) and SHALL NOT introduce new colour values outside the established design system.
5. WHEN Call_State is `connected`, THE VoiceManager SHALL display a small animated waveform icon adjacent to the TALK_Button to reinforce the live audio state.

---

### Requirement 6: Mute Control

**User Story:** As a user on a voice call, I want to mute my microphone with one tap, so that I can prevent the other person from hearing background noise or echo when I am near the caravan.

#### Acceptance Criteria

1. WHEN the user taps MUTE_Button and the Local_Stream microphone track is enabled, THE VoiceManager SHALL set `track.enabled = false` and update the MUTE_Button to a muted style using the `--danger` (`#ff4444`) colour.
2. WHEN the user taps MUTE_Button and the Local_Stream microphone track is disabled, THE VoiceManager SHALL set `track.enabled = true` and restore the MUTE_Button to its default style.
3. WHILE Call_State is `idle`, THE VoiceManager SHALL keep the MUTE_Button in a disabled, low-opacity state.
4. WHEN Call_State becomes `connected`, THE VoiceManager SHALL enable the MUTE_Button.
5. WHEN a call ends and Call_State returns to `idle`, THE VoiceManager SHALL re-enable the microphone track so the next call starts unmuted.

---

### Requirement 7: Call Termination

**User Story:** As a user on a voice call, I want to tap END to hang up, so that I can stop the call cleanly at any time.

#### Acceptance Criteria

1. WHEN the user taps END_Button and Call_State is `calling`, `ringing`, or `connected`, THE VoiceManager SHALL close the active PeerJS call object and set Call_State to `idle`.
2. WHEN the remote peer ends the call, THE VoiceManager SHALL set Call_State to `idle` and restore all voice button styles to their default state.
3. WHEN Call_State becomes `idle` after a call ends, THE VoiceManager SHALL NOT stop the Local_Stream — the microphone track SHALL remain available for the next call without re-prompting.
4. WHILE Call_State is `idle`, THE VoiceManager SHALL keep the END_Button in a disabled, low-opacity state.

---

### Requirement 8: Echo Warning

**User Story:** As a user who has just connected a voice call, I want to see a brief echo warning, so that I know to use the mute button when both phones are near each other.

#### Acceptance Criteria

1. WHEN Call_State first becomes `connected` in a session, THE VoiceManager SHALL display the Echo_Warning message: "📢 Echo? Mute when phones are close together."
2. THE Echo_Warning SHALL appear as an overlay or banner within the footer area and SHALL NOT obscure the leveling data.
3. WHEN the user taps anywhere on the Echo_Warning, THE VoiceManager SHALL dismiss it immediately.
4. THE Echo_Warning SHALL auto-dismiss after 6 seconds if the user does not interact with it.
5. THE VoiceManager SHALL show the Echo_Warning at most once per browser session (using a `sessionStorage` flag), so it does not reappear on subsequent calls within the same session.

---

### Requirement 9: Footer Layout and Visibility

**User Story:** As a user on the live leveling screen, I want the voice buttons to be fixed in the footer without shifting any existing content, so that the leveling data is always visible and the layout is stable.

#### Acceptance Criteria

1. THE Voice_Footer_Row SHALL be rendered as a child element inside both `sensor-footer` and `display-footer`, below the existing angle and bar rows.
2. WHEN panel `s3` is active, THE VoiceManager SHALL show the Voice_Footer_Row in `sensor-footer`.
3. WHEN panel `d3` is active, THE VoiceManager SHALL show the Voice_Footer_Row in `display-footer`.
4. WHEN Solo mode is active (mode is `solo`), THE VoiceManager SHALL NOT render or show the Voice_Footer_Row.
5. THE Voice_Footer_Row SHALL have a fixed height of 56px and SHALL NOT change height when Call_State changes, so that no layout shift occurs.
6. THE Voice_Footer_Row SHALL use the Orbitron font for button labels, consistent with the existing design system.
7. THE TALK_Button, MUTE_Button, and END_Button SHALL each occupy equal width within the Voice_Footer_Row using CSS flexbox.

---

### Requirement 10: Auto-Reconnect After Data Connection Drop

**User Story:** As a user with an active voice call, I want the voice call to survive a data connection drop and reconnect, so that I do not have to manually restart the call when the leveling data reconnects.

#### Acceptance Criteria

1. WHEN the data connection drops and Call_State is `connected`, THE VoiceManager SHALL keep the Local_Stream active and retain the `connected` visual state for up to 10 seconds while attempting to re-establish the voice call.
2. WHEN the data connection reconnects (panel `d3` or `s3` re-enters active state), THE VoiceManager SHALL automatically attempt to re-initiate the voice call using the existing Local_Stream.
3. IF the voice call cannot be re-established within 10 seconds of the data reconnect, THEN THE VoiceManager SHALL set Call_State to `idle` and allow the user to manually restart the call.
4. WHEN the user navigates away from the live screen (goHome is called), THE VoiceManager SHALL close the active call, destroy the Voice_Peer, and stop all Local_Stream tracks.

---

### Requirement 11: Voice Button Styling

**User Story:** As a user, I want the voice buttons to look like they belong in LevelVan, so that the feature feels native and not bolted on.

#### Acceptance Criteria

1. THE TALK_Button SHALL use the `--accent2` (`#00ff88`) colour scheme in its default idle state, consistent with the green "connected" aesthetic of the app.
2. THE MUTE_Button SHALL use the `--dim` (`#7a9fc8`) colour scheme in its default unmuted state.
3. THE END_Button SHALL use the `--danger` (`#ff4444`) colour scheme at all times.
4. ALL three voice buttons SHALL use `border-radius: 12px`, `font-family: 'Orbitron'`, and `font-size: 0.7rem` for label text.
5. ALL three voice buttons SHALL have a `touch-action: manipulation` style to prevent double-tap zoom on mobile.
6. WHEN a button is in a disabled state, THE VoiceManager SHALL apply `opacity: 0.3` and `pointer-events: none` to that button.
