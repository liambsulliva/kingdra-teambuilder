import { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import dbConnect, { User } from '../../lib/db';

// Impossible not to use "any" for error handling :D
/* eslint-disable @typescript-eslint/no-explicit-any */

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
	await dbConnect();
	const { userId } = getAuth(req);
	if (!userId) {
		return res.status(401).json({ message: 'Unauthorized' });
	}

	let user = await User.findOne({ clerkUserId: userId });

	if (!user) {
		user = new User({
			clerkUserId: userId,
			pokemonParty: [[]],
			teamNames: ['Team 1'],
		});
		await user.save();
		console.log('New user created:', user);
	}

	if (req.method === 'GET') {
		try {
			res
				.status(200)
				.json({ teamNames: user.teamNames, pokemonParty: user.pokemonParty });
		} catch (error: any) {
			console.error('Failed to fetch team names and pokemon party:', error);
			res.status(500).json({
				message: 'Failed to fetch team names and pokemon party',
				error: error.message,
			});
		}
	} else if (req.method === 'POST') {
		try {
			const { teamNames, pokemonParty } = req.body;
			if (!Array.isArray(teamNames) || !Array.isArray(pokemonParty)) {
				console.log('Invalid request body:', req.body);
				res.status(400).json({
					message:
						'Invalid request body. Expected teamNames and pokemonParty arrays.',
				});
				return;
			}

			// Validate each Pokemon in each team
			for (const team of pokemonParty) {
				if (team.length > 6) {
					res
						.status(409)
						.json({ message: 'Team size cannot exceed 6 Pokemon' });
					return;
				}
				for (const pokemon of team) {
					const { name, id, sprite, level, moves, iv, ev } = pokemon;
					if (
						!name ||
						!id ||
						!sprite ||
						!level ||
						moves.length === 0 ||
						iv.length !== 6 ||
						ev.length !== 6
					) {
						res
							.status(400)
							.json({ message: 'Invalid Pokemon data in the party' });
						return;
					}
				}
			}

			user.teamNames = teamNames;
			user.pokemonParty = pokemonParty;
			await user.save();
			res
				.status(201)
				.json({ message: 'Team names and pokemon party updated successfully' });
		} catch (error: any) {
			res.status(500).json({
				message: 'Failed to update team names and pokemon party',
				error: error.message,
			});
		}
	} else {
		res.setHeader('Allow', ['GET', 'POST']);
		res.status(405).end(`Method ${req.method} Not Allowed`);
	}
};

export default handler;
