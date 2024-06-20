import { NextApiRequest, NextApiResponse } from 'next';

interface pokemon {
    name: string;
    id: number;
    sprite: string;
}

// Temporary storage for the party (database allocation later)
let pokemonParty: pokemon[] = [];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        const { name, id, sprite } = req.body;

        // Perform any necessary validation on the request body
        if (!name || !id || !sprite) {
            res.status(400).json({ message: 'Invalid request body' });
            return;
        }

        try {
            // Save the new Pokemon to the database or perform any other necessary operations
            // ...
            const newPokemon = { name, id, sprite };
            
            // Check if the Pokemon already exists in the party
            const existingPokemon = pokemonParty.find(pokemon => pokemon.id === newPokemon.id);
            if (existingPokemon) {
                res.status(409).json({ message: 'Pokemon already exists in the party' });
                return;
            }

            // Check if the party is already full
            if (pokemonParty.length >= 6) {
                res.status(409).json({ message: 'Party is already full' });
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
    } else if (req.method === 'DELETE') {
        try {
            
            // Remove the Pokemon from the party
            const { id } = req.query;

            // Check if the party is empty
            if (pokemonParty.length === 0) {
                res.status(409).json({ message: 'Party is empty' });
                return;
            }

            // Check if the Pokemon exists in the party
            const existingPokemon = pokemonParty.find(pokemon => pokemon.id === Number(id));
            if (!existingPokemon) {
                res.status(404).json({ message: 'Pokemon not found in the party' });
                return;
            }

            // Remove the Pokemon from the party
            const index = pokemonParty.findIndex(pokemon => pokemon.id === Number(id));
            if (index !== -1) {
                pokemonParty.splice(index, 1);
            }

            // Return a success response
            res.status(201).json({ message: 'Pokemon removed successfully' });
        } catch (error: any) {
            console.error('Failed to remove Pokemon:', error);
            res.status(500).json({ message: 'Failed to remove Pokemon', error: error.message });
        }
    } else if (req.method === 'GET') {
        res.status(200).json({ pokemonParty });
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}