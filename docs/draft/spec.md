# Draft Mode (Experimental) spec

Status: decisions from the interview on 2026-10-15. Figma frames come later (the connector was not authorized in that session); until then this file and the pinned tests are the reference. The stock app (`docs/redesign/spec.md`) must look and behave exactly as before whenever Draft Mode is off.

Reference for the affordances: the 2024 draft planner at commit `97b9fd3` (point budget, tier picker that toggles picks, import/export, clear). Draft Mode rebuilds those inside the Swiss shell.

## 1. Source of truth: the league sheet

- **Google Sheet link first.** Draft Mode asks for a Google Sheets link (shared as "anyone with the link can view"). The app re-reads it so tiers, prices, bans, rules and other coaches' picks follow the league as it changes.
- **Static Excel upload second.** A `.xlsx` upload is allowed, with a warning that it is a snapshot and will not update until a new file is uploaded.
- Google sends no CORS headers, so `/api/draft/sheet` fetches `docs.google.com/spreadsheets/d/{id}/export?format=xlsx` on the server (cached about 60 s per sheet) and parses it. An upload is posted to the same route, so both paths share one parser and return the same JSON.
- **Sync cadence:** on entering Draft Mode, on returning to the tab when the last sync is over a minute old, and from a Sync button that shows "Synced 2 min ago". A static upload never syncs.

### Workbook contract (modeled on the Woodson Drafters 2026 Summer League sheet)

| Tab | What is read |
|---|---|
| `Tiers` | Row 3 holds the tier headers: `Banned`, `Complex Bans`, then point values (30 … 1). Row 4 labels each block `Pokemon`. Names sit in whichever column of the block holds the most Pokémon. `Banned` lists banned species; `Complex Bans` lists species + move/ability pairs. Any Tera columns are ignored. |
| `Dex` | Fallback: `Pokémon` and `Points` (99 = banned) columns from row 16. |
| `Drafts` | Coach blocks: the coach name on the `Coach Info` row, then `Pick n` rows. `Total Points:` cells. Tera marks and `Tera Points:` cells are ignored. |
| `Data` | `Total Points:` budget cells; team names by coach. |
| `Rules` | Free text. The format line ("Champions OU format"), level, item rule, bans ("Baton Pass is Banned") and clauses (OHKO, Species, Sleep on/off, Evasion, Moody). The pick range comes from "You have N points to draft A-B Pokemon". |

- **Pokémon Champions OU only (for now).** The setup dialog says so up front and has no format select: every draft is Champions OU, whatever the Rules tab names. A saved draft in another format is moved to Champions OU on load.
- **No Tera Captains or Tera Points.** Champions can't Terastallize, so the sheet's Tera values, `T` marks and Tera budget are not read, and picks always cost their board points.
- Names are resolved against the dex with aliases (`Tauros-Aqua` → `Tauros-Paldea-Aqua`, `Basculegion-F`) and a close-match fallback for typos (`Halwucha-Mega` → `Hawlucha-Mega`). Anything still unmatched is listed in the dialog and skipped.
- Budgets that disagree (Rules says 85 points, Data/Drafts say 95) are all shown in the dialog, with the cells preferred over the prose, and every value can be edited before confirming.

## 2. Mode

- **Header toggle** "Draft mode (experimental)", just left of Enable fancy animations, on desktop, tablet and phone. Pressed while on, saved per viewer.
- **A separate app mode.** Turning it on swaps the whole workspace to the one draft: its roster and its battle teams. The normal teams library and Box are untouched and come back exactly as they were when it is turned off.
- The first time (no sheet yet) the toggle opens the **Draft setup dialog**: link (or upload, with the static warning), then the parsed league: budget, pick range, coach ("which coach are you?"), unmatched names, and the rules that will and won't be enforced. Confirm enters Draft Mode; Cancel leaves the toggle off.
- Later, the toggle resumes the saved draft at once. **Replace sheet** (Draft board toolbar) reopens the dialog. On confirm the roster is re-priced from the new sheet, and picks it no longer lists, that are now banned or over budget are flagged, not deleted.
- **One draft per user**, saved with the library: guests in this browser, accounts in MongoDB (`library.draft`).

## 3. Roster and teams

- **Roster:** the user's picks. Each entry is a species and its price. Up to the pick limit and within the point budget.
- **Battle teams:** any number of six-member teams, built only from rostered species. Each team member has its own set (moves, EVs, item…), so weekly variants work. All draft teams share the league's format.
- **Balance:** "42 of 95 pts · 6 of 11 picks" in the Draft board toolbar and the Teams panel head.
- **Taken Pokémon are unassignable.** A species another coach drafted can't be drafted, planned or put on a draft team. With "I'm not a coach in this league" selected, nothing is taken: every Pokémon on the board is assignable. If a planned pick gets taken, it is flagged and the sync view suggests releasing it.
- **Release** (undraft): a confirm names the teams that use it. Confirming refunds the points and removes it from those teams (the card hands off to a neighbour, as everywhere).
- **Megas** are priced separately. A drafted Mega puts its base species on the team holding its Mega Stone, locked. A base-form pick holding its own Mega Stone is flagged unless the Mega is also rostered.

## 4. Sync suggestions

- League data updates on every sync with no prompt: tiers, prices, bans, complex bans, rules and clauses, budgets, and who has taken what.
- The roster is the user's own. Where the sheet differs, the app *suggests*, and the user may stay out of sync to pre-plan or pivot:
  - a pick on your Drafts column that isn't on the roster → add it;
  - a planned pick another coach has taken → release it;
  - a pick that was re-priced or newly banned → acknowledge (the price updates automatically; the suggestion explains the change).
- Each suggestion has Accept and Dismiss, and the list has Accept all. A dismissed suggestion stays hidden until that line of the sheet changes again.
- A count badge ("3 changes on the sheet") sits beside the Draft board's Sync button. It opens the **Draft sync** view in the right panel (desktop and tablet) or the editor sheet (phone). Nothing opens on its own and nothing toasts.

## 5. Where things live

| Stock | Draft Mode |
|---|---|
| Teams list | The draft's battle teams; the panel head shows the balance. No mode toggle or format select in the team controls (the league sets the format). |
| Suggestions panel | **Draft board.** Tier tabs are point values ("17 pts", "1 pt"). Banned Pokémon are not on the board at all. Cards show price and Drafted / Taken by <coach> / Can't afford states; unavailable cards are disabled with the reason. Search, role and support filters work over the board. Click drafts a Pokémon; drag onto the party is refused for undrafted Pokémon ("Draft it first"). |
| Box drawer and Box tab | **Roster row.** No drawer: the roster is one horizontally scrolling row of picks on the main screen, between the board's tabs and its cards, with the balance beside it. Each pick shows its price and release. The whole chip is the click and drag target; a pick already on the open team is tinted and keeps that tint on hover. Hovering release darkens its icon only, with no gray fill on it or the chip. Click or drag a pick onto the party to add it to the open team. |
| Inspector | Adds the **Draft sync** view. Item and evolution editors respect the roster and Mega rules. |
| Phone Browse: Suggestions / Box | One view: party row, board filters, the roster row, then the board's cards. |

## 6. Rules enforcement

The validator runs the chosen Showdown format with the league layered on as custom rules (`format@@@rules`, resolved with `Dex.formats.get(…, true)`): banned species, complex bans (`Basculegion + Last Respects`), banned moves from the Rules text (`Baton Pass`), clauses turned on (`OHKO Clause`, `Species Clause`, `Evasion Clause`, `Moody Clause`) or off (`!Sleep Clause Mod`), and the level (`Adjust Level = 50`). The sheet's tiers, not Smogon tiers, decide which species are draftable. Rules the parser doesn't recognise are listed as "not enforced" in the dialog. As in the stock app, flags never block editing or export.

## 7. Blast radius

| Area | Change | Guard |
|---|---|---|
| `model.ts` `Library`, `normalizeLibrary` | Optional `draft` field, normalized on its own. Libraries without it are unchanged byte for byte. | Unit tests for round trips with and without a draft; existing persistence suite. |
| `store.ts` | `draftMode` (per viewer). Entering swaps `library` for the draft workspace and keeps the stock library aside; leaving swaps back. Team actions refuse un-rostered or taken species only while in draft mode. | Store fuzz and every existing flow run with draft mode off; new draft store tests. |
| `hooks.ts` persistence | Saves the composite (stock library + draft) whichever is on screen. | Persistence suite plus a draft round trip, guest and account. |
| `/api/library` | `normalizeLibrary` keeps `draft`. | API tests. |
| `/api/validate` | Optional `rules` array, resolved as Showdown custom rules. Requests without it behave as before. | API tests for both. |
| `/api/draft/sheet` | New: GET by sheet id or link, POST an upload. | API tests with a small fixture workbook. |
| Header (desktop and phone) | One more icon button. | Phone header fits at 320 px; screenshot baselines before and after. |
| Bottom panel, Box drawer, phone Browse | Draft board (with its roster row) rendered only in Draft Mode; the Box drawer isn't rendered there. | Stock flows untouched; layouts tests in both modes. |

## 8. Out of scope

Live multi-user drafting (snake order, timers), writing back to the sheet, transactions and free agency, and schedules or standings.
