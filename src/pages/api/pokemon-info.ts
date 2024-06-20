import { NextApiRequest, NextApiResponse } from 'next';
import fetch from 'node-fetch';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        if (!req.query.id) {
            res.status(404).json({ message: 'No Pokemon Queried' });
            return; // Stop execution if no ID is provided
        }
        try {
            const response = await fetch('https://pokeapi.co/api/v2/pokemon/' + req.query.id);
            if (!response.ok) {
                // If response status is not ok, log the status and return a 404 error
                console.error('Failed to fetch data:', response.status);
                res.status(404).json({ message: 'Failed to fetch Pokemon data' });
                return; // Stop execution if the fetch request failed
            }
            const data = await response.json();
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