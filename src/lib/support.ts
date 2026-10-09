import { learnsetAt } from './dex';
import type { Team } from './model';

/** The support moves the card points out, grouped by the job they do. */
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
		name: 'Momentum',
		moves: ['U-turn', 'Volt Switch', 'Flip Turn', 'Parting Shot'],
	},
	{ name: 'Disruption', moves: ['Taunt', 'Knock Off'] },
	{ name: 'Status', moves: ['Toxic', 'Will-O-Wisp', 'Thunder Wave'] },
	{ name: 'Terrain', moves: ['Ice Spinner'] },
];

export interface SupportGroup {
	name: string;
	/** The entries from this category the species can learn, as named in SUPPORT. */
	moves: string[];
}

const toId = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const cache = new Map<string, Promise<SupportGroup[]>>();

/** Support categories a species can know at its level in the team's generation, each with its matching moves. */
export function supportFor(
	team: Team,
	species: string,
	level: number
): Promise<SupportGroup[]> {
	const wide = team.mode === 'casual' || team.format.includes('nationaldex');
	const key = `${team.gen}:${wide}:${species}:${level}`;
	let found = cache.get(key);
	if (!found) {
		found = (async () => {
			const learnable = await learnsetAt(team, species, level);
			return SUPPORT.map(({ name, moves }) => ({
				name,
				moves: moves.filter((m) => learnable[toId(m)]),
			})).filter((g) => g.moves.length);
		})();
		cache.set(key, found);
	}
	return found;
}
