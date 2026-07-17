# Rangu Tactics Live Presence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the desktop game use real Rangu Fam identity, roster, presence, and saved-deck data instead of fabricated social and deck data.

**Architecture:** `rangu.fam` owns a small PostgreSQL presence projection keyed by the authenticated `wiki_users` id and exposes a single authenticated snapshot/heartbeat API. `rangu-tactics-heavy` keeps one auth store, sends a lobby or in-game heartbeat every 20 seconds, polls the snapshot at the same cadence, and renders only that server response.

**Tech Stack:** Next.js 14 route handlers, Drizzle ORM/PostgreSQL, TypeScript, Zustand, React 18, Vite, Tauri HTTP transport, Vitest.

## Global Constraints

- Presence must be `offline` after 65 seconds without a server-recorded heartbeat.
- Heartbeats and sidebar polling run every 20 seconds while a desktop session is authenticated.
- The only client-writable presence values are `lobby` and `in_game`; the server derives the user identity.
- The client may not substitute demo decks, fake friends, fake avatars, or fake online states after a request fails.
- Launcher `RANGU_SESSION_TOKEN` handoff remains the first authentication path; standalone OAuth remains supported.
- Do not execute database migrations against a shared or production database during local implementation.
- Keep battle actions constrained by the server-authoritative phase and priority state.

---

## File structure

### `rangu.fam`

- Create `src/lib/ranguMembers.ts`: canonical five-member identity, display, and avatar data.
- Modify `src/lib/doublejAuth.ts`: derive the SSO core-member username set from the canonical roster.
- Create `src/db/schema/tacticsPresence.ts`: Drizzle table for the latest game heartbeat per user.
- Modify `src/db/schema.ts`: export the presence schema.
- Create `src/lib/tactics/presence.ts`: types, TTL classification, roster projection, and database operations.
- Create `src/lib/tactics/presence.test.ts`: deterministic tests for TTL and roster projection.
- Create `src/app/api/game/presence/route.ts`: authenticated `GET` snapshot and `POST` heartbeat endpoint.
- Create `src/db/migrations/0002_tactics_presence.sql` and update `src/db/migrations/meta/_journal.json`: generated migration, reviewed but not applied.
- Modify `package.json` and `package-lock.json`: declare a root Vitest command for the new pure-service tests.

### `rangu-tactics-heavy`

- Modify `src/lib/auth.ts`: store auth state once with Zustand while retaining its current OAuth/handoff functions.
- Create `src/lib/tactics/presence.ts`: typed native-fetch API adapter.
- Create `src/lib/tactics/usePresence.ts`: heartbeat/poll lifecycle hook.
- Create `src/lib/tactics/presence.test.ts`: API payload and in-game/lobby transition tests using mocked `nativeFetch`.
- Modify `src/App.tsx`: run presence once for the shared authenticated app and reflect `matchMode` as `in_game`.
- Modify `src/components/home/friends-sidebar.tsx`: render only server roster rows and an active invite-to-play action.
- Modify `src/components/play/PlayModeView.tsx`, `src/components/play/game-data.ts`, and `src/components/play/deck-selector.tsx`: remove the visible `DEMO_DECK` selection and show a real no-deck state.
- Modify `package.json` and `package-lock.json`: declare Vitest for client pure-module tests.

## Task 1: Establish one canonical Rangu Fam roster

**Files:**

- Create: `rangu.fam/src/lib/ranguMembers.ts`
- Modify: `rangu.fam/src/lib/doublejAuth.ts:1-50`
- Test: `rangu.fam/src/lib/tactics/presence.test.ts`

**Interfaces:**

- Produces `RANGU_TACTICS_MEMBERS`, `RanguTacticsMemberId`, and `isRanguTacticsMemberId(value)`.
- Consumed by SSO member resolution and the presence snapshot service.

- [ ] **Step 1: Add the root test runner and a failing roster-projection test**

Add the root script and development dependency:

```json
{
  "scripts": {
    "test:tactics": "vitest run src/lib/tactics/**/*.test.ts"
  },
  "devDependencies": {
    "vitest": "^2.1.8"
  }
}
```

Create `src/lib/tactics/presence.test.ts` with this initial expectation:

```ts
import { describe, expect, it } from 'vitest'
import { RANGU_TACTICS_MEMBERS } from '@/lib/ranguMembers'

describe('Rangu tactics roster', () => {
  it('contains the five canonical members in sidebar order', () => {
    expect(RANGU_TACTICS_MEMBERS.map((member) => member.id)).toEqual([
      'hanul', 'jaewon', 'minseok', 'seungchan', 'jinkyu',
    ])
  })
})
```

- [ ] **Step 2: Run the test and confirm the missing module failure**

Run from `rangu.fam`:

```powershell
npm install
npm run test:tactics
```

Expected: Vitest reports that `@/lib/ranguMembers` cannot be resolved.

- [ ] **Step 3: Implement the canonical roster and consume it from SSO**

Create `src/lib/ranguMembers.ts`:

```ts
export const RANGU_TACTICS_MEMBERS = [
  { id: 'hanul', name: '강한울', avatar: '/images/profile/hu.jpg' },
  { id: 'jaewon', name: '정재원', avatar: '/images/profile/jw.jpg' },
  { id: 'minseok', name: '정민석', avatar: '/images/profile/ms.png' },
  { id: 'seungchan', name: '이승찬', avatar: '/images/profile/sc.jpg' },
  { id: 'jinkyu', name: '정진규', avatar: '/images/profile/jq.jpg' },
] as const

export type RanguTacticsMemberId = (typeof RANGU_TACTICS_MEMBERS)[number]['id']

const memberIdSet = new Set<string>(RANGU_TACTICS_MEMBERS.map((member) => member.id))

export function isRanguTacticsMemberId(value: string): value is RanguTacticsMemberId {
  return memberIdSet.has(value)
}
```

In `src/lib/doublejAuth.ts`, import `isRanguTacticsMemberId`, delete the literal `CORE_MEMBER_USERNAMES` set, and change the final username guard in `resolveMemberIdFromUsername` to:

```ts
if (!isRanguTacticsMemberId(normalized)) return null
return normalized
```

Keep the existing `jingyu` to `jinkyu` alias immediately before that guard.

- [ ] **Step 4: Run the focused test and TypeScript check**

```powershell
npm run test:tactics
npx tsc --noEmit
```

Expected: roster test passes and TypeScript exits with code 0.

- [ ] **Step 5: Commit the self-contained roster change**

```powershell
git add package.json package-lock.json src/lib/ranguMembers.ts src/lib/doublejAuth.ts src/lib/tactics/presence.test.ts
git commit -m "feat(tactics): centralize Rangu member roster"
```

## Task 2: Add durable presence persistence and deterministic status rules

**Files:**

- Create: `rangu.fam/src/db/schema/tacticsPresence.ts`
- Modify: `rangu.fam/src/db/schema.ts:8-20`
- Create: `rangu.fam/src/lib/tactics/presence.ts`
- Modify: `rangu.fam/src/lib/tactics/presence.test.ts`
- Create: `rangu.fam/src/db/migrations/0002_tactics_presence.sql`
- Modify: `rangu.fam/src/db/migrations/meta/_journal.json`

**Interfaces:**

- Produces `PresenceState`, `PresenceStatus`, `PRESENCE_TTL_MS`, `resolvePresenceStatus`, `getPresenceSnapshot`, and `recordPresence`.
- Consumes a `wikiUsers.id` supplied only by authenticated server code.
- Produces `PresenceSnapshot` for the route in Task 3.

- [ ] **Step 1: Extend the failing tests with TTL and roster behavior**

Replace the import declarations at the top of `src/lib/tactics/presence.test.ts` with these three imports, then add the `presence status` suite below the existing roster suite:

```ts
import { describe, expect, it } from 'vitest'
import { RANGU_TACTICS_MEMBERS } from '@/lib/ranguMembers'
import { PRESENCE_TTL_MS, projectPresenceSnapshot, resolvePresenceStatus } from './presence'

describe('presence status', () => {
  const now = new Date('2026-07-17T09:00:00.000Z')

  it('keeps a recent in-game heartbeat online', () => {
    expect(resolvePresenceStatus('in_game', new Date(now.getTime() - PRESENCE_TTL_MS + 1), now)).toBe('in_game')
  })

  it('marks exactly stale heartbeats offline', () => {
    expect(resolvePresenceStatus('lobby', new Date(now.getTime() - PRESENCE_TTL_MS), now)).toBe('offline')
  })

  it('projects every canonical member and leaves missing records offline', () => {
    const snapshot = projectPresenceSnapshot([], now)
    expect(snapshot.members).toHaveLength(5)
    expect(snapshot.members.every((member) => member.status === 'offline')).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test and confirm the missing service failure**

```powershell
npm run test:tactics
```

Expected: failure because `./presence` does not exist.

- [ ] **Step 3: Define the table, migration, and service**

Create `src/db/schema/tacticsPresence.ts`:

```ts
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { wikiUsers } from './wiki'

export const tacticsPresence = pgTable('tactics_presence', {
  userId: uuid('user_id').primaryKey().references(() => wikiUsers.id, { onDelete: 'cascade' }),
  state: text('state').notNull().default('lobby').$type<'lobby' | 'in_game'>(),
  lastHeartbeatAt: timestamp('last_heartbeat_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  heartbeatIdx: index('tp_last_heartbeat_idx').on(table.lastHeartbeatAt),
}))
```

Export it from `src/db/schema.ts`. Create `src/lib/tactics/presence.ts` with the externally consumed types and pure classifier:

```ts
export type PresenceState = 'lobby' | 'in_game'
export type PresenceStatus = PresenceState | 'offline'
export const PRESENCE_TTL_MS = 65_000

export function resolvePresenceStatus(state: PresenceState, lastHeartbeatAt: Date, now = new Date()): PresenceStatus {
  return now.getTime() - lastHeartbeatAt.getTime() < PRESENCE_TTL_MS ? state : 'offline'
}
```

Implement `projectPresenceSnapshot(records, now)` by iterating `RANGU_TACTICS_MEMBERS` in declaration order, joining a record only when its `memberId` is canonical, and returning `{ members: Array<{ id; name; avatar; status; lastHeartbeatAt }> }`. Implement `getPresenceSnapshot(db, now)` with a left join of `wikiUsers` and `tacticsPresence`; map each joined `wikiUsers` row through `resolveMemberIdForUser`, discard non-members, and pass `{ memberId, state, lastHeartbeatAt }` records to `projectPresenceSnapshot`. Implement `recordPresence(db, userId, state, now)` with `insert(...).onConflictDoUpdate({ target: tacticsPresence.userId, set: { state, lastHeartbeatAt: now, updatedAt: now } })`.

Generate the migration locally:

```powershell
npx drizzle-kit generate --name tactics_presence
```

Keep the generated numbered filename and journal timestamp. Its SQL must create `tactics_presence`, define `user_id` as the primary key, add the foreign key to `wiki_users(id)` with `ON DELETE cascade`, and create `tp_last_heartbeat_idx`. Do not run `drizzle-kit migrate`.

- [ ] **Step 4: Run focused tests and inspect the generated migration**

```powershell
npm run test:tactics
npx drizzle-kit check
Get-Content -Raw src/db/migrations/0002_tactics_presence.sql
```

Expected: tests pass, Drizzle reports no schema inconsistency, and the SQL contains only the new table/index/foreign-key statements.

- [ ] **Step 5: Commit persistence and service logic**

```powershell
git add src/db/schema.ts src/db/schema/tacticsPresence.ts src/lib/tactics/presence.ts src/lib/tactics/presence.test.ts src/db/migrations
git commit -m "feat(tactics): persist authenticated game presence"
```

## Task 3: Publish the authenticated presence API

**Files:**

- Create: `rangu.fam/src/app/api/game/presence/route.ts`
- Modify: `rangu.fam/src/lib/tactics/presence.test.ts`

**Interfaces:**

- Consumes `getAuthenticatedWikiUser(request)`, `getDb()`, `getPresenceSnapshot`, and `recordPresence`.
- Produces `GET /api/game/presence` and `POST /api/game/presence`.
- Response is `{ success: true, members: PresenceMember[] }` on success.

- [ ] **Step 1: Add API input validation tests to the pure service test file**

Extend the existing `./presence` import at the top of `src/lib/tactics/presence.test.ts` to include `parsePresenceState`, then add this parser contract after the `presence status` suite:

```ts
it.each([
  ['lobby', 'lobby'],
  ['in_game', 'in_game'],
  ['offline', null],
  [undefined, null],
])('accepts only client-writable states: %s', (input, expected) => {
  expect(parsePresenceState(input)).toBe(expected)
})
```

- [ ] **Step 2: Run the test and verify it fails before adding the parser**

```powershell
npm run test:tactics
```

Expected: failure because `parsePresenceState` is not exported.

- [ ] **Step 3: Implement parsing and the route handler**

Add this parser to `src/lib/tactics/presence.ts`:

```ts
export function parsePresenceState(value: unknown): PresenceState | null {
  return value === 'lobby' || value === 'in_game' ? value : null
}
```

Create `src/app/api/game/presence/route.ts` using this exact control flow:

```ts
export const dynamic = 'force-dynamic'

async function requirePresenceUser(request: NextRequest) {
  const user = await getAuthenticatedWikiUser(request)
  return user ? { userId: String(user.id || user._id) } : null
}

export async function GET(request: NextRequest) {
  const auth = await requirePresenceUser(request)
  if (!auth) return NextResponse.json({ success: false, error: 'not_authenticated' }, { status: 401 })
  return NextResponse.json({ success: true, ...(await getPresenceSnapshot(getDb())) })
}

export async function POST(request: NextRequest) {
  const auth = await requirePresenceUser(request)
  if (!auth) return NextResponse.json({ success: false, error: 'not_authenticated' }, { status: 401 })
  const state = parsePresenceState((await request.json().catch(() => null))?.state)
  if (!state) return NextResponse.json({ success: false, error: 'invalid_presence_state' }, { status: 400 })
  const db = getDb()
  await recordPresence(db, auth.userId, state)
  return NextResponse.json({ success: true, ...(await getPresenceSnapshot(db)) })
}
```

Wrap the database section in a `try/catch` that logs `tactics presence route error` and returns `{ success: false, error: 'presence_unavailable' }` with HTTP 503. Do not return partial or fake members after a database failure.

- [ ] **Step 4: Verify the parser tests and route compilation**

```powershell
npm run test:tactics
npm run build
```

Expected: every pure parser/TTL/roster test passes and the Next production build completes.

- [ ] **Step 5: Commit the API**

```powershell
git add src/lib/tactics/presence.ts src/lib/tactics/presence.test.ts src/app/api/game/presence/route.ts
git commit -m "feat(tactics): expose live member presence"
```

## Task 4: Make client authentication a shared state source

**Files:**

- Modify: `rangu-tactics-heavy/package.json`
- Modify: `rangu-tactics-heavy/package-lock.json`
- Modify: `rangu-tactics-heavy/src/lib/auth.ts`
- Create: `rangu-tactics-heavy/src/lib/auth.test.ts`

**Interfaces:**

- Produces `useAuth()` backed by one Zustand store, plus existing `bootstrapHandoff`, `login`, and `logout` exports.
- The store exposes `{ account, loading, busy, refresh, bootstrap, login, logout }`.
- Consumed by navigation and the presence hook in Task 5.

- [ ] **Step 1: Add Vitest and write the failing auth store test**

Add this to `rangu-tactics-heavy/package.json`:

```json
{
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^2.1.8"
  }
}
```

Create `src/lib/auth.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn().mockResolvedValue(null) }))
vi.mock('@/lib/tactics/api', () => ({
  API_BASE: 'https://rangu-fam.com', apiUrl: (path: string) => path,
  clearSessionToken: vi.fn(), getSessionToken: vi.fn(() => ''), isTauri: vi.fn(() => false),
  nativeFetch: vi.fn(), setSessionToken: vi.fn(),
}))

describe('shared auth store', () => {
  beforeEach(async () => {
    const { useAuthStore } = await import('./auth')
    useAuthStore.getState().reset()
  })

  it('resets every consumer to the same logged-out state', async () => {
    const { useAuthStore } = await import('./auth')
    expect(useAuthStore.getState()).toMatchObject({ account: null, loading: false, busy: false })
  })
})
```

- [ ] **Step 2: Run the test and confirm the missing store failure**

```powershell
npm install
npm test -- src/lib/auth.test.ts
```

Expected: import failure because `useAuthStore` and `reset` are not exported.

- [ ] **Step 3: Refactor `auth.ts` to a single Zustand state machine**

Keep the existing OAuth and token helper functions, but replace component-local `useState` ownership with `create<AuthState>()`. The state must include `reset()` for tests and logout, an idempotent `bootstrap()` promise, and `refresh()` that calls `/api/auth/me` exactly as the current hook does. `useAuth()` becomes a selector wrapper that runs `bootstrap()` in `useEffect` and returns the store state.

The externally visible state shape is:

```ts
export interface AuthState {
  account: Account | null
  loading: boolean
  busy: boolean
  bootstrap(): Promise<void>
  refresh(): Promise<void>
  login(): Promise<LoginOutcome>
  logout(): Promise<void>
  reset(): void
}
let bootstrapPromise: Promise<void> | null = null

export const useAuthStore = create<AuthState>((set, get) => ({
  account: null,
  loading: true,
  busy: false,
  reset: () => set({ account: null, loading: false, busy: false }),
  refresh: async () => {
    if (!getSessionToken()) {
      set({ account: null, loading: false })
      return
    }
    try {
      const response = await nativeFetch(apiUrl('/api/auth/me'))
      const body = (await response.json().catch(() => null)) as MeResponse | null
      const user = body?.success ? body.data?.user : undefined
      if (!user) {
        set({ account: null, loading: false })
        return
      }
      const avatar = user.avatar || body?.data?.discordAvatar || undefined
      set({ account: { id: user.id, username: user.username, avatar: avatar ? (avatar.startsWith('/') ? apiUrl(avatar) : avatar) : undefined, role: user.role, memberId: user.memberId }, loading: false })
    } catch {
      set({ account: null, loading: false })
    }
  },
  bootstrap: async () => {
    if (!bootstrapPromise) bootstrapPromise = (async () => {
      await bootstrapHandoff()
      await get().refresh()
    })().finally(() => { bootstrapPromise = null })
    return bootstrapPromise
  },
  login: async () => {
    set({ busy: true })
    try {
      const outcome = await oauthLogin()
      if (outcome.ok) await get().refresh()
      return outcome
    } finally {
      set({ busy: false })
    }
  },
  logout: async () => {
    await remoteLogout()
    get().reset()
  },
}))
```

Rename the existing free functions to `oauthLogin` and `remoteLogout` at import time so they do not shadow the store methods. `bootstrap()` awaits `bootstrapHandoff()` before `refresh()` and shares the module-level promise above so two mounted consumers cannot issue duplicate `/api/auth/me` calls.

- [ ] **Step 4: Run the focused test and production build**

```powershell
npm test -- src/lib/auth.test.ts
npm run build
```

Expected: shared-store test passes and Vite completes without type or bundle errors.

- [ ] **Step 5: Commit shared authentication**

```powershell
git -C C:\Users\jaewo\Desktop\rangu-tactics-heavy add package.json package-lock.json src/lib/auth.ts src/lib/auth.test.ts
git -C C:\Users\jaewo\Desktop\rangu-tactics-heavy commit -m "feat(auth): share desktop session state"
```

## Task 5: Connect live presence to the desktop lifecycle and sidebar

**Files:**

- Create: `rangu-tactics-heavy/src/lib/tactics/presence.ts`
- Create: `rangu-tactics-heavy/src/lib/tactics/usePresence.ts`
- Create: `rangu-tactics-heavy/src/lib/tactics/presence.test.ts`
- Modify: `rangu-tactics-heavy/src/App.tsx:1-52`
- Modify: `rangu-tactics-heavy/src/components/home/friends-sidebar.tsx`
- Modify: `rangu-tactics-heavy/src/components/home/HomeView.tsx:7-39`

**Interfaces:**

- Consumes the Task 3 API through `nativeFetch` and the Task 4 auth store.
- Produces `usePresence({ state })`, which returns `{ members, loading, error, refresh }`.
- `PresenceMember.status` is `offline | lobby | in_game` and has no client-defined fallback values.

- [ ] **Step 1: Write failing payload/state-transition tests**

Create `src/lib/tactics/presence.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'

vi.mock('./api', () => ({ apiUrl: (path: string) => path, nativeFetch: vi.fn() }))

describe('presence API', () => {
  it('sends only the requested authoritative state in a heartbeat', async () => {
    const { nativeFetch } = await import('./api')
    vi.mocked(nativeFetch).mockResolvedValue(new Response(JSON.stringify({ success: true, members: [] })))
    const { sendPresenceHeartbeat } = await import('./presence')

    await sendPresenceHeartbeat('in_game')

    expect(nativeFetch).toHaveBeenCalledWith('/api/game/presence', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ state: 'in_game' }),
    }))
  })
})
```

- [ ] **Step 2: Run the test and verify the missing adapter failure**

```powershell
npm test -- src/lib/tactics/presence.test.ts
```

Expected: failure because `./presence` does not exist.

- [ ] **Step 3: Implement the typed API adapter and lifecycle hook**

Create `src/lib/tactics/presence.ts`:

```ts
export type PresenceStatus = 'offline' | 'lobby' | 'in_game'
export type PresenceMember = { id: string; name: string; avatar: string; status: PresenceStatus; lastHeartbeatAt: string | null }
export type PresenceSnapshot = { members: PresenceMember[] }

export async function sendPresenceHeartbeat(state: Exclude<PresenceStatus, 'offline'>): Promise<PresenceSnapshot> {
  const response = await nativeFetch(apiUrl('/api/game/presence'), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state }),
  })
  if (!response.ok) throw new Error(`presence_http_${response.status}`)
  const body = await response.json() as { success?: boolean; members?: PresenceMember[] }
  if (!body.success || !Array.isArray(body.members)) throw new Error('presence_invalid_response')
  return { members: body.members }
}
```

Also export `fetchPresenceSnapshot()` with the same response validation and no fabricated fallback. Implement `usePresence({ enabled, state })` so an authenticated enabled caller does this sequence: heartbeat immediately, schedule `setInterval` at `20_000`, then fetch a fresh snapshot; clear the interval on unmount, disabled state, or an authentication error. Retain the last valid `members` array when a non-401 request fails; expose the error string. On HTTP 401, call `useAuthStore.getState().reset()` and clear members.

In `App.tsx`, obtain `account` from `useAuth()`, call `usePresence({ enabled: !!account, state: matchMode === null ? 'lobby' : 'in_game' })`, and pass its result through `HomeView` to `FriendsSidebar`. Do not start a second heartbeat in the sidebar.

Replace the static `FRIENDS` array and message button in `friends-sidebar.tsx`. Render `members` directly, map `lobby` to "로비", `in_game` to "게임 중", and `offline` to "오프라인". Each member row has a working "대전 준비" button that calls the existing `onPlay`; remove any unimplemented chat affordance. The compact sidebar renders exactly the same `members` array.

- [ ] **Step 4: Run focused client tests and build**

```powershell
npm test -- src/lib/tactics/presence.test.ts src/lib/auth.test.ts
npm run build
```

Expected: both pure client tests pass and Vite produces the desktop bundle.

- [ ] **Step 5: Commit client presence integration**

```powershell
git -C C:\Users\jaewo\Desktop\rangu-tactics-heavy add src/App.tsx src/lib/tactics/presence.ts src/lib/tactics/usePresence.ts src/lib/tactics/presence.test.ts src/components/home/friends-sidebar.tsx src/components/home/HomeView.tsx
git -C C:\Users\jaewo\Desktop\rangu-tactics-heavy commit -m "feat(tactics): show live Rangu member presence"
```

## Task 6: Remove visible demo deck selection without breaking server fallback

**Files:**

- Modify: `rangu-tactics-heavy/src/components/play/game-data.ts:19-70`
- Modify: `rangu-tactics-heavy/src/components/play/PlayModeView.tsx:1-108`
- Modify: `rangu-tactics-heavy/src/components/play/deck-selector.tsx:1-77`
- Modify: `rangu-tactics-heavy/src/components/play/match-details.tsx:1-82`

**Interfaces:**

- `Deck` no longer has `demo`.
- `PlayModeView` starts a match only when a server-saved deck is selected.
- `DeckSelector` calls `onEdit('new')` from the no-deck empty state.

- [ ] **Step 1: Add a failing no-demo pure test**

Create `src/components/play/game-data.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import * as gameData from './game-data'

describe('play deck data', () => {
  it('does not export a client-selectable demo deck', () => {
    expect('DEMO_DECK' in gameData).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test and verify it fails against the old client data**

```powershell
npm test -- src/components/play/game-data.test.ts
```

Expected: assertion failure because `DEMO_DECK` is still exported.

- [ ] **Step 3: Remove the demo path and add the real empty state**

Delete `DEMO_DECK` and `demo` from `game-data.ts`. In `PlayModeView`, initialize `selectedDeckId` as `null`, derive `selectedDeck` from saved decks only, and pass `canStart={!!selectedDeck}` to `MatchDetails`. Keep the current optimistic active-deck transition only for actual saved deck IDs. Change `MatchDetailsProps` to `deck: Deck | null` and `canStart: boolean`; when `deck` is null, render the no-selection heading and a `덱 만들기` callback instead of attempting to read deck fields.

In `DeckSelector`, when `decks.length === 0`, render this real empty state before the create tile:

```tsx
<div className="flex min-h-56 flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/20 p-8 text-center">
  <Layers className="size-8 text-primary" aria-hidden />
  <h3 className="text-base font-semibold text-foreground">플레이할 덱이 없습니다</h3>
  <p className="max-w-sm text-sm text-muted-foreground">카드 보관함에서 16장 덱을 만들고 저장하면 여기에서 선택할 수 있습니다.</p>
  <button type="button" onClick={() => onEdit('new')} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">덱 만들기</button>
</div>
```

Render `MatchDetails` with an explicit no-selection state: hide the match button and show the same `덱 만들기` action. Do not render a disabled match button.

- [ ] **Step 4: Run the no-demo test and build**

```powershell
npm test -- src/components/play/game-data.test.ts
npm run build
```

Expected: the no-demo assertion passes and Vite builds.

- [ ] **Step 5: Commit real deck selection**

```powershell
git -C C:\Users\jaewo\Desktop\rangu-tactics-heavy add src/components/play/game-data.ts src/components/play/game-data.test.ts src/components/play/PlayModeView.tsx src/components/play/deck-selector.tsx src/components/play/match-details.tsx
git -C C:\Users\jaewo\Desktop\rangu-tactics-heavy commit -m "feat(tactics): remove client demo deck"
```

## Task 7: Verify the integrated authenticated desktop flow

**Files:**

- Modify only if verification reveals a concrete defect in the files from Tasks 1-6.

**Interfaces:**

- Consumes deployed or local API with the Task 2 migration applied in an isolated local database.
- Produces verified handoff, lobby, in-game, exit, and error behavior.

- [ ] **Step 1: Run both production builds without altering production data**

```powershell
Set-Location C:\Users\jaewo\Desktop\rangu.fam
npm run build
Set-Location C:\Users\jaewo\Desktop\rangu-tactics-heavy
npm run build
```

Expected: both commands exit 0.

- [ ] **Step 2: Perform the desktop acceptance sequence**

Run the Tauri app from a launcher-authenticated session and verify each observable state:

```text
1. Home opens with the launcher account name/avatar and no login prompt.
2. The matching canonical member is marked “로비” within one poll interval.
3. Opening PlayFlow changes that member to “게임 중”.
4. Closing PlayFlow changes the member back to “로비”.
5. The sidebar contains only the five Rangu Fam members and no fake online user.
6. An account with no saved deck sees “플레이할 덱이 없습니다” and a working “덱 만들기” action.
```

- [ ] **Step 3: Verify failure behavior with the API unavailable**

Temporarily point `VITE_API_BASE_URL` at an unreachable local port in a development-only shell, then launch the client. Expected: the last valid roster remains visible or the first load is an explicit unavailable state; no synthetic friend or demo deck appears; login remains available.

- [ ] **Step 4: Commit only concrete verification fixes**

If verification changed the backend route or presence service, use this exact backend commit:

```powershell
git -C C:\Users\jaewo\Desktop\rangu.fam add src/app/api/game/presence/route.ts src/lib/tactics/presence.ts
git -C C:\Users\jaewo\Desktop\rangu.fam commit -m "fix(tactics): harden presence verification findings"
```

If verification changed the desktop presence lifecycle or friends UI, use this exact client commit:

```powershell
git -C C:\Users\jaewo\Desktop\rangu-tactics-heavy add src/App.tsx src/lib/tactics/usePresence.ts src/components/home/friends-sidebar.tsx
git -C C:\Users\jaewo\Desktop\rangu-tactics-heavy commit -m "fix(tactics): harden client presence flow"
```

If no file changed, create no empty commit.
