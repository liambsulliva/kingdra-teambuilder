import { NextApiRequest, NextApiResponse } from 'next';
import fetch from 'node-fetch';

interface PokemonListResponse {
	name: {
		[key: string]: {
			moves: (string | [string, string[]])[];
			ability: string;
			item: string[];
			nature: string;
			evs: {
				[key: string]: number;
			};
			teratypes: string;
		};
	};
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
	const tier = req.query.tier ? String(req.query.tier) : 'gen9ou';
	const url = `https://pkmn.github.io/smogon/data/sets/${tier}.json`;

	let data: PokemonListResponse;
	try {
		const response = await fetch(url);
		data = (await response.json()) as PokemonListResponse;
	} catch (error: unknown) {
		console.error('Failed to fetch data from SmogonAPI:', error);
		res.status(500).json({
			message: 'Failed to fetch data from SmogonAPI',
			error: error instanceof Error ? error.message : String(error),
		});
		return;
	}

	if (data) {
		try {
			const pokemonArray = Object.keys(data.name).map(
				(key: string) => data.name[key]
			);

			res.status(200).json({
				pokemonData: pokemonArray,
			});
		} catch (error: unknown) {
			console.error('Failed to fetch data for individual Pokemon:', error);
			res.status(500).json({
				message: 'Failed to fetch data for individual Pokemon',
				error: error instanceof Error ? error.message : String(error),
			});
		}
	} else {
		// No data found, possibly end of data
		res.status(404).json({ message: 'No Pokemon Found.' });
	}
};

export default handler;
