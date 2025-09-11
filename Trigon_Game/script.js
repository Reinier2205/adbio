document.addEventListener('DOMContentLoaded', () => {
  // Config
  const N = 4;          // side length
  const SIZE = 80;      // hex radius (px)

  // CSS vars
  const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const playerColors = [cssVar('--player1-color'), cssVar('--player2-color'), cssVar('--player3-color')];
  const players = [{id:0, name:'Player X'}, {id:1, name:'Player O'}, {id:2, name:'Player Δ'}];

  // DOM
  const svg = document.getElementById('board');
  const statusEl = document.getElementById('game-status');
  const moveHistoryEl = document.getElementById('move-history');
  const playerCards = [document.getElementById('playerCard0'), document.getElementById('playerCard1'), document.getElementById('playerCard2')];
  const playerNameEls = [document.getElementById('pname0'), document.getElementById('pname1'), document.getElementById('pname2')];
  const playerWinsEls = [document.getElementById('pw0'), document.getElementById('pw1'), document.getElementById('pw2')];
  const btnNewRound = document.getElementById('btn-new-round');
  const btnNewGame = document.getElementById('btn-new-game');
  const btnUndo = document.getElementById('btn-undo');
  const timerDisplayEl = document.getElementById('timer-display');
  const editIcons = document.querySelectorAll('.edit-name-icon');
  const fireworksContainerEl = document.getElementById('fireworks-container');

  // Timer variables
  const turnDuration = 10; // seconds
  let timeLeft = turnDuration;
  let timerInterval;

  // Axial helpers (flat-top)
  const radius = N - 1;
  function axialToPixel(q, r){
    const x = SIZE * 1.5 * q;
    const y = SIZE * (Math.sqrt(3) * (r + q/2));
    return [x, y];
  }
  function key(q,r){ return `${q},${r}`; }

  // Build axial coords of hex of radius (N-1)
  const axial = [];
  for(let q=-radius; q<=radius; q++){
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for(let r=r1; r<=r2; r++) axial.push([q,r]);
  }

  // compute viewBox to fit board
  const centers = axial.map(([q,r]) => axialToPixel(q,r));
  const minX = Math.min(...centers.map(c=>c[0])) - SIZE;
  const maxX = Math.max(...centers.map(c=>c[0])) + SIZE;
  const minY = Math.min(...centers.map(c=>c[1])) - SIZE;
  const maxY = Math.max(...centers.map(c=>c[1])) + SIZE;
  svg.setAttribute('viewBox', `${minX} ${minY} ${maxX-minX} ${maxY-minY}`);
  //svg.setAttribute('width', Math.min(640, maxX-minX)); // Remove this line to allow full responsiveness
  svg.style.aspectRatio = `${(maxX-minX)/(maxY-minY)}`;

  // SVG helpers
  const NS = 'http://www.w3.org/2000/svg';
  const create = (tag, attrs={}) => {
    const el = document.createElementNS(NS, tag);
    for(const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  };
  function hexPoints(cx, cy, s){
    const pts = [];
    for(let k=0;k<6;k++){
      const ang = Math.PI/180*(60*k);
      pts.push(`${cx + s*Math.cos(ang)},${cy + s*Math.sin(ang)}`);
    }
    return pts.join(' ');
  }
  function triPoints(R){
    // Equilateral triangle pointing upwards, centered at (0,0) with circumradius R
    const p1_x = 0;
    const p1_y = -R;
    const p2_x = -R * Math.sqrt(3) / 2;
    const p2_y = R / 2;
    const p3_x = R * Math.sqrt(3) / 2;
    const p3_y = R / 2;
    return `${p1_x},${p1_y} ${p2_x},${p2_y} ${p3_x},${p3_y}`;
  }

  // defs gradient for cells
  const defs = create('defs');
  const grad = create('radialGradient', { id:'cellGrad', cx:'50%', cy:'40%', r:'70%' });
  grad.appendChild(create('stop', { offset:'0%', 'stop-color':'#0f5a2c' }));
  grad.appendChild(create('stop', { offset:'100%', 'stop-color':'#0a4821' }));
  defs.appendChild(grad);
  svg.appendChild(defs);

  // State
  const cells = new Map(); // key -> {q,r,g,poly,pieceGroup,owner}
  let currentPlayer = 0;
  let moveHistory = [];
  let wins = [0,0,0];
  let gameActive = true; // Flag to control game activity

  // Draw board
  for(const [q,r] of axial){
    const [cx,cy] = axialToPixel(q,r);
    const g = create('g', { class:'hex', 'data-q':String(q), 'data-r':String(r) });
    const poly = create('polygon', { points: hexPoints(cx,cy,SIZE), fill:'url(#cellGrad)' });
    const piece = create('g', { class:'piece', transform:`translate(${cx},${cy})` });
    g.appendChild(poly);
    g.appendChild(piece);
    svg.appendChild(g);

    g.addEventListener('click', () => onCellClick(q,r));

    cells.set(key(q,r), { q, r, g, poly, pieceGroup:piece, owner:null });
  }

  // UI helpers
  function setActivePlayer(idx){
    playerCards.forEach((card,i)=>card.classList.toggle('active', i===idx));
    statusEl.innerHTML = `${playerNameEls[idx].textContent}'s turn <span id="timer-display">${timeLeft}</span>`;
    startTimer(); // Start timer for the new active player
  }
  function updateMoveHistory(){
    moveHistoryEl.innerHTML = '';
    for(const mv of moveHistory){
      const dot = document.createElement('div');
      dot.className = 'history-dot ' + (mv.player===0?'x':mv.player===1?'o':'delta');
      moveHistoryEl.appendChild(dot);
    }
  }

  // Draw a piece into a pieceGroup at its local origin
  function drawPiece(group, playerId){
    group.replaceChildren();
    const color = playerColors[playerId];
    if(playerId === 0){
      const l1 = create('line', { x1:-SIZE*0.45, y1:-SIZE*0.45, x2:SIZE*0.45, y2:SIZE*0.45, stroke:color, 'stroke-width':6, 'stroke-linecap':'round' });
      const l2 = create('line', { x1:SIZE*0.45, y1:-SIZE*0.45, x2:-SIZE*0.45, y2:SIZE*0.45, stroke:color, 'stroke-width':6, 'stroke-linecap':'round' });
      group.appendChild(l1); group.appendChild(l2);
    } else if(playerId === 1){
      const c = create('circle', { cx:0, cy:0, r:SIZE*0.42, fill:'none', stroke:color, 'stroke-width':6 });
      group.appendChild(c);
    } else {
      // equilateral filled triangle
      const tri = create('polygon', { points: triPoints(SIZE * 0.5), fill: color });
      group.appendChild(tri);
    }
  }

  // Click handler
  function onCellClick(q,r){
    if (!gameActive) return; // Only allow clicks if game is active

    const k = key(q,r);
    const cell = cells.get(k);
    if(!cell || cell.owner !== null) return;

    // Calculate empty cells
    const emptyCells = cells.size - moveHistory.length;

    // If only 6 empty cells left and there are moves in history, remove the oldest move
    if (emptyCells === 6 && moveHistory.length > 0) {
      const oldestMove = moveHistory.shift(); // Remove from history
      const oldestCell = cells.get(key(oldestMove.q, oldestMove.r));
      if (oldestCell) {
        oldestCell.owner = null;
        oldestCell.pieceGroup.replaceChildren(); // Remove piece visually
      }
    }

    cell.owner = currentPlayer;
    drawPiece(cell.pieceGroup, currentPlayer);
    moveHistory.push({ q, r, player: currentPlayer });
    updateMoveHistory();

    if (checkWin(q, r, currentPlayer)) {
      wins[currentPlayer]++;
      playerWinsEls[currentPlayer].textContent = wins[currentPlayer];
      statusEl.innerHTML = `${playerNameEls[currentPlayer].textContent} wins!`; // No timer needed on win
      gameActive = false; // Disable further moves
      clearInterval(timerInterval); // Stop timer on win
      showFireworks(playerColors[currentPlayer]); // Show fireworks on win
      return;
    }

    currentPlayer = (currentPlayer + 1) % players.length;
    setActivePlayer(currentPlayer);
    startTimer(); // Restart timer for the next player after a valid move
  }

  function checkWin(q, r, player) {
    const directions = [
      [[1, 0], [-1, 0]], // q-axis
      [[0, 1], [0, -1]], // r-axis
      [[1, -1], [-1, 1]] // s-axis (q+r+s=0)
    ];

    const N_WIN = N; // Number of pieces in a row to win

    for (const [dir1, dir2] of directions) {
      let count = 1;
      // Check in first direction
      for (let i = 1; i < N_WIN; i++) {
        const nq = q + dir1[0] * i;
        const nr = r + dir1[1] * i;
        const cell = cells.get(key(nq, nr));
        if (cell && cell.owner === player) {
          count++;
        } else {
          break;
        }
      }
      // Check in second direction
      for (let i = 1; i < N_WIN; i++) {
        const nq = q + dir2[0] * i;
        const nr = r + dir2[1] * i;
        const cell = cells.get(key(nq, nr));
        if (cell && cell.owner === player) {
          count++;
        } else {
          break;
        }
      }

      if (count >= N_WIN) {
        return true; // Win condition met
      }
    }
    return false; // No win
  }

  // Fireworks function
  function showFireworks(color) {
    const numParticles = 50;
    for (let i = 0; i < numParticles; i++) {
      const firework = document.createElement('div');
      firework.className = 'firework';
      firework.style.backgroundColor = color;

      const angle = Math.random() * Math.PI * 2;
      const velocity = Math.random() * 200 + 100;
      const startX = window.innerWidth / 2 + (Math.random() - 0.5) * 300;
      const startY = window.innerHeight / 2 + (Math.random() - 0.5) * 300;

      firework.style.left = `${startX}px`;
      firework.style.top = `${startY}px`;

      firework.animate([
        { transform: `translate(0, 0)`, opacity: 1 },
        { transform: `translate(${endX - startX}px, ${endY - startY}px)`, opacity: 0 }
      ], {
        duration: 1500,
        easing: 'ease-out',
        fill: 'forwards'
      });

      fireworksContainerEl.appendChild(firework);

      firework.addEventListener('animationend', () => {
        firework.remove();
      });
    }
  }

  // Timer functions
  function startTimer() {
    clearInterval(timerInterval); // Clear any existing timer
    timeLeft = turnDuration;
    updateStatusAndTimer();

    timerInterval = setInterval(() => {
      timeLeft--;
      updateStatusAndTimer();

      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        handleTimeExpired();
      }
    }, 1000);
  }

  function updateStatusAndTimer() {
    const currentPlayerName = playerNameEls[currentPlayer].textContent;
    statusEl.innerHTML = `${currentPlayerName}'s turn <span id="timer-display">${timeLeft}</span>`;
  }

  function handleTimeExpired() {
    statusEl.innerHTML = `${playerNameEls[currentPlayer].textContent} forfeited turn!`;
    gameActive = true; // Ensure game is active to make a move

    const emptyCells = Array.from(cells.values()).filter(cell => cell.owner === null);
    if (emptyCells.length > 0) {
      const randomIndex = Math.floor(Math.random() * emptyCells.length);
      const randomCell = emptyCells[randomIndex];

      // Simulate a move for the current player
      randomCell.owner = currentPlayer;
      drawPiece(randomCell.pieceGroup, currentPlayer);
      moveHistory.push({ q: randomCell.q, r: randomCell.r, player: currentPlayer });
      updateMoveHistory();

      // Check for win after forced move
      if (checkWin(randomCell.q, randomCell.r, currentPlayer)) {
        wins[currentPlayer]++;
        playerWinsEls[currentPlayer].textContent = wins[currentPlayer];
        statusEl.innerHTML = `${playerNameEls[currentPlayer].textContent} wins!`; // No timer needed on win
        gameActive = false;
        clearInterval(timerInterval);
        showFireworks(playerColors[currentPlayer]); // Show fireworks on forfeit win
        return;
      }
    }

    // Move to the next player
    currentPlayer = (currentPlayer + 1) % players.length;
    setActivePlayer(currentPlayer);
    startTimer();
  }

  // Undo function
  function undoLastMove() {
    if (moveHistory.length === 0) return; // Nothing to undo
    if (!gameActive) { // If game just ended due to a win, allow undo and resume game
      gameActive = true;
      // Optionally, revert win display (statusEl) if needed
    }

    const lastMove = moveHistory.pop(); // Remove last move from history
    const { q, r, player: lastPlayer } = lastMove;

    const cell = cells.get(key(q, r));
    if (cell) {
      cell.owner = null; // Clear owner
      cell.pieceGroup.replaceChildren(); // Remove piece visually
      cell.g.classList.remove('win'); // Remove win highlight if it was part of a win
    }

    // Rotate current player back
    currentPlayer = lastPlayer;
    setActivePlayer(currentPlayer);
    updateMoveHistory();
  }

  function editName(playerIndex) {
    const nameEl = playerNameEls[playerIndex];
    const parent = nameEl.parentElement;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = ''; // Make the input box empty
    input.className = 'player-name-input';
    
    parent.replaceChild(input, nameEl);
    input.focus();
    
    const saveName = () => {
        const newName = input.value.trim() || `Player ${playerIndex === 0 ? 'X' : (playerIndex === 1 ? 'O' : 'Δ')}`;
        players[playerIndex].name = newName; // Update player name in the array
        nameEl.textContent = newName;
        parent.replaceChild(nameEl, input);

        if (currentPlayer === playerIndex && gameActive) {
           setActivePlayer(currentPlayer); // Update status if current player's name is edited
        }
    };
    
    input.addEventListener('blur', saveName);
    input.addEventListener('keydown', (e) => { 
        if (e.key === 'Enter') {
            input.blur();
        }
    });
  }

  // Round / Game
  function clearBoard(){
    for(const c of cells.values()){
      c.owner = null;
      c.pieceGroup.replaceChildren();
      c.g.classList.remove('win');
    }
    moveHistory = [];
    updateMoveHistory();
    gameActive = true; // Re-enable game
    clearInterval(timerInterval); // Clear timer when board is cleared
  }
  btnNewRound.addEventListener('click', () => {
    clearBoard();
    currentPlayer = (currentPlayer + 1) % players.length; // rotate starter
    setActivePlayer(currentPlayer);
    startTimer();
  });
  btnNewGame.addEventListener('click', () => {
    wins = [0,0,0];
    playerWinsEls.forEach((el,i)=>el.textContent = wins[i]);
    clearBoard();
    currentPlayer = 0;
    setActivePlayer(currentPlayer);
    startTimer();
  });

  btnUndo.addEventListener('click', undoLastMove);
  editIcons.forEach((icon, index) => {
    icon.addEventListener('click', () => editName(index));
    icon.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        editName(index);
      }
    });
  });

  // init
  setActivePlayer(0);
  startTimer(); // Start the timer on initial load
});

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch(err => {
        console.log('ServiceWorker registration failed: ', err);
      });
  });
}
