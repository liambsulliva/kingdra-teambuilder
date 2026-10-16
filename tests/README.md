# Tests

Three Vitest projects, defined in `vitest.config.ts` (`test.projects`):

| Project | Where | What | Run |
| --- | --- | --- | --- |
| unit | `src/**/*.test.{ts,tsx}` | Colocated library tests; the elastic slider, controls, skeletons and type badge contrast (`src/components/ui/__tests__`); layout breakpoints and the no-all-caps rule (`src/lib/__tests__/breakpoints.test.ts`); the server-side Clerk proxy (`src/__tests__/proxy.test.ts`) | part of both commands |
| simple | `tests/simple` | Fast checks of the model, dex, store, drag rules and API routes, plus the everyday flows on desktop, phone and tablet (~2 s) | `npm run test:simple` (watch: `npm test`) |
| comprehensive | `tests/comprehensive` | The stress suite: every user flow against 32 seeded teams and 100 boxed Pokémon (~15 s) | `npm run test:comprehensive` |

`npm run build` runs lint, then the comprehensive suite (which includes unit and simple), then `next build`, so a production build fails if any pinned flow breaks.

## What the tests pin

The tests pin the flows in `docs/redesign/spec.md` and the decisions made since. Where the app does what the spec intends, a plain `it` holds it there. Where it doesn't yet, an `it.fails` pins the bug (see Known issues). Where the spec has gone stale and the code is what was decided, the test follows the code; the main cases:

- Fancy animations are on for a new viewer, and the header toggle is "Enable fancy animations", pressed while on.
- Team search matches team names, species and nicknames.
- The current evolution stage and drop targets are marked in blue (accent), not red.
- The party row always shows all six members, the one on the card included; no cell slides.
- Dropping a suggestion on a member of a full party replaces that member.
- There is no preview or comparison anywhere. Any Pokémon dropped on the card goes onto the card.

## The stress library

`tests/fixtures/library.ts` builds, from a seed:

- **32 teams**, one per context: Gen 9 OU/UU/RU/NU/Ubers/LC/Doubles OU/VGC/Champions OU/Champions BSS/National Dex, Gen 8 OU/National Dex/VGC/Doubles OU, Gen 7 OU/UU/VGC, Gen 6 OU/VGC, Gen 5 OU, Gen 4 OU, Gen 3 OU, Gen 2 OU, Gen 1 OU, and casual Gen 9/8/7/5/4/3/1. Most are full; every fifth is partial.
- **100 Pokémon across 4 PC boxes**, scattered over random slots.
- Every set is random but valid for its context: real learnset moves at its level (1 to 4), a real ability, item and nature, legal EV/Stat Point spreads, and the occasional nickname, gender, shiny, happiness, Poké Ball, Hidden Power, Dynamax or Tera type.

The seed is printed by `stress-data.test.ts`. Replay a run with `STRESS_SEED=<n> npm run test:comprehensive`.

## The test environment

Server code, and any test that reads files with `node:fs` or `node:path`, runs in Node, not jsdom: `src/__tests__/proxy.test.ts` and `src/lib/__tests__/breakpoints.test.ts` opt into `// @vitest-environment node`. In jsdom, a production build (Vercel sets `NODE_ENV=production`) swaps Node built-ins such as `node:async_hooks` for empty stubs, and Clerk's middleware throws `AsyncLocalStorage is not a constructor` as it loads. It lives in the unit project because the DOM setup below needs jsdom.

`tests/setup/dom.tsx` runs before the simple and comprehensive files:

- jsdom gets small stand-ins for `<dialog>` (with `close` fired in a later task, as browsers do), Web Animations, `matchMedia`, `ResizeObserver` and the clipboard. The dialog stand-in does not react to Escape: a test presses Escape by removing `open` and dispatching `close`, as the browser would.
- Clerk and `next/link` are mocked. `tests/helpers/env.ts` exposes:
  - `auth` (signed in or out, or a Clerk that failed to load)
  - `setViewport` (phone, tablet, reduced motion)
  - `mockApi` (route fetches by URL fragment, with defaults for every `/api/*` route and PokeAPI)
  - `clipboard`
  - `seedLocalLibrary`
  - `reloadPreferences`, which re-reads the per-viewer choices (team view, card sprites, fancy animations, last member on each card) the way a page load would. The store reads them once, when its module loads.
- `MotionGlobalConfig.skipAnimations` is on, so exit animations finish and the next view mounts. `flows-motion.test.tsx` turns reduced motion off to run the choreography itself.
- dnd-kit cannot detect collisions without layout. So `flows-drag.test.tsx` and `flows-mobile.test.tsx` render the real `DragLayer` and drive its `DndContext` handlers with each drop. A drop that moved under 6 px is a long press.
- Roles, suggestions and PokeAPI responses are cached per URL for the life of a test file. A test that mocks one of them uses a format or species no earlier test in the file has fetched.

## Flows covered

| Area | Flows | File |
| --- | --- | --- |
| Team library | list, open by click/keyboard/member icon (Enter only on the card itself), the open team is not a button, its slots show its members with only empty ones dashed, select a member from its icon, search by name/species/nickname, close search from its icon, rename (blur, Enter, Escape, blank), mode toggle, generation and format select and its label, duplicate, copy as Showdown text (empty team, blocked clipboard), two-step delete, last team refused, legality badge (singular, never on casual) | `flows-library`, `simple/app` |
| Card view | toggle and saved choice, two to a row, 2×3 slots, hinge only on closed cards and `data-still` with fancy animations off, controls inside the card with the mode toggle on the name row and no chevron, open from card or icon, search | `flows-library` |
| Dialogs | new team (name, default name, Enter, casual, generation resets format, cancel, close, Escape, backdrop), switch to import and stay open, import team (disabled, no Pokémon, error clears on retry, full backup, headerless text takes the open format, several teams in one toast, skipped species, casual fallback format), paste set (Escape keeps the card), delete member, apply fix | `flows-library`, `flows-card`, `flows-inspector`, `simple/app` |
| Header | save status labels (exact, danger only on error), the save swim (guest and account saves, frames, bubbles only behind, early stop, error, reduced motion), theme, card sprites, fancy animations (on for a new viewer, saved choice restored), sign in, Clerk unavailable, toasts | `flows-library`, `flows-motion`, `stress-persistence`, `simple/app` |
| Card | every member of every team (name, dex number, types, format-specific key rows, four move slots), nature row with its stats or Neutral, key rows and move slots open editors, type badge to matchups, shiny, copy, paste, delete, Escape, empty desk, empty-team summary (issue count on competitive only), evolution line and branching evolutions, Details, Smogon sets (one, several, none, failure, casual format), support moves | `flows-card` |
| Always a member on the card | first add goes on the card, removing/boxing/moving the carded member hands it to its neighbour, a box or team swap hands it to the incoming one, reopening a team brings back its last member, a stale memory falls back to the first, blocked storage, and the fuzz checks it after every action | `simple/store`, `stress-store-fuzz`, `flows-mobile` |
| Drop on the card | a party member is selected; a suggestion, Box Pokémon or another team's member joins the party and is selected; the card's move slots count as the card; a full party refuses newcomers; no Preview or Compare control on desktop, tablet or phone | `flows-drag`, `simple/drag`, `simple/app`, `flows-layouts` |
| Inspector | stats for every competitive member, EV caps, slider keys, resets, IV presets, DVs, Champions Stat Points, speed tiers, Smogon link, tab strip per format, moves (search, type, category, fill, replace, remove, suggestions, Little Cup level), ability, item, nature, Tera, level, Details fields, matchups, team analysis, legality and Fix, Pokédex, locations | `flows-inspector` |
| Suggestions | tier tabs for every team (Champions included), tiers 60 at a time and load more, BST order, search (names first, then roles and moves; Toxic Spikes finds its learners; two letters match names only), role filter, support filter (every category, casual teams too, an empty Momentum in Gen 3), lower and higher generation, Doubles Ubers, casual generations, add and full-team refusal | `flows-browse-box` |
| PC Box | open and close four ways, page all boxes and count 100, move to party, full party, move to box (into the box being viewed, picked member highlighted), selection forgotten on paging, add, rename (blur and Enter), delete (with what it takes), last box, 32-box cap in the drawer | `flows-browse-box` |
| Drag and drop | suggestion to card or move slot (added and selected), party, full party, other team, wrong generation; member out (poof), onto the card or a move slot (selected), reorder, to box, to another team, swap on full team, tap vs long-press, from a closed team (to the party or the card); evolution stage; box to party, card and cell; move to slot, swap, off slot; cancel | `flows-drag` |
| Phone | tabs, team summary, browse, box, everyday tap → key row → sheet → pick closes it, sheet from a key row, move slot or type badge, move and level-preset picks close it but typing doesn't, one sheet height, long press opens the action sheet (never for another team's member), tap a member on Browse with nothing flying across tabs, party row on Browse, Role and Support side by side under the search, move search on Browse, empty-team starters, captions, support badges, legality list, icons kept on the team list, no hinge or fall | `flows-layouts`, `flows-mobile`, `simple/app` |
| Tablet | merged card tab, editors as tabs and back, card drop targets only on the card tab, adding or picking a move returns to the card, no Compare tab, resize back | `flows-layouts`, `simple/app` |
| Motion | team-switch walk, both directions in the air at once, rapid switching, skip on a keypress, phone and reduced motion switch at once, open onto a member, off-screen pop-in; card view fall and shatter, skip, open onto a picked member; fancy animations off (pop in, no fall, no lift); evolve hop (up and down on the sprite); a picked value pops its row; add pops its slot; poof; no animation on team create, duplicate or delete; missing elements | `flows-motion` |
| Persistence | guest load, autosave, burst written once, full storage kept in memory, reload, corrupt storage, account load and save, early load for a returning account, guest merge on sign-in, new account, debounce, failed save, failed load never overwrites, sign-out | `stress-persistence` |
| Data | fixture invariants, learnset/ability/item/training validity, stats, natures, tier tabs, type chart, Showdown round-trip of all 275 sets, every team and a full backup, damaged text, Frustration keeps happiness 255 | `stress-data` |
| Validation | Showdown's validator on every competitive team, counting and attribution, determinism, every offered fix clears its problem, pinned legal and illegal sets | `stress-validator` |
| Store fuzz | 3,000 random actions with invariants after each (a member always on the card included), sets intact while travelling, fill and empty every team, pack all 275 into boxes and back, duplicate and delete all | `stress-store-fuzz` |
| API | library (auth, new account, normalize, migrate, prefer the new library, bad bodies), roles, sets, suggestions (default format, cache headers, fallbacks), validate | `simple/api` |

## Known issues

These are pinned with `it.fails`: the test passes while the bug exists and fails once it is fixed. When you fix one, change `it.fails` to `it` and remove it here.

1. **Picking a move for a tapped slot leaves the phone's editor sheet open** (`flows-mobile`). `pickMove` clears `activeMoveSlot`. MobileApp reads the changed `inspector:slot` key as a new view and reopens the sheet, in the same render where `chosen` closed it. Reproduced in Chrome at 375 px: the sheet stays up on "Moves".
2. **Tailwind's `md` switches at 626 px, but the phone layout switches at 650 px** (`breakpoints`). From 626 to 650 px the phone layout gets desktop `md:` styles: card sprite box, gutters, and touch-sized team buttons.
3. **Reduced motion doesn't reach the stat bars and numbers** (`elastic-slider`). Switching Pokémon still runs the 500 ms slingshot past the value, and `TickNumber` still counts up over 300 ms.
4. **The API routes throw on malformed bodies** (`simple/api`). These requests throw where they should answer 400:
   - `PUT /api/library` with a JSON `null` body
   - `POST /api/validate` with a body that isn't JSON
   - `POST /api/validate` with a member that has no `moves`
