# Rangu Tactics: live presence and Noxus battle board

**Date:** 2026-07-17  
**Status:** Approved for implementation

## Goal

Replace the game client's placeholder social and deck data with authenticated Rangu Fam data, make launcher SSO authoritative in the game, and reshape the battle screen into an original Noxus-themed card-board experience with the information hierarchy of the supplied Legends of Runeterra references.

The implementation spans two repositories:

- `rangu.fam`: authenticated presence API and durable presence storage.
- `rangu-tactics-heavy`: desktop client state, live friends list, and battle UI.

## Scope

### Live member presence

Create a game-specific `tactics_presence` table in `rangu.fam`:

- `user_id` is the primary key and references `wiki_users`.
- `state` is `lobby` or `in_game`.
- `last_heartbeat_at` is the server time of the latest authenticated game heartbeat.
- `updated_at` supports diagnostics and cleanup.

The API exposes an authenticated snapshot and heartbeat endpoint at `/api/game/presence`.

- `GET` returns the five canonical Rangu Fam members—강한울, 정재원, 정민석, 이승찬, 정진규—with display name, avatar, member id, and resolved status.
- `POST` accepts only `lobby` or `in_game`; it upserts the caller's presence and returns the same snapshot shape.
- A presence is online only when its latest heartbeat is at most 65 seconds old. A missing or stale record is `offline`.
- The server builds the member roster from one canonical mapping shared with the existing SSO member identifiers. It never accepts a client-supplied member or user id.

The desktop game makes an initial heartbeat after authentication, repeats it every 20 seconds while open, switches to `in_game` while a match overlay is active, and switches back to `lobby` on match exit. TTL is the fallback for forced quits and network loss. Logging out attempts to mark the caller offline, then clears local authentication regardless of the request outcome.

The friends sidebar refreshes the snapshot on the same 20-second cadence. It shows only the real Rangu Fam roster and their actual server-derived status; fabricated friend names, hard-coded statuses, and placeholder avatars are removed.

### Authentication and real data

Keep the current secure launcher handoff: the launcher-provided `RANGU_SESSION_TOKEN` is read before React renders and becomes the game session token. Refactor authentication into one shared client store so the navigation, presence heartbeat, and game flow observe the same account rather than independent hook instances.

Standalone desktop launches retain the current OAuth flow. Authentication failures show a recoverable login state rather than silently substituting a fake player.

Remove client-facing fake game data:

- The visible demo deck card is removed from deck selection. With no saved deck, the player sees a real empty state and a working "덱 만들기" action.
- The existing server-side fallback deck remains an internal compatibility fallback; it is not presented as user-owned data.
- Card metadata, wallet, saved decks, battle snapshots, and action logs remain server-backed.

### Working controls

Every visible control receives a real, meaningful action or is removed when the underlying capability does not exist. In particular, the static friend message affordance is replaced with a member detail/invite entry point that opens the play flow rather than pretending to offer chat.

Game-rule restrictions remain intact: the client must not send card, attack, block, or pass commands when the authoritative battle state does not permit them. Instead of showing a disabled action wheel during the opponent's turn, the board shows a non-button turn-status indicator. Only short-lived duplicate-submission protection may disable a control while a request is in flight.

### Noxus board redesign

The board uses the supplied references for interaction hierarchy only; it will not copy Riot artwork, card frames, branding, or assets.

The original art direction is an iron Noxian war chamber:

- Palette: volcanic black `#11100F`, forged iron `#2B2926`, oxidized brass `#9A6B32`, war crimson `#9E1D24`, ember orange `#E36B2C`, and enemy ash `#C9C0B5`.
- A deep, cracked-stone battlefield is divided by a glowing siege line. Opponent and player each have a deliberate six-slot unit row with clear attack and block anchors.
- Large, asymmetrical Nexus bastions occupy the left edges of player and opponent zones. Health and seat targeting remain tied to their current battle snapshot anchors.
- The action/priority control becomes a central command standard near the combat line, while opponent hand, mana, player hand, and round state form a stable vertical reading order.
- The lower hand is a layered fan with large hover/focus expansion, cost legibility, and the current drag-to-target behavior. It remains responsive and keyboard-focusable.
- Existing battle snapshot, targeting, combat FX, tutorial constraints, and action logs keep their current server-authoritative behavior while being re-laid out.

## Data flow

```text
Rangu Client authenticated
  -> launches game with RANGU_SESSION_TOKEN
  -> game bootstraps shared auth store
  -> POST /api/game/presence { state: lobby }
  -> GET /api/game/presence every 20 seconds
  -> friends sidebar renders live roster

Match opens
  -> POST /api/game/presence { state: in_game }
  -> existing ticket + WebSocket battle flow
  -> battle snapshot renders the Noxus board
  -> match closes
  -> POST /api/game/presence { state: lobby }
```

## Error handling

- A failed presence request preserves the most recent valid roster, displays a compact retry state, and never turns other members into artificial online users.
- A 401 clears the shared account and stops heartbeat/polling.
- A missing tactics-presence migration returns an explicit server error; it is not hidden with mock data.
- Browser preview may display public card metadata, but authenticated game actions and presence use the established native transport in Tauri.

## Verification

- Database migration defines the table, FK, and lookup index; applying it is a deployment action and is not performed against production during local implementation.
- API coverage validates anonymous rejection, an authenticated heartbeat, TTL classification, member roster ordering, and state transition to `in_game`.
- Client coverage validates unauthenticated/empty/error/presence states and transition calls entering/leaving a match.
- Production builds and TypeScript checks run for both `rangu.fam` and `rangu-tactics-heavy`.
- Manual desktop check: a launcher-authenticated member opens the game with no login prompt, appears online, enters a match as `게임 중`, exits to `로비`, and sees no fabricated friends or selectable demo deck.
