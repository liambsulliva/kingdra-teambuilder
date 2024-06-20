import { NextApiRequest, NextApiResponse } from 'next';

interface pokemon {
    name: string;
    sprite: string;
}

// Temporary storage for the party (database allocation later)
let pokemonParty: pokemon[] = [];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        const { name, sprite } = req.body;

        // Perform any necessary validation on the request body
        if (!name || !sprite) {
            res.status(400).json({ message: 'Invalid request body' });
            return;
        }

        try {
            // Save the new Pokemon to the database or perform any other necessary operations
            // ...
            const newPokemon = { name, sprite };
            
            // Check if the Pokemon already exists in the party
            const existingPokemon = pokemonParty.find(pokemon => pokemon.name === newPokemon.name);
            if (existingPokemon) {
                res.status(409).json({ message: 'Pokemon already exists in the party' });
                return;
            }
            
            // Add the new Pokemon to the party
            pokemonParty.push(newPokemon);
            // Return a success response
            res.status(201).json({ message: 'Pokemon created successfully' });
        } catch (error: any) {
            console.error('Failed to create Pokemon:', error);
            res.status(500).json({ message: 'Failed to create Pokemon', error: error.message });
        }
    } else if (req.method === 'GET') {
        // Return the party data
        res.status(200).json({ pokemonParty });
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}