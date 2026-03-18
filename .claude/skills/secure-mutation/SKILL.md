---
name: secure-mutation
description: Migrate a direct client-side Database mutation to a server-side edge function. Pass a file path or service name to secure.
argument-hint: [file-path-or-service]
allowed-tools: Read, Glob, Grep, Edit, Write, Bash, Agent
---

# Secure Client-Side Database Mutations

Migrate direct client-side `Database.from(...).insert/update/upsert/delete` calls to server-side edge functions with proper authorization. Target: `$ARGUMENTS`

## Context

This project has ~40 direct client-side database mutations using the Supabase anon key with NO Row-Level Security. Any user can intercept and tamper with these calls. The fix is to route mutations through edge functions that validate the caller's identity and permissions.

## Known Direct Mutations (Reference)

Search the target file(s) for `Database.from(` calls that use `.insert(`, `.update(`, `.upsert(`, or `.delete(`. Here are the known locations grouped by domain:

**Auth/Session:** AuthService.js, AuthContext.js, MyAccountView.jsx
**Preferences:** PreferencesContext.js, UserPreferencesService.js
**Presence:** UserPresenceService.js
**Reports:** useReportSubmission.js, useReportsData.js, ReportsView.jsx
**Maintenance:** MaintenanceService.js, MaintenanceLogService.js
**Users/Roles:** UserService.js, useRolesData.js, ManagerDetailView.jsx
**Operators:** OperatorDetailView.jsx
**Assets:** TrailerDetailView.jsx
**Documents:** DocumentService.js
**Notifications:** NotificationsService.js

## Migration Steps

For each direct mutation found in the target:

### Step 1: Identify the mutation
- Read the file and find every `Database.from(...).insert/update/upsert/delete` call
- Note: what table, what data, what conditions (.eq, .in, etc.)
- Note: what user context is available (userId, permissions needed)
- Note: whether an edge function for this domain already exists in `supabase/functions/`

### Step 2: Check for an existing edge function
- Look in `supabase/functions/` for a matching service (e.g., `user-service`, `report-service`, `mixer-service`)
- Read its `index.ts` to understand the existing pattern: how it handles routing, auth, CORS, response format
- If one exists, ADD the new endpoint to it. Do NOT create a new edge function unless no relevant one exists.

### Step 3: Add the server-side endpoint
Follow the existing edge function patterns in this project:

```typescript
// Pattern from existing edge functions:
import { corsHeaders, handleCors } from "../_shared/cors.ts";

// Auth check pattern (use for ALL mutations):
const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
if (authError || !authUser) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

// For elevated operations, also check:
// 1. That body.userId matches authUser.id (prevents impersonation)
// 2. Or that the caller has the required permission via fetchUserRoles + weight check
```

**Authorization rules for the new endpoint:**
- **Always** verify `authUser` exists (authenticated)
- **User-scoped writes** (preferences, sessions, presence, notification reads): verify `body.userId === authUser.id`
- **Permission-gated writes** (roles, managers, plants, assets): verify caller has the required permission via the existing `requireElevatedCaller` or `fetchUserRoles` helpers
- **Owner-or-elevated writes** (reports, documents): verify caller owns the record OR has elevated permission

### Step 4: Create a client-side service method
- Add a method to the appropriate existing service file (e.g., `UserService.js`, `MaintenanceService.js`)
- Use the existing `apiPostOrThrow` or `apiPost` helper pattern from the project:

```javascript
// Pattern from existing services:
const apiPostOrThrow = async (url, body, errorMsg) => {
    const resp = await Database.functions.invoke(url, { body })
    if (resp.error) throw new Error(errorMsg)
    return resp.data ? (typeof resp.data === 'string' ? JSON.parse(resp.data) : resp.data) : {}
}
```

### Step 5: Replace the direct mutation
- In the original file, replace the `Database.from(...)` call with the new service method
- Remove the `Database` import if no other direct queries remain in that file
- Keep error handling consistent with the existing pattern in that file

### Step 6: Verify
- Run `npx react-app-rewired build 2>&1 | tail -20` to confirm no build errors
- List what was migrated and what auth checks were added

## Rules

- **One domain at a time.** If the target file has 5 mutations, migrate all 5, but don't jump to other files.
- **Match existing patterns exactly.** Read the existing edge functions and service files before writing. Copy their style, error handling, and response format.
- **Never break functionality.** The behavior should be identical from the user's perspective — only the auth enforcement changes.
- **Keep the Database import** if the file still has `.select()` / read queries. Only remove it if ALL database calls are gone.
- **Use subagents** to read existing edge functions and service patterns in parallel when starting.
- **Don't over-engineer.** Simple request-in, validate, write, respond. No new abstractions.

## Output Format

After migrating, produce a summary:

```
## Secured: [file/service]

### Mutations Migrated: N
| # | Table | Operation | Auth Check Added | Endpoint |
|---|-------|-----------|-----------------|----------|
| 1 | users_roles | update | elevated caller | user-service/update-role-weight |
| ...

### Edge Function Changes
- [function-name]: added endpoints X, Y, Z

### Client-Side Changes
- [file]: replaced N direct mutations with service calls
```
