# Changelog

All notable changes to SmyrnaTools will be documented in this file.











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

- Updated commit message prefix from "Release" to "SmyrnaTools Release" in release.js
- Modified git push command to specify "origin core" branch
- Changed release completion message to include "SmyrnaTools" prefix
## [7.5] - 2026-01-29

- Updated commit message format to capitalize "Release" in the message string.
- Changed the rule for commit message first line to enforce "Release: vX.Y.Z" format instead of "release: vX.Y.Z".
## [7.4] - 2026-01-29

- Updated release message format from "release: vX.Y.Z" to "Release: vX.Y.Z" in scripts/release.js
## [7.3] - 2026-01-29

- Removed scripts for cleaning up console logs and unused CSS.
- Deleted `remove-console-logs.js` which was used to scan and remove console.log statements from JavaScript files.
- Deleted `remove-unused-css.js` which was used to identify and remove unused CSS from the codebase.
- Added a new empty file `cleanup.js`, potentially as a placeholder for future cleanup scripts.
## [7.2] - 2026-01-29

- Updated formatting in ALLOWED_MIGRATIONS array declaration by removing unnecessary line breaks.
- Improved code readability by splitting a conditional error check into multiple lines in the SupabaseUtils update method.
- Added missing newline at the end of DatabaseService.js file.
## [7.1] - 2026-01-29

- Added new "format" script in package.json to run Prettier on source files for consistent code styling.
- Updated CSS formatting in App.css for better readability of font-family declarations.
- Applied consistent import statement formatting in App.js with proper spacing.
- Enhanced UpdateLoadingScreen component in App.js with improved styling and progress bar animation for a better user experience during updates.
## [7.0] - 2026-01-29

- Added new "format" script in package.json to run Prettier on source files for consistent code styling.
- Updated CSS formatting in App.css for better readability of font-family declarations.
- Applied consistent import statement formatting in App.js with proper spacing.
- Enhanced UpdateLoadingScreen component in App.js with improved styling and progress bar animation for a better user experience during updates.
## [6.9] - 2026-01-29

- Added new "format" script in package.json to run Prettier on source files for consistent code styling.
- Updated CSS formatting in App.css for better readability of font-family declarations.
- Applied consistent import statement formatting in App.js with proper spacing.
- Enhanced UpdateLoadingScreen component in App.js with improved styling and progress bar animation for a better user experience during updates.
## [6.8] - 2026-01-29

- Added .prettierignore configuration file
- Added .prettierrc configuration file
## [6.7] - 2026-01-29

- Enhanced release script to include actual code diff in changelog and commit message generation
- Improved change detection by adding fallback to check HEAD~1 for changed files
- Added diff truncation to prevent overly long prompts for AI generation
- Refined AI prompt rules to focus on visible changes in diffs
- Adjusted temperature in AI requests for more precise outputs
- Renamed functions for clarity, such as getActualCodeDiff for detailed diff output
- Added checks to exit release process if no changes are detected
- Updated commit message generation to prioritize actual code changes
## [6.6] - 2026-01-29

- Enhanced offline detection with improved reliability in unstable network conditions.
- Updated authentication logic to handle session timeouts more gracefully.
- Introduced version polling to notify users of available updates seamlessly.
- Revamped main application interface for better usability and performance.
- Optimized CI workflow for faster build and deployment processes.
- Updated documentation in README.md with clearer setup instructions.
- Revised LICENSE.md to reflect updated terms and conditions.
## [6.5] - 2026-01-29

- Updated LICENSE.md to reflect new terms and conditions for software usage.
- Minor documentation updates in CHANGELOG.md for clarity on version history.

## [6.3] - 2026-01-29

- Initial changelog setup
- Add release script with AI-generated commit messages
- Extract custom hooks to app/hooks folder
- Add version polling and offline detection hooks
- Add authentication hook for session management
