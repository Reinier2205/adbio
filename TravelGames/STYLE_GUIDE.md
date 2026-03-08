# Travel Edition: Technical Style Guide

This document outlines the design standards and mandatory UI components for the "Travel Edition" casino game suite. Following these guidelines ensures a consistent user experience across all applications.

## 1. Mandatory Navigation Components

Every game must include global navigation controls positioned at the top of the main container.

### A. Home Button (Top-Left)
- **Position:** `absolute, top: 12px, left: 12px`
- **Icon:** House emoji (🏠)
- **Styling:** Circular button (approx 36-42px) with a radial-gradient from `--gold` to a darker shade
- **Function:** Must link back to the central hub (index.html)

### B. Help Button (Top-Right)
- **Position:** `absolute, top: 12px, right: 12px`
- **Icon:** Question mark (?)
- **Styling:** Circular button with a radial-gradient from `--gold-light` to `--gold`
- **Function:** Triggers a help-modal overlay containing game-specific rules

## 2. Visual Theme (Casino Palette)

All games utilize the following root variables for a cohesive "Luxury Travel" aesthetic:

- **Felt:** `#0a4821` (Green)
- **Wood:** `#2a1a1f` (Dark Mahogany)
- **Gold:** `#d4af37` (Primary Accent)
- **Gold Light:** `#ffd700` (Highlight Accent)
- **Light Gold:** `#fff8e1` (Text/Secondary Accent)

### Status Colors:
- **Teal:** `#008080` - Primary Action / Active State
- **Maroon:** `#800000` - Secondary Action / Shut State

## 3. Game Element Standards

### A. Dice Branding
Dice must match the player's current "mode" or status.

- **Teal Dice:** Used for "Opening" or Positive actions
- **Maroon Dice:** Used for "Shutting" or Negative actions
- **Pips:** Must use `--pip-color (#fff8e1)` with a subtle shadow for depth

### B. Grid and Tile Layouts
- **Aspect Ratio:** Game tiles should maintain a consistent aspect-ratio (e.g., 1/2 for vertical tiles)
- **Gaps:** Use clamp or rem for gaps to ensure they don't disappear on mobile (standard: 0.4rem to 0.5rem)
- **Corner Radius:** Standard border-radius for tiles and cards is 6px to 10px

## 4. UI Requirements

### Container
Use the `.casino-table` class with a 10px wood border and gold outline.

### Typography
- **Titles:** 'Cinzel', serif (Bold 700)
- **Body:** 'Lato', sans-serif
- **Buttons/Inputs:** 'Inter', sans-serif

### Interactions
- Interactive elements must support both mouse clicks and touch taps
- Active states should include a `translateY(2px)` or `translateY(3px)` transform to simulate a physical button press
- Use `box-shadow` to provide depth, particularly `0 4px 0 #111` for "3D" buttons

## 5. Modal Standards

- **Overlays:** Should use `rgba(0,0,0,0.8)` or darker to maintain focus on content
- **Panels:** Use a linear gradient (`#3e1e24` to `#2a1a1f`) with a 3px gold border
- **Animation:** Modals should scale from 0.7 to 1 or fade in via opacity for a premium feel

## 6. Motion and Feedback

- **Turn Transitions:** The "Active Player" must be highlighted with an animation (e.g., playerGlow or playerSwitch) lasting between 0.8s and 2s
- **Dice Rolls:** Must include a `transform: rotate` animation to provide visual feedback of a physical roll

---

## Quick Reference CSS Template

```css
:root {
    --felt-green: #0a4821;
    --dark-wood: #2a1a1f;
    --gold: #d4af37;
    --gold-light: #ffd700;
    --light-gold: #fff8e1;
    --teal: #008080;
    --maroon: #800000;
    --pip-color: #fff8e1;
}

.casino-table {
    background: var(--felt-green);
    border: 10px solid #4a2c2a;
    box-shadow: 0 0 0 5px var(--gold);
    border-radius: 15px;
    position: relative;
}

.nav-btn {
    position: absolute;
    top: 12px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 2px solid #111;
    box-shadow: 0 4px 0 #111;
}

.home-btn {
    left: 12px;
    background: radial-gradient(circle, var(--gold-light), var(--gold));
}

.help-btn {
    right: 12px;
    background: radial-gradient(circle, var(--gold-light), var(--gold));
}

.nav-btn:active {
    transform: translateY(2px);
    box-shadow: 0 2px 0 #111;
}
```
