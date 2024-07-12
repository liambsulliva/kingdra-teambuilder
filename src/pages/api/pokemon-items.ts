import type { NextApiRequest, NextApiResponse } from 'next';
import items from '../../../lib/items.json';

type ItemData = {
	name: string;
	effect: string;
};

const handler = async (
	req: NextApiRequest,
	res: NextApiResponse<ItemData[] | { error: string }>
) => {
	const { input } = req.query;

	if (!input || typeof input !== 'string') {
		return res.status(400).json({ error: 'Invalid input parameter' });
	}

	const itemsArray = items.items as { name: string; url: string }[];

	const formatItemName = (name: string) => {
		return name
			.split('-')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	};

	const filteredItems = itemsArray.filter((item) =>
		formatItemName(item.name).toLowerCase().includes(input.toLowerCase())
	);

	try {
		const suggestions: ItemData[] = await Promise.all(
			filteredItems.slice(0, 10).map(async (item) => {
				const response = await fetch(
					`https://pokeapi.co/api/v2/item/${item.name.toLowerCase()}/`
				);
				const data = await response.json();
				const effect =
					data.effect_entries.find(
						(entry: { language: { name: string } }) =>
							entry.language.name === 'en'
					)?.short_effect || '';

				return {
					name: formatItemName(item.name),
					effect: effect,
				};
			})
		);

		res.status(200).json(suggestions);
	} catch (error) {
		res.status(500).json({ error: 'Error fetching item data' });
	}
};

export default handler;
