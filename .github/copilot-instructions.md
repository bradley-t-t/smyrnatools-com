# Copilot Instructions

This file provides context to GitHub Copilot for this project.

<!-- TURL-RULES-START -->
## Project Rules (Auto-managed by TURL)

These rules are automatically learned from project commits and enforced during releases.
Do not edit this section manually - it will be overwritten.

- Use constants for cache keys and TTL values in service functions like `getVersion()` in AppService.js, defined at the top of the file, to ensure readability and ease of modification.
- In service files like `UserService.js`, centralize API interactions into reusable helper functions (e.g., `postUser`) to avoid duplication and ensure consistent endpoint handling.
- Implement fallback logic in service methods like `UserService.js` (e.g., `fallbackUserName`) to provide meaningful default values based on available data, ensuring robustness when data retrieval fails.
- For database queries in services like `UserService.js`, create targeted methods (e.g., `fetchProfileField`) to retrieve specific fields directly, improving efficiency over fetching entire records.
- In CI workflows like `.github/workflows/ci.yml`, configure Git to use HTTPS instead of SSH for GitHub packages by setting `git config --global url."https://github.com/".insteadOf ssh://git@github.com/` to ensure smooth dependency resolution.
- For asset management services like `EquipmentService.js` and `MixerService.js`, centralize shared logic into utility files such as `BaseAssetUtility.js` and consolidate common fields and logic into reusable helpers or constants (e.g., `BASE_ASSET_FIELDS`, `resolvePlantCode`) to avoid duplication and ensure consistent handling across asset types.
- In serverless function implementations, define constants for configuration values such as thresholds, query strings, and allowed origins at the top of the file to enhance maintainability and ensure consistent usage across the codebase.
- In API endpoint handlers, centralize response creation into reusable utility functions to standardize response formatting and reduce code duplication across different request handlers.
- For user data processing in backend services, implement dedicated helper functions to handle specific tasks like user ID resolution, role fetching, and name formatting to improve code readability and ensure consistent logic application.
- When refactoring service functions, introduce reusable helper functions for common tasks like response formatting and error handling to reduce code duplication and improve maintainability.
- Define constants for configuration values such as thresholds, query strings, and allowed origins at the top of service files to enhance readability and simplify updates.
- Streamline CORS handling by using predefined lists of allowed origins and consolidating header logic into dedicated utility functions for consistent behavior across endpoints.
- Implement dedicated fallback logic for user data formatting, such as display names, to ensure consistent output even when primary data is unavailable.
<!-- TURL-RULES-END -->
