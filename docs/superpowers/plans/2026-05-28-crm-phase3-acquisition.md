# CRM Phase 3 — Acquisition Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Phase 3 "acquisition" frontend: a Pipeline board page, Opportunities section on account detail, Prospect worklist toggle on Outreach, Opportunities-won column on Team Monitor, and full vitest coverage for all new code.

**Architecture:** All new service methods are appended to `CrmService.js`; a new `useOpportunities.js` hook handles fetch/save/move/remove with a reload pattern; `CallListPipelinePage.jsx` is a new page component; three existing page files are minimally extended. Sidebar constants (`CallListSidebar.jsx`) gain one section entry and one `sectionIds` addition. `CallListView.jsx` gains one render branch.

**Tech Stack:** React 19, Tailwind CSS v3 (theme tokens), vitest + @testing-library/react, simple-import-sort. All constraints from HARD CONSTRAINTS in the prompt apply.

---

## File Map

| Action | File |
|--------|------|
| Modify | `src/services/CrmService.js` |
| Create | `src/app/hooks/useOpportunities.js` |
| Modify | `src/app/components/plan/tabs/call-list/CallListSidebar.jsx` |
| Create | `src/app/components/plan/tabs/call-list/pages/CallListPipelinePage.jsx` |
| Modify | `src/app/components/plan/tabs/call-list/pages/CallListDirectoryPage.jsx` |
| Modify | `src/app/components/plan/tabs/call-list/pages/CallListOutreachPage.jsx` |
| Modify | `src/app/components/plan/tabs/call-list/CallListTeamMonitorPage.jsx` |
| Modify | `src/views/tools/plan/CallListView.jsx` |
| Create | `src/services/__tests__/CrmServicePhase3.test.js` |
| Create | `src/app/hooks/__tests__/useOpportunities.test.js` |
| Create | `src/app/components/plan/tabs/call-list/pages/__tests__/CallListPipelinePage.test.jsx` |
| Create | `src/app/components/plan/tabs/call-list/pages/__tests__/CallListOutreachPage.prospects.test.jsx` |

---

## Task 1: Extend CrmService with opportunity methods

**Files:**
- Modify: `src/services/CrmService.js`

- [ ] **Step 1: Open the file and locate the right insertion point**

Read `src/services/CrmService.js`. The four new methods belong inside `CrmServiceImpl` after `bulkAssignSalesReps`, before the closing `}` of the class. The service prefix is already `'call-list-service'`.

- [ ] **Step 2: Add the four opportunity methods**

Inside `CrmServiceImpl`, append after `bulkAssignSalesReps`:

```js
async fetchOpportunities({ accountId, ownerUserId, openOnly } = {}) {
    const { res, json } = await APIUtility.post(
        `/${SERVICE_PREFIX}/opportunities-list`,
        { accountId, ownerUserId, openOnly }
    )
    if (!res.ok) throw new Error(json?.error || 'Failed to load opportunities')
    return Array.isArray(json?.data) ? json.data : []
}

async saveOpportunity({ id, accountId, title, stage, ownerUserId, expectedClose, notes, lostReason } = {}) {
    if (!title) throw new Error('title is required')
    const { res, json } = await APIUtility.post(`/${SERVICE_PREFIX}/save-opportunity`,
        { id, accountId, title, stage, ownerUserId, expectedClose, notes, lostReason })
    if (!res.ok) throw new Error(json?.error || 'Failed to save opportunity')
    return json?.data ?? null
}

async moveStage(id, stage, lostReason) {
    if (!id) throw new Error('id is required')
    if (!stage) throw new Error('stage is required')
    const { res, json } = await APIUtility.post(`/${SERVICE_PREFIX}/move-stage`,
        { id, stage, lostReason })
    if (!res.ok) throw new Error(json?.error || 'Failed to move stage')
    return json?.data ?? null
}

async deleteOpportunity(id) {
    if (!id) throw new Error('id is required')
    const { res, json } = await APIUtility.post(`/${SERVICE_PREFIX}/delete-opportunity`, { id })
    if (!res.ok) throw new Error(json?.error || 'Failed to delete opportunity')
    return true
}
```

- [ ] **Step 3: Verify import sort is still correct**

The file has only one import (`APIUtility from '../utils/APIUtility'`). No change needed — simple-import-sort is satisfied.

---

## Task 2: Write CrmService Phase 3 tests

**Files:**
- Create: `src/services/__tests__/CrmServicePhase3.test.js`

- [ ] **Step 1: Create the test file**

```js
import { beforeEach, describe, expect, it, vi } from 'vitest'

import APIUtility from '../../utils/APIUtility'
import CrmService from '../CrmService'

vi.mock('../../utils/APIUtility', () => ({ default: { post: vi.fn() } }))

const ok = (data) => ({ res: { ok: true }, json: { data } })
const fail = (error) => ({ res: { ok: false }, json: { error } })

describe('CrmService — Phase 3 opportunity methods', () => {
    beforeEach(() => vi.clearAllMocks())

    // ── fetchOpportunities ───────────────────────────────────────────────────
    it('fetchOpportunities posts to /opportunities-list with accountId', async () => {
        APIUtility.post.mockResolvedValue(ok([{ id: 'o1', title: 'First deal' }]))

        const rows = await CrmService.fetchOpportunities({ accountId: 'a1' })

        expect(APIUtility.post).toHaveBeenCalledWith(
            '/call-list-service/opportunities-list',
            expect.objectContaining({ accountId: 'a1' })
        )
        expect(rows).toEqual([{ id: 'o1', title: 'First deal' }])
    })

    it('fetchOpportunities returns empty array when data is null', async () => {
        APIUtility.post.mockResolvedValue({ res: { ok: true }, json: { data: null } })
        const rows = await CrmService.fetchOpportunities()
        expect(rows).toEqual([])
    })

    it('fetchOpportunities throws on non-ok response', async () => {
        APIUtility.post.mockResolvedValue(fail('Unauthorized'))
        await expect(CrmService.fetchOpportunities()).rejects.toThrow('Unauthorized')
    })

    // ── saveOpportunity ──────────────────────────────────────────────────────
    it('saveOpportunity throws when title is missing', async () => {
        await expect(CrmService.saveOpportunity({ accountId: 'a1' })).rejects.toThrow('title is required')
        expect(APIUtility.post).not.toHaveBeenCalled()
    })

    it('saveOpportunity posts to /save-opportunity and returns the row', async () => {
        const row = { id: 'o1', title: 'New deal', stage: 'new' }
        APIUtility.post.mockResolvedValue(ok(row))

        const result = await CrmService.saveOpportunity({ accountId: 'a1', title: 'New deal' })

        expect(APIUtility.post).toHaveBeenCalledWith(
            '/call-list-service/save-opportunity',
            expect.objectContaining({ accountId: 'a1', title: 'New deal' })
        )
        expect(result).toEqual(row)
    })

    // ── moveStage ────────────────────────────────────────────────────────────
    it('moveStage throws when id is missing', async () => {
        await expect(CrmService.moveStage(null, 'won')).rejects.toThrow('id is required')
        expect(APIUtility.post).not.toHaveBeenCalled()
    })

    it('moveStage throws when stage is missing', async () => {
        await expect(CrmService.moveStage('o1', '')).rejects.toThrow('stage is required')
        expect(APIUtility.post).not.toHaveBeenCalled()
    })

    it('moveStage posts to /move-stage and returns the updated row', async () => {
        const row = { id: 'o1', stage: 'won' }
        APIUtility.post.mockResolvedValue(ok(row))

        const result = await CrmService.moveStage('o1', 'won')

        expect(APIUtility.post).toHaveBeenCalledWith(
            '/call-list-service/move-stage',
            expect.objectContaining({ id: 'o1', stage: 'won' })
        )
        expect(result).toEqual(row)
    })

    it('moveStage forwards lostReason when provided', async () => {
        APIUtility.post.mockResolvedValue(ok({ id: 'o1', stage: 'lost' }))
        await CrmService.moveStage('o1', 'lost', 'Price too high')
        expect(APIUtility.post).toHaveBeenCalledWith(
            '/call-list-service/move-stage',
            expect.objectContaining({ id: 'o1', stage: 'lost', lostReason: 'Price too high' })
        )
    })

    // ── deleteOpportunity ────────────────────────────────────────────────────
    it('deleteOpportunity throws when id is missing', async () => {
        await expect(CrmService.deleteOpportunity(null)).rejects.toThrow('id is required')
    })

    it('deleteOpportunity posts to /delete-opportunity and returns true', async () => {
        APIUtility.post.mockResolvedValue({ res: { ok: true }, json: { success: true } })
        const result = await CrmService.deleteOpportunity('o1')
        expect(APIUtility.post).toHaveBeenCalledWith('/call-list-service/delete-opportunity', { id: 'o1' })
        expect(result).toBe(true)
    })
})
```

- [ ] **Step 2: Run only these tests to confirm they pass**

```
npx vitest run src/services/__tests__/CrmServicePhase3.test.js
```

Expected: all 11 tests pass.

---

## Task 3: Create useOpportunities hook

**Files:**
- Create: `src/app/hooks/useOpportunities.js`

- [ ] **Step 1: Create the hook**

```js
import { useCallback, useEffect, useRef, useState } from 'react'

import CrmService from '../../services/CrmService'

/**
 * Manages opportunities for a single account (detail view) or the full open
 * pipeline (board mode). Returns stable action callbacks so consumers never
 * need to re-subscribe on every render.
 *
 * @param {object} [options]
 * @param {string} [options.accountId] - Load by account when set.
 * @param {boolean} [options.boardMode] - When true, fetches all open opportunities.
 * @returns {{ opportunities, isLoading, error, reload, save, move, remove }}
 */
export function useOpportunities({ accountId, boardMode } = {}) {
    const [opportunities, setOpportunities] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)
    const mounted = useRef(true)

    useEffect(() => {
        mounted.current = true
        return () => { mounted.current = false }
    }, [])

    const load = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const fetchOptions = boardMode
                ? { openOnly: true }
                : { accountId }
            const data = await CrmService.fetchOpportunities(fetchOptions)
            if (mounted.current) setOpportunities(data)
        } catch (err) {
            if (mounted.current) setError(err?.message || 'Failed to load opportunities')
        } finally {
            if (mounted.current) setIsLoading(false)
        }
    }, [accountId, boardMode])

    useEffect(() => { load() }, [load])

    const save = useCallback(async (payload) => {
        const saved = await CrmService.saveOpportunity(payload)
        if (mounted.current) load()
        return saved
    }, [load])

    const move = useCallback(async (id, stage, lostReason) => {
        await CrmService.moveStage(id, stage, lostReason)
        if (mounted.current) load()
    }, [load])

    const remove = useCallback(async (id) => {
        await CrmService.deleteOpportunity(id)
        if (mounted.current) load()
    }, [load])

    return { error, isLoading, move, opportunities, reload: load, remove, save }
}
```

---

## Task 4: Write useOpportunities tests

**Files:**
- Create: `src/app/hooks/__tests__/useOpportunities.test.js`

- [ ] **Step 1: Create the test file**

```js
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CrmService from '../../../services/CrmService'
import { useOpportunities } from '../useOpportunities'

vi.mock('../../../services/CrmService', () => ({
    default: {
        fetchOpportunities: vi.fn(),
        saveOpportunity: vi.fn(),
        moveStage: vi.fn(),
        deleteOpportunity: vi.fn()
    }
}))

const OPEN_OPP = { id: 'o1', title: 'Deal A', stage: 'new', account_id: 'a1' }

describe('useOpportunities', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        CrmService.fetchOpportunities.mockResolvedValue([OPEN_OPP])
        CrmService.saveOpportunity.mockResolvedValue({ id: 'o2', title: 'Deal B', stage: 'new' })
        CrmService.moveStage.mockResolvedValue({ id: 'o1', stage: 'won' })
        CrmService.deleteOpportunity.mockResolvedValue(true)
    })

    it('boardMode fetches all open opportunities on mount', async () => {
        const { result } = renderHook(() => useOpportunities({ boardMode: true }))
        await waitFor(() => expect(result.current.isLoading).toBe(false))

        expect(CrmService.fetchOpportunities).toHaveBeenCalledWith({ openOnly: true })
        expect(result.current.opportunities).toHaveLength(1)
        expect(result.current.opportunities[0]).toMatchObject(OPEN_OPP)
    })

    it('accountId mode fetches by account on mount', async () => {
        renderHook(() => useOpportunities({ accountId: 'a1' }))
        await waitFor(() => expect(CrmService.fetchOpportunities).toHaveBeenCalledWith({ accountId: 'a1' }))
    })

    it('move calls CrmService.moveStage then reloads', async () => {
        const { result } = renderHook(() => useOpportunities({ boardMode: true }))
        await waitFor(() => expect(result.current.isLoading).toBe(false))

        // Clear call counts so we can assert reload happened.
        CrmService.fetchOpportunities.mockClear()

        await act(async () => {
            await result.current.move('o1', 'won')
        })

        expect(CrmService.moveStage).toHaveBeenCalledWith('o1', 'won', undefined)
        // reload() fires after moveStage resolves
        expect(CrmService.fetchOpportunities).toHaveBeenCalledTimes(1)
    })

    it('move forwards lostReason to moveStage', async () => {
        const { result } = renderHook(() => useOpportunities({ boardMode: true }))
        await waitFor(() => expect(result.current.isLoading).toBe(false))

        await act(async () => {
            await result.current.move('o1', 'lost', 'Budget cut')
        })

        expect(CrmService.moveStage).toHaveBeenCalledWith('o1', 'lost', 'Budget cut')
    })

    it('save calls CrmService.saveOpportunity then reloads', async () => {
        const { result } = renderHook(() => useOpportunities({ accountId: 'a1' }))
        await waitFor(() => expect(result.current.isLoading).toBe(false))

        CrmService.fetchOpportunities.mockClear()

        await act(async () => {
            await result.current.save({ accountId: 'a1', title: 'New deal' })
        })

        expect(CrmService.saveOpportunity).toHaveBeenCalledWith({ accountId: 'a1', title: 'New deal' })
        expect(CrmService.fetchOpportunities).toHaveBeenCalledTimes(1)
    })

    it('sets error state when fetch fails', async () => {
        CrmService.fetchOpportunities.mockRejectedValueOnce(new Error('Network error'))
        const { result } = renderHook(() => useOpportunities({ boardMode: true }))
        await waitFor(() => expect(result.current.isLoading).toBe(false))
        expect(result.current.error).toBe('Network error')
    })
})
```

- [ ] **Step 2: Run only these tests**

```
npx vitest run src/app/hooks/__tests__/useOpportunities.test.js
```

Expected: all 6 tests pass.

---

## Task 5: Add Pipeline section to the sidebar constants

**Files:**
- Modify: `src/app/components/plan/tabs/call-list/CallListSidebar.jsx`

- [ ] **Step 1: Add the pipeline section entry to CALL_LIST_SECTIONS**

In `CALL_LIST_SECTIONS`, add after the `directory` entry (before `team-monitor`):

```js
{
    description: 'Opportunities by stage — win new and reactivated customers.',
    icon: 'fa-chart-simple',
    id: 'pipeline',
    label: 'Pipeline'
},
```

The array must stay sorted such that `team-monitor` remains last (it has `minRoleWeight`).

- [ ] **Step 2: Add 'pipeline' to the customers group sectionIds**

In `CALL_LIST_GROUPS`, find the `customers` group. Change:

```js
{ id: 'customers', label: 'Customers', sectionIds: ['directory'] },
```

to:

```js
{ id: 'customers', label: 'Customers', sectionIds: ['directory', 'pipeline'] },
```

`'pipeline'` goes after `'directory'` so it appears below Accounts in the sidebar.

- [ ] **Step 3: Verify import sort is unchanged**

The file starts with `import React, { useEffect, useMemo, useState } from 'react'` — no new imports needed. No sort change required.

---

## Task 6: Create CallListPipelinePage component

**Files:**
- Create: `src/app/components/plan/tabs/call-list/pages/CallListPipelinePage.jsx`

This component must NOT use native `<select>`. Stage move controls are chip buttons. No drag-and-drop.

- [ ] **Step 1: Create the file**

```jsx
/* eslint-disable react/forbid-dom-props */
import React, { useMemo } from 'react'

import { useOpportunities } from '../../../../../hooks/useOpportunities'

/** Ordered pipeline stages used for column rendering. */
const PIPELINE_STAGES = [
    { id: 'new', label: 'New' },
    { id: 'contacted', label: 'Contacted' },
    { id: 'quoted', label: 'Quoted' },
    { id: 'won', label: 'Won' },
    { id: 'lost', label: 'Lost' }
]

/** Horizontal pipeline board — one column per stage, no drag-and-drop.
 *  Cards show title + account name. Stage-move chips let callers advance
 *  or regress an opportunity without leaving the board. */
export function CallListPipelinePage({ accentColor }) {
    const { error, isLoading, move, opportunities } = useOpportunities({ boardMode: true })

    const opportunitiesByStage = useMemo(() => {
        const map = Object.fromEntries(PIPELINE_STAGES.map(({ id }) => [id, []]))
        for (const opp of opportunities) {
            if (map[opp.stage]) map[opp.stage].push(opp)
        }
        return map
    }, [opportunities])

    if (error) {
        return (
            <div className="rounded-lg p-6 text-center text-[12.5px] bg-bg-primary border border-border-light text-text-secondary">
                Failed to load pipeline: {error}
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-3 min-w-0">
            <div className="flex gap-3 overflow-x-auto pb-1">
                {PIPELINE_STAGES.map((stage) => (
                    <StageColumn
                        key={stage.id}
                        accentColor={accentColor}
                        isLoading={isLoading}
                        onMove={move}
                        opportunities={opportunitiesByStage[stage.id]}
                        stage={stage}
                    />
                ))}
            </div>
        </div>
    )
}

function StageColumn({ accentColor, isLoading, onMove, opportunities, stage }) {
    return (
        <div className="flex flex-col gap-2 min-w-[200px] flex-1">
            <div className="flex items-center gap-2 px-0.5">
                <span className="text-[11px] font-bold uppercase tracking-[.08em] text-text-tertiary">
                    {stage.label}
                </span>
                <span className="text-[11px] tabular-nums text-text-tertiary">
                    ({opportunities.length})
                </span>
            </div>

            {isLoading ? (
                <PipelineColumnSkeleton />
            ) : opportunities.length === 0 ? (
                <div className="rounded-md border border-border-light bg-bg-primary px-3 py-4 text-center text-[12px] text-text-tertiary">
                    —
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {opportunities.map((opp) => (
                        <OpportunityCard
                            key={opp.id}
                            accentColor={accentColor}
                            currentStage={stage.id}
                            onMove={onMove}
                            opportunity={opp}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

function OpportunityCard({ accentColor, currentStage, onMove, opportunity }) {
    const otherStages = PIPELINE_STAGES.filter((s) => s.id !== currentStage)

    return (
        <div className="rounded-md border border-border-light bg-bg-primary px-3 py-2.5 flex flex-col gap-2">
            <div>
                <div className="text-[12.5px] font-semibold text-text-primary leading-snug">
                    {opportunity.title}
                </div>
                {opportunity.account_name && (
                    <div className="text-[11px] text-text-secondary mt-0.5 truncate">
                        {opportunity.account_name}
                    </div>
                )}
            </div>

            <div className="flex flex-wrap gap-1">
                {otherStages.map((targetStage) => (
                    <button
                        key={targetStage.id}
                        type="button"
                        onClick={() => onMove(opportunity.id, targetStage.id)}
                        className="rounded px-1.5 py-0.5 text-[10.5px] font-semibold border border-border-light bg-bg-secondary text-text-secondary cursor-pointer active:scale-[0.97] transition-[colors,transform] duration-150 ease-out motion-reduce:transition-none hover:text-text-primary hover:border-border-medium"
                        aria-label={`Move to ${targetStage.label}`}
                    >
                        → {targetStage.label}
                    </button>
                ))}
            </div>
        </div>
    )
}

function PipelineColumnSkeleton() {
    const SkelBar = ({ className = '' }) => (
        <div className={`rounded animate-pulse bg-bg-tertiary ${className}`} />
    )
    return (
        <div className="flex flex-col gap-2">
            {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="rounded-md border border-border-light bg-bg-primary p-3 flex flex-col gap-2">
                    <SkelBar className="h-3.5 w-3/4" />
                    <SkelBar className="h-2.5 w-1/2" />
                    <div className="flex gap-1">
                        <SkelBar className="h-5 w-16" />
                        <SkelBar className="h-5 w-16" />
                    </div>
                </div>
            ))}
        </div>
    )
}
```

- [ ] **Step 2: Verify import is sorted**

Single import group: `react` first (external), then `../../../../../hooks/useOpportunities` (project-relative). Correct.

---

## Task 7: Wire Pipeline page into CallListView

**Files:**
- Modify: `src/views/tools/plan/CallListView.jsx`

- [ ] **Step 1: Import CallListPipelinePage**

In the imports block of `CallListView.jsx`, add the pipeline page import. It belongs in the second group (project-relative), sorted alphabetically after `CallListMyDeskPage`:

Current second-group imports (relevant portion):
```js
import {
    CallListActivityPage,
    CallListDirectoryPage,
    CallListOutreachPage
} from '../../../app/components/plan/tabs/call-list/CallListPages'
```

Add after the existing import block lines (place it alphabetically after `CallListFollowupsPage` import):

```js
import { CallListPipelinePage } from '../../../app/components/plan/tabs/call-list/pages/CallListPipelinePage'
```

The full sorted second-group should be:
```
../../../app/components/common/Badge
../../../app/components/common/PlanSkeletons
../../../app/components/common/TabFadeIn
../../../app/components/plan/tabs/call-list/CallListPages   (ActivityPage, DirectoryPage, OutreachPage)
../../../app/components/plan/tabs/call-list/CallListSidebar
../../../app/components/plan/tabs/call-list/CallListTeamMonitorPage
../../../app/components/plan/tabs/call-list/pages/CallListFollowupsPage
../../../app/components/plan/tabs/call-list/pages/CallListMyDeskPage
../../../app/components/plan/tabs/call-list/pages/CallListPipelinePage  ← NEW
../../../app/context/AuthContext
../../../app/hooks/useCallList
../../../app/hooks/useCrm
../../../services/CrmService
../../../services/UserService
```

- [ ] **Step 2: Add render branch**

Inside the `<TabFadeIn>` block, after the `directory` branch (before closing `</TabFadeIn>`):

```jsx
{activeSection === 'pipeline' && (
    <CallListPipelinePage accentColor={tone} />
)}
```

---

## Task 8: Write CallListPipelinePage tests

**Files:**
- Create: `src/app/components/plan/tabs/call-list/pages/__tests__/CallListPipelinePage.test.jsx`

- [ ] **Step 1: Create the test file**

The `useOpportunities` hook is mocked before the component import (vitest hoisting pattern matches existing tests in this codebase).

```jsx
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Must mock BEFORE importing the component so the mock is in place when
// the module resolves its hook dependency.
vi.mock('../../../../../hooks/useOpportunities', () => ({
    useOpportunities: vi.fn()
}))

import { useOpportunities } from '../../../../../hooks/useOpportunities'
import { CallListPipelinePage } from '../CallListPipelinePage'

const makeOpp = (id, stage, title = `Deal ${id}`, account_name = 'Acme') => ({
    id,
    title,
    stage,
    account_id: 'a1',
    account_name
})

const mockHookReturn = (overrides = {}) => ({
    error: null,
    isLoading: false,
    move: vi.fn(),
    opportunities: [],
    reload: vi.fn(),
    remove: vi.fn(),
    save: vi.fn(),
    ...overrides
})

beforeEach(() => vi.clearAllMocks())

describe('CallListPipelinePage', () => {
    it('renders a column for each of the 5 pipeline stages', () => {
        useOpportunities.mockReturnValue(mockHookReturn())
        render(<CallListPipelinePage accentColor="#2563eb" />)

        expect(screen.getByText('New')).toBeInTheDocument()
        expect(screen.getByText('Contacted')).toBeInTheDocument()
        expect(screen.getByText('Quoted')).toBeInTheDocument()
        expect(screen.getByText('Won')).toBeInTheDocument()
        expect(screen.getByText('Lost')).toBeInTheDocument()
    })

    it('renders an opportunity card in the correct stage column', () => {
        useOpportunities.mockReturnValue(mockHookReturn({
            opportunities: [makeOpp('o1', 'contacted', 'Big project')]
        }))
        render(<CallListPipelinePage accentColor="#2563eb" />)
        expect(screen.getByText('Big project')).toBeInTheDocument()
    })

    it('renders account name on the card', () => {
        useOpportunities.mockReturnValue(mockHookReturn({
            opportunities: [makeOpp('o1', 'new', 'Road work', 'Highway Corp')]
        }))
        render(<CallListPipelinePage accentColor="#2563eb" />)
        expect(screen.getByText('Highway Corp')).toBeInTheDocument()
    })

    it('renders move chips for all other stages', () => {
        useOpportunities.mockReturnValue(mockHookReturn({
            opportunities: [makeOpp('o1', 'new')]
        }))
        render(<CallListPipelinePage accentColor="#2563eb" />)

        // Card is in 'New' so move chips should be for the 4 other stages
        expect(screen.getByRole('button', { name: /move to contacted/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /move to quoted/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /move to won/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /move to lost/i })).toBeInTheDocument()
    })

    it('calls move with the correct id and target stage when a chip is clicked', () => {
        const move = vi.fn()
        useOpportunities.mockReturnValue(mockHookReturn({
            move,
            opportunities: [makeOpp('o1', 'new')]
        }))
        render(<CallListPipelinePage accentColor="#2563eb" />)

        fireEvent.click(screen.getByRole('button', { name: /move to won/i }))
        expect(move).toHaveBeenCalledWith('o1', 'won')
    })

    it('shows boardMode was requested (openOnly: true)', () => {
        useOpportunities.mockReturnValue(mockHookReturn())
        render(<CallListPipelinePage accentColor="#2563eb" />)
        // Hook was called with boardMode:true
        expect(useOpportunities).toHaveBeenCalledWith({ boardMode: true })
    })

    it('renders empty state dash in columns with no opportunities', () => {
        useOpportunities.mockReturnValue(mockHookReturn({ opportunities: [] }))
        render(<CallListPipelinePage accentColor="#2563eb" />)
        // 5 columns each show "—"
        const dashes = screen.getAllByText('—')
        expect(dashes).toHaveLength(5)
    })

    it('renders an error message when the hook returns an error', () => {
        useOpportunities.mockReturnValue(mockHookReturn({ error: 'Network failure' }))
        render(<CallListPipelinePage accentColor="#2563eb" />)
        expect(screen.getByText(/failed to load pipeline/i)).toBeInTheDocument()
        expect(screen.getByText(/network failure/i)).toBeInTheDocument()
    })
})
```

- [ ] **Step 2: Run only these tests**

```
npx vitest run src/app/components/plan/tabs/call-list/pages/__tests__/CallListPipelinePage.test.jsx
```

Expected: all 8 tests pass.

---

## Task 9: Add Opportunities section to CallListDirectoryPage

**Files:**
- Modify: `src/app/components/plan/tabs/call-list/pages/CallListDirectoryPage.jsx`

- [ ] **Step 1: Add the import for useOpportunities**

At the top of `CallListDirectoryPage.jsx`, in the project-relative import group (second group), add:

```js
import { useOpportunities } from '../../../../../hooks/useOpportunities'
```

It sorts after `BulkAssignSalesRepsModal` and before `InteractionTimeline` alphabetically (by path: `hooks/useOpportunities` < `customer-card/InteractionTimeline`? Actually check: `../../../../../hooks/` vs `../customer-card/` — `../` is the same depth; relative path comparison: `hooks/useOpportunities` alphabetically < `customer-card/` since `h` > `c` wait — `c` comes before `h`. So `customer-card/BulkAssignSalesRepsModal` sorts before `customer-card/InteractionTimeline` sorts before `hooks/useOpportunities`. The correct sorted order for second group:

```
../../../../../../utils/CallListUtility           (from component perspective: goes first in second group since it's `../../../../../../utils`)
../customer-card/BulkAssignSalesRepsModal
../customer-card/InteractionTimeline
../customer-card/LogInteractionComposer
./callListShared
../../../../../hooks/useOpportunities             ← WAIT — need to re-check relative path from this file
```

The file is at `src/app/components/plan/tabs/call-list/pages/CallListDirectoryPage.jsx`. To reach `src/app/hooks/useOpportunities.js` the relative path is `../../../../../hooks/useOpportunities`. To reach `src/utils/CallListUtility` the relative path is `../../../../../../utils/CallListUtility`.

Sorted alphabetically by the full relative path string:
1. `../../../../../../utils/CallListUtility` (six `../`)
2. `../../../../../hooks/useOpportunities` (five `../` then `hooks/`)

Wait — path string comparison: `../../../../../../utils/` vs `../../../../../hooks/`. Character by character: same up to the 6th `..` — first has one more `..` making it lexicographically "longer" at that position. In string sort `../../../../../../` > `../../../../../` (longer comes after). So actually:
1. `../../../../../hooks/useOpportunities` (shorter prefix)
2. `../../../../../../utils/CallListUtility` (longer prefix)
3. `../customer-card/BulkAssignSalesRepsModal`
4. `../customer-card/InteractionTimeline`
5. `../customer-card/LogInteractionComposer`
6. `./callListShared`

Wait again — `../` vs `../../`. In ASCII `./` is: `.` then `/`. `../` is: `.` then `.` then `/`. So `./` < `../` < `../../`. This means `./callListShared` sorts BEFORE `../customer-card/…` which sorts before `../../../../../../utils/…`.

Final correct sort for second group imports:
1. `./callListShared`
2. `../customer-card/BulkAssignSalesRepsModal`
3. `../customer-card/InteractionTimeline`
4. `../customer-card/LogInteractionComposer`
5. `../../../../../hooks/useOpportunities`   ← NEW
6. `../../../../../../utils/CallListUtility`

After updating, the import block for `CallListDirectoryPage.jsx` should be:

```js
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { matchesCallListQuery, sortCallListRoster, wasRecentlyCalled } from '../../../../../../utils/CallListUtility'
import { BulkAssignSalesRepsModal } from '../customer-card/BulkAssignSalesRepsModal'
import { InteractionTimeline } from '../customer-card/InteractionTimeline'
import { LogInteractionComposer } from '../customer-card/LogInteractionComposer'
import { useOpportunities } from '../../../../../hooks/useOpportunities'
import { FilterStrip, ListOrDetailPane } from './callListShared'
```

NOTE: `simple-import-sort` groups by blank line separation. The current file has one blank line separating React from the rest. We keep that exact grouping. Within the second group, apply the sort above. Let the linter be the final authority — but the above should be correct.

- [ ] **Step 2: Add useOpportunities to the component body**

In `CallListDirectoryPage`, just after `const selectedAccountId = selectedRow?.account_id ?? null`, add:

```js
const { isLoading: isLoadingOpps, opportunities, save: saveOpportunity } = useOpportunities(
    selectedAccountId ? { accountId: selectedAccountId } : undefined
)
```

Important: when `selectedAccountId` is null we pass `undefined` so the hook does not fire a useless fetch.

- [ ] **Step 3: Add the Opportunities section below the Interactions section**

In the JSX, after the closing `</section>` of the Interactions section (which is currently the last thing rendered when `selectedAccountId` exists), add:

```jsx
{selectedAccountId && (
    <section className="flex flex-col gap-2">
        <h3 className="text-[12px] font-bold uppercase tracking-wide text-text-tertiary">
            Opportunities
        </h3>

        <div className="flex flex-col gap-2">
            {isLoadingOpps ? (
                <div className="text-[12px] text-text-tertiary animate-pulse">Loading…</div>
            ) : opportunities.length === 0 ? (
                <div className="text-[12px] text-text-tertiary">No opportunities yet.</div>
            ) : (
                opportunities.map((opp) => (
                    <div
                        key={opp.id}
                        className="flex items-center justify-between gap-2 rounded-md border border-border-light bg-bg-primary px-3 py-2"
                    >
                        <span className="text-[12.5px] text-text-primary font-medium truncate min-w-0">
                            {opp.title}
                        </span>
                        <span
                            className="shrink-0 rounded px-1.5 py-0.5 text-[10.5px] font-semibold border border-border-light bg-bg-secondary text-text-secondary capitalize"
                        >
                            {opp.stage}
                        </span>
                    </div>
                ))
            )}
        </div>

        <AddOpportunityForm
            accountId={selectedAccountId}
            accentColor={accentColor}
            onSave={saveOpportunity}
        />
    </section>
)}
```

- [ ] **Step 4: Add AddOpportunityForm sub-component**

Append after `AddProspectForm` at the bottom of the file:

```jsx
/** Inline "Add opportunity" form — title input + Save chip. Collapses
 *  to a single button when not expanded. */
function AddOpportunityForm({ accountId, accentColor, onSave }) {
    const [isOpen, setIsOpen] = useState(false)
    const [title, setTitle] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    const handleCancel = useCallback(() => {
        setIsOpen(false)
        setTitle('')
    }, [])

    const handleSave = useCallback(async () => {
        const trimmed = title.trim()
        if (!trimmed || isSaving) return
        setIsSaving(true)
        try {
            await onSave({ accountId, title: trimmed })
            setIsOpen(false)
            setTitle('')
        } finally {
            setIsSaving(false)
        }
    }, [accountId, title, isSaving, onSave])

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter') handleSave()
        if (e.key === 'Escape') handleCancel()
    }, [handleSave, handleCancel])

    if (!isOpen) {
        return (
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="self-start inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-semibold border border-border-light bg-bg-secondary text-text-secondary cursor-pointer active:scale-[0.97] transition-[colors,transform] duration-150 ease-out motion-reduce:transition-none hover:text-text-primary hover:border-border-medium"
            >
                <i className="fas fa-plus text-[10px]" aria-hidden="true" />
                Add opportunity
            </button>
        )
    }

    return (
        <div className="flex items-center gap-2 flex-wrap rounded-md border border-border-light bg-bg-secondary px-3 py-2">
            <label htmlFor="add-opp-title" className="text-[11.5px] font-semibold text-text-secondary shrink-0">
                Title
            </label>
            <input
                id="add-opp-title"
                type="text"
                value={title}
                autoFocus
                placeholder="e.g. Summer repave contract"
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 min-w-[180px] rounded-md border border-border-light bg-bg-primary px-2.5 py-1 text-[12.5px] text-text-primary placeholder:text-text-tertiary outline-none focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--accent)_25%,transparent)]"
            />
            <button
                type="button"
                disabled={!title.trim() || isSaving}
                onClick={handleSave}
                className="rounded-md px-2.5 py-1 text-[12px] font-semibold text-white transition-[colors,transform] duration-150 ease-out active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: accentColor }}
            >
                {isSaving ? 'Saving…' : 'Save'}
            </button>
            <button
                type="button"
                onClick={handleCancel}
                className="rounded-md px-2.5 py-1 text-[12px] font-semibold border border-border-light bg-transparent text-text-secondary cursor-pointer active:scale-[0.97] transition-[colors,transform] duration-150 ease-out hover:text-text-primary"
            >
                Cancel
            </button>
        </div>
    )
}
```

---

## Task 10: Add Prospects toggle to CallListOutreachPage

**Files:**
- Modify: `src/app/components/plan/tabs/call-list/pages/CallListOutreachPage.jsx`

- [ ] **Step 1: Add worklist mode state**

In the component body, after the existing `const [sortKey, setSortKey] = useState('oldest')` line, add:

```js
const [worklistMode, setWorklistMode] = useState('dormant')
```

- [ ] **Step 2: Add the prospects filter**

Replace the current `fresh` and `filtered` memos. The existing dormant-only filtering is the default; we gate it by `worklistMode`:

```js
const dormant = useMemo(
    () => roster.filter((row) => (row.pouring_status || 'dormant') === 'dormant'),
    [roster]
)
const fresh = useMemo(
    () => dormant.filter((row) => !wasRecentlyCalled(row.last_call_at)),
    [dormant]
)
const prospects = useMemo(
    () => roster.filter((row) => row.lifecycle_stage === 'prospect'),
    [roster]
)
const activePool = worklistMode === 'prospects' ? prospects : fresh
const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sortCallListRoster(
        activePool.filter((row) => matchesCallListQuery(row, q)),
        sortKey
    )
}, [activePool, query, sortKey])
```

- [ ] **Step 3: Add the segmented toggle UI above FilterStrip**

In the JSX, before the existing `{!selectedRow && (<FilterStrip …/>)}` block, wrap the whole not-selectedRow section:

```jsx
{!selectedRow && (
    <>
        <WorklistToggle
            accentColor={accentColor}
            activeMode={worklistMode}
            onSelect={setWorklistMode}
        />
        <FilterStrip
            isLoading={isLoading && roster.length === 0}
            onChangeQuery={setQuery}
            onChangeSort={setSortKey}
            query={query}
            sortKey={sortKey}
            totalShown={filtered.length}
            totalUnfiltered={activePool.length}
        />
    </>
)}
```

Remove the old standalone `{!selectedRow && (<FilterStrip … />)}` block.

Also update `listEmptyMessage` in `ListOrDetailPane`:

```jsx
listEmptyMessage={
    activePool.length === 0
        ? worklistMode === 'prospects'
            ? 'No prospects in the roster yet.'
            : 'No dormant customers waiting on a call right now.'
        : 'No customers match your search.'
}
```

- [ ] **Step 4: Add WorklistToggle sub-component**

Append at the bottom of the file:

```jsx
/** Segmented chip toggle: Dormant (default) vs Prospects. */
function WorklistToggle({ accentColor, activeMode, onSelect }) {
    const modes = [
        { id: 'dormant', label: 'Dormant' },
        { id: 'prospects', label: 'Prospects' }
    ]
    return (
        <div className="inline-flex rounded-md overflow-hidden border border-border-light self-start">
            {modes.map(({ id, label }) => {
                const active = activeMode === id
                return (
                    <button
                        key={id}
                        type="button"
                        onClick={() => onSelect(id)}
                        className="text-[11.5px] font-semibold px-3 py-1.5 border-none cursor-pointer active:scale-[0.97] transition-[colors,transform] duration-150 ease-out motion-reduce:transition-none"
                        style={{
                            background: active ? accentColor : 'var(--bg-secondary)',
                            color: active ? '#fff' : 'var(--text-secondary)'
                        }}
                        aria-pressed={active}
                    >
                        {label}
                    </button>
                )
            })}
        </div>
    )
}
```

- [ ] **Step 5: Verify import sort**

`CallListOutreachPage.jsx` currently imports:
```js
import React, { useMemo, useState } from 'react'  // group 1

import { matchesCallListQuery, sortCallListRoster, wasRecentlyCalled } from '../../../../../../utils/CallListUtility'  // group 2a
import { FilterStrip, ListOrDetailPane } from './callListShared'  // group 2b
```

No new imports are needed for this change. The import sort is unchanged.

---

## Task 11: Write CallListOutreachPage prospects tests

**Files:**
- Create: `src/app/components/plan/tabs/call-list/pages/__tests__/CallListOutreachPage.prospects.test.jsx`

- [ ] **Step 1: Create the test file**

```jsx
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Stub heavy shared components.
vi.mock('../callListShared', () => ({
    FilterStrip: () => <div data-testid="filter-strip" />,
    ListOrDetailPane: ({ filtered, listEmptyMessage }) =>
        filtered.length > 0 ? (
            <ul data-testid="customer-list">
                {filtered.map((row) => (
                    <li key={row.customer_num}>{row.customer_name}</li>
                ))}
            </ul>
        ) : (
            <div data-testid="empty-message">{listEmptyMessage}</div>
        )
}))

vi.mock('../../../../../../utils/CallListUtility', () => ({
    matchesCallListQuery: () => true,
    sortCallListRoster: (rows) => rows,
    wasRecentlyCalled: () => false
}))

import { CallListOutreachPage } from '../CallListOutreachPage'

const DORMANT_ROW = {
    customer_num: 'D1',
    customer_name: 'Dormant Paving',
    pouring_status: 'dormant',
    lifecycle_stage: 'customer',
    last_call_at: null
}

const PROSPECT_ROW = {
    customer_num: 'P1',
    customer_name: 'Prospect Co',
    pouring_status: 'dormant',
    lifecycle_stage: 'prospect',
    last_call_at: null
}

const ACTIVE_ROW = {
    customer_num: 'A1',
    customer_name: 'Active Roads',
    pouring_status: 'active',
    lifecycle_stage: 'customer',
    last_call_at: null
}

const ROSTER = [DORMANT_ROW, PROSPECT_ROW, ACTIVE_ROW]

const baseProps = {
    accentColor: '#2563eb',
    colocationMap: {},
    contactsByCustomer: {},
    deleteContact: vi.fn(),
    deleteEntry: vi.fn(),
    historyByCustomer: {},
    isLoading: false,
    loadContacts: vi.fn(),
    loadHistory: vi.fn(),
    loadingContactsFor: new Set(),
    loadingHistoryFor: new Set(),
    logCall: vi.fn(),
    onClearSelectedCustomer: vi.fn(),
    onSelectCustomer: vi.fn(),
    plantNameByCode: {},
    roster: ROSTER,
    rosterError: null,
    saveContact: vi.fn(),
    savingContactFor: new Set(),
    savingFor: new Set(),
    selectedCustomerNum: null
}

beforeEach(() => vi.clearAllMocks())

describe('CallListOutreachPage — worklist toggle', () => {
    it('renders "Dormant" and "Prospects" toggle buttons', () => {
        render(<CallListOutreachPage {...baseProps} />)
        expect(screen.getByRole('button', { name: /dormant/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /prospects/i })).toBeInTheDocument()
    })

    it('defaults to Dormant — shows only dormant rows (not active, not prospect)', () => {
        render(<CallListOutreachPage {...baseProps} />)
        expect(screen.getByText('Dormant Paving')).toBeInTheDocument()
        expect(screen.queryByText('Prospect Co')).not.toBeInTheDocument()
        expect(screen.queryByText('Active Roads')).not.toBeInTheDocument()
    })

    it('switching to Prospects shows only lifecycle_stage==="prospect" rows', () => {
        render(<CallListOutreachPage {...baseProps} />)
        fireEvent.click(screen.getByRole('button', { name: /prospects/i }))
        expect(screen.getByText('Prospect Co')).toBeInTheDocument()
        expect(screen.queryByText('Dormant Paving')).not.toBeInTheDocument()
        expect(screen.queryByText('Active Roads')).not.toBeInTheDocument()
    })

    it('switching back to Dormant restores the dormant view', () => {
        render(<CallListOutreachPage {...baseProps} />)
        fireEvent.click(screen.getByRole('button', { name: /prospects/i }))
        fireEvent.click(screen.getByRole('button', { name: /dormant/i }))
        expect(screen.getByText('Dormant Paving')).toBeInTheDocument()
        expect(screen.queryByText('Prospect Co')).not.toBeInTheDocument()
    })

    it('shows a "no prospects" empty state when Prospects is active with no matches', () => {
        render(<CallListOutreachPage {...baseProps} roster={[DORMANT_ROW]} />)
        fireEvent.click(screen.getByRole('button', { name: /prospects/i }))
        expect(screen.getByTestId('empty-message')).toHaveTextContent(/no prospects/i)
    })
})
```

- [ ] **Step 2: Run only these tests**

```
npx vitest run src/app/components/plan/tabs/call-list/pages/__tests__/CallListOutreachPage.prospects.test.jsx
```

Expected: all 5 tests pass.

---

## Task 12: Add Opps Won column to CallListTeamMonitorPage

**Files:**
- Modify: `src/app/components/plan/tabs/call-list/CallListTeamMonitorPage.jsx`

- [ ] **Step 1: Add opps_won to CallerActivityCard's MiniStat grid**

In `CallerActivityCard`, the existing three-column `MiniStat` grid is:

```jsx
<div className="grid grid-cols-3 gap-2 text-[11px]">
    <MiniStat label="Booked" value={fmtInt(row.booked || 0)} sub={fmtScorePct(bookingRate)} />
    <MiniStat
        label="Will book again"
        value={fmtInt(row.will_book_again || 0)}
        sub={fmtScorePct(productiveRate)}
    />
    <MiniStat label="Customers" value={fmtInt(row.unique_customers || 0)} sub="unique" />
</div>
```

Change to 4 columns to accommodate the new stat:

```jsx
<div className="grid grid-cols-4 gap-2 text-[11px]">
    <MiniStat label="Booked" value={fmtInt(row.booked || 0)} sub={fmtScorePct(bookingRate)} />
    <MiniStat
        label="Will book again"
        value={fmtInt(row.will_book_again || 0)}
        sub={fmtScorePct(productiveRate)}
    />
    <MiniStat label="Customers" value={fmtInt(row.unique_customers || 0)} sub="unique" />
    <MiniStat label="Opps won" value={fmtInt(row.opportunities_won ?? 0)} sub="closed" />
</div>
```

The `?? 0` guard ensures zero renders correctly when the field is absent (server-side migration not yet deployed) — existing cards still render cleanly.

- [ ] **Step 2: Verify no import changes needed**

`fmtInt` is already imported from `../../../../../utils/PlanStatisticsFormatUtility`. No new imports.

---

## Task 13: Full test suite run and build

- [ ] **Step 1: Run the full vitest suite**

```
npx vitest run
```

All tests should pass. Watch for any unintended failures in existing test files (particularly `CallListDirectoryPage.crm.test.jsx` — the Opportunities section is additive so no existing assertions should break, but verify).

- [ ] **Step 2: Fix any import sort violations before building**

If the dev server fails to compile, it is almost certainly a `simple-import-sort` violation. Re-read the import block of the offending file and sort manually.

- [ ] **Step 3: Run the production build**

```
npm run build
```

Expected: exits 0 with no TypeScript or React errors. The only acceptable warnings are the usual Vite bundle size notices.

---

## Self-Review Checklist

### Spec Coverage
| Requirement | Task |
|---|---|
| Extend CrmService: fetchOpportunities, saveOpportunity, moveStage, deleteOpportunity | Task 1 |
| useOpportunities hook (boardMode + accountId, move, save, remove) | Task 3 |
| Pipeline board page with 5 stage columns + move chips + skeleton | Task 6 |
| Pipeline section added to CALL_LIST_SECTIONS + customers group | Task 5 |
| Pipeline wired into CallListView | Task 7 |
| Opportunities section on account detail (CallListDirectoryPage) | Task 9 |
| Prospect worklist toggle on Outreach | Task 10 |
| Team Monitor Opps Won column | Task 12 |
| CrmService tests | Task 2 |
| useOpportunities tests | Task 4 |
| CallListPipelinePage tests | Task 8 |
| CallListOutreachPage prospects tests | Task 11 |
| Full suite + build | Task 13 |

### Type/Name Consistency
- `useOpportunities` returns `{ opportunities, isLoading, error, reload, save, move, remove }` — used as such in Task 6 (pipeline), Task 9 (directory). ✓
- `CrmService.moveStage(id, stage, lostReason)` — called as `move(id, targetStage.id)` in pipeline (no lostReason, which is optional). ✓
- `CrmService.saveOpportunity(payload)` — called as `save({ accountId, title })` in directory. ✓
- `worklistMode` state in OutreachPage toggles between `'dormant'` | `'prospects'`. Test assertions match. ✓
- `row.opportunities_won ?? 0` — guard applied exactly as specified. ✓
