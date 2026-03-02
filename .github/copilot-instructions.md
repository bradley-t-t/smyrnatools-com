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
- For asset management services like `EquipmentService.js` and `MixerService.js`, centralize shared logic into utility files such as `BaseAssetUtility.js` to avoid duplication and ensure consistent handling across asset types.
- When refactoring utility functions for asset data in files like `DashboardUtility.js`, consolidate common fields and logic into reusable helpers or constants (e.g., `BASE_ASSET_FIELDS`, `resolvePlantCode`) to ensure consistency and maintainability.
<!-- TURL-RULES-END -->
