import { generationFor, getSpecies } from './dex';
import type { Team } from './model';

/**
 * Support moves grouped by the job they do. Weather and terrain setters are
 * listed by their abilities as well as their moves, so a species counts if it
 * can learn the move or has the ability in the team's generation.
 */
export const SUPPORT: { name: string; moves: string[] }[] = [
	{
		name: 'Hazards',
		moves: [
			'Stealth Rock',
			'Spikes',
			'Toxic Spikes',
			'Sticky Web',
			'Defog',
			'Rapid Spin',
		],
	},
	{
		name: 'Healing / Cleric',
		moves: [
			'Wish',
			'Healing Wish',
			'Revival Blessing',
			'Heal Bell',
			'Aromatherapy',
		],
	},
	{
		name: 'Momentum',
		moves: [
			'U-turn',
			'Volt Switch',
			'Flip Turn',
			'Parting Shot',
			'Teleport',
			'Shed Tail',
			'Baton Pass',
		],
	},
	{
		name: 'Priority',
		moves: [
			'Upper Hand',
			'Aqua Jet',
			'Bullet Punch',
			'Extreme Speed',
			'Fake Out',
			'Feint',
			'First Impression',
			'Ice Shard',
			'Mach Punch',
			'Quick Attack',
			'Shadow Sneak',
			'Sucker Punch',
			'Vacuum Wave',
			'Water Shuriken',
		],
	},
	{
		name: 'Disruption',
		moves: [
			'Taunt',
			'Knock Off',
			'Encore',
			'Trick',
			'Switcheroo',
			'Thief',
			'Covet',
			'Corrosive Gas',
			'Soak',
			'Worry Seed',
			'Entrainment',
			'Skill Swap',
			'Simple Beam',
			'Imprison',
		],
	},
	{
		name: 'Trapping',
		moves: [
			'Arena Trap',
			'Magnet Pull',
			'Shadow Tag',
			'Bind',
			'Block',
			'Clamp',
			'Fire Spin',
			'Mean Look',
			'Sand Tomb',
			'Whirlpool',
			'Wrap',
		],
	},
	{
		name: 'Phasing',
		moves: [
			'Haze',
			'Circle Throw',
			'Dragon Tail',
			'Roar',
			'Clear Smog',
			'Whirlwind',
		],
	},
	{
		name: 'HP Cutting',
		moves: [
			'Pain Split',
			'Endeavor',
			'Super Fang',
			'Seismic Toss',
			'Final Gambit',
			'Night Shade',
			'Psywave',
			'Dragon Rage',
			'Sonic Boom',
		],
	},
	{
		name: 'Status',
		moves: [
			'Glare',
			'Nuzzle',
			'Sleep Powder',
			'Spore',
			'Stun Spore',
			'Thunder Wave',
			'Toxic',
			'Will-O-Wisp',
			'Yawn',
		],
	},
	{
		name: 'Speed Control',
		moves: [
			'Bulldoze',
			'Electroweb',
			'Icy Wind',
			'Quash',
			'Tailwind',
			'Trick Room',
		],
	},
	{
		name: 'Support',
		moves: [
			'Reflect',
			'Light Screen',
			'Aurora Veil',
			'Ally Switch',
			'Follow Me',
			'Rage Powder',
			'Quick Guard',
			'Wide Guard',
			'Helping Hand',
			'Snarl',
			'Beat Up',
		],
	},
	{
		name: 'Weather',
		moves: [
			'Drought',
			'Sunny Day',
			'Chlorophyll',
			'Drizzle',
			'Rain Dance',
			'Swift Swim',
			'Snow Warning',
			'Hail',
			'Snowscape',
			'Slush Rush',
			'Sand Stream',
			'Sandstorm',
			'Sand Rush',
			'Weather Ball',
		],
	},
	{
		name: 'Terrain',
		moves: [
			'Electric Surge',
			'Electric Terrain',
			'Rising Voltage',
			'Psychic Surge',
			'Psychic Terrain',
			'Expanding Force',
			'Misty Surge',
			'Misty Terrain',
			'Misty Explosion',
			'Grassy Surge',
			'Grassy Terrain',
			'Grassy Glide',
			'Ice Spinner',
			'Terrain Pulse',
		],
	},
	{
		name: 'Setup',
		moves: [
			'Dragon Dance',
			'Swords Dance',
			'Shell Smash',
			'Shift Gear',
			'Belly Drum',
			'Bulk Up',
			'Coil',
			'Hone Claws',
			'Curse',
			'Work Up',
			'Calm Mind',
			'Nasty Plot',
			'Quiver Dance',
			'Cosmic Power',
			'Iron Defense',
			'Cotton Guard',
			'Acid Armor',
			'Amnesia',
			'Agility',
			'Rock Polish',
			'Autotomize',
			'Trailblaze',
			'Stored Power',
			'Power Trip',
		],
	},
];

export interface SupportGroup {
	name: string;
	/** The entries from this category the species can use, as named in SUPPORT. */
	moves: string[];
}

const toId = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const cache = new Map<string, Promise<SupportGroup[]>>();

/** Support categories a species has available in the team's generation, each with its matching entries. */
export function supportFor(
	team: Team,
	species: string
): Promise<SupportGroup[]> {
	const wide = team.mode === 'casual' || team.format.includes('nationaldex');
	const key = `${team.gen}:${wide}:${species}`;
	let found = cache.get(key);
	if (!found) {
		found = (async () => {
			const learnable: Record<string, string[]> =
				(await generationFor(team).learnsets.learnable(species)) ?? {};
			const s = getSpecies(team, species);
			const abilities = new Set(
				team.gen >= 3 && s ? Object.values(s.abilities).map(toId) : []
			);
			return SUPPORT.map(({ name, moves }) => ({
				name,
				moves: moves.filter(
					(m) => learnable[toId(m)] || abilities.has(toId(m))
				),
			})).filter((g) => g.moves.length);
		})();
		cache.set(key, found);
	}
	return found;
}
