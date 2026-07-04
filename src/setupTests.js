import '@testing-library/jest-dom'

import { vi } from 'vitest'

// Tests were authored against the Jest API. Alias `jest` to vitest's `vi` so
// existing `jest.fn()` / `jest.mock()` / `jest.resetModules()` call sites work
// unchanged under the Vitest runner.
global.jest = vi

// Polyfill APIs missing from jsdom
global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
}
