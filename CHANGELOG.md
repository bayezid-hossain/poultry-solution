# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [v1.0.51] - 2026-05-03

### Fix
- Fixed average weight when rejected birds

## [v1.0.45] - 2026-03-30

### Add
- Rejected birds added in sale and adjust sale function

### Fix
- Report DOC Placement

## [v1.0.44] - 2026-03-24

### Fix
- Transfer now depends on main stock instead of remaining stock

### Fix
- Spacing in stock ledger page now shows log type perfectly

## [v1.0.43] - 2026-03-16

### Fix
- Stock change type fixed

### Added
- Party name display

## [v1.0.42] - 2026-03-11

### Add
- Balance in every log of ledger

### Fix
- Search in sales page fixed

## [v1.0.41] - 2026-03-11

### Fix
- Adjust and Sell modal decimal problem fixed!

### Fix
- Order message fix

### Fix
- Farmer name in date of sales page

### Fix
- Management Cycle permission
## [v1.0.40] - 2026-03-11

## [v1.0.39] - 2026-03-11


## [v1.0.38] - 2026-03-10

### Added
- Main stock adjustment fixed

## [v1.0.37] - 2026-03-10

### Added
- Track previous or next sale by button

## [v1.0.32] - 2026-03-08

### Fix
- Sales group by date

### Added
- DOC input date added

## [v1.0.29] - 2026-03-05

### Added
- **Pull-to-Refresh:** Manager mode Overview, Officers, and Members pages now support pull-to-refresh for live data updates.
- **Member Role in Pending Approvals:** The pending approvals list in the Members page now displays the requested role (Officer/Manager) for each pending member.
- **Confirm Modals for Member Actions:** Replaced system alert dialogs for Deactivate/Activate and Remove member actions with themed bottom sheet confirm modals, including a loading indicator while processing.
- **Social Auth Flag:** Created a module-level auth flag (`lib/social-auth-flag.ts`) that persists across React remounts to prevent sign-in page flashes when returning from Google authentication.

### Changed
- **Splash Screen:** Removed the app logo from the native Android splash screen. Now shows a plain background color only — the BirdyLoader is the sole animated loader throughout the app.
- **ConfirmModal Component:** Enhanced with `isLoading` prop support to show an ActivityIndicator on the confirm button while waiting for API responses.

### Fixed
- **Auth State Leakage:** Added `queryClient.clear()` to all sign-out paths (settings, pending-approval, error boundary) and sign-in/sign-up success flows to prevent stale cached data from previous sessions leaking into new logins.
- **Stale Pending Approval Screen:** Fixed an issue where logging out and signing in as a different user would briefly show the previous user's "Waiting for Approval" screen due to cached membership data.
- **Join Org / Pending Approval Delays:** Replaced manual `router.replace()` navigation with `trpc.useUtils().invalidate()` to let the AuthGuard handle routing, eliminating race conditions and delays.
- **Social Sign-In Flash:** Fixed the "Connecting securely..." overlay disappearing and briefly revealing the sign-in form when returning from Google OAuth, by using a module-level flag set before opening Chrome Custom Tab.
- **Sign-Out Loop:** Fixed infinite loading loop after sign-out caused by persistent deep link URLs re-triggering the auth callback detection. Implemented URL consumption via `consumedUrlRef`.
- **Sign-Out Loading Flash:** Eliminated the "Synchronizing" loader appearing during sign-out by detecting sign-out state (`hadSessionRef`) and bypassing all loading states for immediate redirect to sign-in.
- **Access Level Updates:** Disabled role and access level update buttons for non-OWNER users in the Members screen, matching backend restrictions.

## [v1.0.27] - 2026-03-04

### Added
- **Interactive Tour Guide:** Added a comprehensive step-by-step Interactive Tutorial in the sidebar to help new Officers and Managers learn the system.
- **Deep-Dive Explanations:** The tutorial explicitly explains hidden features, including FCR/EPI math, Smart Watchdog rules, auto-reopening logic, and cascade updates.
- **Safety Limits Documented:** Added clear documentation on system bounds (e.g., maximum limits for stock entries, DOC counts, and backdating rules) to prevent user errors.

### Fix
- Added Branch Name and Officer Name auto-fill explanation in Orders and Reports workflows.
- Adjusted tutorial accessibility and persistence to ensure users only see relevant tips based on their current Role (Manager vs Officer) and active Mode.
## [v1.0.26] - 2026-03-03

### Fix
- Pro guard for backdate cycle modal

## [v1.0.25] - 2026-03-03

### Fix
- Added loader for Confirm Adjustment button in the Adjust Sale Modal.

### Fix
- Farmer list loader added

### Fix
- Sale details loader now closes after all calculation.

### Fix
- Branch input background color changed to transparent.

### Fix
- Farmer header details updated

### Added
- Cycle Backdate! You can now change the cycle start and end date accordingly without affecting any conflict with other records!

## [v1.0.24] - 2026-03-02

### Added
- Branch info is automatically fileld in orders

### Added
- Orders can be deleted after confirmation now

## [v1.0.23] - 2026-03-02

### Fix
- Pop up update modal once

### Fix
- Farmer delete update farmer list

### Added
- Other cycles can be seen now

## [v1.0.20] - 2026-03-02

### Added
- Storage Selection once

## [v1.0.18] - 2026-03-02

### Changed
- Officer name font size increased in report

### Added
- Officer information is available in reports now

### Added
- Now users can edit their name, mobile number and branch!

## [v1.0.17] - 2026-03-02

### Added
- Dark Mode added

## [v1.0.16] - 2026-03-02

### Added
- Beautiful loader in download all reports button

### Changed
- Color combination of download all reports changed

### Added
- Officer name in report header

## [v1.0.15] - 2026-03-02

### Added
- Previously sold value in message of sale event

### Changed
- Show only age in sale report

### Added
- Shows reverting changes in download all report button when stopped

### Changed
- All report download progress bar

### Fix
- officer selector keyboard popup

### Changed
- Cannot save file while all reports are being generated

### Added
- Download all Reports cancellation

### Added
- Download all Reports

### Changed
- File naming and directory now follows Year/Month/Date/FileName-Version format

### Changed
- Officer selector design updated

### Added
- Officer selector searchability

### Fixed
- Ranged Reports date [month] fixed

## [v1.0.14] - 2026-03-02

### Added
- Version checker show only once per session

### Added
- New update modal with version comparison.
- Manual update check in Settings.
- Session-based update dismissal.
- Custom premium alert modals for status messages.

### Fixed
- Date format consistency in PDF and Excel reports (`formatLocalDate`).
- Group header labels in DOC Placements and Sales Ledger reports.
