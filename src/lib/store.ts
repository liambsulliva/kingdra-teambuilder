'use client';

import { create } from 'zustand';
import {
	MAX_BOXES,
	MAX_MOVES,
	MAX_TEAM_SIZE,
	emptyLibrary,
	newBox,
	newSet,
	newTeam,
	uid,
	type Library,
	type Mode,
	type SpriteSet,
	type PokemonSet,
	type Team,
} from './model';
import { abilitiesFor, canUseSpecies, defaultAbility, defaultLevel, formatLabel, formatsForGen, getSpecies } from './dex';
import { acceptable, addRefusal, entriesFor, newRosterEntry, pickState, rosterSet, startDraft, teamRefusal, teamSpecies, type Suggestion } from './draft/draft';
import type { Draft, DraftSettings, League } from './draft/types';

export type InspectorView =
	| 'card'
	| 'team'
	| 'stats'
	| 'moves'
	| 'ability'
	| 'item'
	| 'nature'
	| 'tera'
	| 'level'
	| 'details'
	| 'matchups'
	| 'pokedex'
	| 'locations'
	/** Draft Mode: where the roster differs from the league sheet. */
	| 'draftSync';

/** A legality fix waiting for confirmation in the dialog. */
export interface PendingFix {
	uid: string;
	name: string;
	changes: string[];
	patch: Partial<PokemonSet>;
}

export interface Toast {
	id: string;
	kind: 'success' | 'error';
	message: string;
}

export type SaveStatus = 'local' | 'saving' | 'saved' | 'error';

export interface Validation {
	byMember: Record<string, string[]>;
	team: string[];
	count: number;
}

interface State {
	library: Library;
	hydrated: boolean;
	openTeamId: string;
	selectedUid: string | null;
	inspector: InspectorView;
	/** Tablet width: the workspace is merged into the right panel as its first tab. */
	merged: boolean;
	/** Card art style, saved per viewer. */
	spriteSet: SpriteSet;
	/** The team list as rows or as cards, saved per viewer. */
	teamView: TeamView;
	/** The walk, the card fall and the lift onto the card. Off, a switch just pops the new party in. Saved per viewer. */
	fancyMotion: boolean;
	activeMoveSlot: number | null;
	matchupType: string | null;
	carouselTab: string;
	carouselRole: string;
	/** A support category from SUPPORT, or 'All support'. */
	carouselSupport: string;
	carouselSearch: string;
	/** Browse a lower generation without changing the team's. Null browses the team's own. */
	carouselGen: number | null;
	boxOpen: boolean;
	/** Party member picked inside the open Box. */
	boxPartyUid: string | null;
	boxIndex: number;
	dialog: null | 'newTeam' | 'importTeam' | 'importSet' | 'deleteMember' | 'fix' | 'draftSetup' | 'releasePick';
	pendingFix: PendingFix | null;
	toasts: Toast[];
	save: SaveStatus;
	/** Bumped by every write to this browser. A guest save is instant, so the header watches this to show it. */
	localWrites: number;
	validation: Record<string, Validation>;
	/** Mobile: member whose long-press action sheet is open. */
	mobileActionUid: string | null;
	/** Bumped when an add is rejected so the dragged card can bounce back. */
	rejectedAt: number;
	/** Counts the choices made in the editor (a move, ability, item, Tera type…). A phone closes its editor sheet on each one. */
	chosen: number;
	/** The member last on each team's card, by team id, saved per viewer. */
	lastSelected: Record<string, string>;
	/**
	 * Draft Mode is on. `library` is then the draft's workspace: its battle teams, with the draft in
	 * `library.draft`. The stock library waits in `stock`, untouched, until Draft Mode is turned off.
	 */
	draftMode: boolean;
	stock: { library: Library; openTeamId: string } | null;
	/** The last sync, read for "Synced N min ago". `at` is when the sheet was last read, changed or not. */
	draftSync: { status: 'idle' | 'syncing' | 'error'; message?: string; at?: number };
	/** Roster entry waiting on the release confirm. */
	pendingRelease: string | null;
}

interface Actions {
	hydrate(library: Library): void;
	toast(kind: Toast['kind'], message: string): void;
	dismissToast(id: string): void;
	setSave(status: SaveStatus): void;
	noteLocalWrite(): void;
	setDialog(dialog: State['dialog']): void;
	setMerged(merged: boolean): void;
	setSpriteSet(spriteSet: SpriteSet): void;
	setTeamView(teamView: TeamView): void;
	setFancyMotion(fancyMotion: boolean): void;
	proposeFix(fix: PendingFix): void;
	applyFix(): void;
	setValidation(teamId: string, v: Validation): void;

	createTeam(partial: Partial<Team>): void;
	openTeam(id: string): void;
	renameTeam(id: string, name: string): void;
	setTeamContext(id: string, ctx: { mode?: Mode; gen?: number; format?: string }): void;
	duplicateTeam(id: string): void;
	deleteTeam(id: string): void;
	addTeams(teams: Team[]): void;

	selectMember(uid: string | null): void;
	addMember(species: string, index?: number): boolean;
	addMemberToTeam(teamId: string, species: string, index?: number): boolean;
	removeMember(uid: string): void;
	reorderMember(uid: string, index: number): void;
	moveMemberToTeam(uid: string, fromTeamId: string, toTeamId: string, index?: number, species?: string): boolean;
	updateSet(uid: string, patch: Partial<PokemonSet>): void;
	replaceSet(uid: string, set: PokemonSet): void;
	changeSpecies(uid: string, species: string): void;
	setMove(uid: string, slot: number, move: string): void;
	pickMove(move: string): void;

	setInspector(view: InspectorView, slot?: number | null): void;
	chose(): void;
	setMatchupType(type: string | null): void;
	setCarousel(patch: Partial<Pick<State, 'carouselTab' | 'carouselRole' | 'carouselSupport' | 'carouselSearch' | 'carouselGen'>>): void;

	setBoxOpen(open: boolean): void;
	setBoxPartyUid(uid: string | null): void;
	setBoxIndex(index: number): void;
	addBox(): void;
	renameBox(index: number, name: string): void;
	deleteBox(index: number): void;
	storeInBox(uid: string, boxIndex?: number, slot?: number): void;
	takeFromBox(boxIndex: number, slot: number, partyIndex?: number): void;
	moveInBox(fromBox: number, fromSlot: number, toBox: number, toSlot: number): void;

	setDraftMode(on: boolean): void;
	/** Starts the draft from a confirmed setup, or re-reads it against a new sheet, and enters Draft Mode. */
	confirmDraft(league: League, settings: DraftSettings): void;
	/** A sync: league data replaces the old at once. The roster is left to the user. */
	syncLeague(league: League): void;
	setDraftSync(sync: State['draftSync']): void;
	draftPick(species: string): boolean;
	releasePick(uid: string): void;
	confirmRelease(): void;
	acceptSuggestion(suggestion: Suggestion): void;
	acceptAllSuggestions(suggestions: Suggestion[]): void;
	dismissSuggestion(suggestion: Suggestion): void;
}

export type Store = State & Actions;

const first = emptyLibrary();

const SPRITE_KEY = 'kingdra.sprites';

/** The saved card-art style. Black/White when nothing is saved or storage is blocked. */
export function readSpriteSet(): SpriteSet {
	try {
		return localStorage.getItem(SPRITE_KEY) === 'xy' ? 'xy' : 'bw';
	} catch {
		return 'bw';
	}
}

export type TeamView = 'list' | 'cards';

const VIEW_KEY = 'kingdra.teamView';

/** The saved team list view. The list when nothing is saved or storage is blocked. */
export function readTeamView(): TeamView {
	try {
		return localStorage.getItem(VIEW_KEY) === 'cards' ? 'cards' : 'list';
	} catch {
		return 'list';
	}
}

const MOTION_KEY = 'kingdra.fancyMotion';

/** Whether fancy animations are on. On when nothing is saved or storage is blocked. */
export function readFancyMotion(): boolean {
	try {
		return localStorage.getItem(MOTION_KEY) !== 'off';
	} catch {
		return true;
	}
}

const DRAFT_KEY = 'kingdra.draftMode';

/** Whether Draft Mode was on when this viewer left. Off when nothing is saved or storage is blocked. */
export function readDraftMode(): boolean {
	try {
		return localStorage.getItem(DRAFT_KEY) === 'on';
	} catch {
		return false;
	}
}

const writeDraftMode = (on: boolean) => {
	try {
		localStorage.setItem(DRAFT_KEY, on ? 'on' : 'off');
	} catch {
		// Storage can be full or blocked; the mode still applies for this visit.
	}
};

/**
 * The library to save. Outside Draft Mode it is `library` itself. In Draft Mode it is the stock library with
 * the live draft folded in, so saving never writes the workspace over the user's teams.
 */
export function savedLibrary(s: Pick<State, 'library' | 'stock' | 'openTeamId'>): Library {
	if (!s.stock || !s.library.draft) return s.library;
	return { ...s.stock.library, updatedAt: s.library.updatedAt, draft: { ...s.library.draft, teams: s.library.teams, openTeamId: s.openTeamId } };
}

const LAST_KEY = 'kingdra.lastSelected';

/** The member last on each team's card. Empty when nothing is saved or storage is blocked. */
export function readLastSelected(): Record<string, string> {
	try {
		const parsed = JSON.parse(localStorage.getItem(LAST_KEY) ?? '{}');
		return parsed && typeof parsed === 'object' ? parsed : {};
	} catch {
		return {};
	}
}

/** The member a team opens on: the one last on its card, else its first. */
const pickFor = (team: Team | undefined, last: Record<string, string>) =>
	team ? (team.members.find((m) => m.uid === last[team.id]) ?? team.members[0])?.uid ?? null : null;

/** Where the right panel rests: the team analysis, or the card when the workspace is merged into it. */
const restView = (s: Pick<State, 'merged'>): InspectorView => (s.merged ? 'card' : 'team');

const touch = (library: Library): Library => ({ ...library, updatedAt: Date.now() });

export const useStore = create<Store>()((set, get) => {
	const openTeam = () => get().library.teams.find((t) => t.id === get().openTeamId) ?? get().library.teams[0];
	// In the merged panel the move list would hide the card a move just landed on, so the card comes back.
	const cardIfMerged = () => {
		if (get().merged) set({ inspector: 'card' });
	};

	const updateTeam = (id: string, fn: (team: Team) => Team) =>
		set((s) => ({ library: touch({ ...s.library, teams: s.library.teams.map((t) => (t.id === id ? fn(t) : t)) }) }));

	const updateMember = (memberUid: string, fn: (m: PokemonSet) => PokemonSet) => {
		const team = openTeam();
		updateTeam(team.id, (t) => ({ ...t, members: t.members.map((m) => (m.uid === memberUid ? fn(m) : m)) }));
	};

	/** Puts a member on the card without changing the right panel, and remembers it for the team. */
	const focus = (memberUid: string) => {
		const team = openTeam();
		const lastSelected = { ...get().lastSelected, [team.id]: memberUid };
		try {
			localStorage.setItem(LAST_KEY, JSON.stringify(lastSelected));
		} catch {
			// Storage can be full or blocked; the selection still applies for this visit.
		}
		set({ selectedUid: memberUid, activeMoveSlot: null, lastSelected });
	};

	/**
	 * Once a team has members one is always on the card. When the member on the
	 * card has left the team, its neighbor takes over: the member now at `index`,
	 * else the one before it.
	 */
	const settle = (index = 0) => {
		const team = openTeam();
		const { selectedUid } = get();
		if (selectedUid && team.members.some((m) => m.uid === selectedUid)) return;
		const next = team.members[index] ?? team.members[index - 1] ?? team.members[0];
		if (next) focus(next.uid);
		else if (selectedUid) get().selectMember(null);
	};
	const indexOf = (memberUid: string) => openTeam().members.findIndex((m) => m.uid === memberUid);

	const freshSet = (team: Team, species: string) => {
		const s = getSpecies(team, species);
		const draft = get().draftMode ? get().library.draft : undefined;
		const set = newSet(s?.name ?? species, { ability: defaultAbility(team, species), level: draft?.league.rules.level ?? defaultLevel(team) });
		return draft ? rosterSet(draft, set) : set;
	};

	/** In Draft Mode, refuses a species the roster doesn't allow on a team, with a toast. True when refused. */
	const refuseInDraft = (species: string) => {
		const draft = get().draftMode ? get().library.draft : undefined;
		const why = draft && teamRefusal(draft, getSpecies(openTeam(), species)?.name ?? species);
		if (!why) return false;
		set({ rejectedAt: Date.now() });
		get().toast('error', why);
		return true;
	};

	const updateDraft = (fn: (draft: Draft) => Draft) =>
		set((s) => (s.library.draft ? { library: touch({ ...s.library, draft: fn(s.library.draft) }) } : {}));

	/** Swaps the workspace to the draft, keeping the stock library aside. Leaves updatedAt alone, so nothing is saved. */
	const enterDraft = () => {
		const s = get();
		const draft = s.library.draft;
		if (!draft || s.stock) return;
		const team = draft.teams.find((t) => t.id === draft.openTeamId) ?? draft.teams[0];
		set({
			stock: { library: s.library, openTeamId: s.openTeamId },
			draftMode: true,
			library: { ...s.library, teams: draft.teams },
			openTeamId: team.id,
			selectedUid: pickFor(team, s.lastSelected),
			inspector: restView(s),
			activeMoveSlot: null,
			boxOpen: false,
			boxPartyUid: null,
			mobileActionUid: null,
			carouselTab: 'All',
			carouselRole: 'All roles',
			carouselSupport: 'All support',
			carouselSearch: '',
			carouselGen: null,
		});
	};

	const leaveDraft = () => {
		const s = get();
		if (!s.stock) return set({ draftMode: false });
		const library = savedLibrary(s);
		const team = library.teams.find((t) => t.id === s.stock!.openTeamId) ?? library.teams[0];
		set({
			draftMode: false,
			stock: null,
			library,
			openTeamId: team.id,
			selectedUid: pickFor(team, s.lastSelected),
			inspector: restView(s),
			activeMoveSlot: null,
			boxOpen: false,
			boxPartyUid: null,
			mobileActionUid: null,
			carouselTab: getTiersDefault(team) ?? 'OU',
			carouselRole: 'All roles',
			carouselSupport: 'All support',
			carouselSearch: '',
			carouselGen: null,
		});
	};

	/** Takes roster entries off the roster, and their members off every draft team that has no other pick for them. */
	const dropPicks = (uids: string[]) => {
		const s = get();
		const draft = s.library.draft;
		if (!draft) return;
		const roster = draft.roster.filter((r) => !uids.includes(r.uid));
		const next = { ...draft, roster };
		const at = indexOf(s.selectedUid ?? '');
		const teams = s.library.teams.map((t) => ({ ...t, members: t.members.filter((m) => entriesFor(next, m.species).length || !draft.roster.some((r) => uids.includes(r.uid) && teamSpecies(r.species) === m.species)) }));
		set({ library: touch({ ...s.library, teams, draft: next }) });
		settle(Math.max(0, at));
	};

	return {
		library: first,
		hydrated: false,
		openTeamId: first.teams[0].id,
		selectedUid: null,
		inspector: 'team',
		merged: false,
		spriteSet: readSpriteSet(),
		teamView: readTeamView(),
		fancyMotion: readFancyMotion(),
		activeMoveSlot: null,
		matchupType: null,
		carouselTab: 'OU',
		carouselRole: 'All roles',
		carouselSupport: 'All support',
		carouselGen: null,
		carouselSearch: '',
		boxOpen: false,
		boxPartyUid: null,
		boxIndex: 0,
		dialog: null,
		pendingFix: null,
		toasts: [],
		save: 'local',
		localWrites: 0,
		validation: {},
		rejectedAt: 0,
		chosen: 0,
		mobileActionUid: null,
		lastSelected: readLastSelected(),
		draftMode: false,
		stock: null,
		draftSync: { status: 'idle' },
		pendingRelease: null,

		hydrate: (library) => {
			const resume = get().draftMode || readDraftMode();
			set((s) => {
				const open = library.teams.find((t) => t.id === (s.stock?.openTeamId ?? s.openTeamId)) ?? library.teams[0];
				// The carousel opens on a tab the open team has: a casual team has no OU tab.
				return { library, stock: null, draftMode: false, hydrated: true, openTeamId: open.id, selectedUid: pickFor(open, s.lastSelected), carouselTab: getTiersDefault(open) ?? s.carouselTab };
			});
			// Draft Mode comes back on with the page when the library holds a draft to resume.
			if (resume && library.draft) enterDraft();
			else if (resume) writeDraftMode(false);
		},
		toast: (kind, message) => {
			const id = uid();
			set((s) => ({ toasts: [...s.toasts.slice(-2), { id, kind, message }] }));
			setTimeout(() => get().dismissToast(id), 4000);
		},
		dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
		setSave: (save) => set({ save }),
		noteLocalWrite: () => set((s) => ({ localWrites: s.localWrites + 1 })),
		setDialog: (dialog) => set({ dialog }),
		setSpriteSet: (spriteSet) => {
			try {
				localStorage.setItem(SPRITE_KEY, spriteSet);
			} catch {
				// Storage can be full or blocked; the choice still applies for this visit.
			}
			set({ spriteSet });
		},
		setTeamView: (teamView) => {
			try {
				localStorage.setItem(VIEW_KEY, teamView);
			} catch {
				// Storage can be full or blocked; the choice still applies for this visit.
			}
			set({ teamView });
		},
		setFancyMotion: (fancyMotion) => {
			try {
				localStorage.setItem(MOTION_KEY, fancyMotion ? 'on' : 'off');
			} catch {
				// Storage can be full or blocked; the choice still applies for this visit.
			}
			set({ fancyMotion });
		},
		// Entering the merged layout from its rest view lands on the card; leaving it returns the card to the team view.
		setMerged: (merged) =>
			set((s) => ({
				merged,
				inspector: merged && s.inspector === 'team' ? 'card' : !merged && s.inspector === 'card' ? 'team' : s.inspector,
			})),
		proposeFix: (fix) => set({ pendingFix: fix, dialog: 'fix' }),
		applyFix: () => {
			const fix = get().pendingFix;
			if (!fix) return;
			get().updateSet(fix.uid, fix.patch);
			set({ pendingFix: null, dialog: null });
			get().toast('success', `Applied the fix to ${fix.name}`);
		},
		setValidation: (teamId, v) => set((s) => ({ validation: { ...s.validation, [teamId]: v } })),

		createTeam: (partial) => {
			const draft = get().draftMode ? get().library.draft : undefined;
			// Every draft team is competitive, in the league's format.
			const team = newTeam(draft ? { ...partial, mode: 'competitive', gen: 9, format: draft.settings.format } : partial);
			set((s) => ({ library: touch({ ...s.library, teams: [...s.library.teams, team] }), dialog: null }));
			get().openTeam(team.id);
		},
		openTeam: (id) =>
			set((s) => {
				const team = s.library.teams.find((t) => t.id === id);
				const tab = team?.mode === 'casual' ? 'All' : (getTiersDefault(team) ?? s.carouselTab);
				return {
					openTeamId: id,
					selectedUid: pickFor(team, s.lastSelected),
					inspector: restView(s),
					activeMoveSlot: null,
					carouselTab: tab,
					carouselRole: 'All roles',
					carouselSupport: 'All support',
					carouselGen: null,
				};
			}),
		renameTeam: (id, name) => updateTeam(id, (t) => ({ ...t, name: name.trim() || t.name })),
		setTeamContext: (id, ctx) => {
			// The league sets a draft team's mode and format.
			if (get().draftMode) return;
			updateTeam(id, (t) => {
				const next = { ...t, ...ctx };
				// Keep the format valid for the generation; fall back to its OU.
				if (next.mode === 'competitive' && !formatsForGen(next.gen).some((f) => f.id === next.format))
					next.format = formatsForGen(next.gen).find((f) => f.name === 'OU')?.id ?? formatsForGen(next.gen)[0].id;
				return next;
			});
			const team = get().library.teams.find((t) => t.id === id);
			set({ carouselTab: team?.mode === 'casual' ? 'All' : (getTiersDefault(team) ?? 'OU'), carouselGen: null });
		},
		duplicateTeam: (id) => {
			const src = get().library.teams.find((t) => t.id === id);
			if (!src) return;
			const copy: Team = {
				...src,
				id: uid(),
				name: `${src.name} copy`,
				members: src.members.map((m) => ({ ...m, uid: uid() })),
			};
			set((s) => {
				const i = s.library.teams.findIndex((t) => t.id === id);
				const teams = [...s.library.teams];
				teams.splice(i + 1, 0, copy);
				return { library: touch({ ...s.library, teams }) };
			});
			get().toast('success', `Duplicated ${src.name}`);
		},
		deleteTeam: (id) => {
			const { library } = get();
			if (library.teams.length <= 1) {
				get().toast('error', "You can't delete the last team");
				return;
			}
			const i = library.teams.findIndex((t) => t.id === id);
			const teams = library.teams.filter((t) => t.id !== id);
			set({ library: touch({ ...library, teams }) });
			if (get().openTeamId === id) get().openTeam(teams[Math.max(0, i - 1)].id);
		},
		addTeams: (incoming) => {
			let teams = incoming;
			const draft = get().draftMode ? get().library.draft : undefined;
			if (draft) {
				// Imported into a draft, a team keeps only rostered Pokémon and takes the league's format.
				let skipped = 0;
				teams = incoming.map((t) => {
					const members = t.members.filter((m) => !teamRefusal(draft, m.species));
					skipped += t.members.length - members.length;
					return { ...t, mode: 'competitive' as const, gen: 9, format: draft.settings.format, members };
				});
				if (skipped) get().toast('error', `Left out ${skipped} Pokémon that ${skipped === 1 ? "isn't" : "aren't"} on your roster`);
			}
			if (!teams.length) return;
			set((s) => ({ library: touch({ ...s.library, teams: [...s.library.teams, ...teams] }) }));
			get().openTeam(teams[teams.length - 1].id);
		},

		selectMember: (memberUid) => {
			// A member without an ability gets the first available one.
			const picked = memberUid ? openTeam().members.find((m) => m.uid === memberUid) : undefined;
			if (picked && !picked.ability) {
				const ability = defaultAbility(openTeam(), picked.species);
				if (ability) updateMember(picked.uid, (m) => ({ ...m, ability }));
			}
			if (memberUid) focus(memberUid);
			set((s) => ({
				selectedUid: memberUid,
				activeMoveSlot: null,
				inspector: s.merged ? 'card' : memberUid
					? openTeam().mode === 'casual'
						? 'pokedex'
						: s.inspector === 'team' || s.inspector === 'pokedex' || s.inspector === 'locations'
							? 'stats'
							: s.inspector
					: 'team',
			}));
		},
		addMember: (species, index) => {
			if (refuseInDraft(species)) return false;
			const team = openTeam();
			if (team.members.length >= MAX_TEAM_SIZE) {
				// Dropped on a member of a full team: take its place.
				if (index !== undefined && team.members[index]) {
					const old = team.members[index];
					updateTeam(team.id, (t) => ({ ...t, members: t.members.map((m) => (m.uid === old.uid ? { ...freshSet(t, species), uid: old.uid } : m)) }));
					cardIfMerged();
					return true;
				}
				set({ rejectedAt: Date.now() });
				get().toast('error', `${team.name} is full: remove a member first`);
				return false;
			}
			const member = freshSet(team, species);
			updateTeam(team.id, (t) => {
				const members = [...t.members];
				members.splice(index ?? members.length, 0, member);
				return { ...t, members };
			});
			if (!get().selectedUid) focus(member.uid);
			cardIfMerged();
			return true;
		},
		addMemberToTeam: (teamId, species, index) => {
			if (teamId === get().openTeamId) return get().addMember(species, index);
			const team = get().library.teams.find((t) => t.id === teamId);
			if (!team) return false;
			if (refuseInDraft(species)) return false;
			if (!canUseSpecies(team, species)) {
				get().toast('error', `${species} can't be used in ${team.name} (${formatLabel(team)})`);
				return false;
			}
			if (team.members.length >= MAX_TEAM_SIZE) {
				const old = index !== undefined ? team.members[index] : undefined;
				if (!old) {
					get().toast('error', `${team.name} is full`);
					return false;
				}
				updateTeam(team.id, (t) => ({ ...t, members: t.members.map((m) => (m.uid === old.uid ? { ...freshSet(t, species), uid: old.uid } : m)) }));
				get().toast('success', `${species} replaced ${old.name || old.species} in ${team.name}`);
				return true;
			}
			const member = freshSet(team, species);
			updateTeam(team.id, (t) => {
				const members = [...t.members];
				members.splice(Math.min(index ?? members.length, members.length), 0, member);
				return { ...t, members };
			});
			get().toast('success', `${species} added to ${team.name}`);
			return true;
		},
		removeMember: (memberUid) => {
			const team = openTeam();
			const at = indexOf(memberUid);
			updateTeam(team.id, (t) => ({ ...t, members: t.members.filter((m) => m.uid !== memberUid) }));
			settle(at);
		},
		reorderMember: (memberUid, index) => {
			const team = openTeam();
			updateTeam(team.id, (t) => {
				const members = [...t.members];
				const from = members.findIndex((m) => m.uid === memberUid);
				if (from < 0) return t;
				const [m] = members.splice(from, 1);
				members.splice(Math.min(index, members.length), 0, m);
				return { ...t, members };
			});
		},
		/**
		 * Moves a member to another team with its set. With `species`, it arrives as
		 * that evolution, as if it had been switched on the card first. Dropped on an
		 * occupied slot, the two swap: the member there goes to the source team, into
		 * the place the moved member left. Refused when the target is full and the
		 * drop is not on one of its members, or when it cannot field that species.
		 */
		moveMemberToTeam: (memberUid, fromTeamId, toTeamId, index, species) => {
			const { library } = get();
			const from = library.teams.find((t) => t.id === fromTeamId);
			const to = library.teams.find((t) => t.id === toTeamId);
			const member = from?.members.find((m) => m.uid === memberUid);
			if (!from || !to || !member || from.id === to.id) return false;
			const evolves = !!species && species !== member.species;
			if (evolves && refuseInDraft(species)) return false;
			if (evolves && !canUseSpecies(to, species)) {
				get().toast('error', `${species} can't be used in ${to.name} (${formatLabel(to)})`);
				return false;
			}
			// A drop on an occupied slot swaps the two, full team or not. Otherwise the target needs room.
			const displaced = index !== undefined ? to.members[index] : undefined;
			if (!displaced && to.members.length >= MAX_TEAM_SIZE) {
				set({ rejectedAt: Date.now() });
				get().toast('error', `${to.name} is full: remove a member first`);
				return false;
			}
			const moved = evolves ? asSpecies(to, member, species) : member;
			const at = indexOf(memberUid);
			const teams = library.teams.map((t) => {
				if (t.id === from.id)
					return { ...t, members: displaced ? t.members.map((m) => (m.uid === memberUid ? displaced : m)) : t.members.filter((m) => m.uid !== memberUid) };
				if (t.id !== to.id) return t;
				const members = [...t.members];
				if (displaced) members[index!] = moved;
				else members.splice(Math.min(index ?? members.length, members.length), 0, moved);
				return { ...t, members };
			});
			set({ library: touch({ ...library, teams }) });
			// A member swapped into the open team takes the card when the one on it left.
			if (displaced && from.id === get().openTeamId && get().selectedUid === memberUid) focus(displaced.uid);
			settle(Math.max(0, at));
			const name = (m: PokemonSet) => m.name || m.species;
			get().toast('success', displaced ? `${name(moved)} swapped with ${name(displaced)}` : `${name(moved)} moved to ${to.name}`);
			return true;
		},
		updateSet: (memberUid, patch) => updateMember(memberUid, (m) => ({ ...m, ...patch })),
		replaceSet: (memberUid, next) => {
			if (refuseInDraft(next.species)) return;
			updateMember(memberUid, () => ({ ...next, uid: memberUid }));
		},
		changeSpecies: (memberUid, species) => {
			// In Draft Mode a member only switches to another stage that is also on the roster.
			if (refuseInDraft(species)) return;
			updateMember(memberUid, (m) => asSpecies(openTeam(), m, species));
		},
		setMove: (memberUid, slot, move) =>
			updateMember(memberUid, (m) => {
				const moves = [...m.moves];
				while (moves.length < MAX_MOVES) moves.push('');
				const existing = moves.indexOf(move);
				if (move && existing >= 0 && existing !== slot) moves[existing] = moves[slot];
				moves[slot] = move;
				return { ...m, moves: moves.slice(0, MAX_MOVES) };
			}),
		pickMove: (move) => {
			const { selectedUid, activeMoveSlot } = get();
			if (!selectedUid) return;
			const member = openTeam().members.find((m) => m.uid === selectedUid);
			if (!member) return;
			// Picking a move that is already set takes it off.
			if (member.moves.includes(move)) {
				const slot = member.moves.indexOf(move);
				updateMember(selectedUid, (m) => ({ ...m, moves: m.moves.map((x, i) => (i === slot ? '' : x)) }));
				return;
			}
			if (activeMoveSlot !== null) {
				get().setMove(selectedUid, activeMoveSlot, move);
				set({ activeMoveSlot: null });
				cardIfMerged();
				return;
			}
			const padded = [...member.moves, '', '', '', ''].slice(0, MAX_MOVES);
			const empty = padded.findIndex((m) => !m);
			if (empty < 0) {
				get().toast('error', 'All four moves are set. Click a move slot to replace it');
				return;
			}
			get().setMove(selectedUid, empty, move);
			cardIfMerged();
		},

		setInspector: (view, slot = null) => set({ inspector: view, activeMoveSlot: view === 'moves' ? slot : null }),
		chose: () => set((s) => ({ chosen: s.chosen + 1 })),
		setMatchupType: (matchupType) => set({ matchupType, inspector: 'matchups' }),
		setCarousel: (patch) => set(patch),

		setBoxOpen: (boxOpen) => set({ boxOpen, boxPartyUid: null }),
		setBoxPartyUid: (boxPartyUid) => set({ boxPartyUid }),
		setBoxIndex: (boxIndex) => set({ boxIndex }),
		addBox: () => {
			if (get().library.boxes.length >= MAX_BOXES) {
				get().toast('error', `Your PC is full: ${MAX_BOXES} boxes`);
				return;
			}
			set((s) => ({
				library: touch({ ...s.library, boxes: [...s.library.boxes, newBox(`Box ${s.library.boxes.length + 1}`)] }),
				boxIndex: s.library.boxes.length,
			}));
		},
		renameBox: (index, name) =>
			set((s) => ({
				library: touch({
					...s.library,
					boxes: s.library.boxes.map((b, i) => (i === index ? { ...b, name: name.trim() || b.name } : b)),
				}),
			})),
		deleteBox: (index) => {
			const { library } = get();
			if (library.boxes.length <= 1) {
				get().toast('error', "You can't delete the last box");
				return;
			}
			const name = library.boxes[index]?.name;
			const boxes = library.boxes.filter((_, i) => i !== index);
			set((s) => ({ library: touch({ ...library, boxes }), boxIndex: Math.min(s.boxIndex > index ? s.boxIndex - 1 : s.boxIndex, boxes.length - 1) }));
			get().toast('success', `Deleted ${name}`);
		},
		storeInBox: (memberUid, boxIndex, slot) => {
			// The Box belongs to the stock library; Draft Mode has its roster instead.
			if (get().draftMode) return;
			const team = openTeam();
			const member = team.members.find((m) => m.uid === memberUid);
			if (!member) return;
			const { library } = get();
			const bi = boxIndex ?? get().boxIndex;
			let target = slot ?? library.boxes[bi]?.slots.findIndex((x) => !x) ?? -1;
			let boxes = library.boxes;
			let useBox = bi;
			if (target < 0) {
				useBox = boxes.findIndex((b) => b.slots.some((x) => !x));
				if (useBox < 0) {
					if (boxes.length >= MAX_BOXES) {
						set({ rejectedAt: Date.now() });
						get().toast('error', `Your PC is full: ${MAX_BOXES} boxes. Free a slot first`);
						return;
					}
					boxes = [...boxes, newBox(`Box ${boxes.length + 1}`)];
					useBox = boxes.length - 1;
				}
				target = boxes[useBox].slots.findIndex((x) => !x);
			}
			const displaced = boxes[useBox].slots[target];
			boxes = boxes.map((b, i) =>
				i === useBox ? { ...b, slots: b.slots.map((x, j) => (j === target ? member : x)) } : b
			);
			const teams = library.teams.map((t) =>
				t.id === team.id
					? { ...t, members: displaced ? t.members.map((m) => (m.uid === memberUid ? displaced : m)) : t.members.filter((m) => m.uid !== memberUid) }
					: t
			);
			const at = indexOf(memberUid);
			set({ library: touch({ ...library, teams, boxes }) });
			if (displaced && get().selectedUid === memberUid) focus(displaced.uid);
			settle(at);
			get().toast('success', `${member.name || member.species} moved to ${boxes[useBox].name}`);
		},
		takeFromBox: (boxIndex, slot, partyIndex) => {
			if (get().draftMode) return;
			const team = openTeam();
			const { library } = get();
			const stored = library.boxes[boxIndex]?.slots[slot];
			if (!stored) return;
			const target = partyIndex !== undefined ? team.members[partyIndex] : undefined;
			if (!target && team.members.length >= MAX_TEAM_SIZE) {
				set({ rejectedAt: Date.now() });
				get().toast('error', `${team.name} is full: drop onto a member to swap`);
				return;
			}
			const boxes = library.boxes.map((b, i) =>
				i === boxIndex ? { ...b, slots: b.slots.map((x, j) => (j === slot ? (target ?? null) : x)) } : b
			);
			const teams = library.teams.map((t) => {
				if (t.id !== team.id) return t;
				const members = [...t.members];
				if (target) members[partyIndex!] = stored;
				else members.splice(partyIndex ?? members.length, 0, stored);
				return { ...t, members };
			});
			set({ library: touch({ ...library, teams, boxes }) });
			if (target && get().selectedUid === target.uid) focus(stored.uid);
			settle();
		},
		moveInBox: (fromBox, fromSlot, toBox, toSlot) =>
			set((s) => {
				const boxes = s.library.boxes.map((b) => ({ ...b, slots: [...b.slots] }));
				const a = boxes[fromBox].slots[fromSlot];
				boxes[fromBox].slots[fromSlot] = boxes[toBox].slots[toSlot];
				boxes[toBox].slots[toSlot] = a;
				return { library: touch({ ...s.library, boxes }) };
			}),

		setDraftMode: (on) => {
			if (on === get().draftMode) return;
			if (!on) {
				writeDraftMode(false);
				return leaveDraft();
			}
			// With no draft yet, the setup dialog decides; Cancel leaves Draft Mode off.
			if (!get().library.draft) return set({ dialog: 'draftSetup' });
			writeDraftMode(true);
			enterDraft();
		},
		confirmDraft: (league, settings) => {
			const s = get();
			const previous = s.draftMode ? { ...s.library.draft!, teams: s.library.teams, openTeamId: s.openTeamId } : s.library.draft;
			const draft = startDraft(league, settings, previous);
			set({ dialog: null, draftSync: { status: 'idle' } });
			if (s.draftMode) {
				// A new sheet for the draft on screen: the league and format change in place.
				set((x) => ({ library: touch({ ...x.library, teams: draft.teams, draft }) }));
				return;
			}
			set((x) => ({ library: touch({ ...x.library, draft }) }));
			writeDraftMode(true);
			enterDraft();
		},
		syncLeague: (league) => {
			const draft = get().library.draft;
			if (!draft) return;
			// A sheet that hasn't changed leaves the library alone, so a sync with nothing new saves nothing.
			const same = JSON.stringify({ ...draft.league, syncedAt: 0 }) === JSON.stringify({ ...league, syncedAt: 0 });
			if (!same) updateDraft((d) => ({ ...d, league }));
			set({ draftSync: { status: 'idle', at: league.syncedAt } });
		},
		setDraftSync: (draftSync) => set({ draftSync }),
		draftPick: (species) => {
			const draft = get().library.draft;
			if (!draft) return false;
			const state = pickState(draft, species);
			if (!state.ok) {
				set({ rejectedAt: Date.now() });
				get().toast('error', state.message);
				return false;
			}
			updateDraft((d) => ({ ...d, roster: [...d.roster, newRosterEntry(species)] }));
			return true;
		},
		releasePick: (entryUid) => {
			const s = get();
			const entry = s.library.draft?.roster.find((r) => r.uid === entryUid);
			if (!entry) return;
			const used = s.library.teams.some((t) => t.members.some((m) => teamSpecies(entry.species) === m.species));
			if (used) return set({ pendingRelease: entryUid, dialog: 'releasePick' });
			dropPicks([entryUid]);
		},
		confirmRelease: () => {
			const id = get().pendingRelease;
			set({ pendingRelease: null, dialog: null });
			if (id) dropPicks([id]);
		},
		acceptSuggestion: (suggestion) => {
			const draft = get().library.draft;
			if (!draft) return;
			const entry = draft.roster.find((r) => r.species === suggestion.species);
			if (suggestion.kind === 'add') {
				const refusal = addRefusal(draft, suggestion.species);
				if (refusal) {
					get().toast('error', refusal);
					return;
				}
				updateDraft((d) => ({ ...d, roster: [...d.roster, newRosterEntry(suggestion.species)] }));
			} else if (entry) get().releasePick(entry.uid);
		},
		acceptAllSuggestions: (suggestions) => {
			const draft = get().library.draft;
			if (!draft) return;
			const list = acceptable(draft, suggestions);
			const releases = list.filter((x) => x.kind === 'release').map((x) => draft.roster.find((r) => r.species === x.species)?.uid).filter((x): x is string => !!x);
			updateDraft((d) => {
				let roster = d.roster;
				for (const x of list) {
					if (x.kind === 'add' && !roster.some((r) => r.species === x.species)) roster = [...roster, newRosterEntry(x.species)];
				}
				return { ...d, roster };
			});
			if (releases.length) dropPicks(releases);
		},
		dismissSuggestion: (suggestion) => updateDraft((d) => ({ ...d, dismissed: { ...d.dismissed, [suggestion.key]: suggestion.value } })),
	};
});

/** The draft on screen, with its live teams, or null outside Draft Mode. */
export function useDraft(): Draft | null {
	return useStore((s) => (s.draftMode ? (s.library.draft ?? null) : null));
}

/** The same set as another species. It keeps its ability when the species can have it; otherwise it takes the species' first. */
function asSpecies(team: Team, set: PokemonSet, species: string): PokemonSet {
	const ok = abilitiesFor(team, species).some((a) => a.ability.name === set.ability);
	return { ...set, species, ability: ok ? set.ability : defaultAbility(team, species) };
}

function getTiersDefault(team?: Team) {
	if (!team) return undefined;
	if (team.mode === 'casual') return 'All';
	const tier = team.format.replace(/^gen\d/, '');
	const map: Record<string, string> = { ubers: 'Ubers', ou: 'OU', uu: 'UU', ru: 'RU', nu: 'NU', pu: 'PU', zu: 'ZU', lc: 'LC', doublesou: 'DOU', nationaldex: 'OU', championsou: 'OU', championsuu: 'UU' };
	return map[tier] ?? 'All';
}

export function useOpenTeam(): Team {
	return useStore((s) => s.library.teams.find((t) => t.id === s.openTeamId) ?? s.library.teams[0]);
}

export function useSelectedMember(): PokemonSet | null {
	const team = useOpenTeam();
	const selectedUid = useStore((s) => s.selectedUid);
	return team.members.find((m) => m.uid === selectedUid) ?? null;
}

