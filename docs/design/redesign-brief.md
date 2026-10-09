# Kingdra work desk redesign brief

Status: editable design system and desktop screens are in progress in [Kingdra Figma](https://www.figma.com/design/Z8k1YOQkQxG4cVpa8UTjFl?node-id=71-2). Application iteration follows the completed Figma design.

Latest visual authority: the user's [IMG_0471.jpg wireframe](/Users/liambsulliva/Downloads/IMG_0471.jpg). Its compact layout supersedes the earlier nested large/small clusters, large official artwork and full-size deck cards wherever they conflict. Agreed behavior and scope remain in force. Follow the Swiss design inspiration in `personal-website-v3` and its associated Figma design; favor precise alignment, compact controls and deliberate whitespace. Figma is now connected and the user has explicitly authorized starting the design through Figma MCP in **liambsullivan's team**, using the **Pro Full seat**. This brief does not claim any redesign frames or node IDs have already been created.

Root verified the reference Figma file `qG8iY9Elr0VlGXyjC84hSX` contains 100 variables and 138 components. Relevant references are its [light Index frame](https://www.figma.com/design/qG8iY9Elr0VlGXyjC84hSX?node-id=16-173) and [CompactNavIcon](https://www.figma.com/design/qG8iY9Elr0VlGXyjC84hSX?node-id=93-3666). These are reference nodes, not newly created Kingdra design nodes.

Evidence and complete existing-functionality inventory: [research audit](../research/redesign-functionality-audit.md).

## Scope

Preserve the current app's 37 supported capabilities and add Showdown-compatible set editing, generation-aware stats and moves, standard-format legality, lossless text import/export, comparisons and reliable persistence. Exclude custom formats, battle/chat/ladder/replay operation and format-aware suggested movesets. Battle teams have six members and four moves. Pokémon-PC-inspired storage boxes are a **stretch goal, not current scope** (Q40). Showdown transfer is **text-style import/export**, with no external publication or Showdown account integration (Q41). Centralize colors, fonts and icons in the Figma design system before constructing screens.

## Desktop work desk

- Header: Kingdra branding, account access and theme control. Mode is a team property, not a global editing switch.
- Left panel: vertically scrolling, name-searchable team library. Each team is a compact **3 × 2 cluster of six equal, padding-free 48 × 48 Pokémon icons** with 2 px gaps, using Blastoise as the visual size reference. Positions follow deck order; there is no seventh member cell or nested large/small geometry. Team name is an editable ghost text box below the cluster, followed by duplicate and delete icons. Tier/generation remains team metadata and belongs in a compact label/settings affordance rather than a seventh icon position.
- Left-panel footer: **+ New** on the left; selected-team Showdown import/export controls on the right. Footer remains reachable while teams scroll. The new-team modal collects name, mode, generation and tier/format; tier/format is enabled conditionally for Competitive. Import creates a new team and preserves existing teams.
- Center: a stable, sparse work desk containing the selected expanded front sprite or carousel preview, its essential identity/details and the four move controls. Comparison places a current member alongside a candidate. The expanded desk view is the sole location that uses a full front sprite; crop transparent source margins so the artwork uses the available 96 × 96 container while preserving its aspect ratio. Poké Balls remain the fallback when imagery is unavailable.
- Deck: a bottom-left-justified row of **six padding-free 48 × 48 member icons**, separated by 2 px, at the bottom of the center desk above the carousel. Clicking a member lifts it onto the desk and leaves a visible reserved skeleton sized to that icon slot. Dragging within the row reorders members and updates cluster positions.
- Right panel: independently scrolling detail inspector. Competitive initially shows **six aligned stat rows/bars**, as in the wireframe; clicking a move in the card replaces inspector content with that move's extended editor. Other expanded card details use the same inspector. Team analysis shows team weaknesses and offensive coverage; a type badge opens individual matchups.
- Bottom panel: a **full-width**, horizontally scrolling Pokémon carousel spanning beneath library, desk and inspector. Filters sit above the cards and search is on the right. Competitive exposes tier and broad species-role filtering; Casual exposes generation filtering and no roles. Compact carousel cards use uniform 48 × 48 Pokémon icons and color-coded types.
- Bottom-right corner: small save-status text to the left of a progress spinner. Show the spinner while saving/syncing, and keep failures actionable without claiming completion prematurely.
- Icon-only controls use the shared **16 × 16 IconButton** component. All IconButton glyphs are fixed black across default, hover, focus, pressed and disabled states, with no colored highlight background.
- Lucide assets on the Icons page retain their **24 × 24 component containers**, while the centered vector artwork itself is **16 × 16**. Component instances preserve that visual artwork size rather than shrinking the artwork a second time.

## Expanded Pokémon card and inspector

- Species/name, sprite and type badges identify the selected card. Keep the center sparse; use the right inspector for extended editors. Showdown set import/export icons with tooltips sit at top right.
- Four moves occupy a bottom-aligned 2 × 2 grid. Its top-right Stats icon restores the Stats view. Clicking a move opens its full metadata and replacement search in the right panel.
- Compact item, ability and other relevant detail affordances open their full editor in the right panel rather than overcrowding the card.
- Competitive Stats supports numeric and slider editing, color-coded bars, base/final values, level and nature effects. Standard formats and generations determine which fields and stat systems apply, including historical restrictions and applicable generation mechanics.
- Details preserves Showdown set fields such as nickname, species/form, gender, shiny, happiness and applicable special-mechanic fields. Fields must be conditional on generation/format rather than displayed as one universal form.
- Casual initially opens **Locations**, and uses the training-control space for encounter information. **Info** groups species facts, forms and read-only base stats. Casual does not expose EV, IV or nature editing or competitive role labels.
- Changing mode or format must not silently destroy stored values. Incompatible existing choices remain editable drafts with field-specific validation errors. Draft export remains possible with a warning.

## Browsing, comparison and hotswap

- Competitive teams choose generation and standard format/tier. The selected tier and lower-tier species are included, subject to the actual format's bans and clauses. Catalogue tiers are not inferred from usage-list membership.
- Casual includes species introduced through the selected generation; Gen 5 includes Gen 1–5 species. That generation also governs moves, abilities, items and stat calculations.
- Competitive roles are broad species labels, not curated format-specific suggested sets. Role filtering is available only in Competitive.
- `Candidate / Mode=Competitive / State=Default`, populated with Kingdra, is the canonical **240 × 90** Candidate structure for spacing, hierarchy, 48 × 48 icon placement and compact type badges. Hover, selected, skeleton and Casual variants inherit that geometry; only their state styling, skeleton visibility and Casual role visibility differ.
- Clicking a carousel card previews it. If a current member is selected, open candidate-versus-member comparison automatically; otherwise show the candidate and a target chooser.
- Compare paired base-stat bars, types, weaknesses/resistances and broad species roles. Clearly label base stats so they are not mistaken for trained final values. Casual comparison omits roles.
- **Add to team** on a preview plays the drag/drop flight without requiring a manual drag. Dragging a candidate into the deck is the direct addition path.
- A seventh addition is rejected: the candidate card bounces away until a member is removed. No automatic replacement or replacement picker is triggered by Add.
- An explicit **Swap** in comparison replaces the targeted member atomically, keeping the team at six or fewer members. Use a fresh generation-valid set: empty moves/item, legal default ability and default stats. Old moves and training values do not carry over. Do not offer Undo.

## Physical interaction and motion

- Team opening adapts `personal-website-v3` photography: press acknowledgement, clearing the old deck, then staggered member flights and landing. Switching teams returns the previous cards to their cluster before the next team opens. Rapid input redirects toward the latest selection.
- Position travel and shell-size springs animate independently. Sprites retain their proportions and small display scale. Compact shells, shadows and controls provide elastic overshoot and squash/stretch; the new wireframe does not call for large flying illustrations.
- Hover motion draws from **CompactNavIcon in the subfolder menu of `personal-website-v3`**: a 420 ms glyph bounce with Y offsets 0 → −7 → +1.5 → −1 → 0 px at 0/28/62/80/100%. Animate the sprite/glyph inside a stable hit target. The reference triggers bounce only for fine-pointer hover at widths ≥768 px; focus reveals the label, and reduced motion cancels animation. Photography remains the opening/return choreography reference. [Verified source and timing](../research/swiss-reference-pivot.md).
- Expanded members return through their reserved deck position, empty desk space or Escape; mobile uses Back. Use the reverse flight.
- The visible skeleton follows the photography **album** marker: muted surface, rounded corners and dashed border, with no text, icon or loading pulse. Size it to the **tiny reserved deck-icon position**. Keep it visible while the member is on the desk, and hand off to the real icon in the same frame at landing.
- Removal is deliberate drag-out: release a deck member in any other panel, then **poof** it out. Merely crossing the boundary does not delete it. Automatic Add/return animations never trigger removal. No visible remove icon or Undo is part of this interaction.
- Proposed accessibility handoff: keyboard-focusable cards, Escape to cancel a drag, a keyboard removal action that executes the same poof, and reduced-motion equivalents preserving every action. These are implementation/accessibility defaults for final review, not separate removal icons.

## Mobile

Expose the full feature set. Use a team-library view, swipeable deck/carousel and a dedicated Pokémon detail screen. Back returns the member to its reserved position. Candidate-versus-member comparison has a dedicated comparison view. Dragging a deck member into the carousel is a reachable removal target; provide equivalent keyboard/assistive actions. Saving status remains at bottom right.

## Palette, typography and persistence

- Cool light surfaces with a matching dark theme; no cream. General highlighted and selected surfaces use **#E7E9E8** by default. Only icon highlights use **#E8F3FE** backgrounds with **#3983F7** colorable glyphs. Pokémon raster artwork keeps its source colors; type badges, stat bars and weakness panels retain their informational colors.
- Typography uses **Stack Sans**, explicitly chosen by the user to replace UDKakuGo. Use **Stack Sans Text** for UI/body copy and **Stack Sans Headline** for branding/headings, the family variants selected by root. Figma's font inventory verifies Text, Headline and Notch in Regular, Medium, SemiBold and Bold. There is no remaining UDKakuGo font dependency.
- Local autosave survives reload; signed-in users sync with Clerk/MongoDB account storage. Preserve guest work during sign-in. Proposed conflict behavior: retain both versions and expose a save-status action for resolution rather than silently replacing either version.
- Team rename, duplication, explicit deletion, imports and member edits save through the same status system. Importing a team creates a new team; existing-team deletion is a separate explicit action. There is no Undo UI.

## Current-functionality destinations

- F01–F06: header, scrolling library, inline cluster labels and new-team/settings modal.
- F07–F09: 48 × 48 icon deck row selection, additions, reorder and drag-out removal; compact icon-sized reserved slots.
- F10–F13: carousel, generation/tier filters, full-catalogue search and loading/error states.
- F14–F20: sparse central sprite card with identity/types and 2 × 2 moves; inspector item/ability/nature/Tera editors, conditionally available by mode/generation.
- F21–F22: six-row Competitive Stats inspector with corrected calculations, budgets and advanced numeric/slider controls.
- F23–F25: Casual Locations/Info and forms.
- F26–F27: team-analysis inspector and individual matchups.
- F28: appropriate generation-aware Smogon/Serebii links in Info/Details.
- F29–F30: left-footer team import as new team and selected-team export.
- F31–F32: card-level individual set import/export.
- F33–F35: account controls, local/cloud persistence, bottom-right save status and compact inline validation/error feedback.
- F36: full-function mobile views.
- F37: retained application metadata/offline shell and peripheral links moved into reachable About/settings content.

## Figma deliverables before application iteration

Create a central Figma design system for colors, fonts, 48 × 48 Pokémon icons, expanded desk sprites and controls before the screens. Then create editable light/dark desktop frames following the user's wireframe and mobile flows for populated/empty libraries, empty/normal/full teams, selected members, candidate previews, comparison/hotswap, Competitive Stats/moves/details, Casual Locations/Info, team analysis, new-team/import dialogs, validation and saving failures. Represent opening/return/add/reorder/removal/rejected-add motion and the reduced-motion path. Every F01–F37 capability must have a visible destination. Storage boxes and Showdown account integration remain excluded.

Figma is connected and design work via Figma MCP is explicitly authorized in liambsullivan's team with the Pro Full seat. Root owns the design writes and records actual file/frame links as they are created. Stack Sans availability is verified in Figma; application implementation still follows the Figma design. The compact Swiss visual pivot preserves the prior 41 agreed interaction and scope answers wherever the wireframe does not replace their geometry.

## Design coverage verification

Frame names alone do not establish visible editing or usable navigation. Before application iteration, verify these destinations in the desktop inspector and equivalent dedicated mobile screens:

- **Competitive Stats:** six base/final rows, level, complete nature chooser with effects, EV/IV numeric and slider inputs, budget/error/reset feedback and retained Speed multiplier information. Show applicable historical DV/shared-Special, Hidden Power, Let's Go AV and Champions-point variants instead of universal modern EV/IV fields. Include spread optimization and low-Attack/low-Speed choices without suggested movesets.
- **Set Details:** independent nickname and species/form selection; generation-valid item and ability search with descriptions and hidden-ability distinction; gender, shiny, happiness, Hidden Power type, Gen 8 Dynamax level/Gigantamax and applicable Tera type. Preserve imported Poké Ball metadata even where live-client editing is unsupported. These fields are conditional on context; Casual hides EV/IV/nature controls and preserves their stored values.
- **Moves:** selected move metadata, type/category, power/accuracy/PP/effect, clear/change actions, generation/format-aware search and unavailable/illegal-result states. Selecting a move replaces inspector content, and Stats restores it.
- **Casual Info/Locations:** every F23 species fact, informative forms gallery plus read-only base stats, generation-relevant encounters with version/chance and loading/empty/error states, and reachable generation-aware Serebii/evolution links. Competitive retains its Smogon link.
- **Analysis/comparison:** complete offensive and defensive type coverage, individual weakness/resistance/immunity multipliers, candidate-versus-selected-member comparison, no-selected-member target chooser, Add versus fresh-set Swap, and Casual comparison without roles.
- **Lifecycle and transfer states:** empty library/team/slots, team search no-results, inline rename errors, duplication/deletion and last-team handling, creation for both modes, team context change with retained invalid draft, team/set text import parse errors and successful destinations, draft-export warning, clipboard success/failure and Validate field errors.
- **Reliability and alternatives:** signed-out/signed-in account access, local saving/syncing/saved/failure/retry and guest/cloud conflict states; catalogue/detail loading/error/no-results and sprite fallback; keyboard/touch reorder, add, return and removal equivalents, full-team rejection, reduced motion, and accessible focus/tooltip states. Reach About/peripheral links and not-found return navigation on both viewport classes.

This is a verification list, not a claim that the in-progress Figma frames omit these controls. It preserves the feature requirements while keeping the center desk sparse, compact Pokémon icons uniformly 48 × 48, and the full front sprite exclusive to the expanded desk view.
