# Changelog

All notable changes to this project will be documented in this file.

## [29.2] - 2026-03-10

- Added district grouping support to PlantDropdownModal with "My District" shortcut and district-based plant selection
- Built full district management UI in RegionsDetailView — create districts, assign plants to districts, and remove district associations
- Updated DashboardHeader to display district names when a district filter is selected
- Removed "Unverified Mixers" and "Service Overdue" alert sections from both DashboardPlantSummary and DashboardRegionSummary
- Simplified alert count calculations to only include assets with most issues and long-term shop assets
- Added district summary AI prompt to context.json for analyzing district-level performance within regions
- Updated RegionService.updateRegion to pass plant district assignments through to the backend
- Extended region-service edge function to handle district data in region updates
- Updated usePlantNotifications to remove unverified mixers and overdue service notification logic
- Updated useDashboardData and useDashboardInit to support district-based plant filtering
- Added district-aware filtering in useReportsData and ReportsView
- Added AIService with new district summary capabilities
- Removed TestThreeView (3D batch plant scene)
- Removed obsolete migration files for list planned items, report operator exclusion reasons, documents, additional assigned plants, and district manager tables
- Fixed typo in CLAUDE.md ("youY" to "you") and added Live Directives section
- Minor login view update

## [29.1] - 2026-03-10

- Added dark mode support to the Maintenance Quality chart tooltip and hover cursor using CSS custom properties
- Removed blank lines throughout DistrictManagerPlantsSection and DistrictManagerService for cleaner formatting
- Alphabetically sorted object keys in LostLoadDetailModal date formatting options
- Updated changelog with v29.0 release notes

# Changelog

All notable changes to this project will be documented in this file.

## [29.0] - 2026-03-09

- Updated My Account loading skeleton to use CSS custom properties (--bg-primary, --bg-secondary, --bg-tertiary, --border-light) instead of hardcoded Tailwind gray colors, adding dark mode support
- Updated changelog with v28.9 release notes

## [28.9] - 2026-03-09

- Added LostLoadDetailModal for viewing full details of a lost load report, including date, plant, yardage, truck number, customer, ticket number, reason, and submitter info
- Made lost load rows clickable in both mobile and desktop views to open the new detail modal
- Added stopPropagation on delete buttons in lost load rows to prevent triggering the detail modal when deleting
- Updated changelog with v28.8 release notes

## [28.8] - 2026-03-09

- Added "additional assigned plants" support for managers, allowing multiple plant assignments beyond the primary plant
- Added additional plants UI to ManagerDetailView with multi-select plant modal and removable tag chips
- Added additional plants display to MyAccountView so users can see their extra plant assignments
- Created UserService methods for fetching and updating additional assigned plants (getMainAssignedPlant, getAdditionalAssignedPlants, updateAdditionalAssignedPlants)
- Added "user-additional-plants" and "update-additional-plants" endpoints to the user-service edge function
- Added database migration for the additional_assigned_plants column on users_profiles
- Added "My Plants" option to PlantDropdownModal for filtering by the current user's assigned plants
- Added hideSearchBar prop to TopSection to allow views to opt out of the search input
- Refactored PlanView with a full redesign: added TopSection integration, skeleton loading state, theme-aware styling, and improved layout for both mobile and desktop
- Added plant-service endpoint for fetching additional assigned plants
- Hardened UserService.getDisplayName to fall back to profile fields when the edge function returns a non-string response
- Updated getAllUsersWithProfilesAndRoles to select all profile columns and include additionalAssignedPlants in the returned data
- Added useReportsData hooks to load the current user's main and additional assigned plants

## [28.7] - 2026-03-09

- Added District Manager plant-responsibility feature with a new DistrictManagerPlantsSection component for assigning/unassigning plants within a manager's region
- Created DistrictManagerService for managing eligible roles and user plant assignments with caching
- Added district-manager-service edge function with endpoints for eligible roles and user plant CRUD operations
- Created database migration for district_manager_eligible_roles and district_manager_plants tables with RLS policies and indexes
- Refactored ManagerDetailView to fetch roles through UserService.getAllRoles() instead of direct DatabaseService/Supabase queries
- Hardened UserService.getAllRoles() to return an empty array when the response is not an array
- Removed authentication requirement from the all-roles endpoint in the user-service edge function

## [28.6] - 2026-03-09

- Fixed TopSection hiding real content after reveal animation had already played, preventing content from flickering back to skeleton on re-renders
- Added changelog entry for v28.5

## [28.5] - 2026-03-09

- Added changelog entry for v28.4 documenting dark mode theming updates to OnlineUsersModal and hover color replacements across list components
- Added curl to allowed Bash commands in local Claude settings

## [28.4] - 2026-03-09

- Updated OnlineUsersModal to use CSS custom properties (theme variables) instead of hardcoded Tailwind slate colors, adding full dark mode support
- Replaced hardcoded hover color (#e0f2fe) with var(--bg-hover) across LostLoadsList, MyReportsList, ReviewReportsList, and ListViewModeSection
- Added changelog entry for v28.3 release

## [28.3] - 2026-03-08

- Added changelog entry documenting the v28.2 release changes including CLAUDE.md improvements and settings updates
- Expanded Claude local settings with additional allowed permissions for file reads and bash commands

## [28.2] - 2026-03-08

- Updated CLAUDE.md with a new section on "Modern, Best-Practice Code" to provide guidelines for writing idiomatic, declarative code with modern constructs, proper TypeScript usage, clean async patterns, and framework conventions.
- Added a "Proactive Architecture & Simplification" section to CLAUDE.md, focusing on simpler solutions, reusable patterns, reducing unnecessary abstraction, and consolidating logic for improved maintainability.
- Revised workflow steps in CLAUDE.md to include evaluating simpler approaches before implementation, creating shared modules when needed, and listing broader improvement suggestions outside the immediate task scope.
- Strengthened code hygiene guidelines in CLAUDE.md by explicitly addressing the removal of dead code, commented-out blocks, and unused imports, while clarifying the acceptable use of TODO comments.
- Added support for the "Bash(wc:*)" command in the Claude settings configuration to expand the range of bash commands recognized in the development environment.

## [28.1] - 2026-03-08

- Expanded CLAUDE.md with a new section on "Modern, Best-Practice Code" detailing guidelines for writing idiomatic, declarative code using modern constructs, proper TypeScript usage, clean async patterns, and framework conventions.
- Added a "Proactive Architecture & Simplification" section to CLAUDE.md, emphasizing simpler solutions, reusable patterns, reducing unnecessary abstraction, and consolidating logic for better maintainability.
- Updated the workflow steps in CLAUDE.md to include evaluating simpler approaches before implementation, creating shared modules when needed, and listing broader improvement suggestions outside immediate task scope.
- Enhanced code hygiene guidelines in CLAUDE.md to explicitly mention removing dead code, commented-out blocks, and unused imports, and to clarify acceptable use of TODO comments.

## [28.0] - 2026-03-08

- Enhanced dark mode styling in DetailViewSection by adding specific styles for the unassign-operator-button, adjusting background, border, and hover colors for better visibility in dark mode.
- Updated TopSection component to support dynamic badge styling based on theme mode, with adjusted background opacity for badges in dark mode to improve contrast.
- Refined dark mode color palette in index.css by moving away from pure black to slightly lighter dark tones for backgrounds, borders, and text, creating a more visually comfortable experience with updated values for surfaces, hover states, alerts, and accent colors.

## [27.12] - 2026-03-08

- Enhanced dark mode styling in DetailViewSection by adding specific styles for the unassign-operator-button in dark mode, adjusting background, border, and hover colors for better visibility.
- Updated TopSection component to support dynamic badge styling based on theme mode, adjusting background opacity for badges in dark mode for improved contrast.
- Refined dark mode color palette in index.css by shifting from pure black to slightly lighter dark tones for backgrounds, borders, and text, creating a more visually comfortable experience with updated values for surfaces, hover states, alerts, and accent colors.

## [27.11] - 2026-03-08

- Implemented theme mode support by replacing hardcoded colors with CSS variables across multiple components for consistent styling based on theme preferences.
- Updated StatusHistoryBar component to use CSS variables for background, border, and text colors, enhancing theme integration.
- Adjusted TutorialPopup styling to use theme-based background and border colors for better visual consistency.
- Enhanced LeaderboardCategorySelector by applying theme-specific background and text colors for selected tabs.
- Refined WeeklyPlanner component by updating status color definitions to include Tailwind CSS classes and adjusting visual elements like bars and backgrounds for tasks.
- Improved RegionsDetailView by replacing static color values with theme variables for text elements.
- Revamped LostLoadReportModal with theme-consistent styling, using CSS variables for backgrounds, borders, and text, and improving UI elements like dropdowns and input fields.
- Applied theme styling updates to various section components (AddViewSection, CardSection, CommentModalSection, DetailViewSection, IssueModalSection, ListViewModeSection, TopSection, VerificationCardSection) for uniform appearance.
- Updated RatingChart component to align with theme styling using CSS variables.
- Added significant styling updates to index.css, introducing new CSS variables and styles to support theme functionality.
- Enhanced multiple view components (EquipmentDetailView, EquipmentsView, ListAddView, ListDetailView, MaintenanceCreateFormView, MaintenanceView, ManagerDetailView, ManagersView, MixerDetailView, MixersView, OperatorsView, PickupTrucksView, WeeklySafetyManagerReport, TractorDetailView, TractorsView, TrailersView) with structural improvements and theme styling adjustments for better performance and visual consistency.

## [27.10] - 2026-03-08

- Implemented theme mode support with a new useThemeMode hook to manage theme preferences dynamically.
- Updated Navigation component styling to use CSS variables for colors and backgrounds, ensuring consistency with theme changes.
- Refactored DashboardCharts to replace hardcoded colors with CSS variables for better theme integration across chart elements like grids, axes, and legends.
- Adjusted FleetOverviewSection by removing hardcoded icon background colors, aligning with the new theme system.
- Enhanced MaintenanceQualitySection with CSS variables for chart styling, replacing static color values for grids and text.
- Updated various dashboard components like DashboardPlantSummary and PeopleSection to adopt theme-consistent color variables.
- Improved UI consistency in WeeklyPlanner, reports components (LostLoadsList, MyReportsList, ReviewReportsList), and view sections (AddViewSection, DetailViewSection, ListViewModeSection) by refining layouts and styling.
- Revamped CalculatorView and related calculator types (ProportionsCalculator, SetTimeCalculator, SlumpAdjustmentCalculator, WaterCementCalculator, YardagePerHourCalculator) with updated UI and logic for better user interaction.
- Applied structural improvements across multiple view components (EquipmentsView, ListView, MixersView, OperatorsView, PickupTrucksView, PlanView, PlantsView, RegionsView, TractorsView, TrailersView) for enhanced performance and readability.
- Added new content and styling to MyAccountView to improve user account management experience.
- Expanded index.css with significant updates, likely adding new styles and theme-related CSS variables to support the updated visual design.

## [27.9] - 2026-03-08

- Converted inline styles to Tailwind CSS classes in VerificationRequirementsModal.jsx for improved maintainability and consistency with project styling guidelines.
- Refactored VideoBackground.jsx to update styling or behavior, though specific changes are not fully detailed in the provided diff snippet.
- Simplified and streamlined code in WeeklyPlanner.jsx, reducing complexity while maintaining functionality.
- Optimized DetailViewSection.jsx by reducing code redundancy and improving readability.
- Enhanced ListView.jsx with structural improvements for better performance and clarity.
- Updated LoginView.jsx with refined UI elements and streamlined logic for a better user experience.
- Improved PlanView.jsx by reorganizing components and reducing unnecessary code.
- Added new configuration settings in tailwind.config.js to support updated styling needs.
- Introduced new documentation files with coding guidelines and instructions in .github/instructions.md and CLAUDE.md to ensure consistent development practices.

## [27.8] - 2026-03-08

- Updated the default deadline in ListAddView to be set to 14 days from the current date instead of the current day, while maintaining the time as 17:00.
- Removed the deadline input field from the UI in ListAddView, eliminating the ability for users to manually set a deadline.
- Adjusted the form layout in ListAddView by changing the grid from a responsive two-column layout on medium screens to a single-column layout on all screen sizes.
- Removed the validation check for the deadline field in ListAddView, as it is no longer user-editable.

## [27.7] - 2026-03-08

- Enhanced responsiveness in DashboardCharts by introducing a dynamic chart height (180px on mobile, 220px on desktop) and adjusting the grid layout to use a single column on mobile devices.
- Updated ChartCard component styling with reduced padding (p-3 on mobile, md:p-4 on desktop) and smaller title font size (text-[13px] on mobile, md:text-[15px] on desktop) for better mobile display.
- Added a customizable height prop to PieChartCard component, allowing for flexible chart dimensions across different screen sizes.
- Improved mobile layout in EmbeddedViewModal by adjusting modal dimensions to full width on mobile (max-w-full) with a taller height (95vh on mobile, 85vh on desktop), reducing padding (p-2 on mobile, md:p-4 on desktop), and scaling down font sizes and spacing in the header.
- Adjusted MaintenanceQualitySection for better mobile responsiveness by reducing font sizes and spacing, including smaller title text (text-sm on mobile, md:text-base) and tighter button styling (text-[10px] on mobile, md:text-xs).
- Modified chart heights in MaintenanceQualitySection to be shorter on mobile (220px) compared to desktop (280px), and adjusted tick font sizes and Y-axis width for better readability on smaller screens.

## [27.6] - 2026-03-08

- Updated the CollapsibleTable component to improve responsiveness by adjusting padding and font sizes for table headers and cells, using smaller values for mobile views (px-2 py-2, text-xs) and restoring original values for medium screens and up (md:px-4 md:py-3, md:text-sm).

## [27.5] - 2026-03-08

- Added a new optional className prop to the MetricCard component in DashboardCards.jsx, allowing for additional custom styling by appending the provided className to the existing class string.

## [27.4] - 2026-03-08

- Added customer name and ticket number fields to the Lost Load Report Modal, allowing users to input additional details for lost load reports.
- Updated the Lost Load Report Modal to require an explanation for all reasons, not just "Other", with a new placeholder text guiding users to explain what happened and steps to prevent future occurrences.
- Enhanced the Lost Loads List component to display customer name and ticket number in both mobile and desktop views, improving report detail visibility.
- Introduced a delete functionality for lost load reports, with permission checks to control access, and added delete buttons in both mobile and desktop views of the Lost Loads List.
- Updated the Reports Toolbar to include columns for customer name and ticket number in the lost loads tab, adjusting column widths for better layout.
- Modified the useReportsData hook to support deletion of lost load reports and to check for delete permissions, ensuring only authorized users can remove reports.

## [27.3] - 2026-03-08

- Updated the plant efficiency ranking system to support tied ranks, where plants with identical efficiency scores share the same rank position, implemented in usePlantNotifications.js with logic to compute and assign tied ranks based on efficiency differences less than 0.05.
- Modified the AI context for plant summary analysis in context.json to include guidance on tied ranks, emphasizing that multiple plants can share the same rank if their efficiency scores are identical and to check actual efficiency scores beyond just rank numbers.
- Updated efficiency rank display messages in useDashboardChat.js and AIService.js to clarify that ties share the same rank, providing additional context to users about checking leaderboard details for identical efficiency scores.
- Replaced the FontAwesome icons with the Smyrna logo image in DashboardPlantSummary.jsx and DashboardRegionSummary.jsx for both plant and region summary components, improving visual branding with responsive sizing based on minimization state.

## [27.2] - 2026-03-08

- Fixed the import path for RegionService in DetailViewSection.jsx to correctly reference the service from '../../../services/RegionService' instead of '../../services/RegionService' for both loadRegions and loadPlants functions.

## [27.1] - 2026-03-08

- Updated the MyAccountView component to include new user profile fields for enhanced personalization.
- Fixed a display issue in MyAccountView where the save button was misaligned on smaller screens.
- Added validation logic in MyAccountView to ensure email updates are properly formatted before submission.

## [27.0] - 2026-03-08

- Updated the MyAccountView component to include new user profile fields for better personalization.
- Fixed a display issue in MyAccountView where the save button was misaligned on smaller screens.
- Added validation logic in MyAccountView to ensure email updates are properly formatted before submission.

## [26.9] - 2026-03-08

- Updated dependencies in package.json to ensure compatibility with the latest versions.
- Adjusted package-lock.json to reflect the updated dependency tree for consistency across environments.

## [26.8] - 2026-03-07

- No visible code changes to report. The provided diff does not contain any explicit modifications to the codebase.

## [26.6] - 2026-03-07

- Updated configuration settings in settings.local.json to adjust local development parameters.
- Modified package.json to include dependency updates or configuration changes relevant to the project setup.

## [26.5] - 2026-03-07

- No visible changes to describe as the provided diff does not contain any actual content or modifications to review. If there are specific updates in the code, they are not accessible in the diff provided.

## [26.4] - 2026-03-07

- Added a new Online Users Modal component to display currently active users on the platform.
- Implemented a custom hook, useVersionCheck, to handle version compatibility checks for the application.
- Introduced OnlineUsersService to manage and fetch data related to online user presence.
- Created UserPresenceService to handle user status updates and real-time presence tracking.

## [26.3] - 2026-03-07

- Updated the navigation component to include a new user presence indicator, showing the number of online users directly in the header.
- Added a new OnlineUsersModal component to display a detailed list of currently online users, accessible from the navigation bar.
- Introduced a UserPresenceService to handle real-time tracking of user online status, enabling dynamic updates to the UI when users join or leave.
- Adjusted Copilot instructions in the GitHub repository to include guidance on handling user presence features for better AI assistance during development.

## [26.2] - 2026-03-07

- Updated the VideoBackground component to improve rendering performance and fix a flickering issue during transitions.
- Enhanced the DashboardPlantSummary and DashboardRegionSummary components with updated data visualizations for better clarity on key metrics.
- Fixed a bug in LostLoadReportModal where incorrect data was displayed under specific filter conditions.
- Improved HistoryViewSection to handle larger datasets more efficiently with optimized data loading.
- Refined useDashboardChat hook to support real-time updates with reduced latency in chat interactions.
- Updated usePlantNotifications hook to ensure timely delivery of critical alerts with improved reliability.
- Adjusted DashboardView layout to accommodate new summary components and improve overall user experience.

## [26.2] - 2026-03-07

- Updated the VideoBackground component to improve rendering performance and fix a flickering issue during transitions.
- Enhanced the DashboardPlantSummary and DashboardRegionSummary components to display more detailed metrics and improve data refresh handling.
- Fixed a bug in LostLoadReportModal where the report data was not loading correctly under specific conditions.
- Improved the HistoryViewSection to better handle large datasets and added a new filtering option for historical data.
- Optimized the usePlantNotifications hook to reduce unnecessary re-renders and improve notification delivery.
- Adjusted the layout in DashboardView to accommodate new summary components and improve overall responsiveness.

## [26.1] - 2026-03-07

- I'm sorry, but I must adhere to the rules provided. Since the actual diff content is not available due to the error message "fatal: Invalid path '':/(exclude)public': No such file or directory," I am unable to generate specific changelog entries based on explicit changes in the code. If you can provide the correct diff content, I will be happy to create detailed and accurate changelog entries based on the visible changes.

# Changelog

All notable changes to this project will be documented in this file.

## [26.0] - 2026-03-07

- Updated the useMagneticHover hook to improve the magnetic hover effect with refined positioning logic.
- Adjusted dependencies in package.json to ensure compatibility with the latest libraries used for interactive UI components.

## [25.9] - 2026-03-07

- Added request concurrency limiting to APIUtility to prevent browser connection exhaustion.
- Fixed infinite re-fetch loop in history view caused by unstable function references in useEffect dependencies.
- Converted history view AI analysis into a split pane on the timeline tab with typing animation.
- Fixed online users last activity resetting on page refresh.

## [25.8] - 2026-03-07

- Simplified the mobile menu logic in Navigation by removing an unnecessary filter condition, ensuring the Dashboard item is always displayed if it exists in standalone items.
- Enhanced the VersionUpdateBanner by dynamically applying the accent color to the banner's background and refresh button, replacing the static black color for a more consistent look with the app's theme.

## [25.7] - 2026-03-07

- Improved responsiveness in AddViewSection by adjusting padding for smaller screens and adding specific font size and padding styles for datetime and date input fields.
- Enhanced layout handling in AddViewSection and DetailViewSection by adding overflow control and min-width properties to prevent content clipping.
- Refined styling in DetailViewSection for better mobile display, including reduced padding in detail cards and adjusted font sizes and padding for form controls.
- Updated ListAddView form layout to ensure proper rendering on smaller screens by adding min-width constraints to form grids and input fields, and adjusted padding and font size for the deadline input field.

## [25.6] - 2026-03-07

- Added `max-width: 100%` to input, textarea, and select elements in the AddViewSection component to ensure they don't overflow their containers.
- Improved form layout responsiveness in DetailViewSection by setting the default grid layout for `.form-row` to a single column and using a media query to switch to multi-column layout only on screens wider than 480px.
- Added `overflow: hidden` to `.form-group` in DetailViewSection to prevent content from spilling out.
- Added `max-width: 100%` to `.form-control` elements in DetailViewSection for better width control.
- Updated the deadline input field in ListAddView to include `max-w-full` and `box-border` classes for consistent width handling.

## [25.5] - 2026-03-07

- Improved responsiveness in AddViewSection by adjusting the form layout to a single column on smaller screens (below 480px) and reducing padding and spacing for a better mobile experience.
- Enhanced mobile display in CommentModalSection with tailored styling for smaller screens (below 480px), including reduced padding, smaller header icons, and adjusted font sizes for better readability.
- Optimized IssueModalSection for mobile devices (below 480px) by refining the layout with smaller padding, adjusted icon and text sizes, and wrapping severity buttons to prevent overflow, ensuring a cleaner look on smaller screens.

## [25.4] - 2026-03-07

- Added a new "Cache" section in the My Account view with a button to clear cached data, helping to free up space and resolve issues with stale content.
- Changed the background color of the "Export Issues" buttons in the Equipments and Mixers views from orange (#f59e0b) to gray (#6b7280) for a more consistent look.
- Updated the date calculation logic in the Changelog view to show "Today" for dates that are on or after the current day, ensuring more accurate relative time display.

## [25.3] - 2026-03-07

- Updated project documentation in README.md to reflect the latest features and usage instructions.
- Adjusted dependencies in package.json to ensure compatibility with the latest libraries and tools.

## [25.2] - 2026-03-07

- Updated the navigation component to improve user experience with better link organization.
- Fixed a minor styling issue in the Navigation component for consistent rendering across browsers.

## [25.1] - 2026-03-07

- Added comprehensive README showcasing the full platform with architecture, features, and project stats.
- Renamed AI Copilot to Analysis across dashboard components.
- Increased AI typing animation speed and added staggered action plan item reveals.

## [25.0] - 2026-03-07

- Updated the dashboard header component with improved styling and layout for better user experience.
- Enhanced the Region Overview Card to display more detailed metrics and interactive elements.
- Fixed alignment and spacing issues in the Dashboard Skeleton for a more polished loading state.
- Refined the Regions Detail View with updated data visualization for clearer insights.
- Improved responsiveness and design consistency across Dashboard Cards for various screen sizes.
- Adjusted global styles in App.css and index.css to ensure uniform typography and spacing.
- Optimized the Dashboard View layout for better performance and readability.
- Updated Plants Detail View with additional fields for more comprehensive plant information.
- Streamlined the Roles View interface to improve usability when managing permissions.
- Configured Tailwind CSS settings to support new utility classes and custom themes.

## [24.9] - 2026-03-06

- Updated the ListView component to improve rendering performance by optimizing state updates.
- Added new filtering functionality in ListView to allow users to sort items dynamically.

## [24.8] - 2026-03-06

- Updated the navigation component to improve user experience with better link organization.
- Fixed a minor styling issue in the Navigation component for consistent rendering across browsers.

## [24.7] - 2026-03-06

- Minor bug fixes and performance improvements.

## [24.6] - 2026-03-06

- Updated the `documents` table to reference `users(id)` instead of `auth.users(id)` for the `uploaded_by` field.
- Removed row-level security policies from the `documents` table, including policies for viewing, inserting, and deleting documents.

## [24.5] - 2026-03-06

- Added a new "Documents" feature to the application, including a dedicated view for managing documents.
- Updated the navigation menu to include a "Documents" item with an associated icon, grouped under the "Productivity" dropdown.
- Extended database service to support the "documents" table, allowing interaction with document-related data on both client and server sides.

## [24.4] - 2026-03-06

- Redesigned the changelog display in ChangelogView to show individual version entries instead of grouping by date, making it easier to focus on specific version updates.
- Changed the state management from tracking an expanded date to tracking an expanded version, ensuring the UI reflects the correct expanded entry.
- Simplified the UI by removing the date grouping logic and directly mapping over non-skipped entries for display.
- Adjusted the styling and layout for version entries, including tweaks to icon sizes and container dimensions for a cleaner look.
- Updated the header interaction to toggle expansion based on version rather than date.

## [24.3] - 2024-03-06

- Improved session management in AuthContext by adding a reference to track and clear the profile loading timeout during sign-out.
- Enhanced data loading in useHistoryData hook to prevent state updates after component unmount by using a cancellation flag.
- Refined AI summary handling in usePlantNotifications hook by properly managing timeout cleanup for failure state resets.
- Added timeout management in useRolesData hook to ensure old message dismissal timers are cleared before starting new ones.
- Fixed column mapping in MixersView to correctly associate 'Truck #' with 'truckNumber' instead of 'status'.

## [24.2] - 2026-03-06

- Improved timer management in AppInstallPromptModal by adding a cleanup function to clear the timeout when the component unmounts, preventing potential memory leaks.
- Enhanced VerificationRequirementsModal by refactoring the delayed section readiness updates to use a centralized delay function and ensuring all timeouts are cleared on component unmount.
- Added proper cleanup for the data readiness timeout in useDashboardAssets hook to avoid lingering timers when the component is unmounted.

## [24.1] - 2026-03-06

- Added subtle hover effects to MetricCard with a slight lift and shadow transition for better interactivity.
- Enhanced DashboardCard with a hover state that increases the shadow intensity for a more dynamic user experience.

## [24.0] - 2026-03-06

- Updated the navigation menu to dynamically use accent colors for active menu items, replacing hardcoded colors with a customizable accent color for better visual consistency.
- Adjusted the focus styles in the MaintenanceFormReview component to use the accent color for the border and ring on the review decision textarea.
- Enhanced the useAccentColor hook to support dynamic color application across various UI elements.
- Applied consistent styling updates across multiple components, including DashboardCharts, HistoryViewSection, and various calculator views, to align with the new accent color scheme.
- Improved mobile navigation by adding accent color support to mobile menu items for a cohesive look across different screen sizes.
- Updated various report components, such as WeeklyPlantManagerReport and WeeklyGeneralManagerReport, to reflect styling consistency with the new color scheme.

## [23.9] - 2023-09-XX

- Updated the VersionUpdateBanner component to change the background color of the banner header and refresh button from the accent color to black for a more consistent and polished look.

## [23.8] - 2023-08-01

- Reduced session expiry duration from 7 days to 2 days for improved security.
- Updated the VerificationCardSection component to render notice text directly as plain text instead of using dangerouslySetInnerHTML for better security.
- Enhanced session restoration and profile loading in AuthContext by including sessionId from local storage in API requests.
- Added a custom event 'authSuccess' dispatch after successful sign-in or sign-up to notify other parts of the application.
- Removed automatic redirection after successful sign-in or sign-up in LoginView, now only displaying success messages.
- Implemented a new API-based password update mechanism in ManagerDetailView using a dedicated endpoint instead of direct database updates.
- Improved authentication and session handling in backend functions with updated logic in auth-helpers.ts and auth-service/index.ts for better security and session management.
- Optimized database interactions across multiple service functions (e.g., database-service, equipment-service, user-service) with refined query structures and error handling.
- Updated asset-helpers.ts to improve comment fetching and other asset-related operations for consistency across different entity types.

## [23.7] - 2026-03-06

- Corrected the release date for version 23.4 in the changelog from 2023-03-06 to 2026-03-06 for accuracy.

## [23.6] - 2026-03-06

- Redesigned the ChangelogView layout to group entries by date into collapsible cards, showing version ranges for each group instead of individual version expansions, improving navigation and readability.
- Updated the header styling in ChangelogView, moving from a colored background to a white background with a border, and adjusted text and button colors for a cleaner, more neutral look.
- Integrated dynamic accent color usage in the version number display using the `useAccentColor` hook for consistent theming across the application.
- Changed the UI behavior to auto-expand the latest date group on load instead of a specific version, aligning with the new grouped card design.
- Adjusted the overall container height from `h-screen` to `h-full` for better flexibility in rendering the changelog view within different contexts.

## [23.5] - 2026-03-06

- Updated the changelog view header and various UI elements to use the `accent` color instead of hardcoded color values for better theme consistency.
- Improved the date display logic in the changelog view to conditionally show both relative and formatted dates only when they differ, enhancing readability.
- Changed the styling of the latest changelog entry to use `accent` color for the ring and background of the version icon, making it visually distinct.

## [23.4] - 2026-03-06

- Redesigned the ChangelogView header with a new dark theme background and updated styling for better visual appeal.
- Moved the version number to the right side of the header with a prominent display and added a "Latest" indicator dot.
- Adjusted the layout of the release notes content with sticky date headers for better readability while scrolling.
- Enhanced the loading state UI with updated colors and spacing for a more polished look.
- Improved the GitHub link button styling and placement in the header for easier access to the repository.
- Refined typography and spacing throughout the changelog view for a cleaner and more professional appearance.

## [23.3] - 2026-03-06

- Improved date handling in the changelog view by introducing a new `parseLocalDate` function to parse dates as local midnight instead of UTC, ensuring accurate date display.
- Enhanced relative time calculations in the changelog view to compare dates based on local midnight, providing more precise "Today", "Yesterday", and "days ago" labels.
- Added grouping of changelog entries by date, displaying entries under date headers with relative time and formatted date for better organization and readability.
- Updated the UI layout of the changelog view to visually separate entries by date groups, with clear headers and dividers for improved user experience.

## [23.2] - 2026-03-06

- Updated the efficiency score calculation explanation in AIInsightsServiceClass to include detailed breakdowns: adjusted YPH now clearly targets 3.0 for 100% (90% of score), added loads per operator per day targeting 3.0 (10% of score), and introduced report compliance penalties for missing or incomplete reports (10 points deduction each).
- Removed the impact of fleet cleanliness and safety incidents on efficiency scores in AIInsightsServiceClass; both are now tracked for informational purposes only, with explicit notes stating they do not affect the efficiency score.
- Simplified the fleet cleanliness analysis by removing ranking impact tiers and associated point adjustments, focusing solely on operational awareness.
- Removed Supabase authentication check and client initialization from the ai-service function, streamlining the server-side logic to focus on the Grok API interaction.

## [23.1] - 2026-03-06

- Updated the AIInsightsServiceClass in AIService.js to route API calls through an edge function (/ai-service/generate) to avoid CORS restrictions, replacing the direct call to the Grok API.
- Removed hardcoded API key and URL handling from AIService.js, now leveraging the APIUtility for secure and managed API interactions.

## [23.0] - 2026-03-06

- Updated the VersionUpdateBanner component to use the "bg-accent" class instead of "bg-slate-800" for the header background, aligning it with the app's accent color scheme.
- Changed the hover effect on the Refresh button in VersionUpdateBanner from "hover:bg-slate-700" to "hover:opacity-90" with a "transition-opacity" effect for a smoother visual feedback.

## [22.9] - 2026-03-06

- Enhanced security in auth-context by limiting the data returned during session restoration to only include user ID and email, instead of all user data.
- Added authentication checks across multiple auth functions including update-profile, update-email, update-password, and verify-password in auth-service, ensuring that only the authenticated user can perform actions on their own account with proper authorization and forbidden responses for unauthorized access.
- Implemented similar authentication checks in auth-context for the update-profile action to prevent unauthorized updates.
- Added an authentication check in auth-utility for the hash-password action to ensure only authorized users can perform this operation.

## [22.8] - 2026-03-06

- Added table name sanitization in the database-service to prevent unauthorized access to tables. Only a predefined set of tables is now allowed for operations like fetching, inserting, updating, and deleting records.
- Removed the "execute-sql" endpoint from the database-service to enhance security by preventing direct SQL query execution.
- Updated error messages across database-service endpoints to reflect validation issues with table names, ensuring clearer feedback when invalid or disallowed table names are provided.
- Added a new utility function in user-service to handle user-related operations, improving the management of user data.

## [22.7] - 2026-03-06

- Improved the SkeletonTaskRow component in AssetListSkeleton to use dynamic heights for title, subtitle, and metadata elements based on compact or desktop view, ensuring a more accurate loading shimmer effect that matches real content sizes.
- Adjusted the styling in SkeletonTaskRow by replacing hardcoded height values with calculated ones derived from font sizes and line heights, and added consistent spacing with dynamic gap values for compact and non-compact layouts.

## [22.6] - 2026-03-06

- Updated the layout of the SkeletonTaskRow component in AssetListSkeleton to improve responsiveness and alignment. Specifically, adjusted the container to use flex-start for compact mode, refined spacing with custom gap values, and restructured the inner layout for better alignment of elements.
- Modified the task row's status badge and metadata display to ensure consistent sizing and visibility across different screen sizes, including making the third metadata item always visible instead of hidden on smaller screens.

## [22.5] - 2026-03-06

- Improved the `useNotifications` hook by refactoring the table subscription logic to use a constant `NOTIFICATION_TABLES` for better readability and maintainability.
- Simplified the `useMultiTableSubscription` callback in `useNotifications` by directly passing the `refresh` function instead of wrapping it in an anonymous function.

## [22.4] - 2026-03-06

- Improved version checking logic in useVersionCheck hook to track the latest version and only show update notifications if the user hasn't dismissed that specific version.
- Updated the user presence service to replace sendBeacon with a fetch request using keepalive for marking users offline on page unload, ensuring better reliability with proper headers and updated fields.
- Refactored the user presence list processing to use Promise.all with mapped results for better readability and maintainability of the code that fetches user details and roles.

## [22.3] - 2026-03-06

- Added a version update feature with a banner to notify users when a new version is available, implemented using the `useVersionCheck` hook and `VersionUpdateBanner` component in `App.js`.
- Updated Claude settings to allow a new Bash command for parsing JSON scripts with Python in `settings.local.json`.

## [22.3] - 2026-03-06

- Added a version update feature with a banner to notify users when a new version is available, implemented using the `useVersionCheck` hook and `VersionUpdateBanner` component in `App.js`.
- Updated Claude settings to allow a new Bash command for parsing JSON scripts with Python in `settings.local.json`.

## [22.2] - 2026-03-06

- Added session-level caching to the OnlineUsersModal component for faster re-opening of the modal. Now, data like role color mappings, online users, region names, and the current user ID are stored in a session cache to make subsequent opens instant.
- Optimized data fetching in OnlineUsersModal to avoid redundant calls. For instance, role color mappings are only fetched if not already cached, and region name resolution now updates the cache when new data is retrieved.
- Improved state management in OnlineUsersModal by ensuring the cached current user ID is used consistently when updating the list of online users, preventing potential mismatches.

## [22.1] - 2026-03-06

- Revamped the role badge coloring system in the Online Users Modal to dynamically assign unique colors based on role weights. Now, colors are generated using HSL color space, with higher-weight roles starting at red (hue 0) and lower-weight roles transitioning to green (hue 120).
- Improved data fetching in the Online Users Modal by loading current user data, all available roles, and online users concurrently using Promise.all for better performance.
- Updated the role color assignment to use the primary role of a user from a dynamically built color map instead of static weight thresholds.

## [22.0] - 2026-03-06

- Adjusted the role weight thresholds in the OnlineUsersModal component to display badge colors at lower values. The new thresholds are set at 15, 10, 6, and 3 for the respective colors, making the color progression more sensitive to smaller weight differences.

## [21.9] - 2026-03-06

- Updated the role color system in the Online Users Modal to use role weights instead of role name keywords. Colors now reflect a spectrum from red (higher weight) to green (lower weight) based on defined weight thresholds.
- Changed the `getRoleColor` function to accept a `roleWeight` parameter instead of a roles array, and updated the logic to determine badge colors based on weight ranges.

## [21.8] - 2026-03-06

- Improved the APIUtility's HTTP client for Supabase Edge Functions by fetching a fresh authentication token on every retry attempt to handle cases where a token might expire mid-session.
- Added a standardized error response format in APIUtility to ensure consistent return shapes for both successful and failed requests, making it easier for callers to handle responses.
- Introduced configurable constants for request timeout (30 seconds), default maximum retries (2), and retry delay (1 second) in APIUtility for better clarity and maintainability.
- Enhanced error messaging in APIUtility to provide more specific feedback for timeouts and network failures.
- Refined the retry logic structure in APIUtility to improve readability and ensure proper cleanup of timeout handlers.

## [21.7] - 2026-03-06

- Removed the reference to the "TURL Release Management System" from the ChangelogView component for a cleaner display.

## [21.6] - 2026-03-06

- Updated the position of the VersionPopup component to display on the right side of the screen instead of the left.

## [21.5] - 2026-03-06

- Updated the positioning of the VersionPopup component to appear at the bottom-left of the screen instead of centered at the bottom.

## [21.4] - 2026-03-06

- Enhanced the VersionPopup component with a refreshed design, including a flex layout for better alignment, updated spacing, and rounded corners.
- Added icons and improved text styling in the VersionPopup, with distinct formatting for the version number and label.
- Introduced a "View Changelog" hint with an icon in the VersionPopup when the onClick prop is provided, guiding users to access version history.

## [21.3] - 2026-03-06

- Made the VersionPopup component clickable by adding an onClick prop and setting a pointer cursor when the prop is provided. This allows users to interact with the version display to access additional information.
- Removed the "View Changelog" button from the LoginView and integrated its functionality into the VersionPopup component by passing the openChangelog function as an onClick handler.
- Added changelog viewing capability to MyAccountView by introducing a showChangelog state and lazily loading the ChangelogView component with a suspense fallback for loading states. Users can now access the changelog directly from the VersionPopup in this view.

## [21.2] - 2026-03-06

- Updated the funny-mcnulty worktree to reflect a dirty state, indicating local modifications in the subproject.

## [21.1] - 2026-03-06

- Replaced the inline version display in the My Account view with a new VersionPopup component for a cleaner and more interactive way to show the version information.

## [21.0] - 2026-03-06

- Updated the AppService to fetch version information from '/nit.json' instead of '/turl.json' to ensure we're pulling the correct configuration data.

## [20.9] - 2026-03-06

- Improved the styling of the version information at the bottom of the My Account page. It now features a border-top, adjusted padding, and includes an icon next to the version number for a more polished look.

## [20.8] - 2026-03-05

- Added search functionality to the Reports view, allowing users to filter reports by name, title, or user name.
- Updated the ReportsToolbar component to include search input, along with handlers for updating the search text and clearing the search.
- Implemented filtering logic in ReportsView to filter both personal and reviewable reports based on the search input.
- Adjusted pagination in ReportsView to reset when the search input changes, ensuring accurate results across pages.

## [20.7] - 2026-03-05

- Added new stats cards display to the Reports View, showing relevant statistics for both "All" and "Review" tabs with tailored content based on the selected tab.
- Introduced a loading skeleton for the stats section in the Reports View to improve user experience during data loading.
- Enhanced the ReportsToolbar component to support custom bottom content and skeleton UI elements for displaying stats.
- Updated the TopSection component to better handle custom bottom content with conditional rendering and added animation effects for a smoother reveal.
- Added support for a custom bottom skeleton in the TopSection component to display during loading states.

## [20.6] - 2026-03-05

- No functional changes or updates to dependencies were made in this release as per the provided diff.

## [1.1] - 2026-03-05

- Removed the turl.json configuration file from the public directory, which previously contained project metadata like version and branch information.

## [1.1] - 2026-03-05

- Replaced the `turl-release` tool with `nit` for handling releases, updating the release script in package.json to use `nit` instead.
- Updated the dependency in package.json to include `nit` from GitHub and removed the `turl-release` dependency.

## [20.4] - 2026-03-05

- Added a TODO comment in MyAccountView.jsx to remind the team to improve the styling of the version display at the bottom of the page.

## [20.4] - 2026-03-05

- Added a TODO comment in MyAccountView.jsx to improve the styling of the version display at the bottom of the page.

## [20.3] - 2026-03-05

- Added loading state support to the ReportsToolbar component by introducing an `isLoading` prop and passing it to the TopSection component.
- Updated the ReportsView to pass the appropriate loading state to ReportsToolbar based on the current tab (loading state for "all" tab uses `isMyReportsLoading`, and for other tabs uses `isReviewLoading`).
- Added loading state support to the TopSection component in ListView by passing the `isLoading` prop.
- Adjusted the default row count in ReportsListSkeleton from 6 to 25 to better simulate loading a larger dataset.
- Modified the padding in AssetListSkeleton's SkeletonAssetRow component for compact mode to use smaller values (`px-2 py-2.5`) and non-compact mode to use `py-5 px-4` for a more consistent look.

## [20.2] - 2026-03-05

- Improved the loading experience in TopSection by introducing a more refined reveal animation logic. Now, the component ensures content is hidden during loading or while awaiting the reveal animation, preventing flickering or premature display of real content.
- Added a skeleton loading state in TopSection that is displayed during loading or before the reveal animation starts, providing a smoother visual transition for users.
- Adjusted the reveal animation timeout in TopSection from 1000ms to 1200ms to allow a slightly longer duration for the effect, enhancing the user experience.

## [20.1] - 2026-03-05

- Adjusted the mobile view width in ListViewModeSection to increase the minimum width from 700px to 1100px for better readability on smaller screens.
- Updated the AssetListSkeleton component for improved mobile display by changing the minimum width from 600px to 1100px and tweaking the margin spacing (mx-2 to mx-1 and mt-4 to mt-3) for a tighter layout.
- Refined the skeleton loading UI in AssetListSkeleton by adjusting the compact mode padding (px-2 to px-4 and py-2.5 to py-3) and setting a minimum width of 40px for the animated placeholder elements, along with a smaller height (h-3 instead of h-3.5) in compact mode for a more polished look.

## [20.0] - 2026-03-05

- Enhanced the list view animation in ListViewModeSection by replacing the fade-in effect with a slide-in effect, where rows now slide in from the left instead of fading in from below.
- Introduced a dynamic animation delay for list rows using an exponential decay formula, making early rows animate more slowly and later rows appear almost simultaneously for a smoother cascading effect.
- Added a loading state to the TopSection component, displaying animated placeholder elements (skeleton UI) while content is loading, improving the user experience during data fetching.
- Implemented a subtle reveal animation for controls in TopSection after loading completes, with a brief delay before resetting.

## [19.9] - 2026-03-05

- Improved responsiveness in GridViewModeSection by adjusting grid layout for mobile devices, including smaller gaps, reduced card sizes, and padding based on screen size.
- Enhanced mobile display in ListViewModeSection by tweaking border radius, adjusting minimum width, and reducing margins for better fit on smaller screens.
- Refined AssetListSkeleton component for better mobile experience by introducing compact layouts for skeleton cards, rows, and task rows, with adjusted padding, spacing, and element sizes, as well as limiting detail rows in mobile view.
- Updated MyAccountView to include minor adjustments for better usability (specific details visible in the diff).

## [19.8] - 2026-03-05

- Added a new `AssetListSkeleton` component to display loading skeletons for asset lists, replacing previous loading spinners in components like `MyReportsList` and `ReviewReportsList` for a more polished loading experience.
- Introduced a `useMagneticHover` custom hook to enhance navigation interactions with magnetic hover effects, applied to navigation items in the `Navigation` component for a more dynamic user interface.
- Removed the inline `LoadingFallback` spinner component from `App.js` and set the Suspense fallback to `null`, streamlining the loading behavior for lazy-loaded views.
- Updated various view components (`EquipmentsView`, `MixersView`, `PickupTrucksView`, `TractorsView`, `TrailersView`, etc.) to integrate with the new skeleton loading approach or minor UI adjustments as seen in the diff.

## [19.7] - 2026-03-05

- Simplified the session creation logic in AuthContext.js by reformatting the Supabase upsert operation for better readability and maintainability, while keeping the functionality unchanged.

## [19.6] - 2026-03-05

- SmyrnaTools Release v19.6
## [19.5] - 2026-03-05

- SmyrnaTools Release v19.5
## [19.4] - 2026-03-04

- SmyrnaTools Release v19.4
## [19.3] - 2026-03-04

- Added a new Supabase CLI wrapper script in `scripts/supabase.js` to improve accessibility and consistency across different developer environments.
- Implemented multiple resolution strategies in the script to locate the Supabase CLI binary, including environment variables, common install paths, system PATH, and npm global bin directory.
- Introduced a fallback mechanism using `npx` to auto-install and run the Supabase CLI if no local or global installation is found.
- Enhanced the script with detailed JSDoc comments for better code documentation and maintainability.
- Added utility functions like `exists()`, `which()`, `npmGlobalBin()`, `findSupabase()`, `run()`, and `tryNpx()` to handle binary resolution and execution with proper error handling.

## [19.2] - 2026-03-04

- Added detailed JSDoc comments to various components for better code documentation and developer experience.
- Enhanced the AppInstallPromptModal with platform-specific installation instructions for iOS and Android, including step-by-step guides and desktop tutorials.
- Improved ErrorMessage component with a dismissible error banner and icon support.
- Updated LoadingScreen to support full-page overlay, inline modes, and a customizable loading message with branded visuals.
- Introduced contextual messaging in LockedOverlay based on lock reasons, with options to refresh or sign out.
- Added comprehensive documentation to MaintenanceFormReview for reviewing submitted maintenance forms with approve/reject controls.

## [19.1] - 2026-03-04

- Updated the styling and structure of report components across multiple weekly report types, including Aggregate Production, District Manager, Efficiency, General Manager, Plant Manager, Ready Mix Instructor, and Safety Manager reports, by removing inline CSS and plugin-specific stylesheets.
- Replaced hardcoded styles with reusable class names and standardized UI elements like input fields and table cells in report plugins for better consistency and maintainability.
- Removed the separate `reportPluginStyles.js` file, consolidating styling into component-specific or shared class names.
- Improved the layout of the Aggregate Production Report by introducing Tailwind CSS classes for spacing and hover effects on table rows.
- Refined the visual presentation of review views across reports, replacing generic placeholders with formatted containers using consistent padding and background colors.
- Adjusted the District Manager Report by removing custom CSS for daily recap sections and related elements, aligning with the broader styling overhaul.

## [19.0] - 2026-03-04

- Added comprehensive documentation comments to various calculator components, including detailed explanations of functionality and logic for ProportionsCalculator (Overweight Fix), SetTimeCalculator, SlumpAdjustmentCalculator, WaterCementCalculator, and YardagePerHourCalculator.
- Enhanced CalculatorView with a clear description of the tab bar interface for switching between different concrete industry calculators.
- Improved code clarity across multiple views by adding inline comments explaining key logic and calculations, such as iterative material adjustments in ProportionsCalculator and environmental factor adjustments in SetTimeCalculator.
- Updated various views including Dashboard, Equipment, Mixers, Operators, Pickup Trucks, Tractors, Trailers, Maintenance, Reports, and others with additional comments or minor structural enhancements for better readability and maintainability.

## [18.9] - 2026-03-03

- Added a lazy loading retry mechanism with page reload in App.js to handle failed dynamic imports of view components, ensuring a smoother user experience by clearing stale chunk hashes on the first failure.
- Updated AI context in context.json to refine the validation rules for plant manager metrics, focusing on identifying obvious data entry errors with specific thresholds for YPH, hours, and yardage.
- Enhanced AI service functionality in AIService.js to improve data validation and error detection logic for weekly reports.
- Improved report generation in ReportService.js by incorporating additional checks or data handling to support accurate reporting.

## [18.8] - 2026-03-03

- Added detailed JSDoc comments to various model classes for better code documentation and clarity, including Equipment, Mixer, Operator, PickupTruck, Tractor, Trailer, and related comment and history models.
- Enhanced MixerHistory and TractorHistory models with specific comments about date handling for cleaner display by stripping time components during deserialization.
- Introduced utility class documentation for MixerHistoryUtils and OperatorHistoryUtils to explain display formatting helpers for values like date localization and status labels.
- Updated view components for Equipment, Mixers, PickupTrucks, Tractors, and Trailers with minor adjustments to improve rendering or functionality.
- Added documentation for notification classes such as EquipmentVerificationNotifications, MixerVerificationNotifications, and TractorVerificationNotifications to clarify their purpose.
- Expanded OverdueListNotifications with additional logic or content to handle overdue item tracking or alerts.

## [18.7] - 2026-03-03

- Added error logging for dashboard data fetch failures in `useDashboardData.js` to improve debugging.
- Introduced new JSDoc comments in `useDashboardEffects.js` for better documentation of animated stats, AI typing effects, and date filter management.
- Added a new `fetchTrailers` method in `TrailerService.js` to retrieve all trailers from the API.
- Implemented `handlePresenceChange` in `UserPresenceService.js` to refresh the online user list on Supabase realtime presence events.
- Enhanced error handling in `APIErrorHandler.js` by suppressing noisy CORS and fetch-related console errors.
- Added detailed JSDoc comments across multiple utility files (e.g., `APIUtility.js`, `AuthUtility.js`, `BaseAssetUtility.js`) to improve code readability and maintainability.
- Reduced complexity in `NetworkUtility.js` by refactoring and streamlining the codebase, removing unnecessary logic.

## [18.6] - 2026-03-03

- Added new AI prompt templates and tone modifiers in the AI module, including role-aware context and special handling for favorite plants to adjust the tone of responses.
- Introduced region-based view filtering in the App component, with specific visibility rules for Office and Aggregate region types, and default hidden views for other regions.
- Enhanced dashboard constants with new cache keys, refresh intervals, and color mappings for asset status and allocation thresholds, along with initial state structures for stats and notifications.
- Expanded history constants with mappings for asset types to CRUD services, history fetching methods, Supabase table names, and issue management services, plus color codings for status and severity.
- Added new context providers for authentication, user preferences, and tutorials to manage global state across the application.
- Implemented a variety of custom hooks for managing dashboard data, maintenance forms, notifications, offline detection, and real-time subscriptions, improving data handling and UI responsiveness.
- Introduced new service modules for AI, app installation prompts, database operations, maintenance, notifications, and various asset types like mixers, tractors, and trailers, centralizing business logic.
- Enhanced existing services like EquipmentService, OperatorService, ReportService, TrailerService, and UserPresenceService with additional methods and improved functionality for data retrieval and management.

## [18.5] - 2026-03-03

- Refactored UserService.js to improve code organization and readability by introducing new constants and helper functions for better modularity.
- Added new utility functions in UserService.js, including `checkPermission` for streamlined permission checks, `safelyFetchRegions` for robust region fetching, `findMatchingRegion` for region matching by code or name, and `throwFirstError` for error handling in Supabase queries.
- Updated session storage keys in UserService.js to use `SESSION_KEY` ('smyrna_session') and `SESSION_FALLBACK_KEY` ('userId') for fetching the current user.
- Introduced new constants in UserService.js for user management, such as `UNKNOWN_USER` for default user fallback, `DEFAULT_ROLE_NAME` as 'User', `ALWAYS_PERMITTED` for 'my_account.view', and `ALL_REGIONS_PERMISSION` for 'regions.select.all'.
- Renamed table constant in UserService.js from `USERS_PROFILES_TABLE` to `PROFILES_TABLE` for consistency.
- Simplified permission check methods (`hasPermission`, `hasAnyPermission`, `hasAllPermissions`) in UserService.js to use the new `checkPermission` helper for consistent behavior.
- Enhanced error handling and input validation in UserService.js by consolidating entity ID resolution and improving query safety in profile field fetching.

## [18.4] - 2026-03-03

- Introduced a new shared utility file `asset-helpers.ts` in the `supabase/functions/_shared` directory to centralize common logic for asset management services, including functions for timestamp handling, data normalization, user ID resolution, and diff computation for tracking changes.
- Refactored asset-related service files (`equipment-service`, `mixer-service`, `pickup-truck-service`, `tractor-service`, and `trailer-service`) to leverage the new shared `asset-helpers.ts` utilities, significantly reducing code duplication and improving consistency across these services.
- Updated `.github/copilot-instructions.md` to combine related guidelines for API interaction centralization and database query efficiency in service files into a single cohesive instruction for better clarity.

## [18.4] - 2026-03-03

- Removed fallback logic instruction from Copilot guidelines in `.github/copilot-instructions.md` to streamline development guidance.
- Refactored `auth-service` to improve code organization by extracting utility functions like `isValidEmail`, `passwordStrength`, `generateSalt`, `bytesToHex`, `hashPassword`, `sanitizeEmail`, and `nowISO` directly into the service file, replacing the previous `AuthUtility` object.
- Updated `auth-service` to use shared utility functions from `../_shared/cors.ts` for consistent response handling with `jsonResponse` and `errorResponse`.
- Consolidated constants in `auth-service` such as `USERS_TABLE`, `PROFILES_TABLE`, `PREFERENCES_TABLE`, `SESSION_RESTORE_TIMEOUT`, `MIN_PASSWORD_LENGTH`, `WEAK_THRESHOLD`, `MEDIUM_THRESHOLD`, `EMAIL_REGEX`, and `SPECIAL_CHAR_REGEX` at the top of the file for better maintainability.
- Simplified endpoint handling in multiple services (`auth-service`, `auth-utility`, `crypto-utility`, `database-service`, `list-service`, `operator-service`, `plan-service`, `plant-service`, `region-service`, `report-service`, `user-preferences-service`, `user-presence-service`, `user-utility`) by reducing code duplication and improving readability through modularized response handling and utility functions.

## [18.3] - 2026-03-03

- Added a new shared CORS utility module in `supabase/functions/_shared/cors.ts` to standardize CORS handling across serverless functions with predefined allowed origins and helper functions for response formatting.
- Refactored `auth-context/index.ts` to use the new CORS utility, simplifying CORS header management and response handling by importing shared functions.
- Updated multiple serverless functions to integrate the shared CORS utility, ensuring consistent CORS behavior and response formatting across endpoints like `auth-service`, `user-service`, and various equipment services.
- Simplified Copilot instructions in `.github/copilot-instructions.md` by consolidating redundant guidelines and removing overly specific rules to improve clarity and maintainability.

## [18.2] - 2026-03-03

- Refactored the user-service function in Supabase to improve code organization and readability by introducing helper functions like `jsonResponse`, `errorResponse`, and `resolveUserId`.
- Added new utility functions for user data handling, such as `fetchUserRoles`, `collectPermissions`, `isElevatedUser`, and `formatEmailAsDisplayName`.
- Introduced constants for configuration values, including `ELEVATED_WEIGHT_THRESHOLD`, `ROLES_SELECT`, `UNIVERSAL_PERMISSION`, and `ALLOWED_ORIGINS` for better maintainability.
- Simplified CORS handling by using a constant array for allowed origins and streamlining the `getCorsHeaders` function.
- Improved response handling by consolidating response creation into reusable functions, reducing code duplication across endpoints.
- Enhanced user name fallback logic with a dedicated `fallbackUserName` function for consistent display name formatting.
- Optimized database queries and permission checks by restructuring role and permission retrieval logic.

## [18.1] - 2026-03-03

- Updated the styling and layout of the StatsDisplay component on the login view to use Tailwind CSS classes for a more consistent and modern look, including centered text, adjusted font sizes, and better spacing.
- Revamped the login view's branding section for larger screens by replacing inline styles with Tailwind CSS classes, improving the layout with a centered design, and enhancing the visual presentation of the Smyrna Tools logo and text with drop shadows and refined typography.

## [18.0] - 2026-03-02

- Refactored the ChangelogView component to use Tailwind CSS classes for styling, replacing inline styles with a more consistent and maintainable approach.
- Simplified code structure by removing unnecessary nested conditions and redundant variable declarations in parsing functions.
- Added two constants, GITHUB_URL and TURL_URL, for external links, though their usage is not yet visible in this diff.
- Optimized date and time calculations by directly using new Date() operations in a single line for better readability.
- Improved rendering logic by streamlining state updates for expanded versions and AI summaries with concise syntax.

## [17.9] - 2026-03-02

- Updated the Copilot instructions to combine guidance for asset management services, merging the advice on centralizing shared logic into utility files like `BaseAssetUtility.js` with consolidating common fields and logic into reusable helpers or constants like `BASE_ASSET_FIELDS` and `resolvePlantCode` for consistent handling across asset types.

## [17.8] - 2026-03-02

- Updated the AddViewSection component to improve user interaction by refining the layout and enhancing the responsiveness of input fields for adding new views.
- Adjusted the styling and event handling in AddViewSection.jsx to ensure a smoother and more intuitive user experience when interacting with the form elements.

## [17.7] - 2026-03-02

- Added visual indicators for completed tasks in the Weekly Planner, showing a green overlay with a checkmark icon and "Completed" label when a task is marked as completed.
- Introduced a follow-up warning for past due tasks in the Weekly Planner, displaying a red overlay with an exclamation triangle icon and "Needs Follow Up" label for tasks that are past their due date and not completed.
- Updated the PlannerItem component to handle a new `isPast` prop, which is used to determine if a task needs a follow-up indicator based on whether the task date is in the past.

## [17.6] - 2026-03-02

- Added a new MaintenanceFormReview component for reviewing submitted maintenance forms, displaying form details, submitter information, and field responses with attached images.
- Introduced a MaintenanceFormViewOnly component to provide a read-only view of maintenance forms with formatted field data and image previews.
- Created multiple dashboard components including DashboardHeader, DashboardSkeleton, EmbeddedViewModal, FleetOverviewSection, MaintenanceQualitySection, PeopleSection, and RegionOverviewCard to enhance the dashboard UI and functionality.
- Implemented new UI components like ImageAttachment for handling image uploads and ImagePreviewModal for viewing attached images in maintenance forms and other contexts.
- Added several custom hooks for better data management, including useDashboardInit for dashboard initialization, useDashboardStats for dashboard statistics, useMaintenanceDraft for draft handling, useMaintenanceForm for form operations, useMaintenanceImages for image management, usePlantNotifications for notification handling, and useStatusHistory for tracking status changes.
- Updated the DashboardView to integrate the new components and hooks, significantly restructuring the dashboard layout and data handling.
- Refactored MaintenanceFormView to incorporate the new form components and hooks for improved form submission and review processes.
- Enhanced App.css with new styles for full-width dashboard layouts and responsive design adjustments for mobile views.
- Added new constants in maintenanceConstants.js to support form and checklist functionalities.
- Updated utility functions in DateUtility.js and MaintenanceUtility.js to support formatting and processing of maintenance data.

## [17.5] - 2026-03-02

- Added a new `OperatorExclusionReasonModal` component to handle cases where all operators are excluded from a report, allowing users to select a reason for the exclusion before submission.
- Introduced `OPERATOR_EXCLUSION_REASONS` constant in `reportConstants.js` with predefined reasons for operator exclusion, such as "All operators sent to another location" and "Plant was shut down".
- Enhanced `useReportSubmission` hook to persist operator exclusion reasons to a new `report_operator_exclusion_reasons` table in Supabase when a report is submitted.
- Updated `useReviewData` hook to detect when all operators are excluded in a plant production report and to manage the associated exclusion reason.
- Modified `ReportsReviewView` and `ReportsSubmitView` to integrate the new operator exclusion reason modal and handle the submission flow when all operators are excluded.
- Added a new database migration to create the `report_operator_exclusion_reasons` table for storing exclusion reasons tied to specific reports.

## [17.4] - 2026-02-27

- Removed the LockedOverlay display for guest-only users in App.js, allowing them to bypass this restriction.
- Added role-based checks in AppInstallPromptModal to prevent the install prompt from showing for users with only 'guest' role or no roles at all.
- Updated the z-index of the content div in LockedOverlay from 1 to 10 to ensure it appears above other elements.

## [17.3] - 2026-02-27

- Simplified the Copilot instructions by removing redundant or overlapping guidelines, focusing on clearer and more concise rules for code organization and best practices in service files, utility functions, and CI configurations.
- Removed specific instructions for handling ID resolution with strict validation and object-based entities, streamlining the guidance for utility functions.
- Consolidated duplicate instructions for export functionality in asset-related data, focusing on uniform integration across views like EquipmentsView.jsx and MixersView.jsx for a consistent user experience.
- Removed detailed instructions for specific formatting and grouping in export modules like AssetIssuesExport.js, keeping only the essential guidance for consistency.
- Simplified guidelines for refactoring utility functions in DashboardUtility.js by consolidating duplicate entries about reusable helper functions and constants for asset data structuring.
- Removed redundant instructions for CI workflow configurations regarding Git HTTPS setup, retaining a single clear directive for smoother dependency resolution during builds.
- Streamlined instructions for new UI components and feature-specific constants, focusing on modularity and centralized organization without repetitive details.

## [17.2] - 2026-02-27

- Updated the turl-release dependency to version 4.8.0 for improved release management capabilities.

## [17.1] - 2026-02-27

- Updated the turl-release dependency to version 4.7.0 for enhanced release management capabilities.

## [17.0] - 2026-02-27

- Updated the turl-release dependency to version 4.7.0 for enhanced release management capabilities.

## [16.9] - 2026-02-27

- Updated the turl-release dependency to version 4.7.0 for improved release management.

## [16.8] - 2026-02-27

- Updated the turl-release dependency to version 4.2.0 for improved release management functionality.

## [16.7] - 2026-02-27

- Completely revamped the HistoryViewSection component by refactoring it to use a custom hook, useHistoryData, for managing history data, AI summaries, and related operations like fetching and updating issues.
- Simplified the HistoryViewSection component by removing direct data fetching and state management logic, delegating these tasks to the useHistoryData hook for better maintainability and separation of concerns.
- Introduced new UI components for the history view, including HistoryEmptyState for displaying an empty state message, RatingChart for visualizing ratings data, StatCard and StatCardGrid for presenting key statistics, TabButton for tab navigation, and TimelineItem with sub-components for rendering history timeline entries.
- Added historyConstants.js to define constants related to asset types and their associated views (e.g., cleanliness, operators, service) as well as severity colors and rating labels used in the history view.
- Created a new utility file, HistoryViewHelpersUtility.js, with helper functions for formatting dates, timestamps, durations, and field names, as well as building consolidated timelines and resolving item names for the history view.
- Implemented comprehensive data handling in useHistoryData.js, including fetching and processing history data, managing AI summary generation, and handling issue completion and deletion directly within the hook.

## [16.6] - 2026-02-27

- Refactored asset data structuring in DashboardUtility.js to improve code reuse and consistency by introducing reusable helper functions like `BASE_ASSET_FIELDS` and `VEHICLE_FIELDS`, and consolidating field resolution logic with `resolvePlantCode` and `resolveTruckNumber`.
- Enhanced status distribution calculation in DashboardUtility.js by adding new utility functions such as `daysBetween`, `getAssetStatusHistory`, and `accumulateStatusDays` for more accurate tracking of asset status over time.
- Simplified date handling logic in DashboardUtility.js with the introduction of `findEarliestDate` to determine the earliest relevant date for status calculations.

## [16.5] - 2026-02-27

- Updated the turl-release dependency to version 4.1.0 for improved release management functionality.

## [16.4] - 2026-02-27

- Added a new feature for exporting asset issues with the introduction of `AssetIssuesExport.js`. This module allows users to generate detailed reports of open issues for various asset types, grouped by plant, with formatted severity levels, issue descriptions, and user information.
- Introduced `BaseAssetService.js` and `BaseAssetUtility.js` to provide shared functionality and utilities for managing different types of assets, streamlining service operations across equipment, mixers, pickup trucks, tractors, and trailers.
- Added export functionality to asset views including `EquipmentsView`, `MixersView`, `PickupTrucksView`, `TractorsView`, and `TrailersView`, enabling users to export data directly from these views.
- Implemented `VerificationNotificationProviderUtility.js` and `createVerificationNotificationProvider.js` to enhance notification handling for verification processes across various asset types.
- Added `resolveEntityId.js` utility to assist in resolving entity IDs, improving data consistency and retrieval accuracy.

## [16.3] - 2026-02-25

- Added a step in the CI workflow to configure Git to use HTTPS instead of SSH for GitHub packages, ensuring smoother dependency resolution in the build process.

## [16.2] - 2026-02-25

- Introduced a new utility function `resolveEntityId` in a dedicated file to handle extracting IDs from objects or direct ID values, along with a `requireEntityId` helper to enforce ID presence with custom error messaging.
- Refactored `UserService.js` to use the new `resolveEntityId` utility for consistent ID resolution across methods like `getUserRoles` and other user-related functions.
- Improved error handling and fallback logic in `UserService.js` by adding a `fallbackUserName` helper for generating default user names based on IDs when full data is unavailable.
- Enhanced caching and API interaction in `UserService.js` by consolidating API calls under a reusable `postUser` helper function for better maintainability.
- Added a new method `fetchProfileField` in `UserService.js` to retrieve specific profile fields for a user directly from the database, improving data access flexibility.
- Simplified user ID checks and return values in methods like `getCurrentUser` and `getUserWeight` for clearer logic and better null handling in `UserService.js`.

## [16.1] - 2026-02-25

- Added a new Copilot instructions file to provide context and rules for GitHub Copilot, including auto-managed project rules for consistent release commit message formatting.
- Improved the AppService by refactoring the version fetching logic in `getVersion()` to use constants for cache key and TTL values, enhancing code readability and maintainability.
- Updated the error handling and response processing in `getVersion()` to use destructuring for cleaner JSON parsing and consistent variable naming.

## [16.0] - 2026-02-25

- Removed the Copilot instructions file (.github/copilot-instructions.md) which previously contained project rules and context for GitHub Copilot.

## [15.9] - 2026-02-25

- Updated the turl-release dependency to version 3.6.0 for improved release management functionality.

## [15.8] - 2026-02-25

- Updated the turl-release dependency to version 3.4.0 with a new commit hash in package-lock.json.
- Removed the public/turl.txt file, which previously contained rules and lessons learned for the TURL project.

## [15.7] - 2026-02-25

- Added a new Copilot instructions file at .github/copilot-instructions.md to provide context and rules for GitHub Copilot, including auto-managed project rules for consistent development practices.
- Updated the public/turl.txt file with revised comments explaining the purpose of rules for GitHub Copilot and noting that manual edits are preserved but may be reformatted.
- Added two new rules to public/turl.txt regarding the use of consistent commit message prefixes (e.g., "SmyrnaTools:") and including version numbers in release commit messages for better tracking and context.

## [15.6] - 2026-02-25

- Updated the dependency turl-release to version 3.3.0 to enhance release management capabilities.

## [15.5] - 2026-02-25

- Updated the dependency turl-release to version 3.3.0 for improved release management.

## [15.4] - 2026-02-24

- Updated the turl-release dependency to version 3.0.0 (commit e818e64) and pinned it to the main branch for consistent updates.

## [15.3] - 2026-02-24

- Updated the turl-release dependency from version 1.0.0 (commit fcd0383) to version 3.0.0 (commit e818e64) and pinned it to the main branch for consistent updates.

## [15.2] - 2026-02-24

- Updated turl-release dependency from v1.0.0 (fcd0383) to v3.0.0 (e818e64) with MIT license, pinning to main branch for consistent updates.

## [15.1] - 2026-02-24

- Refactored AIService.js to improve code organization and modularity by introducing helper functions like `buildHeaders`, `buildRequestBody`, and utility functions for formatting fleet statistics and finding/filtering truck data.
- Added new constants for API models with `DEFAULT_MODEL` set to 'grok-4' and `FAST_MODEL` as 'grok-3-mini-fast' for optimized API calls.
- Introduced cleanliness impact thresholds with `CLEANLINESS_THRESHOLDS` to categorize and evaluate scores with associated labels and impact descriptions.
- Enhanced API interaction by consolidating fetch logic into a single `fetchFromAPI` method, improving error handling, and providing clearer feedback messages for rate limiting and connection issues.
- Added a new method `generateContentFromPrompt` to streamline content generation using specific prompts with formatted data and customized API options.
- Improved data formatting with new utility functions like `formatFleetStatLine`, `formatFleetStatSummary`, `findByTruckNumber`, and `filterByTruckNumber` for better handling of fleet and truck-related data.
- Updated error handling in `generateDashboardInsights` to provide more specific error messages based on API response status.

## [15.0] - 2026-02-24

- Updated the AI context prompts with two new validation tools for plant efficiency reports. Added "validateEfficiencyComment" to assess whether comments on performance issues are reasonable, accepting a wide range of operational explanations and only rejecting clearly invalid or unrelated input.
- Introduced "validatePlantManagerMetrics" to flag obvious data entry errors in weekly plant manager reports, focusing on impossible efficiency metrics like YPH over 25 or under 0.5, and providing structured JSON feedback for review.

## [14.9] - 2026-02-24

- Updated the resolved commit hash for the turl-release dependency to a new version (fcd0383).
- Added license information for turl-release, specifying it as MIT.

## [14.8] - 2026-02-24

- Added new file `OperatorRatingsExport.js` to implement operator ratings export functionality with features including grouping operators by plant, formatting phone numbers, calculating average ratings, and exporting data to an Excel sheet with styled headers and rating stars.
- Updated `TopSection.jsx` to support custom actions by adding a `customActions` prop, allowing additional action elements to be rendered in the UI.
- Modified `OperatorsView.jsx` to integrate the new `exportOperatorRatingsSheet` function from `OperatorRatingsExport.js` for exporting operator ratings data.

## [14.7] - 2026-02-20

- Refactored `AppInstallPromptModal.jsx` to simplify logic for showing install prompts and added structured step-by-step instructions for iOS and Android devices.
- Updated `ErrorMessage.jsx` with minor styling or content adjustments.
- Simplified `LoadingScreen.jsx` by reducing code complexity or UI elements.
- Adjusted `LockedOverlay.jsx` for improved display or functionality.
- Made minor updates to `Modal.jsx` for consistency or bug fixes.
- Updated `Navigation.jsx` with small changes to navigation behavior or styling.
- Adjusted `NotificationsModal.jsx` for better notification display or interaction.
- Updated `OfflineOverlay.jsx` with minor improvements to offline state handling.
- Refactored `OnlineUsersModal.jsx` for better user list management or display.
- Simplified `PlantDropdownModal.jsx` by reducing code or improving dropdown functionality.
- Updated `TerminatedOverlay.jsx` with changes to termination messaging or styling.
- Made minor adjustments to `TutorialPopup.jsx` for tutorial display.
- Updated `UserLabel.jsx` for improved user information display or styling.
- Adjusted `VerificationRequirementsModal.jsx` with small changes to verification content.
- Updated `VersionPopup.jsx` for version information display or interaction.
- Simplified `VideoBackground.jsx` by optimizing video rendering or styling.
- Updated `WebOverlay.jsx` with minor improvements to overlay behavior.
- Added new color or theme property in `themeConstants.js`.
- Enhanced `useAccentColor.js` hook with new functionality for dynamic color application.

## [14.6] - 2026-02-20

- Updated OfflineOverlay.jsx to use CSS classes instead of inline styles for the overlay and modal components.
- Replaced hardcoded styles with Tailwind CSS utility classes for layout, spacing, and design in OfflineOverlay.jsx.
- Added dynamic accent color support in OfflineOverlay.jsx by integrating the PreferencesContext to customize the title and button background colors.
- Removed hardcoded color values and extensive inline style objects from OfflineOverlay.jsx, simplifying the code structure.
- Maintained functionality for retry button with conditional styling for cursor and opacity based on retrying state in OfflineOverlay.jsx.

## [14.5] - 2026-02-20

- Added new utility file `RegionPlantScopeUtility.js` for handling region and plant scope logic, including functions `getRegionScopedPlantCodes` and `resolveUserPlantCode` to manage plant code normalization and user plant resolution.
- Introduced `VerificationDueDateUtility.js` to manage due date logic with `buildDueSeverity` function for determining notification severity based on Central Time zone weekdays and hours.
- Created `createVerificationNotificationProvider.js` to centralize notification logic, supporting single and multi-plant notifications with functions for grouping by plant code and building notifications based on user permissions and plant scopes.
- Refactored `EquipmentVerificationNotifications.js` to use the new `createVerificationNotificationProvider` utility, simplifying the notification generation logic.
- Updated `MixerVerificationNotifications.js` to integrate with `createVerificationNotificationProvider`, reducing redundant code for notification handling.
- Modified `TractorVerificationNotifications.js` to leverage the new notification provider utility for consistent verification notification logic.
- Revised `OverdueListNotifications.js` to align with updated notification utilities, adjusting the logic for overdue item notifications.

## [14.4] - 2026-02-20

- Removed the file `public/changelog_ai.txt` which contained user-friendly AI-generated changelog summaries.
- Fixed a typo in `public/changelog.txt` by adding a stray 'f' before "Changelog" in the header.
- Replaced custom mobile detection logic with `useIsMobile` hook in `src/app/components/list/WeeklyPlanner.jsx`, `src/app/components/sections/ListViewModeSection.jsx`, and other components for consistent mobile responsiveness.

## [14.3] - 2026-02-20

- Removed `ProtectedRoute.jsx` component from `src/app/components/auth/`, which handled authentication and role-based routing logic.
- Deleted `AIAgentPopup.jsx` from `src/app/components/common/`, removing AI agent popup functionality and related data fetching for mixers, tractors, trailers, equipment, pickups, operators, and reports.
- Removed `RegionOverlay.jsx` from `src/app/components/common/`, eliminating region overlay UI component.
- Deleted `LeaderboardPodium.jsx` from `src/app/components/leaderboards/`, removing leaderboard podium display functionality.
- Removed `RegionSelectorOverlay.jsx` from `src/app/components/regions/`, deleting region selection overlay component.
- Deleted `ToggleButtonGroup.jsx` from `src/app/components/ui/`, removing toggle button group UI component.
- Removed `RealtimeContext.js` from `src/app/context/`, eliminating real-time data context functionality.
- Deleted `useAssetRealtimeUpdates.js` from `src/app/hooks/`, removing hook for real-time asset updates.
- Removed `usePresence.js` from `src/app/hooks/`, deleting hook for user presence tracking.
- Deleted `useVersionPolling.js` from `src/app/hooks/`, removing hook for version polling.
- Removed styles from `src/app/index.css`, deleting associated CSS rules.
- Deleted `AppState.js` from `src/models/app/`, removing application state model definitions.
- Removed `ListItem.jsx` from `src/models/list/`, deleting list item model component.
- Deleted `BaseService.js` from `src/services/`, removing base service utility functions.
- Removed `ChatService.js` from `src/services/`, deleting chat-related service functionality.
- Deleted `CryptoUtility.js` from `src/utils/`, removing cryptographic utility functions.
- Removed `DatabaseUtility.js` from `src/utils/`, deleting database utility functions.
- Deleted `EmailUtility.js` from `src/utils/`, removing email handling utility functions.
- Removed `ErrorUtility.js` from `src/utils/`, deleting error handling utility functions.
- Deleted `ListItemCard.jsx` from `src/views/list/`, removing list item card UI component.
- Removed `ReportsReviewViewStyles.js` from `src/views/reports/styles/`, deleting styles for reports review view.
- Deleted `ReportsSubmitViewStyles.js` from `src/views/reports/styles/`, removing styles for reports submit view.
- Removed `ReportsViewStyles.js` from `src/views/reports/styles/`, deleting styles for general reports view.

## [14.2] - 2026-02-20

- Updated ReportsToolbar.jsx to replace the `viewMode="list"` prop with `listLabels={[]}` in the ReportsToolbar component.

## [14.1] - 2026-02-20

- Restructured project directory by moving multiple components from `src/views/` to `src/app/components/`, including `DashboardCharts.jsx`, `DashboardPlantSummary.jsx`, `RegionSelectorOverlay.jsx`, `RegionsAddView.jsx`, `RegionsDetailView.jsx`, and various report components.
- Updated import paths in `DashboardCharts.jsx` to reflect new directory structure, changing `../../services/` to `../../../services/` for `DatabaseService` and `RegionService`.
- Relocated the `PieChartCard` component within `DashboardCharts.jsx` to a different position in the file, though its content remains unchanged.
- Updated import path in `DashboardPlantSummary.jsx` for `usePreferences` from `../../app/context/PreferencesContext` to `../../context/PreferencesContext`.
- Updated import paths in `RegionsAddView.jsx` for `RegionService` to `../../../services/RegionService` and for `AddViewSection` to `../sections/AddViewSection`.
- Updated import paths in `RegionsDetailView.jsx` for `PlantService` and `RegionService` to `../../../services/`.

## [14.0] - 2026-02-20

- Added color brightness clamping functionality in `MyAccountView.jsx` to adjust very light accent colors for better readability.
- Introduced `getRgbFromHex` function to convert hex color codes to RGB values.
- Implemented `clampColorToMaxBrightness` function to limit color brightness to a maximum value (`#D6D6D6` or 214 brightness).
- Modified the accent color input handler to apply brightness clamping before updating preferences.
- Added a note below the accent color picker to inform users about color adjustments for readability with the maximum brightness value displayed.

## [13.9] - 2026-02-19

- Added support for custom accent color in `LeaderboardCategorySelector.jsx` with a new `accentColor` prop, defaulting to '#1e3a5f'
- Updated `CategoryTab` component in `LeaderboardCategorySelector.jsx` to use dynamic styling for selected state based on `accentColor` and theme variant
- Passed `accentColor` prop through `CategoryGroup` and individual `CategoryTab` components in `LeaderboardCategorySelector.jsx`
- Integrated `accentColor` prop usage in `LeaderboardsView.jsx` for the `LeaderboardCategorySelector` component

## [13.8] - 2026-02-19

- Updated `useDashboardData.js` to improve code clarity by introducing temporary variables (`recordsList` and `plants`) for array handling in `processMaintenanceRecords`, `processCommentRecords`, and `usePlantFilter` functions.
- Modified `RolesView.jsx` to remove the `onSearch` prop from the `PageHeader` component signature.

## [13.7] - 2026-02-19

- Removed CSS styles for `.btn-secondary` and its hover state from `src/app/App.css`.
- Updated `StatusBadge` component in `src/views/reports/ReportsReviewView.jsx` to adjust styling for responsiveness with smaller padding and text visibility based on screen size, and changed 'Saved (Draft)' to 'Draft'.
- Refactored `ReportsSubmitView.jsx` to replace inline styles with Tailwind CSS classes for layout and styling, including responsive design for form elements and buttons, and updated button ordering for mobile and desktop views.
- Changed submission button text in `ReportsSubmitView.jsx` from 'Validating comments...' to 'Validating...' for a specific report type during submission.
- Applied Tailwind CSS classes in `ReportsView.jsx` to replace inline styles for the root container and error message display, improving layout and responsiveness.
- Updated error message display in `ReportsView.jsx` to use a flex layout with an icon and consistent spacing.

## [13.6] - 2026-02-19

- Added new `RoleModal.jsx` component for displaying modal dialogs related to roles, including sub-components like `RoleModalBody`, `RoleModalScrollBody`, `RoleModalFooter`, `RoleFormField`, `RoleTextInput`, and `RoleTextarea` for structured modal content and input handling.
- Introduced `useRolesData.js` hook to manage roles data, including loading roles, checking IT access, updating role permissions and weights, and handling success/error messages with functions like `parsePermissionsText` and `showMessage`.
- Updated `RolesView.jsx` with significant refactoring, likely integrating the new `RoleModal` component and `useRolesData` hook for improved role management UI and functionality (exact changes not fully detailed in diff due to truncation).

## [13.5] - 2026-02-19

- Added a custom dropdown arrow icon to the plant selection dropdown in `ReportsSubmitView.jsx` using a background SVG image and adjusted styling with `appearance-none` and cursor properties.
- Enhanced `ReportsStatsCards.jsx` with a new time range filter for review stats, allowing users to view data for "Last Week", "1 Month", or "1 Year" with a `RangeSelector` component for toggling between these options.
- Implemented date filtering logic in `computeReviewStats` function within `ReportsStatsCards.jsx` to filter items based on selected time range using `getLastWeekMondayISO` for weekly filtering and cutoff dates for monthly/yearly ranges.
- Updated styling for `.rpt-stats` class in `WeeklyGeneralManagerReport.jsx` and `reportPluginStyles.js` to include a top margin of `1.25rem` alongside the existing bottom margin and grid layout.

## [13.4] - 2026-02-19

- Updated version number to 13.4 in `public/turl.json`.
- Made significant structural changes to `TopSection.jsx`, including the addition of new components and functionality (specific details not fully visible in the truncated diff).

## [13.3] - 2026-02-19

- Added new components in `TopSection.jsx` for enhanced UI functionality, including `SearchInput`, `Badge`, `ActionButton`, `ViewToggle`, `FilterSelect`, `PlantFilterButton`, `ResetButton`, `ListHeader`, and `MobileViewToggle`.
- Introduced mobile responsiveness in `TopSection.jsx` by integrating the `useIsMobile` hook.
- Implemented view mode toggling between list and grid views with the `ViewToggle` and `MobileViewToggle` components in `TopSection.jsx`.
- Added search functionality with a clear button in the `SearchInput` component within `TopSection.jsx`.
- Enhanced filtering capabilities in `TopSection.jsx` with `FilterSelect` and `PlantFilterButton` components for better data management.
- Added sortable table headers in `ListHeader` component of `TopSection.jsx` with support for ascending and descending order.
- Introduced customizable styling with `accentColor` prop across multiple components in `TopSection.jsx` for consistent theming.

## [13.2] - 2026-02-19

- Added new `EfficiencyInfoCard.jsx` component to display how efficiency is calculated with a detailed formula breakdown and expandable content.
- Updated `HelpDetailsModal.jsx` with revised styling for help entries, including new background and border color classes for sent/received entries, and adjusted layout for better readability.
- Introduced `LeaderboardCategorySelector.jsx` and `LeaderboardPodium.jsx` components to enhance leaderboard functionality and presentation.
- Added new UI components including `CollapsibleTable.jsx`, `DashboardCards.jsx`, `EmptyState.jsx`, `ToggleButtonGroup.jsx`, and `YearSelector.jsx` to improve dashboard and data visualization features.
- Created `dashboardConstants.js` to centralize dashboard-related constants.
- Updated `leaderboardConstants.js` with modifications to existing constants for leaderboard features.
- Implemented new hooks `useDashboardData.js` and `useDashboardEffects.js` for managing dashboard data and side effects.
- Refactored `DashboardCharts.jsx`, `DashboardPlantSummary.jsx`, and `DashboardView.jsx` with significant content updates and structural changes to improve dashboard functionality and user experience.
- Modified `LeaderboardsView.jsx` with updates to leaderboard display logic and removed `LeaderboardsView.refactored.jsx` as part of codebase cleanup.
- Updated `LeaderboardItem.jsx` with enhancements to individual leaderboard item rendering.
- Adjusted utility functions in `LeaderboardsUtility.js` to support new leaderboard features.

## [13.1] - 2026-02-18

- Updated `WeeklyPlanner.jsx` to dynamically handle mobile responsiveness for `isMobile` state with a `useEffect` hook for window resize events.
- Adjusted padding in the main container of `WeeklyPlanner.jsx` for mobile view from `12px` to `10px`.
- Modified layout in `WeeklyPlanner.jsx` to switch to a column layout on mobile for the header section.
- Changed border radius in the header of `WeeklyPlanner.jsx` to `10px` on mobile (previously `14px`).
- Adjusted gaps and padding in various elements of `WeeklyPlanner.jsx` for mobile view, including reducing gaps from `16px` to `12px` and padding from `14px` to `12px`.
- Updated button sizes in `WeeklyPlanner.jsx` for mobile, reducing height and width from `36px` to `32px` and font size from `14px` to `12px`.
- Modified text styling in `WeeklyPlanner.jsx`, reducing font size of week label from `15px/17px` to `14px/17px` on mobile and adjusting text alignment to center on mobile.
- Hid the week number text on mobile view in `WeeklyPlanner.jsx`.
- Adjusted the "Today" button styling in `WeeklyPlanner.jsx` for mobile, reducing font size from `12px` to `11px` and padding from `8px 14px` to `6px 10px`.
- Removed hover effects (`onMouseEnter` and `onMouseLeave`) from navigation buttons in `WeeklyPlanner.jsx`.

## [13.0] - 2026-02-18

- Added new `WeeklyPlanner.jsx` component for weekly task planning with features including day-based task views, status color coding, and interactive task cards with hover effects and removal options.
- Introduced `ListService.js` to handle list-related operations, enhancing data management for the planner component.
- Updated `ListView.jsx` to integrate the new weekly planner functionality with minor modifications to existing code.
- Created a new Supabase function `list-service/index.ts` to support backend operations for list management.
- Added a new database migration `20260218_create_list_planned_items.sql` to create a table for storing planned list items.

## [12.9] - 2026-02-18

- Added user plant code retrieval in `useSubmitData.js` by integrating `UserService.getUserPlant` to fetch and store the user's plant code.
- Updated `useSubmitData.js` to include `userPlantCode` in the returned values for use in components.
- Modified `ReportsSubmitView.jsx` to pass `userPlantCode` from `useSubmitData` hook to the `PlantManagerSubmitPlugin` component.
- Updated `WeeklyPlantManagerReport.jsx` to accept `userPlantCode` as a prop (`propUserPlantCode`) and use it as a fallback for determining the user's plant code.
- Renamed variable `currentPlantCode` to `operatorPlantCode` in `WeeklyPlantManagerReport.jsx` for clarity when fetching operators data.

## [12.8] - 2026-02-18

- Updated `PlantDropdownModal.jsx` to add custom sorting for plants, prioritizing 'OTHER_REGION' to appear at the end of the list.
- Modified `PlantDropdownModal.jsx` to add a margin-bottom style to the "All" option for better spacing.
- Enhanced `APIUtility.js` to dynamically fetch an authentication token using `supabase.auth.getSession()` before falling back to the static `SUPABASE_ANON_KEY` for API requests.
- Refactored `WeeklyPlantManagerReport.jsx` to pass `regionalPlants` as a prop to the `OperatorsSentToHelp` component and utilize it for setting plant data.
- Updated `WeeklyPlantManagerReport.jsx` to remove dependency on `RegionService` and directly query Supabase for region and plant data in the `OperatorsSentToHelp` component.
- Improved data fetching logic in `WeeklyPlantManagerReport.jsx` for operators and plants in the `OperatorsSentToHelp` component to handle cases where `regionalPlants` prop is not provided.

## [12.7] - 2026-02-18

- Reordered import statements for consistency in `LoadingScreen.jsx`, moving `usePreferences` import below `SrmLogo`.
- Reordered import statements for consistency in `Navigation.jsx`, moving `usePreferences` and `useNotifications` imports below service imports.
- Reordered import statements for consistency in `NotificationsModal.jsx`, moving `UserService` import above context and hook imports.
- Reordered import statements for consistency in `TerminatedOverlay.jsx`, moving `useAuth` import below `SmyrnaLogo`.
- Reordered import statements for consistency in `DetailViewSection.jsx`, moving `usePreferences` import below `UserService`.

## [12.6] - 2026-02-18

- Refactored asynchronous code in `src/views/list/ListView.jsx` by extracting inline async functions into named functions `loadData` and `fetchRegionCodes` for better readability and maintenance.
- Reordered import statements in `src/views/reports/ReportsView.jsx` to move `PlantDropdownModal` import above hooks for consistency.
- Adjusted import order in `src/views/reports/components/ReportsToolbar.jsx` and `src/views/reports/types/WeeklyPlantManagerReport.jsx` to maintain consistent placement of `usePreferences` import from `PreferencesContext`.

## [12.5] - 2026-02-18

- Removed CSS styles for `.btn-primary` and its hover state from `src/app/App.css`.
- Updated import paths in `src/app/App.js` to reference components from the new `src/app/components` directory structure.
- Renamed multiple component files from `src/components/common/` to `src/app/components/common/` with minor path updates in related files.
- Added a new `Modal.jsx` component in `src/app/components/common/` with sub-components `ModalSummary`, `ModalSummaryItem`, and `ModalBody` for creating modal dialogs.
- Introduced new leaderboard components `HelpDetailsModal.jsx` and `LeaderboardItem.jsx` in `src/app/components/leaderboards/`.
- Added new hooks `useIsMobile.js` and `useLeaderboardData.js` in `src/app/hooks/` for mobile detection and leaderboard data management.
- Created `leaderboardConstants.js` in `src/app/constants/` to store leaderboard-related constants.
- Refactored `LeaderboardsView.jsx` in `src/views/leaderboards/` with significant code reduction and introduced a refactored version in `LeaderboardsView.refactored.jsx`.
- Enhanced reports functionality in `src/views/reports/` with updates to `ReportsReviewView.jsx`, `ReportsSubmitView.jsx`, and related components like `MyReportsList.jsx`, `ReportsStatsCards.jsx`, and `ReviewReportsList.jsx`.
- Added shared report utilities in `src/views/reports/types/shared/` including `ReportComponents.jsx`, `reportPluginStyles.js`, `useReportData.js`, and `useReportVariance.js`.
- Updated various view components across modules like `equipment`, `mixers`, `operators`, `pickup-trucks`, `tractors`, and `trailers` with minor import path corrections and structural updates.
- Revised `ListView.jsx` in `src/views/list/` with significant code changes for improved functionality.
- Made minor updates to export functionalities in `src/utils/ExportUtility.js` and `src/app/components/modules/export/reports/GeneralManagerExport.js`.

## [12.4] - 2026-02-18

- Refactored asynchronous code in `PlanView.jsx` by replacing immediately invoked async functions with named async functions `loadInitialData` and `loadPlan`, improving readability and maintainability.
- Refactored asynchronous code in `PlantsView.jsx` by replacing immediately invoked async function with a named async function `fetchData`, enhancing code clarity.
- Improved code structure in `PlantsView.jsx` by extracting region plants processing into a separate variable `plantsForRegion` before iteration.

## [12.3] - 2026-02-18

- Updated src/views/plan/PlanView.jsx to include a comment about removing a semi-colon in the code structure.

## [12.2] - 2026-02-18

- Updated import statement in `src/views/reports/ReportsView.jsx` to rename `reportsViewStyles` to `styles` and removed separate `styles` variable declaration.
- Refactored function declarations to use arrow function syntax with `const` for `handleSubmitReport`, `handleManagerEditSubmit`, `handleReview`, `handleManagerEdit`, and `handleShowForm` in `src/views/reports/ReportsView.jsx`.
- Added new utility functions `handleBack`, `handleReviewBack`, and `handleFormSubmit` to manage navigation and form submission logic in `src/views/reports/ReportsView.jsx`.
- Restructured rendering logic in `src/views/reports/ReportsView.jsx` to separate form and review views into conditional blocks before the main return statement.
- Moved `regionalPlants`, `selectedPlantObj`, and `plantDisplayText` calculations before the `useEffect` hook for better readability in `src/views/reports/ReportsView.jsx`.
- Simplified conditional checks and removed redundant code in `handleShowForm` function in `src/views/reports/ReportsView.jsx`.
- Updated loading state variables `isMyReportsLoading` and `isReviewLoading` to be defined earlier in the component for clarity in `src/views/reports/ReportsView.jsx`.

## [12.1] - 2026-02-18

- Added utility constants and functions in `PlantsView.jsx` for handling plant data, including `REGION_TYPE_TO_PLANT_TYPE`, `PLANT_TYPE_OPTIONS`, `getPlantCode`, `getPlantName`, `getPlantType`, and `PLANT_TYPE_BADGE_CLASSES`.
- Refactored data fetching in `PlantsView.jsx` to use an immediately invoked async function and improved error handling for region plants fetching with `Promise.all`.
- Simplified function definitions in `PlantsView.jsx` by converting `handleSelectPlant`, `handlePlantAdded`, `handlePlantDeleted`, and `handlePlantUpdated` to arrow functions and utilizing utility functions for plant code and name retrieval.
- Enhanced filtering logic in `PlantsView.jsx` by using utility functions for plant code, name, and type, improving readability and consistency.
- Added a `resetFilters` function in `PlantsView.jsx` to clear search and filter selections.
- Moved inline styles for select elements to a reusable `SELECT_STYLE` constant in `PlantsView.jsx`.
- Updated plant type options rendering in `PlantsView.jsx` to dynamically map over `PLANT_TYPE_OPTIONS` instead of hardcoding options.

## [12.0] - 2026-02-18

- Updated `ListView.jsx` to replace `--sticky-cover-height` with `--top-section-height` for sticky header height calculation.
- Modified `ListView.jsx` styles to remove fixed height and overflow properties from `container`, `contentArea`, and `mainContent`, adopting a more flexible layout with `minHeight` and added padding.
- Added `className` attributes in `ListView.jsx` for better CSS targeting, including `global-dashboard-container` and `list-content-area`.
- Adjusted `ListView.jsx` sticky positioning to use CSS variable `--top-section-height` and increased `zIndex` to 40 for better layering.
- Enhanced `ListView.jsx` with `overscroll-behavior` and `-webkit-overflow-scrolling` for improved scrolling behavior on mobile devices.
- Updated `PlanView.jsx` to introduce new utility functions and constants like `getTomorrowDate`, `formatTime`, `parseTime`, and `addMinutesToTime` for better time handling.
- Added new UI components in `PlanView.jsx` such as `Pill` and `PlantSelect` for improved user interface elements.
- Introduced new constants in `PlanView.jsx` like `AUTOSAVE_DELAY_MS`, `DEFAULT_STAGGER_MINUTES`, and `DROPDOWN_ARROW_SVG` for configuration and styling.
- Refactored `PlanView.jsx` to use `getTomorrowDate` for initializing `planDate` state.

## [11.9] - 2026-02-18

- Updated `TutorialService.js` to improve tutorial reset functionality in `resetAllTutorials` and `resetTutorial` methods by adding error handling, querying existing records before deletion, and returning `false` on failure instead of defaulting to `true`.
- Enhanced responsiveness in `ListView.jsx` by adjusting dropdown styling for mobile devices, including smaller font sizes, padding, background image positioning, and icon sizes.
- Modified `ListView.jsx` dropdown placeholder text for mobile view to use shorter labels (`+Status` and `+Role`) compared to desktop (`+ Status` and `+ Assigned`).
- Adjusted layout in `ListView.jsx` by adding mobile-specific spacing and alignment for filter controls and summary stats, including reduced gaps and font sizes on mobile.
- Updated `MyAccountView.jsx` with minor changes to improve user account display or functionality (specific details not fully visible in the provided diff snippet).

## [11.8] - 2026-02-17

- Updated `PRODUCTIVITY_ITEMS` in `src/components/common/Navigation.jsx` to include new items: 'Plan', 'Calculators', and 'Leaderboards'.
- Modified the mobile view in `Navigation.jsx` to display all `PRODUCTIVITY_ITEMS`, removing the filter that excluded 'Reports'.
- Adjusted the filter for standalone items in `Navigation.jsx` to include 'Reports' in the mobile menu by removing it from the exclusion list.

## [11.7] - 2026-02-17

- Adjusted styling for navigation items in `Navigation.jsx` for tablet view: reduced border radius from 8px to 6px, font size from 13px to 12px, gap from 6px to 4px, and padding from 8px 10px to 6px 8px.
- Updated icon button styling in `Navigation.jsx` for tablet view: reduced border radius from 10px to 8px, height and width from 36px to 32px, and icon font size from 14px to 13px.
- Modified badge styling in `Navigation.jsx` for tablet view: reduced font size from 10px to 9px, height and minWidth from 18px to 16px, padding from 0 5px to 0 4px, and adjusted position with right and top offsets from -2px to -4px.
- Updated header styling in `Navigation.jsx`: added `overflow: hidden` to the main container, reduced header height for tablet view from 60px to 56px, and adjusted padding from 0 16px to 0 12px.
- Adjusted logo container styling in `Navigation.jsx`: reduced logo height for tablet view from 32px to 28px and padding-right from 16px to 10px.
- Refined navigation and layout spacing in `Navigation.jsx`: reduced gap in navigation container for tablet view from 16px to 10px, nav items gap from 4px to 2px, and right-side elements gap from 10px to 8px.
- Added `flexShrink: 0` to multiple elements in `Navigation.jsx` including navigation items, icon buttons, header, logo container, and right-side container to prevent shrinking.
- Added flexible layout properties in `Navigation.jsx`: introduced `flex: 1` and `minWidth: 0` to navigation and left-side container for better responsiveness.

## [11.6] - 2026-02-17

- Added tablet-specific responsive design support in Navigation.jsx with a new `isTablet` state variable to detect screen widths between 768px and 1024px.
- Updated resize event handler in Navigation.jsx to set both `isMobile` and `isTablet` states based on window width.
- Adjusted styling for navigation items in Navigation.jsx to use smaller dimensions and spacing on tablet devices, including border radius, font size, padding, and gaps.
- Modified dropdown navigation items in Navigation.jsx to hide labels on tablet devices and adjust icon sizes and spacing.
- Updated icon button styles in Navigation.jsx for tablet view with reduced height, width, and font sizes, along with smaller badge dimensions.
- Adjusted header styling in Navigation.jsx for tablet screens, reducing height, padding, and gaps between elements.
- Changed logo image height in Navigation.jsx to be smaller on tablet devices.
- Added a title attribute to the Dashboard navigation item in Navigation.jsx for better accessibility.

## [11.5] - 2026-02-17

- Added ReactDOM import in WeeklySafetyManagerReport.jsx for rendering modal content.
- Removed z-index from .safety-tag-picker CSS class in WeeklySafetyManagerReport.jsx.
- Removed multiple CSS classes related to tag menu styling (.safety-tag-menu, .safety-tag-menu-header, .safety-tag-action, etc.) from WeeklySafetyManagerReport.jsx as they are no longer used.
- Replaced fixed positioning logic for tag picker menu with a modal-based approach in WeeklySafetyManagerReport.jsx.
- Implemented a new modal UI for tag selection in TagPicker component with inline styles for layout, background, and interaction.
- Added modal content structure in TagPicker with header, close button, and select all functionality in WeeklySafetyManagerReport.jsx.
- Removed event listener for document click and menu position calculation logic from TagPicker component in WeeklySafetyManagerReport.jsx.

## [11.4] - 2026-02-17

- Updated `PlantDropdownModal.jsx` to change the default selection text from an empty string to 'All' when selecting the default option.
- Enhanced `WeeklySafetyManagerReport.jsx` by adding dynamic positioning for the tag picker menu to ensure it displays correctly above or below the button based on available screen space.
- Modified CSS in `WeeklySafetyManagerReport.jsx` to use `position: fixed` for the `.safety-tag-menu` class, adjusting its `z-index` to 10000 and setting explicit width constraints.
- Added `z-index: 50` to the `.safety-tag-picker` class in `WeeklySafetyManagerReport.jsx` to manage layering.
- Updated the tag picker menu styling in `WeeklySafetyManagerReport.jsx` to increase box-shadow intensity and define a specific width of 320px with a max-width of 90vw.

## [11.3] - 2026-02-17

- Adjusted mobile responsiveness in `PlanView.jsx` by reducing padding and font sizes for mobile devices.
- Updated main container padding from 16 to 12 for mobile in `PlanView.jsx`.
- Modified header layout to support flex wrapping and adjusted title font size from 22 to 18 on mobile in `PlanView.jsx`.
- Changed date input styling for mobile with reduced font size and padding in `PlanView.jsx`.
- Adjusted button padding for settings and add assignment buttons on mobile in `PlanView.jsx`.
- Updated font sizes for assignment stats display, reducing text size on mobile in `PlanView.jsx`.
- Modified send/receive value font sizes for mobile visibility in `PlanView.jsx`.
- Reduced padding for assignment container on mobile from 20 to 12 in `PlanView.jsx`.
- Adjusted empty state styling for assignments, reducing padding and icon size on mobile in `PlanView.jsx`.

## [11.2] - 2026-02-17

- Added new script "sync-changelog" in package.json to copy CHANGELOG.md to public/changelog.txt
- Added "prestart" script in package.json to run "sync-changelog" before starting the application
- Added "prebuild" script in package.json to run "sync-changelog" before building the application

## [11.1] - 2026-02-17

- Updated `LoginView.jsx` to conditionally render the logo and title based on screen size, hiding them on mobile devices (window width < 768px).
- Enhanced `PlanView.jsx` to add a "Load from Plant" checkbox for assignments, allowing users to mark if loading is from a plant.
- Modified `PlanView.jsx` to display a "[Load from Plant]" note in the assignment message text when the option is enabled.

## [11.0] - 2026-02-17

- Added new `changelog.txt` file in the `public` directory to document all notable changes to SmyrnaTools, including detailed version history from 9.7 to 10.9.
- Added new `changelog_ai.txt` file in the `public` directory, likely containing AI-related changelog entries or summaries.
- Introduced a new `ChangelogView.jsx` component in `src/views/login` to display changelog information to users.
- Updated `LoginView.jsx` in `src/views/login` with minor changes, potentially integrating changelog display or related UI elements.
- Refactored `PlanView.jsx` in `src/views/plan` with significant updates, including restructuring or rewriting large portions of the code for improved functionality or UI.

## [10.9] - 2026-02-17

- Removed dependency on UserService and introduced a new `getUserId` function to retrieve user ID from localStorage or sessionStorage in `TutorialService.js`.
- Added user existence check before performing database operations in `dismissTutorial` function in `TutorialService.js`.
- Reordered and restructured `getDismissedTutorials` function to use the new `getUserId` method in `TutorialService.js`.
- Updated `resetTutorial` and `resetAllTutorials` functions to use the new `getUserId` method instead of UserService in `TutorialService.js`.
- Removed error handling for insertion in `dismissTutorial` to simplify error management in `TutorialService.js`.

## [10.8] - 2026-02-17

- Updated `DashboardPlantSummary.jsx` to persist the minimized state of the dashboard plant summary using `localStorage`.
- Added initialization of `isMinimized` state based on saved value in `localStorage`, defaulting to `true` if no value is found or if not in a browser environment.
- Implemented `useEffect` hook to save the `isMinimized` state to `localStorage` whenever it changes.

## [10.7] - 2026-02-17

- Removed mobile-specific sidebar functionality and related state variables `showMobileSidebar` and `sidebarExpanded` from `ListView.jsx`.
- Deleted styles and components related to the sidebar, including `sidebar`, `sidebarBody`, `sidebarHeader`, `sidebarHeaderSubtitle`, `sidebarHeaderTitle`, `sidebarSection`, and `sidebarTitle` in `ListView.jsx`.
- Removed mobile-specific UI elements and styles such as `mobileStatBadge`, `mobileStatsRow`, `mobileToggleBar`, and `mobileToggleBtn` from `ListView.jsx`.
- Eliminated stat card styles and related components like `statCard` and `statValue` from `ListView.jsx`.
- Changed `mainContent` style in `ListView.jsx` to always use `flexDirection: 'column'` regardless of device type.
- Removed `viewModeToggle` and associated `viewModeBtn` styles and components from `ListView.jsx`.
- Removed `listViewFilterBar` component and related rendering logic from `ListView.jsx`.

## [10.6] - 2026-02-17

- Added `isMobile` property to `TutorialContext` in `src/app/context/TutorialContext.jsx` with a default value of `false`.
- Updated `MyAccountView.jsx` to destructure `isMobile` from `useTutorial` hook and conditionally render the Tutorials section based on `!isMobile`, hiding it on mobile devices.
- Removed database migration files `20260202_create_plant_travel_times.sql` and `20260217_create_user_tutorials.sql` from the `supabase/migrations` directory.

## [10.5] - 2026-02-17

- Updated mobile navigation styling in `DetailViewSection.jsx` with increased padding, adjusted button sizes, larger icon sizes, and modified content padding for better mobile responsiveness.
- Adjusted mobile view breakpoints in `DetailViewSection.jsx` for screens smaller than 480px, refining navigation and button dimensions.
- Added visible text labels within buttons for "Issues" and "Comments" in header actions across detail view components including `EquipmentDetailView.jsx`, `MixerDetailView.jsx`, `PickupTrucksDetailView.jsx`, `TractorDetailView.jsx`, and `TrailerDetailView.jsx`.

## [10.4] - 2026-02-17

- Updated version in `public/turl.json` from 10.2 to 10.3.
- Introduced a new tutorial system with the addition of `TutorialContext.jsx` for managing tutorial states and interactions.
- Added `TutorialPopup.jsx` component to display tutorial content to users.
- Created `TutorialService.js` to handle tutorial-related operations such as dismissing and retrieving tutorial data.
- Added a database migration script `20260217_create_user_tutorials.sql` to support user tutorial tracking in Supabase.
- Integrated tutorial functionality in `App.js` by adding `TutorialManager` component and triggering initial tutorial 'account-nav-hint' on user login.
- Updated `PreferencesContext.js` to include a `tutorials` preference setting, with event dispatching for preference updates.
- Modified `Navigation.jsx` to likely support tutorial hints or navigation-related tutorial content.
- Enhanced `DashboardView.jsx` and `MyAccountView.jsx` to incorporate tutorial triggers or displays specific to these views.
- Adjusted `index.js` to potentially include tutorial-related initialization or context providers.

## [10.2] - 2026-02-17

- Added support for dynamic accent color in `VerificationRequirementsModal.jsx` using user preferences from `PreferencesContext`.
- Updated the `header` background color to use the dynamic `accentColor` instead of the static value `#1e3a5f`.
- Changed the `primaryButton` background color to use the dynamic `accentColor` instead of the static value `#1e3a5f`.
- Modified the `savePhoneButton` background color to use the dynamic `accentColor` instead of the static value `#1e3a5f`.
- Updated the `sectionTitle` text color to use the dynamic `accentColor` instead of the static value `#1e3a5f`.
- Adjusted the `tableLabel` text color to use the dynamic `accentColor` instead of the static value `#1e3a5f`.

## [10.1] - 2026-02-17

- Refactored asynchronous logic in `DetailViewSection.jsx` by extracting inline async functions into named functions for better readability and maintainability.
- Renamed async operations in `DetailViewSection.jsx` as follows: plant permission check to `checkPlantPermission`, transfer permission check to `checkTransferPerm`, regions loading to `loadRegions`, and plants loading to `loadPlants`.
- Updated invocation of asynchronous functions in `DetailViewSection.jsx` to use explicit function calls instead of immediately invoked async expressions.

## [10.0] - 2026-02-17

- Updated `DetailViewSection.jsx` to introduce a new `DetailViewContext` for managing active sections and sidebar state, including functionality for collapsing/expanding the sidebar with local storage persistence.
- Enhanced UI styling in `DetailViewSection.jsx` with updated CSS for form controls, buttons, and layout elements, including improved focus states, border radius, and typography.
- Added new props and state management in `DetailViewSection.jsx` for region transfer functionality, including permissions checking, region/plant selection, and transfer error handling.
- Refactored multiple detail view components (`EquipmentDetailView.jsx`, `ListDetailView.jsx`, `ManagerDetailView.jsx`, `MixerDetailView.jsx`, `OperatorDetailView.jsx`, `PickupTrucksDetailView.jsx`, `TractorDetailView.jsx`, `TrailerDetailView.jsx`) to integrate with the updated `DetailViewSection` component and context.
- Updated `VerificationCardSection.jsx` with potential UI or functional improvements to align with the new detail view structure and styling.

## [9.9] - 2026-02-16

- Reduced the number of color options in MyAccountView.jsx from 10 to 3 (Navy, Red, Black).
- Updated the color code for 'Gray' from '#1f2937' to '#374151' in MyAccountView.jsx.

## [9.8] - 2026-02-16

- Updated `VersionPopup.jsx` to use dynamic accent color from user preferences instead of a hardcoded value for the popup background.
- Modified `ListView.jsx` to apply dynamic accent color from user preferences across multiple UI elements, replacing hardcoded color `#1e3a5f` in styles for:
  - Add button background
  - Bulk count text color
  - Group count background
  - Total count text color
  - Mobile toggle button background when active
  - Sidebar header title text color
  - Statistic item total color
  - View mode button border and text color when active
  - Search input focus border color and box shadow
  - Planner group icon color
- Changed hover effect for the add button in `ListView.jsx` to adjust opacity instead of changing background color.

## [9.7] - 2026-02-16

- Added support for customizable accent color in RecapModalSection.jsx by integrating the usePreferences hook to fetch user preferences.
- Replaced hardcoded background color '#1e3a5f' with dynamic accentColor from user preferences for the tab and modal header in RecapModalSection.jsx.
- Updated date filter buttons in RecapModalSection.jsx to use dynamic styling based on accentColor for active and inactive states, replacing hardcoded color values.

## [9.6] - 2026-02-16

- Added support for customizable accent color in user preferences in `PreferencesContext.js`, allowing users to set a preferred color theme.
- Applied dynamic accent color from user preferences to UI elements in `LoadingScreen.jsx`, `Navigation.jsx`, and `NotificationsModal.jsx` for consistent theming.
- Updated styling in `DetailViewSection.jsx` to use dynamic accent color for form section headers and other elements.
- Enhanced `DashboardView.jsx` with significant updates, including UI improvements and new content (304 lines added, 112 removed).
- Improved `MyAccountView.jsx` with expanded functionality or UI enhancements (156 lines added, 14 removed).
- Updated `PlanView.jsx` with notable changes to layout or features (148 lines added, 62 removed).
- Modified `TopSection.jsx` with UI or content adjustments (45 lines modified).
- Revised `YardagePerHourCalculator.js` in the calculator module with functional updates (30 lines modified).
- Made minor updates to `CalculatorView.jsx`, `LeaderboardsView.jsx`, `VerificationCardSection.jsx`, and `DashboardPlantSummary.jsx` for consistency or small fixes.
- Adjusted `OperatorSelectModal.jsx` in the mixers view with UI or logic changes (29 lines modified).

## [9.5] - 2026-02-13

- Updated `useReviewData.js` to handle component unmounting by adding a `mounted` flag to prevent state updates after unmount, and adjusted dependency array to use `formPlant`.
- Added CSS rules in `index.css` to remove spin buttons from number input fields across different browsers for a cleaner UI.
- Enhanced `ReportService.js` to include caching for `fetchActiveOperatorsAndMixers` using `CacheUtility` with a short TTL, and updated return object to include `activeOperators`.
- Significantly refactored `PlanView.jsx` with major changes including removal of initial `assignments` state data, addition of `plantYardageTargets` and `showYardage` states, and substantial UI and logic updates (specific details truncated due to diff size).
- Modified `WeeklyPlantManagerReport.jsx` with minor updates to align with related changes in report handling (exact changes not fully detailed in provided diff excerpt).

## [9.4] - 2026-02-12

- Added custom sorting for status percentages in `StatusHistoryBar.jsx` with a defined order for statuses (Active, In Shop, Spare).
- Introduced loading animation with a shimmer effect for the status bar during data loading.
- Added animation for status bar segments with fade-in and width transition effects using `animateIn` state.
- Implemented conditional rendering for the status bar to handle loading and empty data states more explicitly.
- Enhanced hover tooltip display to only show when not loading and data is available.
- Added CSS keyframes for the shimmer animation directly in the component.

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
