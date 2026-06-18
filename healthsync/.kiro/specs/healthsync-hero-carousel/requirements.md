# Requirements Document

## Introduction

Replace the static hero section on the Health Synchrony homepage (`index.html`) with a full-viewport, interactive service carousel. The carousel displays five slides — one per service (Aesthetics, Weight Loss, IV Therapy, Consultations, Dispensary) — with the site-level headline preserved on the first slide. Each slide contains a background image (Picsum/Unsplash placeholder), service heading, tagline, and a CTA button linking to the relevant service page. The carousel auto-plays, supports manual navigation via arrows and dots, respects `prefers-reduced-motion`, and meets WCAG 2.1 AA accessibility requirements. All styling follows the existing CSS cascade (`tokens.css → base.css → layout.css → components.css → pages/home.css`) and the carousel logic is delivered as a vanilla JS ES module.

## Glossary

- **Carousel**: The interactive, full-viewport hero section that cycles through service slides.
- **Slide**: A single panel within the Carousel containing a background image, heading, tagline, and CTA button.
- **CTA Button**: A call-to-action anchor element that navigates the user to a service sub-page.
- **Navigation Dots**: A set of dot indicators below the slide area representing each Slide and the currently active Slide.
- **Prev/Next Arrows**: Two button controls that manually advance the Carousel one Slide backward or forward.
- **Auto-play**: The behaviour whereby the Carousel advances to the next Slide automatically on a timed interval.
- **Reduced Motion**: The operating-system or browser preference (`prefers-reduced-motion: reduce`) indicating the user requests minimised animation.
- **Hero Section**: The `<section class="hero">` element in `index.html` that the Carousel replaces.
- **Carousel Module**: The vanilla JavaScript ES module (`js/hero-carousel.js`) responsible for all Carousel behaviour.
- **Live Region**: An ARIA `aria-live` region that announces Slide changes to screen readers.
- **Active Slide**: The Slide currently visible in the Carousel viewport.
- **Design Tokens**: The CSS custom properties defined in `css/tokens.css` (colours, spacing, transitions, z-index).

---

## Requirements

### Requirement 1 — Carousel Structure

**User Story:** As a visitor to the Health Synchrony homepage, I want to see a full-viewport hero carousel that showcases all five services, so that I can quickly understand the breadth of offerings and navigate directly to the service that interests me.

#### Acceptance Criteria

1. THE Carousel SHALL contain exactly five Slides, presented in the order: Aesthetics, Weight Loss, IV Therapy, Consultations, Dispensary.
2. THE Carousel SHALL occupy 100% of the viewport width and 100% of the viewport height (`100dvh` with `100vh` fallback) at all viewport sizes.
3. THE Carousel SHALL replace the existing static `<section class="hero section">` element in `index.html` entirely, retaining the `section` element and its `aria-label` attribute.
4. WHEN the Carousel is rendered, THE Carousel SHALL display the site-level headline "Integrated Wellness & Aesthetics in Centurion, Irene Security Estate" as an `<h1>` within the first Slide (Aesthetics).
5. THE Carousel SHALL render Prev/Next Arrows and Navigation Dots as controls.
6. THE Carousel SHALL be implemented as the Carousel Module loaded via `<script type="module">` in `index.html`.

---

### Requirement 2 — Slide Content

**User Story:** As a visitor, I want each carousel slide to clearly identify the service, provide a brief tagline, and offer a direct link to the service page, so that I can make an informed decision without leaving the hero section.

#### Acceptance Criteria

1. WHEN a Slide is rendered, THE Slide SHALL display a full-bleed background image sourced from the Picsum Photos API (`https://picsum.photos/`) at a resolution of at least 1440 × 810 pixels, with a dark semi-transparent overlay to ensure text contrast.
2. WHEN a Slide is rendered, THE Slide SHALL display a service-specific heading using the `<h2>` element for slides 2–5 and the `<h1>` element for slide 1 (Aesthetics), with text colour matching `var(--color-ivory)`.
3. WHEN a Slide is rendered, THE Slide SHALL display a tagline of no more than 15 words describing the service, styled below the heading using `var(--color-gold)` as the text colour.
4. WHEN a Slide is rendered, THE Slide SHALL display a CTA Button that navigates to the corresponding service page: `aesthetics.html`, `weight-loss.html`, `iv-therapy.html`, `consultations.html`, or `dispensary.html`.
5. THE CTA Button SHALL use the existing `btn-primary` class for consistent styling.
6. THE Slide background overlay SHALL provide a minimum contrast ratio of 4.5:1 between slide text and the background, in compliance with WCAG 2.1 AA criterion 1.4.3.

---

### Requirement 3 — Auto-play Behaviour

**User Story:** As a visitor, I want the carousel to advance automatically so that I see all services without needing to interact, but I also want it to pause when I'm reading a slide.

#### Acceptance Criteria

1. WHEN the page loads and Reduced Motion is not active, THE Carousel SHALL begin Auto-play, advancing to the next Slide every 5 seconds.
2. WHILE the user's pointer is over the Carousel, THE Carousel SHALL pause Auto-play.
3. WHEN the user's pointer leaves the Carousel, THE Carousel SHALL resume Auto-play.
4. WHILE a Slide control (Prev/Next Arrow or Navigation Dot) has keyboard focus, THE Carousel SHALL pause Auto-play.
5. WHEN focus leaves all Carousel controls, THE Carousel SHALL resume Auto-play.
6. IF Reduced Motion is active, THEN THE Carousel SHALL disable Auto-play and all CSS transition animations.

---

### Requirement 4 — Manual Navigation

**User Story:** As a visitor, I want to move between slides using arrow buttons and dot indicators so that I can jump directly to a service of interest.

#### Acceptance Criteria

1. WHEN the user activates the Next Arrow, THE Carousel SHALL advance to the next Slide; if the Active Slide is the last Slide, THE Carousel SHALL advance to the first Slide.
2. WHEN the user activates the Prev Arrow, THE Carousel SHALL retreat to the previous Slide; if the Active Slide is the first Slide, THE Carousel SHALL retreat to the last Slide.
3. WHEN the user activates a Navigation Dot, THE Carousel SHALL set the Slide corresponding to that dot as the Active Slide.
4. THE Navigation Dots SHALL visually indicate the Active Slide using a distinct colour (`var(--color-gold)`) and an `aria-current="true"` attribute on the dot corresponding to the Active Slide.
5. WHEN the Carousel is focused and the user presses the Right Arrow key, THE Carousel SHALL advance to the next Slide.
6. WHEN the Carousel is focused and the user presses the Left Arrow key, THE Carousel SHALL retreat to the previous Slide.

---

### Requirement 5 — Accessibility

**User Story:** As a user of assistive technology, I want the carousel to be fully navigable and announce slide changes, so that I can access all service information without visual interaction.

#### Acceptance Criteria

1. THE Carousel SHALL be implemented as an ARIA carousel pattern with `role="region"` and `aria-label="Service carousel"` on the containing element.
2. THE Carousel SHALL contain a Live Region with `aria-live="polite"` and `aria-atomic="true"` that announces the Active Slide's heading text whenever the Active Slide changes.
3. THE Prev Arrow SHALL have an `aria-label` of "Previous slide" and the Next Arrow SHALL have an `aria-label` of "Next slide".
4. WHEN Slide images are rendered, THE Carousel Module SHALL set a descriptive `alt` attribute on each image that identifies the service depicted.
5. THE Prev/Next Arrows and each Navigation Dot SHALL have a minimum touch-target size of 48 × 48 CSS pixels, matching `var(--touch-target)`.
6. THE Carousel SHALL be fully operable using only a keyboard, including Tab to reach controls, Enter/Space to activate controls, and Left/Right Arrow keys to change slides.
7. IF Reduced Motion is active, THEN THE Carousel SHALL replace animated slide transitions with an instantaneous cross-fade or cut, with a CSS transition duration of 0ms.

---

### Requirement 6 — Visual Design and CSS Integration

**User Story:** As a developer maintaining the site, I want the carousel styles to follow the existing CSS cascade and use only design tokens, so that future theme changes propagate automatically.

#### Acceptance Criteria

1. THE Carousel Module SHALL apply all carousel-specific styles exclusively through CSS classes defined in `css/pages/home.css`.
2. THE Carousel styles SHALL use only CSS custom properties from `css/tokens.css` for colours, spacing, border-radius, transitions, and z-index values; no hard-coded hex values or pixel values that duplicate tokens SHALL be introduced.
3. THE Carousel SHALL apply a slide transition animation using `var(--transition-normal)` (300ms ease) for the cross-fade or slide effect when Reduced Motion is not active.
4. WHEN the viewport width is below 768px, THE Carousel SHALL scale heading font sizes and CTA Button padding so that all slide text is readable without horizontal scrolling.
5. THE Prev/Next Arrows SHALL be positioned absolutely within the Carousel viewport using `var(--z-sticky)` or above to remain visible above slide content.
6. THE Navigation Dots SHALL be positioned at the bottom of the Carousel and centred horizontally.

---

### Requirement 7 — Image Loading and Performance

**User Story:** As a visitor on a mobile or slower connection, I want the carousel to load efficiently so that the page remains fast and the first slide appears without delay.

#### Acceptance Criteria

1. THE first Slide image SHALL use `fetchpriority="high"` and `loading="eager"` to prioritise Largest Contentful Paint.
2. THE remaining Slide images (slides 2–5) SHALL use `loading="lazy"` to defer network requests until needed.
3. THE Carousel Module SHALL render the complete Carousel HTML — including all five Slides — into the Hero Section on `DOMContentLoaded` or via a module-level `init()` call.
4. WHEN a Slide image fails to load, THE Carousel SHALL display the dark overlay and slide text content without layout shift, using a `var(--color-navy)` background colour as the fallback.

---

### Requirement 8 — Integration with Existing Page

**User Story:** As a developer, I want the carousel to integrate cleanly with the existing homepage structure so that no other page sections, scripts, or styles are disrupted.

#### Acceptance Criteria

1. THE Carousel Module SHALL export a named `init()` function that is imported and called from a `<script type="module">` block in `index.html`.
2. THE existing `<script type="module">` imports for `nav.js`, `sticky-cta.js`, `booking-widget.js`, `review-widget.js`, and `ai-receptionist.js` SHALL remain unchanged in `index.html`.
3. THE Hero Section's `aria-label="Hero"` attribute SHALL be updated to `aria-label="Service carousel"` when the Carousel Module initialises.
4. WHEN the Carousel Module is loaded on a page that does not contain the Hero Section element, THE Carousel Module SHALL exit silently without throwing an uncaught exception.
