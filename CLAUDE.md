# Code Agent Instructions

## Communication Style
Be direct, concise, and informative. No filler, no fluff. State what you did and why in brief terms.

## Code Quality Standards

### Refactoring & Readability
- Refactor code to be clean, readable, and human-like. Write code as a senior developer would — clear intent, logical flow, no clever tricks that sacrifice comprehension.
- Add concise comments explaining **why**, not **what**. Skip obvious comments. Focus on business logic, edge cases, and non-obvious decisions.
- Keep code concise but **never remove or break edge case handling**. If an edge case exists, assume it's there for a reason. Preserve it, but you may refactor how it's expressed.

### File Structure & Naming Conventions
- **Match existing project conventions exactly.** Before creating or renaming any file, inspect the surrounding files and directories for naming patterns (casing, suffixes, prefixes, separators).
    - If existing files are `UserService.js`, `OrderService.js` → name yours `PaymentService.js`, not `paymentservice.js`, `payment-service.js`, or `paymentSvc.js`.
    - If utilities follow `StringUtility.js`, `DateUtility.js` → name yours `MathUtility.js`, not `mathutil.js` or `math-helpers.js`.
- Place files in the directory that matches the project's established structure. Do not create new directories or organizational patterns unless explicitly asked.

### Use Existing Architecture
- **Always use existing Utility classes, Services, Helpers, and shared modules.** Before writing new logic, check if a relevant Service, Utility, or shared class already exists that is designed to centralize that type of logic. Use it.
- Do not duplicate logic that belongs in an existing shared layer. If a `DateUtility` exists, date logic goes there — not inline in a component.
- If new shared logic is genuinely needed, place it in the appropriate existing architectural layer following the established patterns.

### Styling — Tailwind CSS Only
- **Use Tailwind CSS exclusively. No regular CSS under any circumstances.** No inline `style` attributes for layout/design. No `.css` files. No `<style>` blocks. No CSS modules. No styled-components.
- If you encounter regular CSS anywhere in files you're touching, **stop and convert it to Tailwind before continuing your primary task.** Complete both: the CSS-to-Tailwind conversion AND the original task.
- If the CSS conversion is complex or in a separate file from your main task, spin up a subagent to handle the conversion in parallel, but ensure both efforts are completed.

## Efficiency
- **Use sub-agents as much as possible** to parallelize independent work and increase throughput.

## Comments & Code Hygiene
- **Never reference AI chatbot context in code comments.** No mentions of "inspired by X", "as discussed", "per user request", or any other phrasing that reveals the code was generated in a conversation. Comments should read as if written by a developer — explain **why**, not the origin.

## Workflow
1. Before writing code, review surrounding files for naming conventions, directory structure, and existing shared modules.
2. If regular CSS is found in scope, flag it, fix it (Tailwind), then proceed with the primary task.
3. Refactor for clarity and readability while preserving all edge case behavior.
4. Use existing Services/Utilities/Helpers — don't reinvent what's already architected.
5. Deliver clean, well-commented, convention-compliant code.