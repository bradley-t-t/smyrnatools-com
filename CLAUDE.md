# Code Agent Instructions

## Communication Style
Be direct, concise, and informative. No filler, no fluff. State what you did and why in brief terms.

## Code Quality Standards

### Refactoring & Readability
- Refactor code to be clean, readable, and human-like. Write code as a senior developer would — clear intent, logical flow, no clever tricks that sacrifice comprehension.
- Add concise comments explaining **why**, not **what**. Skip obvious comments. Focus on business logic, edge cases, and non-obvious decisions.
- Keep code concise but **never remove or break edge case handling**. If an edge case exists, assume it's there for a reason. Preserve it, but you may refactor how it's expressed.

### Modern, Best-Practice Code
- Write code that a senior engineer would be proud to review. Idiomatic, expressive, and leveraging the language and framework's strengths — not fighting them.
- **Prefer declarative over imperative.** Use `.map()`, `.filter()`, `.reduce()`, destructuring, optional chaining, nullish coalescing, and other modern constructs where they improve clarity. Avoid verbose `for` loops and manual null checks when a cleaner pattern exists.
- **Use early returns and guard clauses** to eliminate deep nesting. Flat code is readable code.
- **Name things precisely.** Variables, functions, and files should reveal intent at a glance. No single-letter names outside of tight lambdas. No generic names like `data`, `info`, `temp`, `stuff`, or `handler` unless scope is tiny and context is obvious.
- **Keep functions short and single-purpose.** If a function does two things, it should be two functions. If a block of logic inside a function could have a name, extract it.
- **Favor composition over inheritance.** Build small, composable pieces. Use hooks, utilities, and service methods that snap together rather than deep class hierarchies.
- **Use TypeScript features properly** (if applicable). Leverage types, interfaces, generics, and discriminated unions to make illegal states unrepresentable. Don't use `any` as an escape hatch.
- **Async patterns should be clean.** Use `async/await` over raw `.then()` chains. Handle errors intentionally — no silent `catch(() => {})` blocks. Propagate or handle, never swallow.
- **Constants over magic values.** If a number, string, or config value appears in logic, extract it to a named constant or config. The name should explain the *meaning*, not the value.
- **Leverage framework conventions.** Use React hooks properly (dependency arrays, cleanup functions). Use Next.js/Nuxt/SvelteKit conventions if present. Don't reinvent routing, data fetching, or state management patterns the framework already provides.

### Proactive Architecture & Simplification
- **Always look for the simpler path.** Before implementing, ask: is there a way to achieve the same result with less code, fewer moving parts, or a more standard pattern? If yes, do that instead.
- **Surface suggestions when you see opportunities.** If you notice during a task that a broader refactor, a utility extraction, a pattern consolidation, or an architectural improvement would meaningfully benefit the codebase — briefly flag it. State what you'd change, why it's better, and the tradeoff. Don't just silently comply with a suboptimal approach.
- **Build systems, not one-offs.** When adding functionality, consider whether the solution should be generalized into a reusable pattern. If you're writing a formatter for dates in one component and the project has no `DateUtility` yet, create one. If a validation pattern repeats, build a small validation layer. Think in terms of infrastructure that makes the *next* task easier.
- **Reduce indirection unless it earns its keep.** Abstraction is good when it eliminates duplication or isolates complexity. Abstraction is bad when it just moves code to another file for no practical benefit. Every layer should justify its existence.
- **Consolidate related logic.** If three components each manually parse the same API response shape, that's a service method. If five files each define their own error messages, that's a constants file. Spot these patterns and fix them.

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
- Remove dead code, commented-out blocks, and unused imports. Don't leave debris.
- TODOs are acceptable only if they describe a specific, actionable next step — never vague (`// TODO: fix this`).

## Workflow
1. Before writing code, review surrounding files for naming conventions, directory structure, and existing shared modules.
2. If regular CSS is found in scope, flag it, fix it (Tailwind), then proceed with the primary task.
3. Before implementing, evaluate whether a simpler approach exists. If the current approach is overcomplicated, say so and propose the alternative.
4. Refactor for clarity and readability while preserving all edge case behavior.
5. Use existing Services/Utilities/Helpers — don't reinvent what's already architected. If a shared module *should* exist but doesn't, create it in the right place.
6. Deliver clean, well-commented, convention-compliant, modern code.
7. If you spotted broader improvements outside the immediate task scope, briefly list them at the end of your response with a one-line rationale each.

## Live Directives
When the user says "never" or "always" do something (e.g., "never auto-commit", "always use bun"), **immediately add it as a rule** to this section. Do not wait for multiple interactions. These are standing orders.

- *(No directives yet — they will be added here as the user gives them.)*