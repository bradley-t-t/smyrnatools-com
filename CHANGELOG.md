# Changelog

All notable changes to SmyrnaTools will be documented in this file.

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
