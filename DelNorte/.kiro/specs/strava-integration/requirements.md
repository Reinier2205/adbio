# Requirements Document

## Introduction

Camino Ready currently requires users to log all activities manually. Phase 2 adds Strava integration so that walking and hiking activities recorded in Strava are automatically imported into Camino Ready. This reduces manual data entry, increases data accuracy, and improves engagement by keeping the training dashboard up to date without user effort.

The integration is read-only. Camino Ready will never publish, modify, or delete activities in Strava.

### Scope

**Included:**
- Strava OAuth 2.0 connect and disconnect
- Automatic import of Walk and Hike activities (Run, Cycle, Gym, Other configurable)
- Daily background sync via Cloudflare Cron
- Camino Readiness Score calculated from imported data
- Dashboard status and manual "Sync Now" trigger

**Out of scope for Phase 2:**
- Apple Health, Garmin Connect, Huawei Health
- Strava segments, kudos, comments, social features
- Route maps and activity photos
- Premium Strava features

---

## Glossary

- **OAuth 2.0**: Open authorisation standard used by Strava to grant Camino Ready read access without exposing user credentials.
- **Access Token**: Short-lived credential used to authenticate Strava API calls. Expires after 6 hours.
- **Refresh Token**: Long-lived credential used to obtain a new access token when the current one expires.
- **Initial Import**: The one-time bulk import of historical activities triggered immediately after a user first connects Strava.
- **Daily Sync**: Scheduled background job that runs at 03:00 UTC every day to import new activities.
- **Camino Readiness Score**: A 0–100 score calculated from weekly distance, longest walk, elevation exposure, and training consistency.
- **imported_activities**: New database table storing all Strava-sourced activity records, separate from manually logged activities.
- **source**: A field on activity records indicating origin — either 'manual' or 'strava'.

---

## Requirements

### 1. Authentication Requirements

**1.1** WHEN a logged-in user views the dashboard AND their Strava account is not connected THEN the system SHALL display a "Connect Strava" button and the message: *"Connect your Strava account to automatically import walks and hikes."*

**1.2** WHEN a user clicks "Connect Strava" THEN the system SHALL redirect the user to the Strava OAuth 2.0 authorisation page requesting scopes `read` and `activity:read_all`.

**1.3** WHEN Strava redirects back to `/auth/strava/callback` with a valid authorisation code THEN the system SHALL exchange the code for an access token and refresh token and store both securely against the user record.

**1.4** WHEN storing Strava credentials THEN the system SHALL store: Strava athlete ID, access token, refresh token, and token expiry datetime.

**1.5** WHEN a Strava access token has expired THEN the system SHALL automatically use the refresh token to obtain a new access token before making any API call, without requiring user interaction.

**1.6** WHEN a user clicks "Disconnect Strava" THEN the system SHALL remove all stored Strava tokens and athlete ID for that user and display the disconnected state on the dashboard.

**1.7** WHEN Strava revokes a user's access (refresh token invalid) THEN the system SHALL mark the connection as disconnected and display: *"Your Strava connection needs to be reconnected."*

**1.8** WHEN a user connects Strava THEN the system SHALL display a privacy notice before the OAuth redirect: *"Camino Ready only reads your walking activities. No activities are published or modified. Data is used solely for training analysis."* The user must explicitly confirm before proceeding.

---

### 2. Activity Import Requirements

**2.1** WHEN a user successfully completes the Strava OAuth flow for the first time THEN the system SHALL automatically import up to 100 activities from the last 90 days.

**2.2** WHEN importing activities THEN the system SHALL import activities of type: Walk and Hike (mandatory). Run, Cycling, Gym, and Other activity types SHALL be configurable per deployment and disabled by default.

**2.3** WHEN importing a Strava activity THEN the system SHALL map fields as follows:

| Strava field | Imported field |
|---|---|
| `name` | `activity_name` |
| `distance` (metres) | `distance_meters` |
| `moving_time` (seconds) | `moving_time_seconds` |
| `total_elevation_gain` (metres) | `elevation_gain` |
| `start_date` | `start_date` |
| `sport_type` | `activity_type` |

**2.4** WHEN an imported activity's `strava_activity_id` already exists in the `imported_activities` table THEN the system SHALL skip that activity without error (no duplicate import).

**2.5** WHEN an activity is imported THEN the system SHALL record `source = 'strava'` and `imported_at = current UTC datetime`.

**2.6** WHEN displaying activities on the training dashboard THEN the system SHALL include imported Strava activities alongside manually logged activities in all totals and calculations.

**2.7** WHEN a user has both a manually logged activity and an imported Strava activity for the same session THEN the system SHALL display both; deduplication across sources is out of scope for Phase 2.

---

### 3. Sync Requirements

**3.1** WHEN the daily scheduled job runs (cron: `0 3 * * *`) THEN the system SHALL process all connected Strava accounts and import any new activities since the last successful sync.

**3.2** WHEN the daily sync runs for a user THEN the system SHALL first check whether the access token has expired and refresh it if necessary before fetching activities.

**3.3** WHEN a user clicks "Sync Now" on the dashboard THEN the system SHALL trigger an immediate sync for that user's account and display the result within 10 seconds.

**3.4** WHEN a sync completes successfully THEN the system SHALL record the sync timestamp and display it on the dashboard as *"Last synced: [date] [time]"*.

**3.5** WHEN the Strava API returns a rate limit error (HTTP 429) THEN the system SHALL stop processing for that user, log the error, and retry at the next scheduled sync window.

**3.6** WHEN a sync fails for any reason THEN the failure SHALL NOT affect other users' sync jobs running in the same cron execution.

---

### 4. Dashboard Requirements

**4.1** WHEN a user's Strava account is connected THEN the dashboard SHALL display:
- A "Connected to Strava" status indicator
- The timestamp of the last successful sync
- A "Sync Now" button
- A "Disconnect" link

**4.2** WHEN a user's Strava account is not connected THEN the dashboard SHALL display:
- The message: *"Connect your Strava account to automatically import walks and hikes."*
- A "Connect Strava" button

**4.3** WHEN the dashboard loads THEN imported Strava activities SHALL appear in the "My activities" table alongside manually logged activities, with a visual indicator showing source (e.g. "Strava" badge).

**4.4** WHEN the user views the overview page THEN all summary totals (weekly distance, activity counts) SHALL include both manually logged and Strava-imported activities.

---

### 5. Training Metrics Requirements

**5.1** WHEN calculating weekly distance THEN the system SHALL sum `distance_meters` from all activities (manual and imported) in the current calendar week and display the result in kilometres.

**5.2** WHEN calculating the longest walk THEN the system SHALL identify the single activity with the highest `distance_meters` across all time and display it in kilometres.

**5.3** WHEN calculating elevation practice THEN the system SHALL sum `elevation_gain` from all activities in the current calendar month and display the result in metres.

**5.4** WHEN calculating the Camino Readiness Score THEN the system SHALL produce a score between 0 and 100 using the following weighted formula:
- 40% — weekly distance relative to target
- 30% — longest single walk relative to Camino daily average
- 20% — cumulative elevation exposure
- 10% — training consistency (active days in last 30 days)

**5.5** WHEN displaying the Camino Readiness Score THEN the system SHALL show the numeric score and a plain-language label (e.g. Building base / On track / Camino ready).

---

### 6. Data & Privacy Requirements

**6.1** WHEN storing Strava tokens THEN the system SHALL NOT expose access tokens or refresh tokens in any API response, log output, or client-side code.

**6.2** WHEN a user disconnects Strava THEN the system SHALL delete all stored tokens for that user within the same request. Imported activity records SHALL be retained unless the user explicitly requests deletion.

**6.3** WHEN importing data THEN the system SHALL only read activity data. The integration SHALL NOT write to, modify, or delete any data in the user's Strava account.

**6.4** WHEN a user requests account deletion THEN the system SHALL delete all associated imported activities and Strava credentials.

**6.5** The system SHALL NOT share any user data or Strava tokens with third parties outside of the Cloudflare Workers and Supabase infrastructure used to run Camino Ready.

---

### 7. Error Handling Requirements

**7.1** WHEN the Strava OAuth callback receives an error parameter (user denied access) THEN the system SHALL redirect to the dashboard and display: *"Strava connection was cancelled."*

**7.2** WHEN a token refresh request fails THEN the system SHALL mark the connection as disconnected and notify the user on next login.

**7.3** WHEN the Strava API returns HTTP 429 (rate limit) THEN the system SHALL log the event, stop processing for the affected user, and retry at the next scheduled sync.

**7.4** WHEN the Strava API is unreachable or returns a 5xx error THEN the system SHALL log the error and retry at the next scheduled sync without surfacing a visible error to the user.

**7.5** WHEN an individual activity import fails THEN the system SHALL log the failure and continue importing remaining activities in the batch.

**7.6** WHEN any sync error occurs THEN the last successful sync timestamp SHALL remain unchanged until a successful sync completes.

---

### 8. Non-Functional Requirements

**8.1** WHEN a user initiates "Connect Strava" THEN the full OAuth flow from button click to dashboard redirect SHALL complete in under 30 seconds under normal network conditions.

**8.2** WHEN the initial import runs THEN 100 activities SHALL be processed and stored in under 15 seconds.

**8.3** WHEN the daily cron sync runs THEN it SHALL complete for all connected users within 5 minutes.

**8.4** WHEN the system stores Strava credentials THEN token fields SHALL be stored in the database only and SHALL NOT appear in Worker logs or be accessible via the public API.

**8.5** WHEN a Strava API call fails THEN the system SHALL NOT retry more than 3 times in a single sync window to avoid exhausting rate limits.