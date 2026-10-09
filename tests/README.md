# Tests

Three Vitest projects, defined in `vitest.workspace.ts`:

| Project | Where | What | Run |
| --- | --- | --- | --- |
| unit | `src/**/__tests__` | Colocated library tests | part of both commands |
| simple | `tests/simple` | Fast checks of the model, dex, store, drag rules, API routes and the everyday app flows (~3 s) | `npm run test:simple` (watch: `npm test`) |
| comprehensive | `tests/comprehensive` | The stress suite: every user flow against 32 seeded teams and 100 boxed Pokémon (~15 s) | `npm run test:comprehensive` |

`npm run build` runs the comprehensive suite (which includes unit and simple) before `next build`, so a production build fails if any pinned flow breaks.

## The stress library

`tests/fixtures/library.ts` builds, from a seed:

- **32 teams**, one per context: Gen 9 OU/UU/RU/NU/Ubers/LC/Doubles OU/VGC/Champions OU/Champions BSS/National Dex, Gen 8 OU/National Dex/VGC/Doubles OU, Gen 7 OU/UU/VGC, Gen 6 OU/VGC, Gen 5 OU, Gen 4 OU, Gen 3 OU, Gen 2 OU, Gen 1 OU, and casual Gen 9/8/7/5/4/3/1. Most are full; every fifth is partial.
- **100 Pokémon across 4 PC boxes**, scattered over random slots.
- Every set is random but valid for its context: real learnset moves at its level (1 to 4), a real ability, item and nature, legal EV/Stat Point spreads, and the occasional nickname, gender, shiny, happiness, Poké Ball, Hidden Power, Dynamax or Tera type.

The seed is printed by `stress-data.test.ts`. Replay a run with `STRESS_SEED=<n> npm run test:comprehensive`.

## The test environment

`tests/setup/dom.tsx` runs before the simple and comprehensive files:

- jsdom gets small stand-ins for `<dialog>` (with `close` fired in a later task, as browsers do), Web Animations, `matchMedia`, `ResizeObserver` and the clipboard.
- Clerk and `next/link` are mocked. `tests/helpers/env.ts` exposes `auth` (signed in or out), `setViewport` (phone, tablet, reduced motion), `mockApi` (route fetches by URL fragment, with defaults for every `/api/*` route and PokeAPI), `clipboard` and `seedLocalLibrary`.
- `MotionGlobalConfig.skipAnimations` is on, so exit animations finish and the next view mounts. `flows-motion.test.tsx` turns reduced motion off to run the choreography itself.
- dnd-kit cannot detect collisions without layout, so `flows-drag.test.tsx` renders the real `DragLayer` and drives its `DndContext` handlers with each drop.
- Roles, suggestions and PokeAPI responses are cached per URL for the life of a test file. A test that mocks one of them uses a format or species no earlier test in the file has fetched.

## Flows covered

| Area | Flows | File |
| --- | --- | --- |
| Team library | list, open by click/keyboard/member icon, open team with no skeleton slots, search by name/species/nickname, rename (blur, Enter, Escape, blank), mode toggle, generation and format select, duplicate, copy as Showdown text (empty team, blocked clipboard), two-step delete, legality badge | `flows-library` |
| Dialogs | new team (name, default name, Enter, casual, generation resets format, cancel, close), import team (disabled, no Pokémon, full backup, skipped species, casual fallback format), paste set, delete member, apply fix | `flows-library`, `flows-card`, `flows-inspector` |
| Header | theme, card sprites, sign in, save status (local, saving, saved, not saved), toasts | `flows-library`, `stress-persistence` |
| Card | every member of every team (name, dex number, types, format-specific key rows, four move slots), key rows and move slots open editors, type badge to matchups, shiny, copy, paste, delete, Escape, empty desk, evolution line and branching evolutions, Details, Smogon sets (one, several, none, failure, casual format), support moves | `flows-card` |
| Preview and compare | preview, add, full team, compare against chosen or carded member, swap in a fresh set, close, inspector comparison with roles | `flows-card` |
| Inspector | stats for every competitive member, EV caps, slider keys, resets, IV presets, DVs, Champions Stat Points, speed tiers, Smogon link, tab strip per format, moves (search, type, category, fill, replace, remove, suggestions, Little Cup level), ability, item, nature, Tera, level, Details fields, matchups, team analysis, legality and Fix, Pokédex, locations | `flows-inspector` |
| Suggestions | tier tabs for every team, tiers 60 at a time and load more, BST order, search, role filter, lower and higher generation, Doubles Ubers, casual generations, add and full-team refusal | `flows-browse-box` |
| PC Box | open and close four ways, page all boxes and count 100, move to party, full party, move to box, add, rename, delete, last box | `flows-browse-box` |
| Drag and drop | suggestion to card, party, full party, other team, wrong generation; member out (poof), to card, reorder, to box, to another team, swap on full team, tap vs long-press, from a closed team; evolution stage; box to party and cell; move to slot, swap, off slot; cancel | `flows-drag` |
| Layouts | phone tabs, team summary, browse, box, editor sheet, long-press actions; tablet merged card tab, editors, return to card after a move, compare tab, resize back; switching layouts | `flows-layouts` |
| Motion | team-switch walk, rapid switching, open onto a member, lift, evolve hop, value flight, poof, reduced motion, missing elements | `flows-motion` |
| Persistence | guest load, autosave, reload, corrupt storage, account load and save, guest merge on sign-in, new account, debounce, failed save, failed load never overwrites, sign-out | `stress-persistence` |
| Data | fixture invariants, learnset/ability/item/training validity, stats, natures, tier tabs, type chart, Showdown round-trip of all 275 sets, every team and a full backup, damaged text | `stress-data` |
| Validation | Showdown's validator on every competitive team, counting and attribution, determinism, every offered fix clears its problem, pinned legal and illegal sets | `stress-validator` |
| Store fuzz | 3,000 random actions with invariants after each, sets intact while travelling, fill and empty every team, pack all 275 into boxes and back, duplicate and delete all | `stress-store-fuzz` |

## Known issues

These are pinned with `it.fails`: the test passes while the bug exists and fails once it is fixed. When you fix one, change `it.fails` to `it`.

1. **Frustration loses happiness 255 through Showdown text** (`stress-data`). `exportSet` omits `Happiness: 255`, and Showdown's importer reads a Frustration set without that line as happiness 0.
2. **Full or blocked browser storage crashes the app** (`stress-persistence`). `usePersistence` writes the guest flag with `localStorage.setItem` outside a try/catch, so the error escapes an effect and unmounts the app.
3. **"Paste a Showdown team instead" closes the import dialog** (`flows-library`). The New team dialog's `close` event arrives after the switch, and its `onClose` sets the dialog to null. Reproduced in Chrome: the import dialog closes about 0.7 s after it opens.
4. **Champions OU and UU open the carousel on a tab they don't show** (`flows-browse-box`). The store's default-tab map has no entry for them, so they open on "All": no tab is selected and the list isn't narrowed to the tier.
