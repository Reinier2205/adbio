const bingoItems = [
    "An old photo with Anneke",
    "A photo from a past birthday or braai",
    "The oldest selfie you have together",
    "A photo that shows where your friendship began",
    "A photo from a time you both looked too young to drink beer",
    "Anneke walking barefoot (bonus: dirty feet)",
    "Anneke drinking beer (bonus: a cheers moment)",
    "Someone borrowing something from Anneke",
    "Oliver riding his bike",
    "Oliver dunking something in tea",
    "Oliver playing ball with someone",
    "The baby with a new “aunt” or “uncle”",
    "Everyone gathered around the fire",
    "A sunrise or sunset over camp",
    "Someone cooking or braaing",
    "Anneke reading a book in peace",
    "Morning coffee in a mug that’s clearly been used too many times",
    "Oliver “helping” with something",
    "A creative photo of everyone together",
    "Someone caught mid-laugh",
    "A barefoot photo competition (yours vs Anneke’s)",
    "Someone “borrowing” Anneke’s beer",
    "A photo that proves you’re having more fun than planned",
    "A photo that shows the “spirit of the weekend”",
    "Your favorite memory moment — real or recreated"
  ];
  
  const grid = document.getElementById('bingoGrid');
  const playerInput = document.getElementById('player');
  
  function renderGrid() {
    grid.innerHTML = '';
    bingoItems.forEach((item, idx) => {
      const div = document.createElement('div');
      div.className = 'square';
      div.dataset.id = idx;
      div.innerHTML = `<span>${item}</span><br><input type="file" style="margin-top:5px;">`;
      grid.appendChild(div);
  
      const fileInput = div.querySelector('input');
      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const player = playerInput.value.trim();
        if (!player) { alert("Enter your name first!"); return; }
  
        const formData = new FormData();
        formData.append('file', file);
        formData.append('player', player);
        formData.append('square', idx);
  
        const res = await fetch('/worker', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.url) {
          div.innerHTML = `<img src="${data.url}"><br>${item}`;
          checkBingo();
        }
      });
    });
  }
  
  function checkBingo() {
    const squares = document.querySelectorAll('.square');
    let completed = 0;
    squares.forEach(sq => { if (sq.querySelector('img')) completed++; });
    if (completed === squares.length) alert("🎉 BINGO! All photos uploaded!");
  }
  
  renderGrid();
  