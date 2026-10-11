# Performance

## Barometers

| Barometer | How to read it | Target | Oct 2026 |
|---|---|---|---|
| Hydration | `kingdra:hydrated` − `kingdra:boot` (`performance.getEntriesByType('mark')`) | < 100 ms | 4–5 ms |
| App ready | `kingdra:ready` (full app and library committed), from navigation start | Not gated on Clerk | 64–131 ms; Clerk finishes about 600 ms |
| First paint | `first-contentful-paint`; the server HTML is the `AppShell` frame | Before app JS | 44–60 ms |
| Edit cost | Rename a team: time from `blur` to the next frame, 200 teams + 32 full boxes, desktop | < 16 ms | 5.4 ms median (was 32.7) |
| Team switch | Click a team card: time to the next frame, same library | < 50 ms | 19 ms median (was 33.5) |
| Guest writes | `localStorage.setItem` calls during a burst of edits | 1 per pause | 1 (250 ms debounce, flushed on `pagehide`) |
| Initial JS | Sum of `<script src="/_next/…">` in `.next/server/app/index.html`, gzip | < 250 KB | 777 KB (see follow-ups) |
| Cloud writes on load | `PUT /api/library` when the account library is unchanged | 0 | 0 |

The figures were measured on a production build (`kingdra-prod` in `.claude/launch.json`) on an M-series Mac. Expect them to be 4–6× slower on a mid-range phone.

The worst-case library is 200 teams of 6 plus 32 full boxes, about 906 KB of JSON.

## How startup works

1. The server renders `AppShell`, a static frame with no reads from the browser, so hydration has nothing to reconcile.
2. `Persistence` mounts with the shell:
   - **Guests:** the library loads from `localStorage` right away. Clerk is never awaited.
   - **Returning accounts** (remembered in `kingdra.account`): the account fetch starts at once. Only if it is refused, because the session cookie expired, does it retry after Clerk loads.
3. The workbench renders. The first 60 team cards mount at once; the rest mount in idle chunks. Off-screen cards use `content-visibility: auto`.
4. Learnsets, a 263 KB brotli chunk, are prefetched while the browser is idle, so the first card open does not wait for them.
5. The proxy (`src/proxy.ts`) runs Clerk on `/api/*` and forwards Clerk's `/__clerk` Frontend API calls. The static page never waits on a Clerk handshake redirect.

## Rules that keep it fast

- Nothing near the root subscribes to `library`. Autosave uses `useStore.subscribe`. Validation runs in its own leaf component (`OpenTeamValidation`).
- Memoize list items whose props come from cached data: `TeamCard`, `CandidateCard`, `MoveRow`. Key effects and memos on the team's context (`mode`, `gen`, `format`), not the `team` object, which changes on every edit.
- Remember server answers for the visit: roles, Smogon suggestions, validation by team contents, and learnable moves. Tests clear these caches with `clearRequestCaches()` / `clearSmogonCache()`.

## Follow-ups not done yet

- **Slim species index:** the main chunk carries all of `@pkmn/dex`, about 2.4 MB raw. A generated index (name → num, types, forme) would let the icons, team list and party render without it. The dex-heavy panels would then load it with a dynamic `import()`. This is the biggest remaining win for phones.
- **Cloud autosave sends the whole library** on every save, up to about 1.8 MB at 500 teams. Sending only the changed team or box would need a per-team write API.
- **Sprites:** each Gen 1–8 icon is its own `raw.githubusercontent.com` request with a short cache lifetime. An immutable mirror (jsDelivr pinned to a commit) or the single Showdown icon sheet would cut requests.
- **Breakpoints:** Tailwind's `md` is 626px but `MOBILE_QUERY` is 650px. `AppShell` uses `min-[651px]` to match the JS.
