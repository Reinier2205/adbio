---
inclusion: fileMatch
fileMatchPattern: ['TravelGames/**/*.html', 'TravelGames/**/*.js', 'TravelGames/**/*.css']
---

# Travel Games — Master Standards

All game files in `/TravelGames/` (every `.html`, `.js`, and `.css` file, at any depth) must comply with every section below. The hub page (`index.html`) is exempt from the game-specific checks (dice, multiplayer) but must still include the casino palette and navigation structure. Apply these standards when building new games or auditing existing ones.

---

## 1. Navigation Buttons

Every game page must have exactly these two buttons **inside `.casino-table`**:

```html
<!-- Home button — top-left, links to hub -->
<button class="nav-btn home-btn" onclick="location.href='/TravelGames/index.html'" title="Home">🏠</button>

<!-- Help button — top-right, opens help modal -->
<button class="nav-btn help-btn" onclick="document.getElementById('help-modal').style.display='flex'" title="Help">?</button>
```

```css
.nav-btn {
  position: absolute;
  top: 12px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid #111;
  box-shadow: 0 4px 0 #111;
  cursor: pointer;
  font-size: 1.1rem;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  transition: transform 0.1s, box-shadow 0.1s;
}
.home-btn { left: 12px;  background: radial-gradient(circle, var(--gold-light), var(--gold)); color: #111; }
.help-btn { right: 12px; background: radial-gradient(circle, var(--gold-light), var(--gold)); color: #111; }
.nav-btn:active { transform: translateY(2px); box-shadow: 0 2px 0 #111; }
```

**Checklist:**
- [ ] Home button present, top-left, links to `/TravelGames/index.html`
- [ ] Help button present, top-right, opens `#help-modal`
- [ ] Both use `.nav-btn` with gold gradient and active press effect

---

## 2. Visual Theme — Casino Palette

### CSS Custom Properties

Define in `:root`. **Never hardcode these values elsewhere.**

```css
:root {
  --felt-green: #0a4821;
  --dark-wood:  #2a1a1f;
  --gold:       #d4af37;
  --gold-light: #ffd700;
  --light-gold: #fff8e1;
  --teal:       #008080;
  --maroon:     #800000;
  --pip-color:  #fff8e1;
}
```

### Typography

| Role             | Font              |
|------------------|-------------------|
| Titles/headings  | `'Cinzel'`, serif, weight 700 |
| Body text        | `'Lato'`, sans-serif |
| Buttons/inputs   | `'Inter'`, sans-serif |

```html
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Lato&family=Inter&display=swap" rel="stylesheet">
```

### Casino Table Container

```css
.casino-table {
  background: var(--felt-green);
  border: 10px solid #4a2c2a;
  box-shadow: 0 0 0 5px var(--gold);
  border-radius: 15px;
  position: relative;
}
```

### Modals

```css
.modal-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.85);
  z-index: 1000;
  align-items: center;
  justify-content: center;
}
.modal-panel {
  background: linear-gradient(160deg, #3e1e24, #2a1a1f);
  border: 3px solid var(--gold);
  border-radius: 12px;
  padding: 1.5rem;
  max-width: 420px;
  width: 90%;
  animation: modalIn 0.25s ease;
}
@keyframes modalIn {
  from { opacity: 0; transform: scale(0.7); }
  to   { opacity: 1; transform: scale(1); }
}
```

### General Buttons

```css
.btn {
  font-family: 'Inter', sans-serif;
  border-radius: 8px;
  box-shadow: 0 4px 0 #111;
  border: none;
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.1s;
}
.btn:active { transform: translateY(3px); box-shadow: 0 1px 0 #111; }
```

### Tiles / Cards

- `border-radius`: 6px–10px
- Gaps: `clamp(0.4rem, 1vw, 0.5rem)`
- Vertical tiles: `aspect-ratio: 1/2`

---

## 3. 3D CSS Dice — Canonical Implementation

**All games using dice must use this implementation.** Never use flat emoji (🎲), images, or 2D canvas dice.

### Colour Semantics

- **Teal** (`.die--teal`) — opening / positive actions
- **Maroon** (`.die--maroon`) — shutting / negative actions
- Pips use `var(--pip-color)` with `box-shadow` for depth

### HTML Structure (one die)

```html
<div class="die-scene">
  <div class="die die--teal" id="die1" data-face="1">
    <div class="face front">  <!-- face 1 --> <span class="pip center"></span> </div>
    <div class="face back">   <!-- face 6 --> <span class="pip tl"></span><span class="pip tr"></span><span class="pip ml"></span><span class="pip mr"></span><span class="pip bl"></span><span class="pip br"></span> </div>
    <div class="face right">  <!-- face 2 --> <span class="pip tr"></span><span class="pip bl"></span> </div>
    <div class="face left">   <!-- face 5 --> <span class="pip tl"></span><span class="pip tr"></span><span class="pip center"></span><span class="pip bl"></span><span class="pip br"></span> </div>
    <div class="face top">    <!-- face 3 --> <span class="pip tl"></span><span class="pip center"></span><span class="pip br"></span> </div>
    <div class="face bottom"> <!-- face 4 --> <span class="pip tl"></span><span class="pip tr"></span><span class="pip bl"></span><span class="pip br"></span> </div>
  </div>
</div>
```

### CSS

```css
.die-scene {
  width: 52px; height: 52px;
  perspective: 200px;
  cursor: pointer;
  display: inline-block;
}
.die {
  width: 100%; height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.6s ease;
}

/* Face rotations */
.face {
  position: absolute; width: 52px; height: 52px;
  border-radius: 8px; border: 2px solid rgba(0,0,0,0.4);
  display: grid; grid-template-columns: 1fr 1fr 1fr; grid-template-rows: 1fr 1fr 1fr;
  padding: 6px; box-sizing: border-box; backface-visibility: hidden;
}
.face.front  { transform: rotateY(  0deg) translateZ(26px); }
.face.back   { transform: rotateY(180deg) translateZ(26px); }
.face.right  { transform: rotateY( 90deg) translateZ(26px); }
.face.left   { transform: rotateY(-90deg) translateZ(26px); }
.face.top    { transform: rotateX( 90deg) translateZ(26px); }
.face.bottom { transform: rotateX(-90deg) translateZ(26px); }

/* Die colours */
.die--teal .face   { background: radial-gradient(circle at 35% 35%, #00b3b3, var(--teal));   box-shadow: inset 0 0 10px rgba(0,0,0,0.4); }
.die--maroon .face { background: radial-gradient(circle at 35% 35%, #b30000, var(--maroon)); box-shadow: inset 0 0 10px rgba(0,0,0,0.4); }

/* Pips */
.pip {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--pip-color); box-shadow: 0 1px 2px rgba(0,0,0,0.5);
  align-self: center; justify-self: center;
}
.pip.tl { grid-area: 1/1; } .pip.tc { grid-area: 1/2; } .pip.tr { grid-area: 1/3; }
.pip.ml { grid-area: 2/1; } .pip.center { grid-area: 2/2; } .pip.mr { grid-area: 2/3; }
.pip.bl { grid-area: 3/1; } .pip.bc { grid-area: 3/2; } .pip.br { grid-area: 3/3; }

/* Roll animation */
@keyframes dieRoll {
  0%   { transform: var(--face-transform) rotateX(0deg)   rotateZ(0deg); }
  25%  { transform: rotateX(360deg) rotateY(180deg) rotateZ(90deg); }
  50%  { transform: rotateX(180deg) rotateY(360deg) rotateZ(180deg); }
  75%  { transform: rotateX(90deg)  rotateY(270deg) rotateZ(270deg); }
  100% { transform: var(--face-transform); }
}
.die.rolling { animation: dieRoll 0.6s ease-in-out; }
```

### JavaScript — Face Transforms & Roll Logic

```js
// Maps die value 1–6 to the CSS 3D rotation that puts that face forward
const FACE_TRANSFORMS = {
  1: 'rotateY(0deg)',
  6: 'rotateY(180deg)',
  2: 'rotateY(-90deg)',
  5: 'rotateY(90deg)',
  3: 'rotateX(-90deg)',
  4: 'rotateX(90deg)'
};

/**
 * Roll a single die element to show a target value (1–6).
 * @param {HTMLElement} dieEl - the .die div
 * @param {number} value      - target face (1–6)
 * @param {number} delay      - ms before starting (for staggered multi-dice)
 */
function rollDie(dieEl, value, delay = 0) {
  setTimeout(() => {
    const transform = FACE_TRANSFORMS[value];
    dieEl.style.setProperty('--face-transform', transform);
    dieEl.classList.remove('rolling');
    void dieEl.offsetWidth; // force reflow
    dieEl.classList.add('rolling');
    dieEl.addEventListener('animationend', () => {
      dieEl.style.transform = transform;
      dieEl.classList.remove('rolling');
    }, { once: true });
  }, delay);
}

// Roll multiple dice with 80ms stagger
function rollAllDice(results) {
  results.forEach((val, i) => {
    rollDie(document.querySelectorAll('.die')[i], val, i * 80);
  });
}
```

**Checklist:**
- [ ] No flat emoji dice (🎲) used as the primary die visual
- [ ] No 2D canvas or image-based dice
- [ ] `.die-scene` + `.die` + six `.face` elements present per die
- [ ] Teal or maroon colour applied via `.die--teal` / `.die--maroon`
- [ ] Roll uses `dieRoll` keyframe animation (not just a number swap)
- [ ] Pips use `var(--pip-color)` with shadow

---

## 4. Disney-Themed Multiplayer Characters

All multiplayer games use this exact roster. **Never invent new characters or use generic avatars.**

```js
const CHARACTERS = [
  { name: 'Mickey', icon: '🐭' },
  { name: 'Minnie', icon: '🎀' },
  { name: 'Donald', icon: '🦆' },
  { name: 'Daisy',  icon: '🌸' },
  { name: 'Goofy',  icon: '🐶' },
  { name: 'Pluto',  icon: '🦴' },
  { name: 'Simba',  icon: '🦁' },
  { name: 'Stitch', icon: '👽' },
  { name: 'Woody',  icon: '🤠' },
  { name: 'Buzz',   icon: '🚀' },
];
```

Characters are chosen in the lobby. The host picks first; guests pick from the remaining pool (taken names are greyed out).

---

## 5. Peer-to-Peer Multiplayer — PeerJS PIN Architecture

### Technology Stack

- **PeerJS 1.5.4** — WebRTC wrapper via CDN
- **Host-authority model** — host owns all game state; guests are thin clients
- **4-digit PIN** — maps to predictable PeerJS peer IDs
- **Local WiFi** — relay used only for initial handshake

```html
<script src="https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js"></script>
<script src="lcr-multiplayer.js"></script>
```

### Required Mode Variables

```js
let mpMode = 'single';   // 'single' | 'host' | 'guest'
let mpHost  = null;
let mpGuest = null;
let myPlayerIndex = null;
```

### On Load — Mode Selection

```js
window.onload = () => {
  const hashPin = location.hash.match(/^#LCP:(\d{4})$/)?.[1];
  if (hashPin) { _startGuestFlow(hashPin); return; }

  LCRMultiplayer.UI.showModeSelectionThree(
    () => { mpMode = 'single'; initGame(); },
    () => _startHostFlow(),
    () => _startGuestFlow(null)
  );
};
```

### Game Adapter — Required Interface

```js
function _buildGameAdapter() {
  return {
    getState()                { /* return full serialisable state incl. turnIndex */ },
    applyState(state)         { /* restore state + call updateUI() + _updateTurnUI() */ },
    executeRoll()             { /* host-only: run dice logic, return getState() */ },
    executeTarget(data, mode) { /* host-only: handle actions, return getState() */ },
    handleDisconnect(idx)     { /* remove player, return getState() */ },
    onAssigned(idx)           { myPlayerIndex = idx; },
    onHostDisconnected()      { LCRMultiplayer.UI.showHostDisconnected(); }
  };
}
```

### Host Flow

```js
async function _startHostFlow() {
  mpMode = 'host'; myPlayerIndex = 0;
  const adapter = _buildGameAdapter();
  mpHost = new LCRMultiplayer.MultiplayerHost(adapter, MAX_PLAYERS);
  try { await mpHost.open(); } catch(e) {
    LCRMultiplayer.UI.showToast('Could not connect — check your internet');
    mpMode = 'single'; initGame(); return;
  }
  _showHostCharacterPicker();
}
```

### Guest Flow

```js
async function _startGuestFlow(pin) {
  mpMode = 'guest';
  const adapter = _buildGameAdapter();
  mpGuest = new LCRMultiplayer.MultiplayerGuest(adapter);
  const pinUI = LCRMultiplayer.UI.showGuestPinEntry({
    prefillPin: pin || '',
    onConnect: async (p) => {
      try { await mpGuest.connect(p); pinUI.remove(); _showGuestCharacterPicker(); }
      catch(e) { pinUI.showError('Host not found — check PIN'); }
    },
    onBack: () => { pinUI.remove(); location.reload(); }
  });
}
```

### Action Routing Pattern

**Always check `mpMode` before executing any game action.**

```js
function handleRoll() {
  if (mpMode === 'guest') { mpGuest.sendAction({ type: 'roll' }); return; }
  if (mpMode === 'host') {
    const s = mpHost.gameAdapter.executeRoll();
    mpHost.broadcastState(s);
    if (mpHost.onStateChange) mpHost.onStateChange(s);
    return;
  }
  _executeLocalRoll(); // single-device only
}
```

### Turn UI

```js
function _updateTurnUI() {
  if (mpMode === 'single') return;
  const isMine = myPlayerIndex === turnIndex;
  document.querySelectorAll('.action-btn').forEach(b => b.disabled = !isMine);
  document.getElementById('lcr-mp-spectator-banner')?.remove();
  document.getElementById('lcr-mp-active-banner')?.remove();
  if (isMine) LCRMultiplayer.UI.showActiveTurnBanner();
  else LCRMultiplayer.UI.showSpectatorBanner(players[turnIndex]?.name);
}
```

### Persistent PIN Display (host only)

```js
function _showGamePin(pin) {
  document.getElementById('lcr-game-pin')?.remove();
  const el = document.createElement('div');
  el.id = 'lcr-game-pin';
  el.style.cssText = 'position:fixed;top:8px;right:52px;background:rgba(0,0,0,0.75);border:1px solid #d4af37;border-radius:8px;padding:4px 10px;font-family:Cinzel,serif;font-size:0.65rem;color:#ffd700;z-index:500;pointer-events:none;letter-spacing:0.1em';
  el.textContent = `PIN: ${pin}`;
  document.body.appendChild(el);
}
```

### Player Count Constants

| Game type        | `MAX_PLAYERS` |
|------------------|---------------|
| 2-player duel    | 2             |
| Small party game | 4–6           |
| Large party (LCR)| 10            |

**Checklist:**
- [ ] Disney character roster matches `CHARACTERS` array above
- [ ] Mode variables declared (`mpMode`, `mpHost`, `mpGuest`, `myPlayerIndex`)
- [ ] Hash PIN auto-join (`#LCP:XXXX`) implemented on page load
- [ ] All action handlers check `mpMode` before executing
- [ ] Host delegates to `gameAdapter.executeRoll()` / `executeTarget()` — no duplicated logic
- [ ] `mpHost.broadcastState()` called after every host state change
- [ ] `_updateTurnUI()` called inside `applyState()` and after every local state change
- [ ] `MAX_PLAYERS` set correctly for the specific game
- [ ] Persistent PIN badge shown during gameplay

---

## 6. Quick Reference

### Building a New Game

1. Add CSS variables + `.casino-table` from §2
2. Add home + help buttons from §1
3. Add 3D dice from §3 *(only if the game uses dice)*
4. Add Disney characters from §4 *(only if multiplayer)*
5. Wire multiplayer from §5 *(only if multiplayer)*
6. Include a `#help-modal` with game-specific rules

### Auditing an Existing Game

Check every item in the checklists in §1, §3, and §5. Output a list of issues found, then output the corrected full HTML.

### Common Fixes

| Symptom                      | Fix |
|------------------------------|-----|
| No home/help buttons         | Add `.nav-btn` pair from §1 |
| Flat emoji or 2D dice        | Replace with 3D `.die-scene` from §3 |
| Generic avatars in lobby     | Replace with `CHARACTERS` array from §4 |
| Dice don't animate on roll   | Add `dieRoll` keyframe + `rollDie()` from §3 |
| Guest can act out of turn    | Ensure `_updateTurnUI()` disables buttons |
| Host logic duplicated        | Move logic into `gameAdapter.executeRoll()` |
| PIN not shown in game        | Add `_showGamePin()` after deal-in |
