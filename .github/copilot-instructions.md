# Copilot Instructions

This file provides context to GitHub Copilot for this project.

<!-- TURL-RULES-START -->
## Project Rules (Auto-managed by TURL)

These rules are automatically learned from project commits and enforced during releases.
Do not edit this section manually - it will be overwritten.

- Use a consistent format for release commit messages, such as "SmyrnaTools: Release vX.Y", to maintain clarity and uniformity in version tracking.
- Use constants for cache keys and TTL values in service functions like `getVersion()` in AppService.js to improve code readability and maintainability, ensuring that these values are defined at the top of the file for easy reference and modification.
- Apply consistent variable naming and destructuring when processing API responses in service functions, such as renaming generic terms like `res` to more descriptive names like `response` and using destructuring for JSON parsing (e.g., `const { version = '' } = await response.json()`), to enhance clarity and reduce errors.
<!-- TURL-RULES-END -->
