# Copilot Instructions

This file provides context to GitHub Copilot for this project.

<!-- TURL-RULES-START -->
## Project Rules (Auto-managed by TURL)

These rules are automatically learned from project commits and enforced during releases.
Do not edit this section manually - it will be overwritten.

- Use a consistent format for release commit messages, such as "SmyrnaTools: Release vX.Y", to maintain clarity and uniformity in version tracking.
- Use constants for cache keys and TTL values in service functions like `getVersion()` in AppService.js to improve code readability and maintainability, ensuring that these values are defined at the top of the file for easy reference and modification.
- Apply consistent variable naming and destructuring when processing API responses in service functions, such as renaming generic terms like `res` to more descriptive names like `response` and using destructuring for JSON parsing (e.g., `const { version = '' } = await response.json()`), to enhance clarity and reduce errors.
- When introducing utility functions for ID resolution, ensure they are placed in a dedicated utility file like `resolveEntityId.js` and reused across services such as `UserService.js` to maintain consistency in handling entity IDs and reduce code duplication.
- In service files like `UserService.js`, create reusable helper functions such as `postUser` for API interactions to consolidate endpoint calls, improving maintainability and reducing the risk of inconsistent API handling across methods.
- Enhance error handling in service methods by implementing fallback logic, such as `fallbackUserName` in `UserService.js`, to provide meaningful default values (e.g., generating a user name from an ID) when data retrieval fails, ensuring better user experience and robustness.
- When creating utility functions for ID resolution, ensure they handle both direct ID values and object-based entities with an `id` property, as seen in `resolveEntityId.js`, to provide a consistent way of extracting IDs across the codebase. Additionally, include a strict validation helper like `requireEntityId` to enforce ID presence with customizable error messages for better error handling.
- In service files like `UserService.js`, centralize API interactions under reusable helper functions (e.g., `postUser`) to improve maintainability and reduce duplication when making API calls to specific endpoints.
- When handling user data in services like `UserService.js`, implement fallback logic for user attributes (e.g., `fallbackUserName`) to provide meaningful default values based on available data like IDs, ensuring robustness when full data is unavailable.
- For database queries in service implementations like `UserService.js`, create targeted methods (e.g., `fetchProfileField`) to retrieve specific fields directly from the database, enhancing flexibility and efficiency in data access over fetching entire records.
<!-- TURL-RULES-END -->
