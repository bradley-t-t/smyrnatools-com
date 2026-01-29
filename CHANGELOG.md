# Changelog

All notable changes to SmyrnaTools will be documented in this file.

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
