# Bugfix Requirements Document

## Introduction

The DelNorte Camino Training Tracker authentication flow completes successfully on the backend (all API calls return 200 OK), but the frontend fails to transition from the login screen to the main application screen. Users remain stuck on the login screen with the "Logging in..." button text after authentication succeeds. This bugfix addresses the screen transition failure in the `showApp()` function in `app.js`.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user clicks "Start Training" with a valid name selected AND authentication succeeds (confirmed by 200 OK responses from `/api/login`, `/api/dashboard`, and `/api/activities`) THEN the system leaves both the login screen and app screen visible or fails to properly hide the login screen

1.2 WHEN the `showApp()` function executes after successful authentication THEN the system logs indicate CSS classes are being toggled but the visual transition does not occur

1.3 WHEN the screen transition fails THEN the system leaves the user stuck on the login screen with "Logging in..." button text indefinitely

### Expected Behavior (Correct)

2.1 WHEN a user clicks "Start Training" with a valid name selected AND authentication succeeds THEN the system SHALL hide the login screen (remove 'active' class from `#login-screen`)

2.2 WHEN a user clicks "Start Training" with a valid name selected AND authentication succeeds THEN the system SHALL show the app screen (add 'active' class to `#app-screen`)

2.3 WHEN the screen transition completes successfully THEN the system SHALL initialize the router and display the Overview page

2.4 WHEN the screen transition completes successfully THEN the system SHALL display the sidebar navigation and main content area

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user first loads the application without prior authentication THEN the system SHALL CONTINUE TO display the login screen

3.2 WHEN a user loads the travelers dropdown on the login screen THEN the system SHALL CONTINUE TO populate it with available travelers from the API

3.3 WHEN a user selects a name from the dropdown THEN the system SHALL CONTINUE TO enable the login button

3.4 WHEN authentication fails due to network error or invalid credentials THEN the system SHALL CONTINUE TO display an error alert and reset the login button

3.5 WHEN a user clicks logout from the app screen THEN the system SHALL CONTINUE TO show the login screen and hide the app screen

3.6 WHEN a user refreshes the page while already authenticated (has valid token in localStorage) THEN the system SHALL CONTINUE TO bypass the login screen and show the app screen directly

3.7 WHEN the router initializes after successful screen transition THEN the system SHALL CONTINUE TO register all page renderers and navigate to the Overview page

3.8 WHEN navigation links are clicked in the sidebar THEN the system SHALL CONTINUE TO render the appropriate page content
