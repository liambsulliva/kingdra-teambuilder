export const ROLES = [
	'Wallbreaker',
	'Setup sweeper',
	'Revenge killer',
	'Pivot',
	'Hazard setter',
	'Hazard removal',
	'Wall',
	'Lead',
	'Support',
	'Weather setter',
	'Trick Room',
] as const;
export type Role = (typeof ROLES)[number];

interface SmogonSet {
	moves?: (string | string[])[];
	ability?: string | string[];
	item?: string | string[];
	evs?: Record<string, number> | Record<string, number>[];
}

const flat = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
const has = (list: string[], names: string[]) => list.some((x) => names.includes(x));

const SETUP = ['Swords Dance', 'Calm Mind', 'Nasty Plot', 'Dragon Dance', 'Bulk Up', 'Quiver Dance', 'Shell Smash', 'Agility', 'Tail Glow', 'Curse', 'Coil', 'Shift Gear', 'Victory Dance', 'Tidy Up', 'Belly Drum', 'Geomancy', 'Clangorous Soul', 'Iron Defense'];
const PIVOT = ['U-turn', 'Volt Switch', 'Flip Turn', 'Parting Shot', 'Teleport', 'Chilly Reception', 'Shed Tail', 'Baton Pass'];
const HAZARDS = ['Stealth Rock', 'Spikes', 'Toxic Spikes', 'Sticky Web', 'Stone Axe', 'Ceaseless Edge'];
const REMOVAL = ['Defog', 'Rapid Spin', 'Mortal Spin', 'Tidy Up', 'Court Change'];
const RECOVERY = ['Recover', 'Roost', 'Slack Off', 'Soft-Boiled', 'Moonlight', 'Synthesis', 'Morning Sun', 'Wish', 'Shore Up', 'Milk Drink', 'Strength Sap', 'Rest'];
const SUPPORT = ['Wish', 'Healing Wish', 'Reflect', 'Light Screen', 'Aurora Veil', 'Thunder Wave', 'Will-O-Wisp', 'Encore', 'Haze', 'Whirlwind', 'Roar', 'Toxic', 'Taunt', 'Trick', 'Knock Off', 'Heal Bell', 'Aromatherapy', 'Memento', 'Tailwind', 'Follow Me', 'Rage Powder'];
const WEATHER = ['Drizzle', 'Drought', 'Sand Stream', 'Snow Warning', 'Orichalcum Pulse', 'Electric Surge', 'Psychic Surge', 'Grassy Surge', 'Misty Surge'];

/** Broad roles for one Smogon set, from its name and contents. */
export function rolesForSet(name: string, set: SmogonSet): Role[] {
	const moves = (set.moves || []).flatMap(flat);
	const items = flat(set.item);
	const abilities = flat(set.ability);
	const n = name.toLowerCase();
	const roles = new Set<Role>();
	if (has(items, ['Choice Band', 'Choice Specs', 'Life Orb']) || /wallbreak|all-out|mixed|attacker/.test(n)) roles.add('Wallbreaker');
	if (items.includes('Choice Scarf') || /scarf|revenge/.test(n)) roles.add('Revenge killer');
	if (has(moves, SETUP) || /sweeper|dance|calm mind|nasty plot|bulk up|setup/.test(n)) roles.add('Setup sweeper');
	if (has(moves, PIVOT) || /pivot/.test(n)) roles.add('Pivot');
	if (has(moves, HAZARDS) || /hazard|rocks|spikes|web/.test(n)) roles.add('Hazard setter');
	if (has(moves, REMOVAL) || /defog|spin/.test(n)) roles.add('Hazard removal');
	if (/defensive|wall|bulky|unaware|phazer/.test(n) || (has(moves, RECOVERY) && !has(moves, SETUP))) roles.add('Wall');
	if (/lead/.test(n)) roles.add('Lead');
	if (/utility|support|screens|cleric|wish/.test(n) || moves.filter((m) => SUPPORT.includes(m)).length >= 2) roles.add('Support');
	if (has(abilities, WEATHER) || /setter/.test(n)) roles.add('Weather setter');
	if (moves.includes('Trick Room') || /trick room/.test(n)) roles.add('Trick Room');
	return [...roles];
}

/** Collapse every set of a species into its two most common roles. */
export function rolesForSpecies(sets: Record<string, SmogonSet>): Role[] {
	const counts = new Map<Role, number>();
	for (const [name, set] of Object.entries(sets))
		for (const role of rolesForSet(name, set)) counts.set(role, (counts.get(role) || 0) + 1);
	return [...counts.entries()]
		.sort((a, b) => b[1] - a[1] || ROLES.indexOf(a[0]) - ROLES.indexOf(b[0]))
		.slice(0, 2)
		.map(([r]) => r);
}
