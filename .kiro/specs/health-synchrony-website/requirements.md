# Requirements Document

## Introduction

Health Synchrony – Integrated Health Practitioners is a Centurion-based (Gauteng, South Africa) medical practice led by Dr. van Dyk, offering aesthetics, weight loss, IV therapy, consultations, and a dispensary. This document defines the requirements for a standalone modern, high-conversion website residing in the `healthsync/` folder inside the existing adbio project. The site must balance clinical credibility with a premium wellness aesthetic ("Medical Luxury"), comply with South African HPCSA regulations and POPIA privacy law, and be fully optimised for mobile-first delivery to a local Centurion audience.

---

## Glossary

- **Website**: The standalone Health Synchrony web application located at `healthsync/` within the adbio project.
- **Visitor**: Any person accessing the Website via a browser.
- **Patient**: A Visitor who has booked or intends to book a consultation or treatment.
- **Dr. van Dyk**: The lead practitioner and medical director of Health Synchrony.
- **Booking_Widget**: The embedded third-party scheduling widget (Jane App or Vagaro) used to accept appointment requests.
- **AI_Receptionist**: The 24/7 AI-powered chatbot embedded on the Website for FAQs and booking guidance.
- **Treatment_Quiz**: The interactive "Find Your Perfect Treatment" quiz used to pre-qualify leads.
- **Before_After_Slider**: An interactive image comparison component showing pre- and post-treatment photos.
- **Journey_Map**: The interactive visual step-by-step weight loss journey component (3–5 steps).
- **IV_Menu_Card**: A colour-coded card component representing a single IV therapy drip option.
- **Review_Widget**: The embedded real-time Google Reviews display component.
- **HPCSA**: Health Professions Council of South Africa – the regulatory body governing medical advertising.
- **POPIA**: Protection of Personal Information Act – South Africa's data privacy legislation.
- **Sticky_CTA**: The persistent "Book Consultation" call-to-action button that remains visible during scrolling on mobile devices.
- **Schema_Markup**: Structured data in JSON-LD format embedded in page `<head>` elements for search engine optimisation.
- **WebP**: A modern image format providing superior compression for web delivery.
- **LCP**: Largest Contentful Paint – a Core Web Vitals metric measuring perceived load speed.
- **Touch_Target**: An interactive UI element sized to be comfortably tappable on a touchscreen.

---

## Requirements

---

### Requirement 1: Site Architecture and Navigation

**User Story:** As a Visitor, I want clear and intuitive site navigation, so that I can find any page or service within two taps or clicks from any location on the site.

#### Acceptance Criteria

1. THE Website SHALL include the following primary pages: Home, About Us, Services (with sub-pages for Aesthetics, Weight Loss, IV Therapy, Consultations, and Dispensary), and Contact Us.
2. THE Website SHALL render a navigation menu that links to all primary pages and service sub-pages.
3. WHILE a Visitor is on any page on a mobile device (viewport width ≤ 768px), THE Website SHALL display the Sticky_CTA "Book Consultation" button in a fixed position visible at all times, regardless of scroll state.
4. THE Sticky_CTA SHALL be a minimum of 48×48 pixels in touch target size.
5. WHEN a Visitor taps or clicks the Sticky_CTA, THE Website SHALL scroll to the Booking_Widget if one is present on the current page, or navigate to the Contact Us page if no Booking_Widget is present on the current page.
6. THE Website SHALL be structured as a standalone folder (`healthsync/`) such that removing or renaming all files outside that folder does not prevent the Website from loading in a browser.
7. THE Website's `index.html` SHALL serve as the Home page entry point.
8. THE Website SHALL ensure that every primary service sub-page (Aesthetics, Weight Loss, IV Therapy, Consultations, Dispensary) is reachable in at most two taps or clicks from the Home page navigation menu.

---

### Requirement 2: Visual Design and Brand Identity ("Medical Luxury")

**User Story:** As a Visitor, I want the site to feel premium and trustworthy the moment I arrive, so that I immediately perceive Health Synchrony as a credible, high-quality practice.

#### Acceptance Criteria

1. THE Website SHALL apply Playfair Display (serif) as the heading typeface and Montserrat or Open Sans as the body typeface, loaded via Google Fonts; IF the Google Fonts request fails, THE Website SHALL fall back to a system serif font for headings and a system sans-serif font for body text.
2. THE Website SHALL use one of the following two named colour palette options, applied consistently across all pages — Option A: primary Navy (#0A1F3C) and Gold (#C9A84C), secondary Soft Sage Green (#8FAF8A), accent Warm Ivory (#F5F0E8); Option B: primary Deep Teal (#0D4F5C) and Gold (#C9A84C), secondary Eucalyptus (#5C8C7A), accent Muted Rose-Gold (#C9817A).
3. THE Website SHALL apply a minimum vertical spacing of 64px between content sections on viewport widths ≥ 1024px, and a minimum of 40px between content sections on viewport widths < 1024px.
4. WHEN a Visitor loads any page, THE Website SHALL present within the first visible viewport: a full-width image or video with a minimum height of 60vh as the hero visual, a visible provider credential or patient result statement as text overlaid on or immediately adjacent to the hero, and a Sticky_CTA or inline CTA button.
5. THE Website SHALL use only authentic clinic or team photographs on the Aesthetics, IV Therapy, and Consultations pages; no stock photography depicting models who are not clinic staff or patients of the practice SHALL appear on those pages.
6. THE Website SHALL render all content images in WebP format with a descriptive, non-empty `alt` attribute; purely decorative images SHALL use `alt=""`.

---

### Requirement 3: Home Page – First Impression and Conversion

**User Story:** As a Visitor arriving at the Home page, I want to immediately understand what Health Synchrony offers and how to book, so that I can decide to engage within three seconds.

#### Acceptance Criteria

1. THE Website's Home page SHALL include a full-viewport hero section with a headline of no more than 12 words communicating the practice's core value proposition.
2. THE Home page SHALL include a "Who We Are" section of no more than 150 words referencing at least one of Dr. van Dyk's named credentials and the text "Centurion" or "Irene Security Estate."
3. THE Home page SHALL include a services overview section containing exactly five visual cards, each linking to one of the service sub-pages: Aesthetics, Weight Loss, IV Therapy, Consultations, and Dispensary.
4. THE Home page SHALL embed the Booking_Widget or an inline CTA button labelled "Book a Consultation" that is visible without scrolling on viewport widths ≥ 768px; IF the Booking_Widget fails to load, THE Website SHALL display the inline CTA button as a fallback.
5. THE Home page SHALL include the Review_Widget; IF the Review_Widget fails to load within 10 seconds, THE Website SHALL display at minimum a static fallback section with at least one representative review and a link to the Google Business Profile.
6. THE Home page SHALL embed the Treatment_Quiz as a named, scrollable section of the page.
7. WHEN a Visitor interacts with the Treatment_Quiz, THE Website SHALL present between 3 and 7 questions sequentially and, upon completion, display a personalised service recommendation accompanied by a CTA linking to the corresponding service sub-page.

---

### Requirement 4: About Us Page – Provider Trust and Credibility

**User Story:** As a prospective Patient, I want to learn about Dr. van Dyk's background and qualifications, so that I can feel confident in the quality and safety of the care I will receive.

#### Acceptance Criteria

1. THE About Us page SHALL display Dr. van Dyk's University of Pretoria degree and Advanced Diploma in Aesthetics credentials as text or credential badge components with a minimum font size of 16px and a contrast ratio of at least 4.5:1 against the background.
2. THE About Us page SHALL include a minimum of two photographs depicting Dr. van Dyk in a clinical or patient-facing setting.
3. THE About Us page SHALL include a Provider Introduction Video section that is between 30 and 60 seconds in duration and is playable with accessible controls visible to the Visitor without navigating away from the page.
4. IF the Provider Introduction Video asset is unavailable at launch, THEN THE Website SHALL display a styled placeholder section with an accessible title, descriptive text in place of video content, and full ARIA labelling; no `<video>` element SHALL be rendered until the asset is provided.
5. WHEN the Provider Introduction Video asset is supplied, THE Website SHALL replace the placeholder section with the embedded video, removing all placeholder elements.
6. THE About Us page SHALL include the cybersecurity disclaimer: "The doctor will never ask for payment before a consultation."
7. THE About Us page SHALL include a single CTA element that navigates the Visitor to either the Booking_Widget on the page or the Contact Us page.

---

### Requirement 5: Aesthetics Page – Transformation Focus

**User Story:** As a Visitor interested in aesthetic treatments, I want to understand the benefits and see evidence of results, so that I feel confident booking an aesthetics consultation.

#### Acceptance Criteria

1. THE Aesthetics page SHALL use benefit-driven headings for every treatment section, where a benefit-driven heading describes a patient outcome or improvement (e.g., skin texture, appearance, or wellbeing) and does NOT use a procedure name or medical term as the sole heading text.
2. THE Aesthetics page SHALL include a minimum of one Before_After_Slider component for each treatment category that has a dedicated section on the page.
3. WHEN a Visitor interacts with a Before_After_Slider, THE Website SHALL animate the comparison transition using a CSS transition with a duration of 300ms; the transition SHALL NOT be intentionally set to exceed 300ms, though browser rendering variation is acceptable.
4. THE Aesthetics page SHALL list all displayed aesthetic treatments using their HPCSA-registered generic names as the primary treatment label, with no trade name used as a primary label in place of the registered generic name.
5. THE Aesthetics page SHALL NOT display prices for Schedule 2 or higher medications.
6. THE Aesthetics page SHALL NOT use the terms "Specials," "Discounts," "Buy one get one," or equivalent promotional language in reference to any medical treatment.
7. THE Aesthetics page SHALL embed the Booking_Widget or include an inline CTA button that is visible without scrolling on viewport widths ≥ 768px and that navigates the Visitor to the booking flow when activated.
8. IF the Booking_Widget fails to load, THEN THE Aesthetics page SHALL display an inline CTA button that navigates the Visitor to the booking flow, ensuring booking initiation remains available.

---

### Requirement 6: Weight Loss Page – Journey and Trust

**User Story:** As a Visitor seeking weight loss support, I want to see a clear treatment journey and evidence of Dr. van Dyk's expertise, so that I feel motivated and reassured enough to book an appointment.

#### Acceptance Criteria

1. THE Weight Loss page SHALL use copy that names a patient outcome (such as confidence, energy, or sustained health) in each section heading or introductory paragraph, without naming a clinical procedure as the primary focus of any heading.
2. THE Journey_Map component SHALL present the actual number of treatment steps required to accurately represent the weight loss journey; WHERE the process has fewer than 3 steps, THE Website SHALL group related actions to present a minimum of 3 steps and a maximum of 5 steps.
3. WHEN a Visitor interacts with a Journey_Map step, THE Website SHALL highlight the selected step visually and display a description of between 10 and 40 words for that step.
4. THE Weight Loss page SHALL display Dr. van Dyk's University of Pretoria degree and Advanced Diploma in Aesthetics within the same page section as any transformation content (before-and-after imagery or patient result statements).
5. THE Weight Loss page SHALL embed the Booking_Widget or include an inline CTA button that is visible without horizontal scrolling at all supported breakpoints and that meets the minimum 48×48px Touch_Target size.
6. THE Weight Loss page SHALL NOT display prices, discount values, or promotional values for Schedule 2 or higher medications or injection-based treatments, including within conditionally revealed content.

---

### Requirement 7: IV Therapy Page – Menu Experience

**User Story:** As a Visitor interested in IV therapy, I want to browse available drip options in a clear, engaging format, so that I can identify which treatment is right for me before booking.

#### Acceptance Criteria

1. THE IV Therapy page SHALL display each available drip offering as an IV_Menu_Card.
2. THE Website SHALL render between 3 and 10 IV_Menu_Cards, including at minimum one card each for the Energy, Beauty, and Immunity categories.
3. THE Website SHALL render each IV_Menu_Card with: a colour-coded visual indicator unique to its category, a list of at least 3 key ingredients, a "Best For" tag of no more than 60 characters describing the primary benefit, and a CTA linking to the Booking_Widget.
4. THE IV Therapy page SHALL not display stock photography depicting models who are not clinic staff or patients of the practice.
5. THE IV Therapy page SHALL embed the Booking_Widget or include a section-level CTA that is visible within the initial viewport without scrolling on viewport widths ≥ 768px.

---

### Requirement 8: Consultations Page – Trust and Accessibility

**User Story:** As a first-time Visitor, I want to understand what a consultation involves and feel personally connected to the practice, so that I am comfortable enough to book my first appointment.

#### Acceptance Criteria

1. THE Consultations page SHALL include a minimum of 2 photographs depicting Dr. van Dyk in a patient consultation setting, each with a descriptive `alt` attribute of at least 10 characters.
2. THE Consultations page SHALL embed the Provider Introduction Video such that the Visitor can play it without navigating away from the page.
3. THE Consultations page SHALL include a section describing the consultation process at a reading level no higher than Grade 8, covering at minimum: what to expect, typical duration, and any preparation required.
4. THE Consultations page SHALL embed the Booking_Widget such that a Visitor can select a date and submit a booking request without leaving the page.
5. THE Consultations page SHALL display the cybersecurity disclaimer "The doctor will never ask for payment before a consultation" in a position visible without scrolling on a 1024×768 viewport.

---

### Requirement 9: Dispensary Page

**User Story:** As a Patient, I want to know what products and supplements are available from the dispensary, so that I can plan my visit or enquire before attending.

#### Acceptance Criteria

1. THE Dispensary page SHALL include a minimum of 3 named product category sections (e.g., Supplements, Skincare, Nutraceuticals), each with a brief description of what is available in that category.
2. THE Dispensary page SHALL include a contact CTA within the main page content area directing Visitors to enquire about specific products via the Contact Us page or by phone.
3. THE Dispensary page SHALL NOT display prices for any medication scheduled under the South African Medicines and Related Substances Act (Schedule 1 or higher).
4. IF any promotional value (discount, bundled price, or offer) would apply to a scheduled product, THEN THE Website SHALL NOT display that value anywhere on the Dispensary page, including within conditionally revealed or dynamically loaded content.

---

### Requirement 10: Contact Us Page

**User Story:** As a Visitor ready to get in touch, I want to find contact details, a location reference, and a simple enquiry form, so that I can reach the practice with minimal friction.

#### Acceptance Criteria

1. THE Contact Us page SHALL display the practice address including "Irene Security Estate, Centurion, Gauteng."
2. THE Contact Us page SHALL display a phone number and email address for the practice.
3. THE Contact Us page SHALL include an embedded Google Map or static map image showing the practice location.
4. THE Contact Us page SHALL include an enquiry form with fields for: full name, email address, phone number (with a South African format hint), reason for enquiry (free-text, maximum 500 characters), and preferred contact method (selectable: Phone or Email).
5. WHEN a Visitor submits the enquiry form, THE Website SHALL validate that: the name field is non-empty; the email field matches the format `local@domain.tld`; and the phone number matches a South African format (e.g., 0XX XXX XXXX or +27 XX XXX XXXX).
6. IF a Visitor submits the enquiry form with invalid or empty required fields, THEN THE Website SHALL display an inline, accessible error message immediately adjacent to each invalid field, and SHALL retain all previously entered valid field values.
7. THE Contact Us page SHALL include the POPIA-compliant consent section as defined in Requirement 13.
8. WHEN a Visitor successfully submits the enquiry form with all required fields valid and appointment communication consent checked, THE Website SHALL display a visible confirmation message on the same page indicating the enquiry has been received.

---

### Requirement 11: Booking Widget Integration

**User Story:** As a Patient ready to book, I want to complete my appointment booking directly on the website without being redirected away, so that I can book quickly with minimal friction.

#### Acceptance Criteria

1. THE Website SHALL embed the Booking_Widget (Jane App or Vagaro) as an inline iframe or script-based embed on each relevant treatment page (Aesthetics, Weight Loss, IV Therapy, Consultations) and on the Home page.
2. WHEN the Booking_Widget has not loaded within 10 seconds of the page becoming interactive, THE Website SHALL display a fallback message containing the practice phone number and email address; IF the fallback message also fails to render, THE Website SHALL ensure the Contact Us page link remains accessible on the page.
3. THE Booking_Widget embed SHALL render without a horizontal scrollbar and without clipped interactive controls at viewport widths from 320px to 1440px.
4. THE Booking_Widget SHALL load within 15 seconds of page interaction and SHALL allow a Visitor to select a date and submit a booking request without navigating away from the host page.

---

### Requirement 12: AI Receptionist Chatbot

**User Story:** As a Visitor arriving outside business hours, I want to ask questions and get help booking, so that I am not left without support when the practice is closed.

#### Acceptance Criteria

1. THE Website SHALL embed an AI_Receptionist chatbot widget visible on all pages, available 24/7.
2. WHEN a Visitor opens the AI_Receptionist, THE Website SHALL present a greeting message and prompt options including "Book an appointment," "Learn about our services," and "Ask a question."
3. THE AI_Receptionist SHALL respond to common FAQ topics including services offered, location, operating hours, and booking process within 10 seconds, with each response no longer than 500 characters.
4. IF the AI_Receptionist cannot match the Visitor's question to any of the supported FAQ topics, THEN THE Website SHALL display a message directing the Visitor to call or email the practice.
5. THE Website SHALL implement active content filtering on all AI_Receptionist responses; any response containing medical advice, diagnoses, or specific treatment recommendations SHALL be blocked before display.
6. IF a response is blocked by the content filter, THEN THE Website SHALL display a fallback message directing the Visitor to contact the practice directly for medical guidance.
7. IF the AI_Receptionist backend does not return a response within 10 seconds, THEN THE Website SHALL display an offline fallback message indicating the assistant is temporarily unavailable and directing the Visitor to call or email the practice.
8. THE AI_Receptionist trigger button SHALL meet a minimum Touch_Target size of 48×48 pixels.

---

### Requirement 13: POPIA Compliance – Privacy and Consent

**User Story:** As a Patient, I want transparent and granular control over how my personal information is used, so that I can trust the practice with my data.

#### Acceptance Criteria

1. THE Website's enquiry form and any data-collection form SHALL include two separate checkboxes, each with its own distinct visible label: (a) "I consent to appointment communication" and (b) "I consent to marketing and educational communications"; the two checkboxes SHALL have no shared selection logic.
2. THE Website SHALL NOT pre-tick or pre-select either consent checkbox.
3. WHEN a Visitor submits a form without the appointment communication consent checkbox explicitly checked, THE Website SHALL block form submission and display an accessible inline error message immediately adjacent to that checkbox; all previously entered field values SHALL be retained.
4. THE Website SHALL allow form submission to proceed when only the appointment communication consent checkbox is checked and the marketing consent checkbox is unchecked.
5. THE Website SHALL include a link to the Privacy Policy in the site footer on every page AND immediately above or below any data-collection form.
6. THE Privacy Policy SHALL state at minimum: the categories of personal information collected (including name, contact details, and appointment-related information), the purpose of processing, and the Visitor's rights to access and correction.

---

### Requirement 14: HPCSA Regulatory Compliance

**User Story:** As the practice owner, I want the website to fully comply with HPCSA advertising guidelines, so that the practice is protected from regulatory sanctions.

#### Acceptance Criteria

1. THE Website SHALL NOT use any proprietary trade names for Schedule 2 or higher medications anywhere on the site including in page content, metadata, and image `alt` attributes; only approved generic or scientific names SHALL be used.
2. THE Website SHALL NOT display prices, promotional pricing, or value comparisons for any medical treatments or Schedule 2+ medications.
3. THE Website SHALL NOT use the following terms or patterns in relation to any medical treatment: "Specials," "Discounts," "Deals," "BOGO," "Buy one get one," "Sale," "Free," "% off," "Save," or "Limited offer."
4. THE Website SHALL display the cybersecurity disclaimer "The doctor will never ask for payment before a consultation" rendered in the visible body of the About Us page and the Consultations page.
5. THE Website SHALL NOT use language that guarantees a specific measurable outcome from any treatment (e.g., "you will lose X kg" or "guaranteed results").
6. THE Website SHALL NOT make claims about treatments that are not supported by a referenced professional body, peer-reviewed publication, or regulatory approval; any benefit statement SHALL be qualified with language such as "may," "can," or "results vary."

---

### Requirement 15: Performance and Technical Standards

**User Story:** As a Visitor on a mobile device in Centurion, I want the website to load quickly and operate smoothly, so that I am not deterred by slow performance or a poor experience.

#### Acceptance Criteria

1. THE Website SHALL achieve an LCP of under 2.5 seconds on all pages as measured by the Lighthouse Mobile preset with Fast 4G throttling.
2. THE Website SHALL apply `loading="lazy"` to all images and iframes that appear below the initial viewport fold.
3. WHERE the build or server pipeline supports WebP conversion, THE Website SHALL serve images in WebP format using `<picture>` elements with JPEG or PNG fallback sources for browsers that do not support WebP; WHERE WebP conversion is not available, THE Website SHALL serve JPEG or PNG as the primary format.
4. THE Website SHALL render at each of the following viewport widths — 320px, 375px, 768px, 1024px, and 1440px — without any horizontal scrollbar and without any two content elements visually overlapping.
5. THE Website SHALL implement all interactive Touch_Targets at a minimum size of 48×48 pixels.
6. THE Website SHALL pass W3C HTML validation with zero errors (warnings are permitted).
7. THE Website SHALL meet WCAG 2.1 Level AA colour contrast requirements for all body text and interactive elements.

---

### Requirement 16: Local SEO and Structured Data

**User Story:** As the practice owner, I want the website to rank prominently in local search results for Centurion and Irene, so that prospective patients in the area can find the practice easily.

#### Acceptance Criteria

1. THE Website SHALL include the geographic terms "Irene Security Estate," "Centurion," and "Gauteng" in the `<h1>` or `<h2>` heading of the Home page and in the `<meta name="description">` tag of the Home page.
2. EACH page of THE Website SHALL include a `<title>` tag of no more than 60 characters and a `<meta name="description">` of between 50 and 160 characters; both values SHALL differ across pages and each SHALL contain at least one service-relevant keyword and one location keyword (e.g., "Centurion," "Irene," or "Gauteng").
3. THE Website SHALL embed `MedicalBusiness` schema markup in JSON-LD format in the `<head>` of the Home page, including: name, address (with Centurion / Irene), telephone, url, and openingHours (in schema.org `OpeningHoursSpecification` format).
4. THE Website SHALL embed `Physician` schema markup in JSON-LD format in the `<head>` of the About Us page, including: name (Dr. van Dyk), a `medicalSpecialty` value drawn from the schema.org `MedicalSpecialty` enumeration, and `worksFor` referencing the practice.
5. THE Website SHALL include an `<html lang="en">` attribute and `<meta charset="UTF-8">` declaration on every page.

---

### Requirement 17: Review Widget

**User Story:** As a Visitor uncertain about the practice, I want to see real patient reviews, so that I can feel reassured by the experiences of others before booking.

#### Acceptance Criteria

1. THE Website's Home page SHALL embed the Review_Widget displaying Google Reviews no older than 24 months.
2. THE Review_Widget SHALL display an aggregate star rating on a 1–5 scale alongside between 3 and 10 individual review excerpts, each no longer than 250 characters.
3. IF the aggregate rating displayed is below 4.0 stars, THEN THE Website SHALL hide the star rating indicator and display only the review excerpts alongside a link to the Google Business Profile.
4. IF the Review_Widget has not loaded within 10 seconds, THEN THE Website SHALL trigger the fallback display.
5. WHEN the Review_Widget fallback is triggered, THE Website SHALL render within the page's visible viewport at minimum a static section with at least one representative review excerpt and a clearly visible link to the Google Business Profile.

---

### Requirement 18: Accessibility

**User Story:** As a Visitor with a disability or using assistive technology, I want to navigate and use the website independently, so that I have equal access to the practice's services.

#### Acceptance Criteria

1. THE Website SHALL include descriptive `alt` attributes on all meaningful images; decorative images SHALL use `alt=""`.
2. THE Website SHALL maintain a logical heading hierarchy (`<h1>` → `<h2>` → `<h3>`) on every page with no skipped heading levels.
3. THE Website SHALL ensure all interactive elements (buttons, links, form inputs) are keyboard-navigable and have visible focus indicators.
4. THE Website SHALL associate all form input fields with explicit `<label>` elements using matching `for` and `id` attributes.
5. THE Before_After_Slider component SHALL include ARIA labels describing the before and after states for screen reader users.
6. THE AI_Receptionist chatbot widget SHALL include an accessible `aria-label` on its trigger button.
