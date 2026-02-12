# Changelog

All notable changes to SmyrnaTools will be documented in this file.

## [9.3] - 2026-02-12

- Updated the expand/collapse button in `DashboardPlantSummary.jsx` to prevent event propagation with `e.stopPropagation()`.
- Changed the styling of the expand/collapse button in `DashboardPlantSummary.jsx`, including background color to `#f0f9ff`, added a border of `1px solid #bae6fd`, set border radius to `8px`, updated text color to `#0369a1`, and adjusted padding to `6px 12px`.

## [9.2] - 2026-02-12

- Added new file `DashboardPlantSummary.jsx` to handle detailed plant summary views with features like expandable alert sections, asset buttons, and metric cards.
- Implemented interactive UI components in `DashboardPlantSummary.jsx` including tab navigation, minimization toggles, and dynamic content rendering based on notifications and metrics.
- Refactored `DashboardView.jsx` to reduce codebase by removing or consolidating 687 lines, likely extracting functionality to the new `DashboardPlantSummary.jsx` component.

## [9.1] - 2026-02-12

- Updated status color coding for 'Spare' status to use a new background color '#f3e8ff' and text color '#7c3aed' in ListViewModeSection.jsx, EquipmentsView.jsx, PickupTrucksView.jsx, and TrailersView.jsx
- Added new status color coding for 'In Shop' with background color '#dbeafe' and text color '#1e40af' in ListViewModeSection.jsx, EquipmentsView.jsx, PickupTrucksView.jsx, and TrailersView.jsx
- Introduced new status 'Down In Yard' with background color '#fee2e2' and text color '#dc2626' in ListViewModeSection.jsx
- Introduced new status 'Waiting For Shop' with background color '#ffedd5' and text color '#c2410c' in ListViewModeSection.jsx
- Introduced new status 'Third Party Work' with background color '#fef9c3' and text color '#a16207' in ListViewModeSection.jsx

## [9.0] - 2026-02-12

- Updated status color schemes in `MixersView.jsx` for multiple statuses:
  - Changed 'Spare' background to '#f3e8ff' and color to '#7c3aed'
  - Changed 'Waiting For Shop' background to '#ffedd5' and color to '#c2410c'
  - Changed 'Down In Yard' background to '#fee2e2' and color to '#dc2626'
  - Changed 'Third Party Work' background to '#fef9c3' and color to '#a16207'
- Updated status color schemes in `TractorsView.jsx` for 'Spare' status:
  - Changed background to '#f3e8ff' and color to '#7c3aed'
- Reordered status checks in both `MixersView.jsx` and `TractorsView.jsx` to ensure 'In Shop' status is handled consistently

## [8.9] - 2026-02-12

- Added new component `StatusHistoryBar.jsx` to display status history as a visual bar with percentage-based status durations for various item types.
- Implemented status history tracking in `StatusHistoryBar.jsx` with support for multiple item types including equipment, mixers, operators, pickup trucks, tractors, and trailers.
- Updated `EquipmentsView.jsx` to integrate the `StatusHistoryBar` component for displaying equipment status history.
- Updated `MixersView.jsx` to include the `StatusHistoryBar` component for mixer status history visualization.
- Updated `OperatorsView.jsx` to incorporate the `StatusHistoryBar` component for operator status history.
- Updated `PickupTrucksView.jsx` to add the `StatusHistoryBar` component for pickup truck status history display.
- Updated `TractorsView.jsx` to integrate the `StatusHistoryBar` component for tractor status history.
- Updated `TrailersView.jsx` to include the `StatusHistoryBar` component for trailer status history visualization.

## [8.8] - 2026-02-12

- Optimized `VideoBackground` component in `src/components/common/VideoBackground.jsx` by wrapping it with `React.memo` to prevent unnecessary re-renders.
- Removed video preloading and rotation logic in `VideoBackground.jsx`, simplifying the component to use a single randomly selected video without cycling.
- Updated event handling in `VideoBackground.jsx` by replacing `onLoadedMetadata`, `onTimeUpdate`, and `onEnded` with `onCanPlay` for better video playback control.
- Changed video behavior in `VideoBackground.jsx` to loop continuously instead of switching videos on completion.
- Adjusted styling in `VideoBackground.jsx` by updating the fallback background to a gradient and reducing transition opacity duration from 1.5s to 1s.
- Removed dynamic key prop from the video element in `VideoBackground.jsx` to maintain consistent rendering.
- Added lazy loading for `VideoBackground` component in `src/views/login/LoginView.jsx` using `React.lazy` and `Suspense` for improved performance.

## [8.7] - 2026-02-12

- Reworked TractorSelectModal in `src/views/trailers/TractorSelectModal.jsx` to improve UI and functionality:
  - Replaced `searchTerm` with `searchText` and introduced `sortAvailableFirst` state for sorting tractors.
  - Removed filter options ('all', 'available', 'samePlant') and simplified filtering logic to include search by truck number and assigned plant.
  - Added sorting logic to prioritize available tractors when `sortAvailableFirst` is enabled.
  - Updated modal UI with new styling, including a modern backdrop, rounded corners, and improved search input design.
  - Added auto-focus to the search input and refined clear search functionality with a styled button.
- Updated `src/views/trailers/TrailerDetailView.jsx` with minor changes to integrate with the revised TractorSelectModal (exact changes not fully visible in truncated diff).
- Modified `supabase/functions/trailer-service/index.ts` with a small update (exact change not fully visible in truncated diff).

## [8.6] - 2026-02-12

- Implemented lazy loading for view components in `src/app/App.js` to improve performance by dynamically importing components like `CalculatorView`, `DashboardView`, and others.
- Added a `LoadingFallback` component in `src/app/App.js` to display a spinner during component loading with `Suspense`.
- Optimized event handlers in `src/app/App.js` by wrapping `handleViewSelection`, `handleSetSelectedView`, `handleRetryConnection`, `handleReloadIfOnline`, and `handleCloseWebView` with `useCallback` to prevent unnecessary re-renders.
- Updated import order in `src/app/App.js` to include `./index.css` after `./App.css`.
- Added memoization to the `LoadingFallback` component in `src/app/App.js` to prevent unnecessary re-renders.

## [8.5] - 2026-02-12

- Added `ReportsStatsCards` component in `ReportsView.jsx` to display statistics for both 'all' and 'review' tabs when data is loaded.
- Introduced `ReportsEmptyState` component in `ReportsView.jsx` to handle empty states for 'all' and 'review' tabs when no reports are available.
- Modified `MyReportsList.jsx` to return `null` instead of an empty state message when `weeksToShow` is empty and loading is complete.
- Enhanced `MyReportsList.jsx` with a new `getDueDateStatus` function to calculate and display due date status with color-coded urgency indicators (Overdue, Due Today, Due Tomorrow, days left).
- Updated `MyReportsList.jsx` to style table rows with a colored left border for urgent due dates based on the status returned by `getDueDateStatus`.

## [8.4] - 2026-02-12

- Added new hook `usePagination.js` for handling pagination logic with features like page navigation and page size adjustment.
- Introduced `useReportSubmission.js` hook for managing report submissions, including functions for building data, finding existing reports, saving reports, and handling manager edits.
- Created `useReportsData.js` hook to manage report data fetching and processing.
- Added `useReviewData.js` hook for handling review-related data operations.
- Implemented `useSubmitData.js` hook to support data submission processes.
- Developed `useSubmitForm.js` hook for managing form submission logic.
- Refactored `ReportsReviewView.jsx` with updates to improve review functionality (significant code changes observed).
- Overhauled `ReportsSubmitView.jsx` with extensive modifications to submission UI and logic (major reduction in lines indicating cleanup or restructuring).
- Updated `ReportsView.jsx` with significant changes to the main reports interface (substantial code reduction suggesting optimization).
- Added new components for reports including `ConfirmationModal.jsx`, `ErrorModal.jsx`, `MyReportsList.jsx`, `ReportsToolbar.jsx`, `ReviewReportsList.jsx`, and `SubmitHeader.jsx`.
- Introduced new styling files for reports views: `ReportsReviewViewStyles.js`, `ReportsSubmitViewStyles.js`, and `ReportsViewStyles.js` to enhance UI consistency and design.

## [8.3] - 2026-02-12

- Added a new "Production vs Labor" chart in `DashboardCharts.jsx` to display weekly production data with yards and hours, including a custom tooltip showing yards, hours, and YPH (Yards Per Hour) for each week.
- Included summary statistics below the "Production vs Labor" chart in `DashboardCharts.jsx`, showing total yards, total hours, and average YPH.
- Removed the "Fleet Uptime vs Downtime" chart from `DashboardCharts.jsx` that was previously displayed with `shopTimeData`.
- Added grouping comments in `DashboardCharts.jsx` to organize charts into "PRODUCTION & EFFICIENCY GROUP" and "LOSS & RECOVERY GROUP" sections.

## [8.2] - 2026-02-12

- Added Recharts library components (Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis) to DashboardView.jsx for data visualization.
- Replaced the previous status color and sorting logic in DashboardView.jsx with a new STATUS_COLORS object for consistent color mapping.
- Implemented a new chartData structure in DashboardView.jsx to display percentage data for different equipment types (Mixers, Tractors, Trailers, etc.) in a bar chart format.
- Removed the previous bar mapping and sorting logic for equipment status display in DashboardView.jsx, replacing it with a structured chart data approach.

## [8.1] - 2026-02-12

- Added `recharts` library version 3.7.0 to dependencies in `package.json` and `package-lock.json` for chart visualization support.
- Introduced `@reduxjs/toolkit` version 2.11.2 and related dependencies in `package-lock.json` for state management.
- Added D3-related type definitions and libraries (`@types/d3-*`, `d3-array`, `d3-color`, etc.) in `package-lock.json` to support data visualization features.
- Included `clsx` version 2.1.1 in `package-lock.json` for utility class name manipulation.
- Created new file `src/views/dashboard/DashboardCharts.jsx` to implement chart components for the dashboard.
- Updated `src/views/dashboard/DashboardView.jsx` with 14 lines of new code, likely integrating the new chart components.

## [8.0] - 2026-02-11

- Added `trailerType` field to the `slimTrailer` function in `src/utils/DashboardUtility.js` with a default value of 'Cement' if not specified.
- Enhanced trailer statistics in `src/views/dashboard/DashboardView.jsx` to track totals by `trailerType`, specifically for 'Cement' and 'End Dump' categories, including counts for active, shop, spare, and total trailers per type.
- Updated trailer status counting logic in `src/views/dashboard/DashboardView.jsx` to categorize trailers by type ('Cement' or 'End Dump') when updating totals.
- Added a new UI section in `src/views/dashboard/DashboardView.jsx` to display trailer type statistics for 'Cement' and 'End Dump', with custom icons and formatted counts for each category.

## [7.9] - 2026-02-11

- Replaced "Verified" percentage pill with "Allocated" percentage pill for mixers in DashboardView.jsx, with conditional background and text color based on allocation percentage thresholds (80% green, 50% yellow, below 50% red).
- Replaced "Verified" percentage pill with "Allocated" percentage pill for tractors in DashboardView.jsx, with conditional background and text color based on allocation percentage thresholds (80% green, 50% yellow, below 50% red).
- Added "Allocated" percentage pill for trailers in DashboardView.jsx, with conditional background and text color based on allocation percentage thresholds (80% green, 50% yellow, below 50% red).
- Added "Allocated" percentage pill for equipment in DashboardView.jsx, with conditional background and text color based on allocation percentage thresholds (80% green, 50% yellow, below 50% red).

## [7.8] - 2026-02-11

- Added `freight` property to tractor data in `src/utils/DashboardUtility.js` to include freight type information.
- Enhanced tractor statistics in `src/views/dashboard/DashboardView.jsx` to track and display freight type categories (Cement, Aggregate, Dump Truck, Other) with respective counts for active, shop, and spare statuses.
- Added UI components in `src/views/dashboard/DashboardView.jsx` to visually represent freight type statistics for tractors with icons and formatted displays.
- Updated tractor status tracking logic in `src/views/dashboard/DashboardView.jsx` to categorize and count tractors by freight type and status.

## [7.7] - 2026-02-11

- Updated sorting logic in `MixersView.jsx` to include 'Active' status alongside 'In Shop' and 'Spare' for mixer status comparison.
- Modified date calculation for sorting in `MixersView.jsx` to fallback to `createdAt` if `statusChangedAt` is not available.

## [7.6] - 2026-02-11

- Added cleanliness rating check in MixerDetailView.jsx to block setting a mixer to "Active" status if cleanliness rating is less than 3 stars.
- Implemented visual feedback in MixerDetailView.jsx with a warning message and icon when cleanliness rating blocks "Active" status.
- Disabled the "Active" option in the status dropdown in MixerDetailView.jsx when cleanliness rating is less than 3 stars, with a note indicating the requirement.
- Added restriction in MixerDetailView.jsx to prevent operator assignment if cleanliness rating is less than 3 stars.
- Displayed a warning message in MixerDetailView.jsx when cleanliness rating blocks operator assignment, indicating the 3+ stars requirement.
- Updated button disabled state and styling in MixerDetailView.jsx for operator selection to reflect cleanliness rating restrictions.

## [7.5] - 2026-02-11

- Added sorting logic to `validAssignments` in `PlanView.jsx` to order assignments numerically by `fromPlant` and then by `toPlant`.

## [7.4] - 2026-02-11

- Updated plant code filtering logic in `ListService.js` to exclude 'All' option from filtering condition in `getFilteredItems`.
- Modified plant selection logic in `FleetUtility.js` to handle 'All' option in `countUnassignedActiveOperators` for active operator counting.
- Added support for 'All' plant selection in filtering across multiple views:
  - `EquipmentsView.jsx` for equipment filtering.
  - `ManagersView.jsx` for manager filtering.
  - `MixersView.jsx` for mixer filtering.
  - `OperatorsView.jsx` for operator filtering and equipment assignment checks.
  - `PickupTrucksView.jsx` for pickup truck filtering.
  - `ReportsView.jsx` for report filtering.
  - `TractorsView.jsx` for tractor filtering.
  - `TrailersView.jsx` for trailer filtering.

## [7.3] - 2026-02-11

- Updated PlantDropdownModal.jsx to change the onSelect value from 'All' to an empty string ('') when selecting the corresponding option.

## [7.2] - 2026-02-08

- Updated AI history summary prompt in `src/app/ai/context.json` to focus on overall trends and positive patterns, only flagging excessive changes as concerns (e.g., 20+ assignment changes in under 3 months).
- Modified `HistoryViewSection.jsx` to use `handleRegenerateAISummary` for regenerating AI summaries instead of inline function logic.
- Removed operator turnover warning logic from `AIService.js` when operator changes exceed 5.
- Added copy-to-clipboard functionality for identifying numbers in `EquipmentsView.jsx`, `MixersView.jsx`, `OperatorsView.jsx`, `PickupTrucksView.jsx`, `TractorsView.jsx`, and `TrailersView.jsx` with visual feedback on copy action.
- Enhanced UI in `MixersView.jsx`, `OperatorsView.jsx`, `PickupTrucksView.jsx`, `TractorsView.jsx`, and `TrailersView.jsx` with additional data fields and interactive elements like status indicators and action buttons.
- Updated `MyAccountView.jsx` with minor UI or logic adjustments related to user account display or functionality.

## [7.1] - 2026-02-08

- Updated branding text in LoginView.jsx from "Ready Mix" to "Tools" in the login page header.

## [7.0] - 2026-02-06

- Updated padding for `.login-panel` class in `LoginView.jsx` to `0.75rem` at max-width of 480px.
- Removed specific padding and border-radius styles for `.login-panel > div` at max-width of 480px in `LoginView.jsx`.

## [6.9] - 2026-02-06

- Updated `GeneralManagerExport.js` to handle trainer field in `createWeekSheet` function by displaying 'Not Assigned' when the trainer value is empty or not a valid string.
- Enhanced responsive design in `LoginView.jsx` by adjusting padding and layout for the login panel at different screen sizes, including specific styles for screens smaller than 480px.

## [6.8] - 2026-02-06

- Added a grid background pattern to the login panel in `src/views/login/LoginView.jsx` using `backgroundImage` with a linear gradient for a subtle grid effect.
- Enhanced the login panel container styling in `src/views/login/LoginView.jsx` by adding a white background, border radius, box shadow, increased max width to 380px, and padding for a more polished look.

## [6.7] - 2026-02-06

- Added dynamic statistics display for assets, operators, and plants on the login screen in `src/views/login/LoginView.jsx`.
- Implemented data fetching from Supabase for counts of mixers, tractors, trailers, heavy equipment, operators, and plants in `LoginView.jsx`.
- Introduced animated number transitions for displaying statistics with a smooth easing effect over 2 seconds in `LoginView.jsx`.
- Enhanced UI styling for input fields and labels with focus states and transitions in `LoginView.jsx`.
- Updated layout and design of the login page with new styles for logo, text, and overall structure in `LoginView.jsx`.

## [6.6] - 2026-02-06

- Simplified error handling in `setAISummaryToCache` and `clearAISummaryCache` functions by removing explicit `return` statements in catch blocks in `src/utils/DashboardUtility.js`.
- Refactored `buildPlantSet` function in `src/utils/DashboardUtility.js` to improve readability by assigning `regionPlants || []` to a variable before iteration.

## [6.5] - 2026-02-06

- Added new file `src/utils/DashboardUtility.js` with utility functions for dashboard data processing, including `slimMixer`, `slimTractor`, `slimTrailer`, `slimEquipment`, `slimPickup`, and `slimOperator` for data normalization.
- Implemented `isServiceOverdue` and `normalizeDate` functions in `DashboardUtility.js` to handle service overdue checks and date normalization.
- Introduced `calculateStatusDistribution` function in `DashboardUtility.js` to compute status distribution of assets over a specified date range.
- Updated `src/views/dashboard/DashboardView.jsx` with significant refactoring, though specific changes are not detailed in the provided diff excerpt.

## [6.4] - 2026-02-06

- Added a grid background effect to the Navigation component in src/components/common/Navigation.jsx using a linear gradient pattern.
- Added a subtle grid background effect to the dashboard view in src/views/dashboard/DashboardView.jsx with a linear gradient pattern.

## [6.3] - 2026-02-06

- Updated styling in Navigation.jsx by removing background grid image and adjusting box shadow from '0 4px 20px' to '0 2px 8px' with reduced opacity.
- Removed background grid and radial gradient image from DashboardView.jsx in the dashboard container styling.
- Adjusted card shadow in DashboardView.jsx from 'shadow-lg' to 'shadow-md' for a subtler effect.
- Changed icon background opacity in DashboardView.jsx from 'bg-white/10' with backdrop blur to 'bg-white/15'.
- Removed 'animate-pulse' and 'animate-fadeOut' effects from notification styling in DashboardView.jsx for failed AI summaries.
- Added new CSS animations in DashboardView.jsx: 'cursorBlink' for a blinking cursor effect and 'fadeSlideIn' for a smooth entry animation.
- Applied 'cursorBlink' animation to the typing cursor in DashboardView.jsx with a 1-second step-end infinite loop.

## [6.2] - 2026-02-05

- Updated PlanView.jsx to display effective and base values alongside percentage in stat displays
- Modified allocation bar in PlanView.jsx to show effective/base values with percentage in the UI

## [6.1] - 2026-02-05

- Updated `Mixer.js` to replace `downInYard` property with `shopStatus` for more detailed status tracking of mixers.
- Modified `MixerCard.jsx` to handle multiple shop statuses (`down_in_yard`, `waiting_for_shop`, `third_party`) with corresponding color coding and display text.
- Enhanced `MixerDetailView.jsx` to support the new `shopStatus` field instead of `downInYard`, including UI updates and data handling for different shop status values.
- Adjusted related views and components in `MixersView.jsx` to reflect the change from `downInYard` to `shopStatus` for consistency in status representation.
- Updated backend logic in `supabase/functions/mixer-service/index.ts` to accommodate the new `shopStatus` field in mixer data processing.

## [6.0] - 2026-02-05

- Updated README.md to remove specific details about the operational scope, specifically the references to "24 states" and "100+ plants", simplifying the description of SRM Tools.

## [5.9] - 2026-02-05

- Added error logging for operator comments count fetch in `OperatorService.js`.
- Implemented status change history tracking in `OperatorService.js` by fetching data from `operators_history` table and mapping the latest `changed_at` date for each operator's status change.
- Added `createdAt` and `statusChangedAt` fields to operator data in `OperatorService.js`, with `statusChangedAt` falling back to `created_at` if no history is available.
- Enhanced `OperatorsView.jsx` to display the duration of an operator's current status in days next to the status badge (excluding 'Terminated' status), using either `statusChangedAt` or `createdAt`.
- Added a visual comment count badge in `OperatorsView.jsx` on the comments action button, displaying the number of comments (showing '9+' if count exceeds 9), with specific styling for positioning and appearance.
- Adjusted styling of the comments action button in `OperatorsView.jsx` to include `position: 'relative'` for proper badge placement.

## [5.8] - 2026-02-05

- Added `showReturnTime` state property to control visibility of the return time field in `PlanView.jsx`.
- Modified assignment loading in `fetchUserPlan` to include `showReturnTime` based on existing `returnTime` or explicitly set value.
- Updated UI to conditionally display a button to add a return time when `showReturnTime` is false, and show the return time input field when `showReturnTime` is true.
- Added functionality to toggle `showReturnTime` for an assignment via a button click in `PlanView.jsx`.

## [5.7] - 2026-02-05

- Added functionality to fetch comment counts for various asset types in services:
  - Implemented `fetchAllCommentsCounts` in `EquipmentService.js` for heavy equipment.
  - Implemented `fetchAllCommentsCounts` in `MixerService.js` for mixers.
  - Implemented `fetchAllCommentsCounts` in `OperatorService.js` for operators.
  - Implemented `fetchAllCommentsCounts` in `PickupTruckService.js` for pickup trucks.
  - Implemented `fetchAllCommentsCounts` in `TractorService.js` for tractors.
  - Implemented `fetchAllCommentsCounts` in `TrailerService.js` for trailers.
- Added functionality to fetch open issues counts for various asset types in services:
  - Implemented `fetchAllIssuesCounts` in `EquipmentService.js` for heavy equipment.
  - Implemented `fetchAllIssuesCounts` in `MixerService.js` for mixers.
  - Implemented `fetchAllIssuesCounts` in `PickupTruckService.js` for pickup trucks.
  - Implemented `fetchAllIssuesCounts` in `TractorService.js` for tractors.
  - Implemented `fetchAllIssuesCounts` in `TrailerService.js` for trailers.
- Enhanced `EquipmentService.js` to track status change history with `fetchEquipmentsWithDetails`, adding `statusChangedAt` field to equipment data.
- Updated views to likely integrate the new comment and issue count functionalities (exact UI changes not visible in diff but inferred from file modifications):
  - Modified `EquipmentsView.jsx` for equipment.
  - Modified `MixersView.jsx` for mixers.
  - Modified `OperatorsView.jsx` for operators.
  - Modified `PickupTrucksView.jsx` for pickup trucks.
  - Modified `TractorsView.jsx` for tractors.
  - Modified `TrailersView.jsx` for trailers.

## [5.6] - 2026-02-05

- Added comment count badge to the comments button in MixersView.jsx, displaying the number of comments for each item with a styled badge showing up to "9+" if the count exceeds 9.
- Added open issues count badge to the issues button in MixersView.jsx, displaying the number of open issues for each item with a styled badge showing up to "9+" if the count exceeds 9.
- Updated button styles in MixersView.jsx for both comments and issues buttons to include `position: 'relative'` to support badge positioning.

## [5.5] - 2026-02-04

- Updated sorting logic in MixersView.jsx for the 'Status' column to prioritize different statuses with a specific order: Active (1), Spare (2), In Shop without downInYard (3), In Shop with downInYard (4), Retired (5), and others (6).
- Added secondary sorting by days since status change for 'Spare' and 'In Shop' statuses in MixersView.jsx, using the statusChangedAt field to calculate elapsed days.

## [5.4] - 2026-02-04

- Added `@vercel/speed-insights` package version 1.3.1 to project dependencies in `package.json` and `package-lock.json`
- Integrated Vercel Speed Insights by importing and rendering the `SpeedInsights` component from `@vercel/speed-insights/react` in `src/app/App.js`

## [5.3] - 2026-02-04

- Updated `CommentModalSection.jsx` to improve comment display and interaction:
  - Added relative time formatting for comment timestamps (e.g., "Just now", "5m ago").
  - Introduced avatar initials and gradient backgrounds for comment authors.
  - Simplified backdrop click handling to close the modal.
  - Optimized error handling for comment operations by removing explicit error parameters.
  - Enhanced UI with updated styles for comments, avatars, and modal layout (styles truncated in diff).
- Enhanced `IssueModalSection.jsx` with significant updates (exact changes not fully visible in truncated diff, but file shows substantial modifications).
- Modified `AIService.js` with minor updates or fixes (specific changes not fully visible in diff stats).
- Improved `DashboardView.jsx` with updates to dashboard functionality or UI (specific changes not fully visible in diff stats).
- Updated `PlanView.jsx` with enhancements to planning features or layout (specific changes not fully visible in diff stats).
- Removed or modified content in `ReportsSubmitView.jsx` (specific changes not fully visible, but deletions noted in diff stats).

## [5.2] - 2026-02-03

- Added Vercel Analytics integration with `@vercel/analytics` package in `package.json` and `package-lock.json`, and included the `<Analytics />` component in `src/app/App.js`.
- Enhanced Mixer model in `src/models/mixers/Mixer.js` to include `statusChangedAt` property for tracking status change timestamps.
- Updated `MixerService.js` to fetch and map status change history from `mixers_history` table in Supabase, associating `statusChangedAt` with each mixer during data processing in `fetchMixersWithDetails`.
- Modified `MixersView.jsx` to display the duration of a mixer's status based on `statusChangedAt` instead of `updatedAt` for non-retired mixers, improving accuracy of status duration display.

## [5.1] - 2026-02-03

- Removed PropTypes import and related prop type definitions from src/app/App.js
- Removed VideoBackground component import and usage from src/app/App.js
- Removed useVersionPolling hook import from src/app/App.js
- Removed VersionPopup component and its associated code from src/app/App.js
- Removed UpdateLoadingScreen component and its associated code from src/app/App.js
- Removed UpdateWarningPopup component and its associated code from src/app/App.js
- Removed ScheduledUpdateBanner component and its associated code from src/app/App.js

## [5.0] - 2026-02-03

- Added `overflow: 'hidden'` to the card style in `PlanView.jsx` to prevent content overflow.
- Updated button styles in `PlanView.jsx` for mobile responsiveness:
  - Changed `flex` property to `flex: isMobile ? '1 1 auto' : 'none'` for `tabBtn`, `newPlanBtn`, and `dangerBtn`.
  - Adjusted `fontSize` to `isMobile ? '0.8125rem' : '0.875rem'` for `tabBtn`, `newPlanBtn`, and `dangerBtn`.
  - Modified `padding` to `isMobile ? '0.5rem 0.75rem' : '0.5rem 1rem'` for `tabBtn`, `newPlanBtn`, and `dangerBtn`.

## [4.9] - 2026-02-03

- Enhanced mobile responsiveness in `PlanView.jsx` by adjusting layout styles for mobile devices, including full-width date inputs, flexible header actions, and column-based layouts for configuration forms and buttons.
- Added a mobile-specific allocation card in `PlanView.jsx` to display allocation statistics with a grid layout for better visibility on smaller screens.
- Modified grid layout in `PlanView.jsx` to display a single column on mobile devices instead of multiple columns for card rows.
- Adjusted spacing and visibility of elements in `PlanView.jsx` for mobile view, such as hiding the config arrow and adding margin to mixer counts row.
- Updated the empty message text in `PlanView.jsx` to provide more context about the purpose of the generated message for plant managers.
- Removed validation logic for plant production reports in `ReportsSubmitView.jsx` when saving drafts under specific conditions involving manager edit users.

## [4.8] - 2026-02-03

- Added new CSS styles in `CardSection.jsx` for detailed row layouts with classes like `detail-row`, `detail-label`, and `detail-value`
- Introduced styling for overdue values with a distinct color and weight in `CardSection.jsx`
- Added styles for a star rating system with `stars-container`, `filled-star`, and `empty-star` classes in `CardSection.jsx`
- Implemented styling for an "in-yard" badge with specific colors and formatting in `CardSection.jsx`
- Moved inline styles to a separate `cardStyles` string and injected them using a `<style>` tag in `CardSection.jsx`
- Wrapped the main `div` content of `CardSection.jsx` in a React fragment (`<>...</>`) to include the style tag

## [4.7] - 2026-02-03

- Updated status display in `MixerCard.jsx` to show "Down In Yard" instead of a separate badge when a mixer is in shop and down in the yard.
- Added specific color coding for "Down In Yard" status in `MixerCard.jsx` using `var(--error)` color.
- Modified status display in `MixersView.jsx` to combine "In Shop" and "downInYard" into a single "Down In Yard" status label.
- Added new background and text color styling for "Down In Yard" status in `MixersView.jsx` with background `#fef2f2` and text color `#991b1b`.
- Removed separate "IN YARD" badge styling from `MixersView.jsx` and integrated it into the main status badge.

## [4.6] - 2026-02-03

- Updated `MixerDetailView` in `MixersView.jsx` to pass `selectedMixer.id` instead of `selectedMixer` as the `mixerId` prop.

## [4.5] - 2026-02-03

- Updated `MixerDetailView` in `MixersView.jsx` to pass `selectedMixer.id` instead of `selectedMixer` as the `mixerId` prop.

## [4.4] - 2026-02-03

- Added conditional rendering to hide the Active Mixers section in ReportsSubmitView.jsx for the 'general_manager' report type.
- Restructured the DOM hierarchy in ReportsSubmitView.jsx by wrapping the Active Mixers content in an additional div element for better styling or layout control.

## [4.3] - 2026-02-03

- Removed support for `generatedMessage` parameter in `saveUserPlan` function in `src/services/PlanService.js`
- Updated `PlanView.jsx` to remove references to `generatedMessage` in state and function calls
- Modified `supabase/functions/plan-service/index.ts` to exclude `generatedMessage` from request body parsing and database operations

## [4.2] - 2026-02-03

- Removed the `user_plans` table and associated indexes from `sql/users_plans.sql`
- Removed row-level security configuration and access policy for the `user_plans` table

## [4.1] - 2026-02-03

- Added a new `pulse` animation keyframe in `src/app/index.css` for visual effects.
- Introduced loading indicator styles (`msgLoading`, `msgLoadingDots`, `msgLoadingDot`, `msgLoadingText`) in `src/views/plan/PlanView.jsx` for displaying a loading state during message generation.
- Removed `AIService` import from `src/views/plan/PlanView.jsx`, indicating a potential shift away from AI-related functionality.
- Refactored `generateMessage` function in `src/views/plan/PlanView.jsx` to handle message formatting directly within the component, replacing previous logic with a simplified structure for assignment messages.
- Removed `getPlantName` utility function from `src/views/plan/PlanView.jsx` as it is no longer used in the updated message generation logic.
- Updated message formatting in `src/views/plan/PlanView.jsx` to include custom operator times, staggered schedules, and visual dividers for better readability in the generated plan message.

## [4.0] - 2026-02-03

- Added new Plan feature with a dedicated view in `src/views/plan/PlanView.jsx` for managing user plans and assignments.
- Integrated Plan navigation item in `src/components/common/Navigation.jsx` with a calendar icon and permission setting `plan.view`.
- Introduced `PlanService.js` in `src/services/` to handle plan-related operations including fetching travel times, upserting/deleting travel times, and managing user plans.
- Updated `ReportService.js` to include a new method `fetchActiveMixerCountsByPlant` for retrieving active mixer counts per plant.
- Added routing for Plan view in `src/app/App.js` to render `PlanView` component when selected.
- Created Supabase function `plan-service` in `supabase/functions/plan-service/index.ts` to support backend operations for plan services.
- Added database migration `supabase/migrations/20260202_create_plant_travel_times.sql` to create a table for storing plant travel times.

## [3.9] - 2026-02-02

- Added new CSS styles for report cards in ReportsReviewView.jsx and ReportsSubmitView.jsx with classes like .rpt-card, .rpt-card-accent, .rpt-card-header, and .rpt-card-title for enhanced visual structure.
- Introduced styling for form layouts in both ReportsReviewView.jsx and ReportsSubmitView.jsx using classes such as .rpt-form-row and .rpt-flex-col.
- Implemented table styling for plant summaries and aggregated data in both files with classes like .rpt-plant-summary-table and .rpt-agg-table, including hover effects and consistent design.
- Added input field styling in both ReportsReviewView.jsx and ReportsSubmitView.jsx with .rpt-input, including disabled states and focus effects (in ReportsSubmitView.jsx).
- Created variance cell styling for visual feedback in both files using classes like .rpt-variance-cell, .rpt-variance-positive, .rpt-variance-negative, .rpt-variance-neutral, and .rpt-variance-symbol.
- Added empty state styling with .rpt-empty class in both ReportsReviewView.jsx and ReportsSubmitView.jsx for better user experience when no data is present.

## [3.8] - 2026-02-02

- Added 'Unscreened White Sand' as a new material option in the General Manager Export report in `src/components/modules/export/reports/GeneralManagerExport.js`
- Added 'Unscreened White Sand' to the report types configuration with required field and number type in `src/types/ReportTypes.js`

## [3.7] - 2026-02-02

- Updated AI comment validation logic in `src/services/AIService.js` to be more lenient, accepting a broader range of operational reasons as valid (e.g., weather, equipment issues, staffing) and only marking comments as invalid if empty, unhelpful, or unrelated to work.
- Improved error messaging for comment validation in `src/utils/ReportUtility.js` by including the user's comment and a detailed list of issues (e.g., punch-in delays, load counts) in the feedback.
- Enhanced error handling in `src/views/reports/ReportsSubmitView.jsx` by introducing a modal for displaying errors with a new `showError` function and `showErrorModal` state, replacing direct error state updates.
- Made various updates to `src/views/reports/types/WeeklyEfficiencyReport.jsx` to align with the new validation and error handling changes (specific details not fully visible in truncated diff).

## [3.6] - 2026-02-02

- Added new dependency `turl-release` from GitHub repository `bradley-t-t/turl-release` in `package.json` and `package-lock.json`.
- Updated `release` script in `package.json` to use `turl-release` instead of a hardcoded path.
- Replaced `version.json` with `turl.json` in the `public` directory, adding additional fields like `projectName` and `branch`.
- Updated version fetching logic in `App.js`, `useVersionPolling.js`, `AppService.js`, and `NetworkUtility.js` to use `/turl.json` instead of `/version.json`.
- Modified error handling in `useVersionPolling.js` to silently handle fetch errors instead of logging them.
- Removed CSS styles for `.mixer-card` from `index.css`.

## [3.5] - 2026-02-02

- Updated dependency versions for improved performance and security.
- Enhanced release and cleanup scripts for smoother deployment processes.
- Incremented version information in public files for accurate tracking.

## [3.0] - 2026-01-30

- Replaced the browser's native confirm dialog for AI validation warnings with a custom modal dialog in the report submission view.
- Added state management for displaying AI warning modal with concerns and suggestions when potential issues are detected in reports.
- Fixed a minor CSS style formatting issue in the submit button by changing 'font-weight' to 'fontWeight' for consistency.

## [2.9] - 2026-01-30

- Added AI validation for Plant Manager reports during submission
- Implemented progress tracking for AI validation process
- Integrated dynamic import of AIService for validation of report metrics
- Display AI-detected issues and suggestions in a confirmation dialog
- Allow users to review or proceed with submission after AI validation feedback

## [2.8] - 2026-01-30

- Code formatting and cleanup

## [2.7] - 2026-01-30

- Added new method `validatePlantManagerMetrics` in AIService.js to validate weekly plant manager reports for concrete manufacturing operations.
- Implemented validation logic to flag obvious data entry errors in metrics such as yards per hour (YPH), total hours, lost yardage, and resold yardage.
- Defined specific validation rules including flagging YPH > 25 as impossible and YPH < 0.5 as nearly impossible, along with other suspicious patterns.
- Integrated AI validation through API calls with tailored system and user prompts to identify potential data entry issues.
- Updated ReportsSubmitView.jsx to display a custom AI validation message for plant manager reports, focusing on checking hours, yardage, lost yardage, and resold yardage for consistency.

## [2.6] - 2026-01-30

- Added AI validation feature for plant production reports to analyze efficiency and operator performance.
- Implemented new state variables for tracking AI validation status and progress.
- Introduced logic to identify rows with potential issues in timing and performance metrics before validation.
- Added a modal UI for displaying AI validation progress with a progress bar and relevant messaging.
- Enhanced validation process to include checks for operator explanations related to timing discrepancies.

## [2.5] - 2026-01-30

- Updated the styling of the AI validation warning message in the Weekly Efficiency Report.
- Changed the warning message background to a gradient yellow color with a solid border and a thicker left border.
- Adjusted the text color and font properties for better readability of the warning message.
- Added an icon (fa-robot) to the AI validation warning message for visual emphasis.
- Revised the warning text to explicitly state that the explanation will be checked for specific reasons regarding timing issues before submission.
- Improved the layout of the warning message with flexbox for better alignment and spacing.

## [2.4] - 2026-01-30

- Added AI-powered validation for weekly plant efficiency report comments in AIService.js to ensure meaningful explanations for performance issues.
- Implemented detailed criteria for valid and invalid comments, with specific guidance provided for improvement.
- Updated ReportUtility.js to integrate AI comment validation in the validatePlantProduction method, now asynchronous to handle API calls.
- Enhanced validation logic to identify performance issues like delayed starts, low loads, and excessive hours, requiring detailed comments when issues are detected.
- Added specific feedback messages in validation results to guide users on improving their comments based on identified issues.
- Modified the submit button text in ReportsSubmitView.jsx to display "Validating comments..." during submission of plant production reports.
- Updated WeeklyEfficiencyReport.jsx to visually indicate the need for comments when performance issues are present in the detail table view.

## [2.3] - 2026-01-29

- Updated eslint-plugin-react-hooks from version 7.0.1 to 5.0.0
- Downgraded TypeScript from version 5.9.3 to 4.9.5
- Removed eslint-plugin-sonarjs dependency
- Removed ts-api-utils dependency
- Turned off security/detect-object-injection rule in ESLint configuration
- Removed react-hooks/set-state-in-effect rule from ESLint configuration
- Removed react-hooks/immutability rule from ESLint configuration

## [2.2] - 2026-01-29

- Removed SonarJS plugin and its associated rules from ESLint configuration
- Removed "plugin:sonarjs/recommended-legacy" from the extends section
- Removed multiple SonarJS-specific rules including cognitive-complexity, no-duplicate-string, and others

## [2.1] - 2026-01-29

- Updated ESLint configuration with new plugins for React hooks, SonarJS, and security checks.
- Added linting rules for import sorting, unused imports/variables, and code quality with SonarJS.
- Enhanced security by integrating eslint-plugin-security with specific detection rules.
- Updated .gitignore to exclude .idea directory for better project hygiene.
- Incremented project dependencies in package.json to support new ESLint plugins.
- Comprehensive refactoring across application components, services, and utilities for improved maintainability.
- Enhanced report generation and export functionalities with structural improvements.
- Updated various UI components and views for consistency and minor bug fixes.

## [2.0] - 2026-01-29

- Enhanced ESLint configuration with additional plugins for React hooks, security, and code organization.
- Added new linting rules for import sorting, unused imports, and security checks.
- Updated dependencies in package.json to include new ESLint plugins and tools.
- Ignored .idea directory in .gitignore for better project hygiene.
- Comprehensive refactoring across application components, services, and utilities for improved maintainability.
- Updated various UI components and views for consistency and minor bug fixes.
- Enhanced report generation and export functionalities with structural improvements.

## [1.9] - 2026-01-29

- Simplified README.md by removing detailed sections on Getting Started, Environment, and Scripts.
- Retained only the essential footer credit line in README.md.

## [1.8] - 2026-01-29

- Updated the 'plantSummary' prompt in context.json to improve formatting and clarity of the analysis output.
- Changed the structure of the 'plantSummary' response to use plain text formatting with specific separators and line breaks.
- Added explicit instructions in 'plantSummary' to avoid markdown, hashtags, asterisks, or bold formatting in the output.

## [1.7] - 2026-01-29

- Code formatting and cleanup

## [1.6] - 2026-01-29

- Version update

## [1.5] - 2026-01-29
- Updated README.md with improved formatting and layout for better readability
- Removed unnecessary spacing and alignment tags in README.md
- Consolidated changelog entries in CHANGELOG.md by removing older version details
- Adjusted formatting in CHANGELOG.md for consistency and clarity

## [1.4] - 2026-01-29
- Updated CI workflow to trigger on the 'core' branch instead of 'main' and 'master' for both push and pull request events
- Removed the test coverage step from the CI workflow
- Updated the CI status badge in README.md to point to the 'core' branch
- Updated the footer in README.md to credit Trenton Taylor for building the project for SRM Concrete

## [1.3] - 2026-01-29
- Added new AI module with initial configuration files and service implementations
- Introduced context.json for AI context management
- Added index.js as the entry point for AI functionalities
- Included plantSummaryConfig.json for plant summary configurations
- Created prompts.json for storing AI prompts
- Implemented AIPrompts.js for handling AI prompt logic
- Developed AIServiceNew.js for new AI service operations

## [1.2] - 2026-01-29
- Renamed AIInsightsService.js to AIService.js for consistency in naming conventions

## [1.1] - 2026-01-29
