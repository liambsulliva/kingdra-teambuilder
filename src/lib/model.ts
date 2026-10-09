export type StatID = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe';
export type StatTable = Record<StatID, number>;
export type Mode = 'competitive' | 'casual';
/** Card art style: Black/White animated sprites, or X/Y pixelated 3D models (Showdown's animated sprites). */
export type SpriteSet = 'bw' | 'xy';

export const STATS: StatID[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
export const STAT_LABELS: Record<StatID, string> = {
	hp: 'HP',
	atk: 'Atk',
	def: 'Def',
	spa: 'SpA',
	spd: 'SpD',
	spe: 'Spe',
};

export const MAX_TEAM_SIZE = 6;
export const MAX_MOVES = 4;
export const BOX_SIZE = 30;
/** The PC holds 32 boxes, as in the games. Adding and storing stop at this count. */
export const MAX_BOXES = 32;

/** One Pokémon set. Mirrors Showdown's PokemonSet plus a stable uid. */
export interface PokemonSet {
	uid: string;
	species: string;
	name: string;
	item: string;
	ability: string;
	nature: string;
	gender: '' | 'M' | 'F' | 'N';
	shiny: boolean;
	happiness: number;
	pokeball: string;
	level: number;
	evs: StatTable;
	ivs: StatTable;
	moves: string[];
	hpType: string;
	dynamaxLevel: number;
	gigantamax: boolean;
	teraType: string;
}

export interface Team {
	id: string;
	name: string;
	mode: Mode;
	gen: number;
	/** Showdown format id such as gen9ou; casual teams use `casual`. */
	format: string;
	members: PokemonSet[];
}

export interface Box {
	id: string;
	name: string;
	slots: (PokemonSet | null)[];
}

export interface Library {
	version: 2;
	teams: Team[];
	boxes: Box[];
	updatedAt: number;
}

export const uid = () =>
	typeof crypto !== 'undefined' && 'randomUUID' in crypto
		? crypto.randomUUID()
		: Math.random().toString(36).slice(2) + Date.now().toString(36);

export const statTable = (value: number): StatTable => ({
	hp: value,
	atk: value,
	def: value,
	spa: value,
	spd: value,
	spe: value,
});

export function newSet(species: string, partial: Partial<PokemonSet> = {}): PokemonSet {
	return {
		uid: uid(),
		species,
		name: '',
		item: '',
		ability: '',
		nature: '',
		gender: '',
		shiny: false,
		happiness: 255,
		pokeball: '',
		level: 100,
		evs: statTable(0),
		ivs: statTable(31),
		moves: [],
		hpType: '',
		dynamaxLevel: 10,
		gigantamax: false,
		teraType: '',
		...partial,
	};
}

export function newTeam(partial: Partial<Team> = {}): Team {
	return {
		id: uid(),
		name: 'Untitled team',
		mode: 'competitive',
		gen: 9,
		format: 'gen9ou',
		members: [],
		...partial,
	};
}

export function newBox(name: string): Box {
	return { id: uid(), name, slots: Array(BOX_SIZE).fill(null) };
}

export function emptyLibrary(): Library {
	return {
		version: 2,
		teams: [newTeam({ name: 'Team 1' })],
		boxes: [newBox('Box 1')],
		updatedAt: Date.now(),
	};
}

/** Clamp a set to the hard limits every standard format shares. */
export function normalizeSet(set: Partial<PokemonSet> & { species: string }): PokemonSet {
	const base = newSet(set.species, set);
	const clampTable = (t: Partial<StatTable> | undefined, min: number, max: number, fallback: number) => {
		const out = statTable(fallback);
		for (const s of STATS) {
			const v = Number(t?.[s]);
			out[s] = Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback;
		}
		return out;
	};
	return {
		...base,
		uid: set.uid || uid(),
		level: Math.min(100, Math.max(1, Math.round(base.level || 100))),
		happiness: Math.min(255, Math.max(0, Math.round(base.happiness ?? 255))),
		dynamaxLevel: Math.min(10, Math.max(0, Math.round(base.dynamaxLevel ?? 10))),
		evs: clampTable(set.evs, 0, 255, 0),
		ivs: clampTable(set.ivs, 0, 31, 31),
		moves: (base.moves || []).filter(Boolean).slice(0, MAX_MOVES),
	};
}

export function normalizeLibrary(input: unknown): Library {
	const lib = input as Partial<Library> | null;
	if (!lib || !Array.isArray(lib.teams)) return emptyLibrary();
	const teams = lib.teams
		.filter((t): t is Team => !!t && typeof t === 'object')
		.map((t) => ({
			...newTeam(),
			...t,
			members: (t.members || []).slice(0, MAX_TEAM_SIZE).map((m) => normalizeSet(m)),
		}));
	const boxes = (Array.isArray(lib.boxes) && lib.boxes.length ? lib.boxes : [newBox('Box 1')]).map((b) => ({
		id: b.id || uid(),
		name: b.name || 'Box',
		slots: Array.from({ length: BOX_SIZE }, (_, i) => (b.slots?.[i] ? normalizeSet(b.slots[i]!) : null)),
	}));
	return {
		version: 2,
		teams: teams.length ? teams : [newTeam({ name: 'Team 1' })],
		boxes,
		updatedAt: Number(lib.updatedAt) || Date.now(),
	};
}
