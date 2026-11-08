---
inclusion: auto
name: travelgames-new-app
description: Use when a new HTML app or game is created in the TravelGames folder, or when the user asks to add a new entry to TravelGames/index.html.
---

# TravelGames Index Update Instructions

When a new `.html` file is created in `TravelGames/` (other than `index.html`), automatically add a card for it in `TravelGames/index.html`.

## Section Placement Rules

Choose the correct section based on what the app does:

- **Games** (`id="games"`) — dice, cards, board games, strategy, competitive play (e.g. Yatzy, Perudo, Number Chain)
- **Tools** (`id="tools"`) — practical travel utilities: timers, speed monitors, leveling tools, LED displays, calculators, recipe managers, price comparators (e.g. SpeedSentry, BraaiTyd, LED Banner, LevelVan, PriceComp, Recipe Book)
- **Other Apps** (`id="other-apps"`) — external projects, AI tools, non-travel apps (e.g. AI Prompter)

## Card HTML Structure

Every card follows this exact pattern:

```html
<a href="https://adbio.pages.dev/TravelGames/[filename].html" class="game-card">
  <img src="./images/[name].[ext]" alt="[description]" class="game-card-image" onerror="this.src='https://placehold.co/100x100/0a4821/d4af37?text=[Fallback]'">
  <button class="info-btn" aria-label="Show game info" type="button">ⓘ</button>
  <h3>[Title]</h3>
  <p>[Short tagline]</p>
  <div class="game-card-description" role="dialog" aria-modal="true" aria-label="[Title] details">
    <button class="close-desc" aria-label="Close">×</button>
    <span>[Full description for info overlay]</span>
  </div>
</a>
```

- `[filename]` — the HTML file name without extension
- `[name].[ext]` — matching image in `TravelGames/images/` (prefer `.svg`, fall back to `.png`)
- `[Fallback]` — short word for the placeholder image text (e.g. `Yatzy`)
- `[Title]` — human-readable title
- `[Short tagline]` — one line describing the app (shown on the card)
- `[Full description]` — 1–2 sentences for the info overlay

## Steps to Follow

1. Read the new HTML file to understand what it does.
2. Determine the correct section (Games, Tools, or Other Apps).
3. Derive a title, tagline, and description from the file content.
4. Check `TravelGames/images/` for an existing matching image; note the filename.
5. Insert the card at the end of the correct section's card list in `TravelGames/index.html`.
6. If no image exists yet, create a new SVG at `TravelGames/images/[filename].svg`. The SVG must:
   - Use `viewBox="0 0 100 100"` — all existing card images are 100×100
   - Use the TravelGames colour palette: deep forest green `#0a4821` and/or dark burgundy `#2a1a1f` as the background (use a diagonal `linearGradient` for richness), gold `#d4af37` / `#ffd700` for accents and labels, warm cream `#fff8e1` for highlights, and jewel tones (teal `#008080`, crimson `#800000`, emerald `#22c55e`) as supporting colours
   - Have a rounded rectangle background (`rx="12"–"14"`) with a subtle gold border or stroke
   - Contain meaningful iconography that clearly reflects what the app does — draw actual shapes, paths, and symbols rather than generic placeholders
   - Include a short label at the bottom (around `y="95"–"97"`) in `font-family="Cinzel, serif"` or `Arial Black`, `font-size="7"–"10"`, `fill="#d4af37"`, `text-anchor="middle"` — matching the app title
   - Optionally use a `<filter id="glow">` feGaussianBlur for glowing accent elements
   - Be self-contained (no external fonts or images referenced) so it renders correctly as a static file
