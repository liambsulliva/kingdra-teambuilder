import { NextApiRequest, NextApiResponse } from 'next';
import fetch from 'node-fetch';

interface PokemonData {
	abilities: Array<{
		ability: {
			url: string;
		};
	}>;
}

interface AbilityData {
	effect_entries: Array<{
		language: {
			name: string;
		};
		effect: string;
	}>;
}

const handler = async(
	req: NextApiRequest,
	res: NextApiResponse
) => {
	if (req.method === 'GET') {
		if (!req.query.id) {
			res.status(404).json({ message: 'No Pokemon Queried' });
			return;
		}
		try {
			const response = await fetch(
				'https://pokeapi.co/api/v2/pokemon/' + req.query.id
			);
			if (!response.ok) {
				console.error('Failed to fetch data:', response.status);
				res.status(404).json({ message: 'Failed to fetch Pokemon data' });
				return;
			}
			const data = (await response.json()) as PokemonData;

			// Fetch ability details
			const abilitiesWithEffects = await Promise.all(
				data.abilities.map(async (ability: { ability: { url: string } }) => {
					const abilityResponse = await fetch(ability.ability.url);
					const abilityData = (await abilityResponse.json()) as AbilityData;
					const effect =
						abilityData.effect_entries.find(
							(entry: { language: { name: string } }) =>
								entry.language.name === 'en'
						)?.effect || 'No English description available';
					return { ...ability, effect };
				})
			);

			// Replace the original abilities with the updated ones
			data.abilities = abilitiesWithEffects;

			console.log(data);
			res.status(200).json(data);
		} catch (error) {
			console.error(error);
			res.status(500).json({ message: 'Internal Server Error' });
		}
	} else {
		res.setHeader('Allow', ['GET']);
		res.status(405).end(`Method ${req.method} Not Allowed`);
	}
}

export default handler;
