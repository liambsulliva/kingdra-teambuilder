import { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { User } from '../../../models/User';
import mongoose from 'mongoose';
import db from '../../../lib/db';

interface pokemon {
    name: string;
    id: number;
    sprite: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    await db();
    const { userId } = getAuth(req);

    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findOne({ clerkUserId: userId });
        
    if (!user) {
        console.log('User not found. Creating new user.');
        const newUser = new User({ clerkUserId: userId, pokemonParty: [] });
        await newUser.save();
        console.log('New user created:', newUser);
        return res.status(200).json({ pokemonParty: [] });
    }

    if (process.env.MONGODB_URI) {
        mongoose.connect(process.env.MONGODB_URI);
    }

    if (req.method === 'POST') {
        const { name, id, sprite } = req.body;
        if (!name || !id || !sprite) {
            res.status(400).json({ message: 'Invalid request body' });
            return;
        }

        try {
            const newPokemon = { name, id, sprite };
            
            const existingPokemon = user.pokemonParty.find((pokemon: pokemon) => pokemon.id === newPokemon.id);
            if (existingPokemon) {
                res.status(409).json({ message: 'Pokemon already exists in the party' });
                return;
            }

            // Check if the party is already full
            if (user.pokemonParty.length >= 6) {
                res.status(409).json({ message: 'Party is already full' });
                return;
            }
            
            // Add the new Pokemon to the party
            user.pokemonParty.push(newPokemon);
            await user.save();

            // Return a success response
            res.status(201).json({ message: 'Pokemon created successfully' });
        } catch (error: any) {
            console.error('Failed to create Pokemon:', error);
            res.status(500).json({ message: 'Failed to create Pokemon', error: error.message });
        }
    } else if (req.method === 'DELETE') {
        try {
            const { id } = req.query;

            // Check if the party is empty
            if (user.pokemonParty.length === 0) {
                res.status(409).json({ message: 'Party is empty' });
                return;
            }

            // Check if the Pokemon exists in the party
            const existingPokemon = user.pokemonParty.find((pokemon: pokemon) => pokemon.id === Number(id));
            if (!existingPokemon) {
                res.status(404).json({ message: 'Pokemon not found in the party' });
                return;
            }

            // Remove the Pokemon from the party
            const index = user.pokemonParty.findIndex((pokemon: pokemon) => pokemon.id === Number(id));
            if (index !== -1) {
                user.pokemonParty.splice(index, 1);
            }

            // Return a success response
            res.status(201).json({ message: 'Pokemon removed successfully' });
        } catch (error: any) {
            console.error('Failed to remove Pokemon:', error);
            res.status(500).json({ message: 'Failed to remove Pokemon', error: error.message });
        }
    } else if (req.method === 'GET') {
        try {
            res.status(200).json({ pokemonParty: user.pokemonParty });
        } catch (error: any) {
            console.error('Failed to fetch Pokemon party:', error);
            res.status(500).json({ message: 'Failed to fetch Pokemon party', error: error.message });
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}