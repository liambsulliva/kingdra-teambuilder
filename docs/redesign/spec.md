# Kingdra redesign spec

Status: decisions locked through the UI interview on 2026-10-08, and brought in line with the shipped app and its test suite (`tests/README.md`) on 2026-10-12. Design lives in the [Kingdra Swiss redesign Figma file](https://www.figma.com/design/H8XygLsOxYDmwr881Cxct5). Where this spec and the tests disagree, the tests win; a known bug is pinned there with `it.fails` and listed under Known issues.

## 0. Figma file

| Page | Contents |
|---|---|
| Cover | Index |
| Components | Icons (40 Majesticons, 16 px), IconButton, Tooltip, PokemonSlot, TypeBadge, StatRow, MoveCell, KeyRow, Tab, Select, SearchField, Button, CarouselCard, TeamCard, TeamTile (card view), SaveIndicator and Kingdra silhouette, MoveListRow, Toast, ModeToggle, EvolutionStep |
| Desktop (1440×900) | Competitive / Stats (`9:2`), Team cards (`56:4104`), Move editing (`12:421`), Team analysis (`13:840`), Compare (`14:1149`, removed from the app), Box drawer (`15:1435`), Casual / Pokédex (`18:1874`), New team dialog (`20:2193`), Drag to add (`21:2540`), Stats / Dark (`21:3176`) |
| Mobile (390×844) | Party (`23:2`), Editor sheet (`23:190`), Teams (`24:252`), Browse (`24:505`), Browse › Box (`47:3934`), Empty team (`47:4123`), Long-press action sheet (`24:691`), Support badge tapped (`48:773`), Teams in card view (`56:4791`) |
| Motion | Storyboards with timings (`25:2`); card view open (`58:101`) and switch (`58:423`); save swim (`67:451`) |

Variables: `Primitives`, `Color` (Light/Dark modes), `Layout`. Dark mode is the same frames with the `Color` collection switched to Dark.

Decisions made while designing:

- **Desktop grid:** header 56, left panel 296, right panel 384, bottom panel 236 (toolbar 52 + 164-tall cards), center is whatever remains (760 at 1440 wide).
- **Stat bars:** 8 px tall, full radius, track `#F4F5F7`, bar width = base / 180.
- **Party hover label:** on hover or focus, the caption line under the party row turns into the Pokémon's name and types. Nothing floats over the move grid.
- **Open team control row:** mode icon, format select, then duplicate, export, delete. The legality issue count sits on the name row.
- **Box drawer:** the party row docks on the drawer's top edge, in its workspace column, so box ↔ party drags stay short. Dropping on a full party member swaps it into the box.

The earlier Codex research in `docs/research` and `docs/design` was spot-checked against the source and its feature inventory is accurate. This spec supersedes its layout and interaction decisions wherever they differ.

## 1. Visual language

- **Swiss design.** Strict grid, flush-left text, generous white space. No all-caps anywhere, including labels and buttons.
- **Type.** Stack Sans Text for UI and body copy; Stack Sans Headline for the wordmark and Pokémon names. IBM Plex Mono only for flavor text such as Pokédex numbers (`#230`) and the change lines in the fix dialog; every other number is Stack Sans Text with tabular figures. All three are on Google Fonts.
- **Lines.** 1px `#E4E4E5` hairlines are the only dividers. No cards with shadows and no filled panels.
- **Color.** The chrome is monochrome. Blue is the single accent, used sparingly: selection markers, active tab underline, focus ring, drop-target highlight, the current evolution stage and the primary action. Red (`danger`) is reserved for errors, legality warnings and destructive actions, so they stay readable. Otherwise color comes only from type badges and stat bars.

| Token | Light | Dark |
|---|---|---|
| `bg` | `#FFFFFF` | `#0F0F10` |
| `fg` | `#0A0A0A` | `#F5F5F5` |
| `muted` | `#6B6B70` | `#9A9AA0` |
| `line` | `#E4E4E5` | `#26262A` |
| `hover` | `#F4F4F5` | `#1A1A1D` |
| `accent` (blue) | `#2563EB` | `#6EA8FF` |
| `accent-soft` | `#EAF1FE` | `#142036` |
| `danger` (errors only) | `#EE1515` | `#FF4A4A` |
| `danger-soft` | `#FDECEC` | `#2A1414` |

- **Stat colors.** HP green, Atk yellow, Def orange, SpA cyan, SpD purple, Spe pink. Exact values are set in Figma and checked for contrast on both themes.
- **Type colors.** Keep `src/lib/typeColors.json`, re-checked on dark.
- **Icons.** Majesticons (line variant) everywhere possible. Key-row tabs use trending-up (Level), lightning-bolt (Ability), shopping-bag (Item), heart (Nature), cube (Tera) and clipboard (Moves), rendered at **16×16** in a stable hit target. Fallback set: Lucide. Icon buttons copy personal-website-v3's IconButton: glyph at 80% opacity rising to 100%, a hover fill, and a 13px tooltip below.
- **Light/dark toggle.** 16px sun/moon icon in the header.

## 2. Pokémon imagery

| Use | Source | Size |
|---|---|---|
| Party, team list, Box, evolution row, drag ghost | PokeAPI Gen VIII icons (`versions/generation-viii/icons/{id}.png`, 68×56) | 32×32 |
| Gen 9 species (#906+) and missing forms | Showdown icon sheet (`play.pokemonshowdown.com/sprites/pokemonicons-sheet.png`, 40×30 cells) | 32×32 |
| Expanded card | The header's B/W or X/Y choice. **B/W:** Black/White animated GIFs (`versions/generation-v/black-white/animated/{id}.gif`). **X/Y:** the pixelated 3D models, Showdown's animated sprites (`other/showdown/{id}.gif`), which are also the fallback for B/W gaps (Gen 9, #650+). Then the static sprite and the front sprite. `back/` and `shiny/` follow the viewer's side and shininess. | Up to 96 high, 2× pixelated |
| Carousel cards | PokeAPI `front_default` (96×96) | Trimmed, 64 high |
| Fallback | Poké Ball glyph | Same slot |

**Trim and fill.** The source canvases carry heavy transparent padding: Pikachu is 21×20 inside 68×56, Charizard 44×39. Every icon is cropped to its own alpha bounding box and scaled to fit 32×32, anchored bottom-center, with `image-rendering: pixelated`. Bounding boxes are precomputed by a build script into `src/lib/iconBounds.json`, so the browser never measures images at runtime.

## 3. Desktop layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ◓ Kingdra                                              ⓘ  ◐  ◯ account   │ header
├───────────────┬──────────────────────────────────────┬───────────────────┤
│ Teams  ⌕ ↧ +  │                                      │ Team · Stats · …  │
│               │   Expanded card                      │                   │
│ ▢▢▢▢▢▢        │   sprite / name / types   ⇩ ⇧ ⋯       │  right panel      │
│ Rain team     │   evolution row                      │  (inspector)      │
│ gen 9 · OU    │   Level / Ability / Item / Nature /  │                   │
│ ┄ controls ┄  │   Tera rows                          │                   │
│               │                              stats ▤ │                   │
│ ▢▢▢▢▢▢        │   move 1     │ move 2                │                   │
│ Trick room    │   move 3     │ move 4                │                   │
│               │                                      │                   │
│               │ ▢ ▢ ▢ ▢ ▢   ← party, bottom-left      │                   │
├───────────────┴──────────────────────────────────────┴───────────────────┤
│ Suggestions  gen 9 ▾  Ubers OU UU RU NU PU ZU LC  roles ▾      ▣ box  ⌕   │
│ [card] [card] [card] [card] [card] [card] [card] [card] →                │ carousel
└──────────────────────────────────────────────────────────────────────────┘
```

- **Header.** The Kingdra logo (PokeAPI's front sprite, mirrored, cropped 38×38 around the head; `public/brand/kingdra.png`, also the favicon), vertically centered, plus the "Kingdra" wordmark on the left. On the right, the B/W | X/Y sprite toggle (saved per viewer), then 16px icon buttons: **Enable fancy animations** (a sparkle toggle, pressed while on, on for a new viewer, and saved per viewer only once changed). Turning it off stops the team-switch walk, the card fall and shatter, the jump onto the card, the card-view hinge and the EV bar's stretch; a switch then just pops the new party into its slots, and every other animation stays. Then theme and account (Clerk sign-in or user button; a disabled account button says so when Clerk can't load). There is no about button. Left of them, the save status: a 16px icon and a label ("Saved in this browser", "Saved", "Not saved"), which gives way to the **save swim** on every save: a Kingdra silhouette (PokeAPI's Gen VIII icon, mirrored to swim right, `public/brand/kingdra-silhouette.png`) swimming across a 54×22 track with a trail of bubbles, and no visible label.
- **Left panel, team list.** Scrolls independently. Its text cannot be selected, so a press and drag never shows a text ghost; only the team name and search fields take selection. The panel head reads "Teams" with its count, and icons for card view, search (team names, species and nicknames; the icon closes it and clears the query), import team (paste Showdown text, which creates a new team), and new team.
  - **Card view.** The 2×2 icon (Majesticons applications-line) switches the list to cards, two per row, each with its six icons in a 2×3 grid. It is a toggle shown as selected while cards are on, and the choice is saved per viewer. Switching views keeps the open team. On hover (fine pointer, desktop) a closed card hangs from its top-left corner and snaps down to 4° on a stiff spring, like a loose picture frame; it should feel instant (there in about 70 ms, settled by 300 ms).
  - **Team card.** Six 32×32 icon slots in a row at the top-left, then the team name, then a muted label such as "gen 9 · OU" or "gen 5 · casual".
  - **Open team.** Its icon slots show its members, as the party does, so nothing vanishes when a team opens, and clicking one puts that member on the card. Only empty slots are dashed. The open team sits on a hover-gray fill and is not a button. Its name row carries the legality issue count (competitive teams only). Its **controls** take the place of its format line, beside the name, in the list and in card view: mode (casual/competitive), generation and format, duplicate, export, delete. The line keeps its 16 px height and the 20 px buttons overflow it, so a card never changes height when it opens. In card view the card is too narrow for all of them, so the mode toggle sits on the name row after the legality issue count, and the format label drops its chevron.
  - **Rename.** The team name is a ghost text input.
- **Center workspace.**
  - **Expanded card.** Top-right icons: copy set, paste set, details (competitive only), delete member (after a confirm). A Pokémon dropped anywhere on the card goes onto the card (section 4).
  - **Party row.** Pinned to the **bottom-left** of the workspace, directly above the carousel. It holds 32×32 slots with dashed skeletons for empty team spots. It always shows all six members, the one on the card included, so a member never seems to vanish. Every cell can be dragged from, in the Box drawer and on the phone's Browse tab too.
  - **Always a member on the card.** Once a team has members, one of them is always on the card: the first add puts it there, opening a team brings back the member that was last on its card (remembered per team in this browser, else the first), and removing, boxing or moving the member on the card puts its neighbor there (the member that slides into its slot, else the one before). Esc and clicking the empty workspace never clear the card. The empty state appears only while the team has no members: the team name, its format and size, and on competitive teams its issue count ("No Issues" when clean).
- **Right panel (inspector).** Scrolls independently and shows one view at a time. With no member on the card it shows **Team analysis**. A tab strip of 16px icons switches between views.
- **Bottom panel.** Full width. The toolbar sits above a horizontally scrolling carousel.
  - **Toolbar left.** Generation select. In Competitive: format tiers plus a role filter. In Casual: generations only, no roles.
  - **Toolbar right.** The **Box** icon, then search across the full catalogue (not only loaded cards).
- **Box drawer.** The Box icon slides a drawer up from the screen's bottom edge over the carousel, to about 50% of the viewport. The party row stays visible above it so drags between the two are short. Esc, the icon, or a click outside closes it.

**Tablet, 651–1100px.** The workspace folds into the right panel as its first tab (the party icon), so the team list stays on the left and the panel takes the space the center and right panels shared. The card tab is the default there: selecting, adding a Pokémon or picking a move brings it forward. Editors open as tabs beside it. Drop targets on the card (the card itself, the party row, move cells) exist only while that tab is open. Widening to desktop returns the panel to Team analysis. At 650px and below the mobile layout applies (section 10).

## 4. Expanded card

- **Identity.** Animated sprite, nickname or species name (Stack Sans Headline), type badges. Clicking a type badge opens that member's matchups in the right panel. The sprite is top-aligned with the name beside it and left-aligned with the key row labels, on every device. On a phone the name truncates with an ellipsis, and the dex number and species (when there is a nickname) stay on the name's line, bottom-aligned with it.
- **Evolution row.** 32×32 icons for the whole line (branches included) under the name, with the current stage underlined in blue (accent); clicking it does nothing, and it can be dragged to another team. Clicking another stage switches species and **keeps the whole set**. Anything the new species can't legally use is flagged, not deleted.
- **Key rows.** Two-column label/value list. Clicking a row opens its editor in the right panel.
  - Competitive: Level, Ability, Item, Nature (with +/− stats, or "Neutral"), Tera (shown as its type badge).
  - Casual: Ability, Item.
- **Details icon.** Opens the rarer fields in the right panel (section 7).
- **Moves.** A **2×2 grid aligned to the bottom of the card**. Each cell shows type color, move name, and category glyph with power. Above it, "Load Smogon Set" and the member's support-move badges. Stats opens from the right panel's tab strip; there is no Stats icon on the card. On a phone, the member's legality issues are listed under the grid instead of flagged beside each row.
  - Clicking a cell opens the move list on the right with that slot active.
  - Moves dragged from the list onto a cell replace it.
- **Dropping on the card.** There is no preview or comparison. Any Pokémon dropped on the card (its move slots included) goes onto the card: a party member is selected, and a suggestion, a Box Pokémon or another team's member joins the end of the party and is selected. A full party refuses a newcomer with the bounce and a toast, and the card keeps its member. The card is tinted accent-soft while a drop there would be accepted. Clicking a carousel card adds it directly.
- **Empty state copy.** "Drag a suggestion onto the party, or click one to add it." ("tap" on phones).

## 5. Right panel views

| View | Contents |
|---|---|
| Team (default) | Offensive coverage and defensive weaknesses for 18 types, with the same math as today but immunity-correct. Explanations live in tooltips. Competitive teams also get the legality summary. |
| Stats (Competitive) | Six color-coded bars: base, final, EV and IV numeric and slider controls, nature effect markers, EV budget (510 max, 508 efficient), double-click reset, Speed tier tooltip (+1/Scarf, +2, +3). Generation-aware variants: DVs and shared Special in Gen 1–2, no EVs and IVs in Let's Go formats. |
| Base stats (Casual) | Read-only colored base stat bars and total. |
| Moves | Learnable moves for this species in the team's generation at the Pokémon's level, searchable, with type, category, power, accuracy, PP and short effect. A level-up move is listed only at or below the Pokémon's level; TMs, tutors, eggs and events always are. Each row is draggable. **Click replaces the active slot if one is active, otherwise fills the next empty slot.** |
| Ability, Item, Nature, Tera, Level | Searchable lists with descriptions. Hidden ability is marked. Items are filtered to held items valid in the generation. All 25 natures. Each is also its own tab in the icon bar, shown where the format has that field, so the editor is one click away even without the key row. |
| Details | Nickname, gender, shiny, happiness, Poké Ball, Hidden Power type (Gen 2–7), Dynamax level and Gigantamax (Gen 8), Tera (Gen 9). Fields appear only when the generation and format use them. |
| Matchups | One member's weaknesses, resistances and immunities with ×4, ×2, ×½, ×¼ and ×0 shown. |
| Pokédex (Casual) | Every field from today's species info: dex number, flavor text, generation, gender rate, capture rate, happiness, baby/legendary/mythical, hatch counter, growth rate, egg group, evolves-from. Also cosmetic forms and the Serebii link. |
| Locations (Casual) | Encounter locations with version and chance, plus loading, empty and error states. |
| External link | Smogon (Competitive) or Serebii (Casual), with the URL built from the team's generation. |

## 6. Carousel and Box

- **Carousel card.**
  - Sprite, name, color-coded type badges.
  - In Competitive, the broad roles (wallbreaker, pivot, revenge killer, lead, setup sweeper, wall, hazard setter, hazard removal, support, Trick Room). Roles come from Smogon set names for the team's format and are labeled as heuristics.
  - Click adds to the party. Drag onto a party slot adds there, or onto the card to add it and put it on the card.
  - A full team rejects a click or an empty-slot drop: the card bounces back with a toast. Dropped on a member of a full party, it replaces that member with a fresh set.
- **Box.** One global PC shared by all teams. 30-slot boxes (6×5), up to 32 boxes as in the games (the New box button then reads "PC full: 32 boxes" and is disabled), add, rename (double-click, then Enter or blur) and delete boxes (never the last; the confirm names what it takes with it), page with arrows. Picking a party member in the drawer and pressing Move to box stores it in the box being viewed. Stored Pokémon keep their full sets.
  - Drag party ↔ box both ways.
  - A box Pokémon moved into a team of a different generation or format keeps its set, and anything illegal is flagged.

## 7. Showdown parity, the set model

Each member stores the following fields. The generation and format decide which ones are visible.

- species (forme included) and nickname
- level (1–100)
- gender, shiny, happiness (0–255)
- Poké Ball
- ability, item, nature
- six EVs and six IVs (DVs in Gen 1–2)
- Hidden Power type
- Dynamax level (0–10) and Gigantamax
- Tera type
- four moves (no custom formats: a team has at most 6 members and each has at most 4 moves)

Import and export must be lossless Showdown text, so IVs, level, nickname and gender survive a round trip. Legality checks use Showdown's own validator for the team's format.

Inline flags: a 16px warning glyph sits next to the offending field with the reason in a tooltip, and the team control row shows an issue count. Flags never block editing or export.

## 8. Modes, formats and teams

- **Mode belongs to each team**, chosen in the new-team dialog (name, mode, generation, format) and changeable later from the team's control row. Changing it never wipes stored values. Hidden fields keep their values.
- **Casual.** Choose a generation, and the carousel offers species introduced through that generation. Editable fields are species, ability, item and moves. The right panel adds Pokédex and Locations views.
- **Competitive.** Choose a generation and a format.
  - Formats: Smogon singles Ubers, OU, UU, RU, NU, PU, ZU and LC, plus Doubles OU, VGC and National Dex where that generation has them.
  - The format drives the carousel's tier filter (that tier and the tiers below it) and the legality checks.
  - Tiers come from Showdown's data, not usage-stats scraping.
- **Team import** creates a new team. Single-set import on the card replaces that member's set.
- **Moving between teams.** Drop a member on another team's slot to move it there. On an occupied slot the two swap, even when the team is full.
- **Deleting the last team** is blocked with a message, as today.

## 9. Motion

All motion respects `prefers-reduced-motion`; with it on, everything becomes a crossfade.

| Moment | Spec (starting values, tuned in build) |
|---|---|
| Hover on any Pokémon icon or header icon | personal-website-v3 scare-bounce: 420ms, Y 0 → −7 → +1.5 → −1 → 0 at 0/28/62/80/100%, fine pointer only. |
| Press | Squishy: scale 0.95 over 90ms, release over 460ms `cubic-bezier(.34,2.1,.5,1)`. |
| Open team | Members walk off the team card toward the workspace, rocking ±30° about the bottom-center at 67 ms per step with a 2px bob, staggered 13 ms. Each then hops into its party slot: a fast charge, a slow arc, and a fast landing with a squash. A click or keypress skips to the end. If the team's card is not fully on screen, nothing walks: the new party pops in. |
| Open team, card view | The card lets go of its corner and falls with gravity (4800 px/s², at most 420 ms) onto the top edge of the Suggestions panel, where it shatters into six shards (420 ms) that bounce once and drop out of the window. Its Pokémon jump out of the break into their party slots (440 ms, staggered 20 ms) and land with a squash; the member for the card appears on the card. The card, its members showing, pops back into the team's place in the grid as the card breaks (scale 0.9 → 1.04 → 1, 160 ms). A click or keypress skips the shatter. |
| Switch team, card view | The open party jumps up into the old card's slots (370 ms, staggered 20 ms) while the new card falls, so it shatters with the party still in the air and a switch takes under a second. A click or keypress skips to the end. If the card is not fully on screen, nothing falls: the new party pops in. |
| Switch team | At the same time: the open party hops up and walks home into its card while the new team walks off its card and drops in. If the team was opened from one of its icons, that member waddles into its party slot with the rest and then jumps from there onto the card. Rapid clicks redirect to the latest team. |
| Select member | It jumps up into the card (340 ms; the icon morphs into the card sprite) while its icon stays in its party cell: cells never move. The icon is cloned where it sits, bounce included, before the selection renders, so it never leaves the screen; the card sprite takes over once its art has decoded, in the same frame the clone is removed. |
| Add (drag) | A ghost icon follows the pointer. Valid slots switch from dashed gray to dashed accent (blue), and the slot under the pointer fills accent-soft; an invalid one turns danger. On drop the icon lands with a squash. A full team bounces the card back. |
| Remove | Release a party icon outside the card, the party and the Box and it disappears in a poof. Release it on the Box and it is stored; on the card, it goes onto the card. |
| Box drawer | Slides up with a spring and slides back down. |
| Save | Stop motion: Kingdra swims right in still frames, 400 ms each with no in-betweens, 6 px a frame, tilting ±6° and bobbing 1 px. Each frame leaves a 3 px bubble 2 px behind it, at its own height, that rises 3 px and grows 1 px a frame and pops after three; bubbles are only ever behind it, and a new lap starts with a clean trail. Every save starts it (an account save while in flight, a guest save once written); it stops at the next frame once nothing is saving, after at least two frames (0.8 s), and at once on an error. None with reduced motion. |
| Theme | 200ms color crossfade. |

## 10. Mobile, 650px and below

- **Tabs.** A bottom bar with Teams, Party and Browse.
  - **Teams:** the list or the cards, with the open team's controls in its card as on desktop (28 px buttons). Cards never hinge, fall or shatter on a phone, and a team opens at once. The open team keeps all its icons here, as on desktop, so the list always shows the whole team.
  - **Party:** the card with the party row pinned under it.
  - **Browse:** Suggestions and Box, with search.
- **Editor.** Slides up as a sheet over Party when a key row, a move slot, a type badge (matchups) or More details is tapped. It is 80% of the screen tall on every tab, so it never resizes as tabs change. A choice (a move, ability, item, Tera type, level preset or any other pick) drags it back down to the card; typing a level does not. Dismissing it and tapping the same row opens it again.
- **Safe areas.** The header starts below the status bar and the tab bar keeps its 72 px above the home indicator, so nothing sits under the system UI.
- **Touch.**
  - Long-press picks up an icon for dragging, with the same rules as desktop.
  - Long-press without moving opens an action sheet with the member's name and types: put on the card, move to Box, remove. Only the open team's members have one.
  - Tapping a carousel card adds it.
  - Tapping a party member on the Party tab hops it up onto the card, as on desktop; its icon stays in the row. No selection tile. Nothing animates across tabs: tapping a member on Browse switches to Party with the member already on the card.
  - The caption under the party row shows the member on the card (name and types), or "Party n/6" when the team is empty. Touch never leaves a hover label behind.
  - The editor sheet opens only when a key row, move cell, type badge or More details is tapped. Selecting a member, or opening a team, never opens it.
  - Support badges show their moves on tap; tapping the badge again or anywhere else hides them.
- **Party row on Browse.** The party row sits left-aligned directly under the Suggestions | Box tabs and stays put across both. Long-press drags work both ways: a suggestion or a Box Pokémon onto a slot, a member onto a Box cell. In Suggestions, tapping a member puts it on the card and switches to Party. In Box, tapping a member moves it to the current box, and tapping a Box Pokémon moves it into the party.
- **Empty team.** Under the empty-state message the top four suggestions for the team's tier sit in a 2×2 grid, followed by "See all suggestions", which opens Browse. They disappear once the first member is added.
- **Icons stay loaded.** An icon whose sheet is already cached renders immediately on remount (tab switches), with no skeleton.
  - Tapping a move in the sheet follows the same replace-or-fill rule.
  - On touch screens, draggable icons and rows never select text or call out under a long press.

## 11. Persistence

- Signed-in users keep Clerk auth and MongoDB, with a new schema: teams with id, name, mode, generation, format and members; the box set; theme. The old `pokemonParty`/`teamNames` data is migrated on read.
- Guests save teams and Box to localStorage. On sign-in, local teams are appended to the account and nothing is overwritten.
- Save failures are surfaced, not silent.

## 12. Current features mapped to the redesign

Every existing capability has a new home. Defects noted in `docs/research/redesign-functionality-audit.md` (HP formula, EV total drift, 4 missing natures, Scarlet/Violet-only learnsets, lossy export, broken member DELETE, coverage immunity bug, unpersisted guests, team selector label) are fixed rather than carried over.

| # | Today | Redesign |
|---|---|---|
| F01 | Header logo, mode, new team, team dropdown, auth; mobile hamburger | Header (brand, sprite set, fancy animations, theme, account). Team controls move to the left panel. Mobile: Teams tab. |
| F02 | New team modal (name) | New team dialog: name, mode, generation, format |
| F03 | Team dropdown with name search | Scrolling team list with name search |
| F04 | Rename via pencil | Ghost text input on the team name |
| F05 | Delete team, last team blocked | Delete in the open team's control row, last team blocked |
| F06 | Global casual/competitive toggle | Mode per team, in the dialog and control row |
| F07 | Six party slots, click opens detail | Party row bottom-left, jump-up to card |
| F08 | Click finder card to add; full and duplicate rejected | Click to add, drag to a slot, or drop on the card to add and select; full-team bounce. Duplicates allowed unless the format's Species Clause forbids them, in which case they are flagged. |
| F09 | × on slot removes | Drag out (poof) or into the Box (store); mobile action sheet |
| F10 | Competitive gen dropdown + tier tabs | Carousel toolbar: generation, tiers within the team's format, roles |
| F11 | Casual gen tabs + infinite scroll | Carousel generation filter, horizontal lazy loading |
| F12 | Client-side search over loaded names | Search across the full catalogue at the carousel's top-right |
| F13 | Loaders, error toasts | Skeleton cards, inline errors, toasts |
| F14 | Name, regional naming, animated sprite | Card identity with animated sprite, nickname and species |
| F15 | Type badges with weakness tooltip | Type badges open the Matchups view |
| F16 | Tera select | Tera row and editor (Gen 9) |
| F17 | Ability buttons with hidden marker | Ability row and editor with descriptions |
| F18 | Nature select | Nature row and editor, all 25 |
| F19 | Item search | Item row and editor, generation-aware |
| F20 | Four move inputs | 2×2 move grid and move list (click or drag) |
| F21 | Level input (Competitive) | Level row and editor |
| F22 | Stat bars with EV/IV sliders, Speed tooltip | Stats view (color coded, corrected math) |
| F23 | Casual species info | Pokédex view |
| F24 | Casual encounter locations | Locations view |
| F25 | Casual cosmetic forms | Pokédex view, forms section |
| F26 | Team offensive coverage | Team view |
| F27 | Team defensive weaknesses | Team view |
| F28 | Smogon or Serebii link | Link in Stats or Pokédex, built from the generation |
| F29 | Team import, replaces the open team | Import in the panel head, creates a new team |
| F30 | Team export to clipboard | Export in the open team's control row, lossless |
| F31 | Single-set import | Import icon at the card's top-right |
| F32 | Single-set export | Export icon at the card's top-right, lossless |
| F33 | Clerk + MongoDB autosave | Same, new schema, visible save failures |
| F34 | Guest session (lost on reload) | localStorage, merged on sign-in |
| F35 | Toasts | Restyled toasts |
| F36 | Responsive layout | Tabbed mobile layout with sheets |
| F37 | Footer links, 404, PWA manifest and service worker | Footer links dropped, restyled 404, PWA kept (no service worker) |

## 13. Implementation notes, for after Figma

- **Next.js and Tailwind.** Keep Next.js 16 and React 19. Remove flowbite-react in favor of in-house components, since the Swiss style needs full control.
- **Data.** `@pkmn/dex` and `@pkmn/data` supply species, learnsets, items, abilities, natures, tiers and stat calculation per generation. `@pkmn/sim`'s `Teams` handles text import and export, and its `TeamValidator` runs in an API route. PokeAPI is kept for Casual Pokédex and location data and for all imagery.
- **Motion and drag.** `motion` handles layout animation and the walk/jump paths, and `@dnd-kit` handles accessible drag and drop with keyboard sensors.

## 14. Implementation decisions (second interview)

**Stack**
- Motion handles layout shifts, presence and springs. Web Animations API clones handle the arc flights.
- dnd-kit handles drag and drop, with pointer, long-press touch and keyboard sensors.
- `@pkmn` data is bundled client-side. Showdown's validator runs in `/api/validate`. PokeAPI is used only for images, Pokédex flavor and encounters.
- The old UI, the obsolete API routes and the flowbite, Apollo, axios, react-icons and lodash dependencies are deleted.

**Animation per flow** (any reduced-motion setting turns these into ≤150 ms fades or nothing):

| Flow | Animation |
|---|---|
| Switch team | Brisk, about 0.7 s total. The old party walks home while the new team walks off its card and jumps into the party, both at once. A click or keypress skips to the end. If the team's card is not fully on screen, nothing walks: the new party pops in all at once. On a phone, with reduced motion, or with fancy animations off, nothing walks. |
| Select member | It arcs up onto the card; its icon stays in the row and no cell moves. |
| Pick a move or picker value | Nothing flies. The move cell or key row bounces up with the same pop as a drop. |
| Right panel view change | **None.** |
| Evolve | Hop and swap: the sprite hops (210 ms), swaps species mid-air, and lands with a squash (260 ms). |
| Add by click or Add to team | The new member pops into its party slot, the same pop as a drop. |
| Drag to add / reject / remove | The ghost follows the pointer and lands with a squash. A full team bounces the ghost back. Releasing outside the party poofs the member. |
| Stat edits | Bars glide (300 ms) and final numbers tick. The EV bar is elastic: dragging past either end stretches up to 4 px and springs back on release. The handle stays on the track. Selecting another Pokémon slingshots its bars to their new values: a small pull back, a quick launch a bit past the value, then a settle on it. The overshoot stays on the track, with fancy animations on or off. Any other change (a key, a reset) glides to its place without overshoot. |
| Carousel filter change | Old cards fade out in 100 ms. The new ones rise in chunks of four, 40 ms apart, each fading up over 160 ms. |
| Box drawer and dialogs | The drawer rises with a soft spring, and the party row rides up onto it. Dialogs rise 8 px and fade in 200 ms. Scrims fade. |
| Team create, duplicate, import, delete | **None.** |
| Theme toggle | 200 ms color crossfade. |
| Loading images (sprites and icons) | A gradient skeleton pulses in the photography pages' style until the image loads. The image then fades in over 300 ms. |
| Hover on a Pokémon or icon | personal-website-v3 scare-bounce. |
| Mobile | Tabs switch instantly, and nothing animates across tabs. Sheets spring up and drag down to dismiss. Opening a team jumps to Party at once. |

## 15. PWA

- Kingdra installs as a standalone PWA: `src/app/manifest.ts`, icons in `public/icons` (192, 512, maskable 512), `src/app/apple-icon.png` and `src/app/icon.png`. All are generated from the header logo crop.
- There is **no service worker**. The app is always online. The old cache-first worker served stale HTML for `/`, so returning visitors saw a blank page. `public/sw.js` is now a kill switch: it clears caches and unregisters itself. The root layout also unregisters any remaining registration.
