import { NextApiRequest, NextApiResponse } from 'next';
import fetch from 'node-fetch';

interface PokemonData {
	id: number;
	sprites: {
		front_default: string | null;
	};
	name: string;
}

interface SmogonData {
	[pokemonName: string]: object;
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
	const tier = req.query.tier ? String(req.query.tier).toLowerCase() : 'ou';

	try {
		// Fetch Smogon usage data
		const smogonResponse = await fetch(
			`https://pkmn.github.io/smogon/data/stats/gen9${tier}.json`
		);
		const smogonData: SmogonData = (await smogonResponse.json()) as SmogonData;

		// Get Pokémon names from the requested tier
		const pokemonNames = Object.keys(smogonData.pokemon || {});
		//console.log('Pokemon names:', pokemonNames);

		// Fetch data for each Pokémon on the current page
		const pokemonData = await Promise.all(
			pokemonNames.map(async (name) => {
				try {
					// Transform the name to kebab-case
					const formattedName = name.toLowerCase().replace(/ /g, '-');
					const response = await fetch(
						`https://pokeapi.co/api/v2/pokemon/${formattedName}`
					);
					if (!response.ok) {
						console.error(
							`Failed to fetch data for ${name}: ${response.statusText}`
						);
						return null;
					}
					const data: PokemonData = (await response.json()) as PokemonData;
					return {
						name: data.name,
						id: data.id,
						sprite: data.sprites.front_default,
						tier: tier.toUpperCase(),
					};
				} catch (error) {
					console.error(`Error fetching data for ${name}:`, error);
					return null;
				}
			})
		);

		const filteredPokemonData = pokemonData.filter(
			(item): item is NonNullable<typeof item> => item !== null
		);

		res.status(200).json({
			pokemonData: filteredPokemonData,
			nextPage: null,
			hasNextPage: null,
		});
	} catch (error: unknown) {
		console.error('Failed to fetch data:', error);
		res.status(500).json({
			message: 'Failed to fetch data',
			error: error instanceof Error ? error.message : String(error),
		});
	}
};

export default handler;
