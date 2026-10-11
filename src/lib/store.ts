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
import { abilitiesFor, canUseSpecies, defaultAbility, formatLabel, formatsForGen, getSpecies, isChampions } from './dex';

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
	| 'compare';

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
	previewSpecies: string | null;
	compareSpecies: string | null;
	/** Party member the comparison is against when nothing is on the card. */
	compareTarget: string | null;
	inspector: InspectorView;
	/** Tablet width: the workspace is merged into the right panel as its first tab. */
	merged: boolean;
	/** Card art style, saved per viewer. */
	spriteSet: SpriteSet;
	/** The team list as rows or as cards, saved per viewer. */
	teamView: TeamView;
	activeMoveSlot: number | null;
	matchupType: string | null;
	carouselTab: string;
	carouselRole: string;
	carouselSearch: string;
	/** Browse a lower generation without changing the team's. Null browses the team's own. */
	carouselGen: number | null;
	boxOpen: boolean;
	/** Party member picked inside the open Box. */
	boxPartyUid: string | null;
	boxIndex: number;
	dialog: null | 'newTeam' | 'importTeam' | 'importSet' | 'deleteMember' | 'fix';
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
	swapIn(uid: string, species: string): void;
	setMove(uid: string, slot: number, move: string): void;
	pickMove(move: string): void;

	setInspector(view: InspectorView, slot?: number | null): void;
	chose(): void;
	setMatchupType(type: string | null): void;
	preview(species: string | null): void;
	compare(species: string | null): void;
	setCompareTarget(uid: string | null): void;
	setCarousel(patch: Partial<Pick<State, 'carouselTab' | 'carouselRole' | 'carouselSearch' | 'carouselGen'>>): void;

	setBoxOpen(open: boolean): void;
	setBoxPartyUid(uid: string | null): void;
	setBoxIndex(index: number): void;
	addBox(): void;
	renameBox(index: number, name: string): void;
	deleteBox(index: number): void;
	storeInBox(uid: string, boxIndex?: number, slot?: number): void;
	takeFromBox(boxIndex: number, slot: number, partyIndex?: number): void;
	moveInBox(fromBox: number, fromSlot: number, toBox: number, toSlot: number): void;
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
		const level = team.format.endsWith('lc') ? 5 : team.format.includes('vgc') || isChampions(team) ? 50 : 100;
		return newSet(s?.name ?? species, { ability: defaultAbility(team, species), level });
	};

	return {
		library: first,
		hydrated: false,
		openTeamId: first.teams[0].id,
		selectedUid: null,
		previewSpecies: null,
		compareSpecies: null,
		compareTarget: null,
		inspector: 'team',
		merged: false,
		spriteSet: readSpriteSet(),
		teamView: readTeamView(),
		activeMoveSlot: null,
		matchupType: null,
		carouselTab: 'OU',
		carouselRole: 'All roles',
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

		hydrate: (library) =>
			set((s) => {
				const open = library.teams.find((t) => t.id === s.openTeamId) ?? library.teams[0];
				// The carousel opens on a tab the open team has: a casual team has no OU tab.
				return { library, hydrated: true, openTeamId: open.id, selectedUid: pickFor(open, s.lastSelected), carouselTab: getTiersDefault(open) ?? s.carouselTab };
			}),
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
			const team = newTeam(partial);
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
					previewSpecies: null,
					compareSpecies: null,
					inspector: restView(s),
					activeMoveSlot: null,
					carouselTab: tab,
					carouselRole: 'All roles',
					carouselGen: null,
				};
			}),
		renameTeam: (id, name) => updateTeam(id, (t) => ({ ...t, name: name.trim() || t.name })),
		setTeamContext: (id, ctx) => {
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
		addTeams: (teams) => {
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
				previewSpecies: null,
				compareSpecies: null,
				activeMoveSlot: null,
				inspector: s.merged ? 'card' : memberUid
					? openTeam().mode === 'casual'
						? 'pokedex'
						: s.inspector === 'team' || s.inspector === 'compare' || s.inspector === 'pokedex' || s.inspector === 'locations'
							? 'stats'
							: s.inspector
					: 'team',
			}));
		},
		addMember: (species, index) => {
			const team = openTeam();
			if (team.members.length >= MAX_TEAM_SIZE) {
				// Dropped on a member of a full team: take its place.
				if (index !== undefined && team.members[index]) {
					const old = team.members[index];
					updateTeam(team.id, (t) => ({ ...t, members: t.members.map((m) => (m.uid === old.uid ? { ...freshSet(t, species), uid: old.uid } : m)) }));
					set({ previewSpecies: null });
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
			set({ previewSpecies: null });
			if (!get().selectedUid) focus(member.uid);
			cardIfMerged();
			return true;
		},
		addMemberToTeam: (teamId, species, index) => {
			if (teamId === get().openTeamId) return get().addMember(species, index);
			const team = get().library.teams.find((t) => t.id === teamId);
			if (!team) return false;
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
		replaceSet: (memberUid, next) => updateMember(memberUid, () => ({ ...next, uid: memberUid })),
		changeSpecies: (memberUid, species) => updateMember(memberUid, (m) => asSpecies(openTeam(), m, species)),
		swapIn: (memberUid, species) => {
			const team = openTeam();
			const fresh = freshSet(team, species);
			updateMember(memberUid, () => ({ ...fresh, uid: memberUid }));
			set((s) => ({ compareSpecies: null, previewSpecies: null, inspector: s.merged ? 'card' : 'stats' }));
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
		preview: (species) =>
			set((s) => ({
				previewSpecies: species,
				compareSpecies: null,
				inspector: s.merged ? 'card' : species ? (s.selectedUid ? 'compare' : s.inspector) : s.selectedUid ? 'stats' : 'team',
			})),
		setCompareTarget: (compareTarget) => set({ compareTarget }),
		compare: (species) =>
			set((s) => ({
				compareSpecies: species,
				compareTarget: s.selectedUid ?? openTeam().members[0]?.uid ?? null,
				previewSpecies: null,
				inspector: s.merged ? 'card' : species ? 'compare' : s.selectedUid ? 'stats' : 'team',
			})),
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
	};
});

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

