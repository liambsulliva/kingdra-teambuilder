import type { NextApiRequest, NextApiResponse } from 'next';

type MoveData = {
	name: string;
	base: number;
	type: string;
	acc: number;
	effect: string;
	moveClass: string;
};

const handler = async (
	req: NextApiRequest,
	res: NextApiResponse<MoveData | { error: string }>
) => {
	const { url } = req.query;

	if (!url || typeof url !== 'string') {
		return res.status(400).json({ error: 'Invalid URL parameter' });
	}

	try {
		const response = await fetch(url);
		const data = await response.json();

		const moveData: MoveData = {
			name:
				data.names.find(
					(entry: { language: { name: string } }) =>
						entry.language.name === 'en'
				)?.name || '',
			base: data.power,
			type: data.type.name,
			acc: data.accuracy,
			effect:
				data.effect_entries.find(
					(entry: { language: { name: string } }) =>
						entry.language.name === 'en'
				)?.short_effect || '',
			moveClass: data.damage_class.name || '',
		};

		res.status(200).json(moveData);
	} catch (error) {
		res.status(500).json({ error: 'Error fetching move data' });
	}
};

export default handler;
