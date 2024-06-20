import { NextApiRequest, NextApiResponse } from 'next';
import fetch from 'node-fetch';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const limit = 100; // Number of pokemon to fetch at once
  const page = req.query.page ? parseInt(String(req.query.page), 10) : 1; // Page number for pagination
  const offset = (page - 1) * limit; // Offset calculation based on page number
  const url = `https://pokeapi.co/api/v2/pokemon?limit=${limit}&offset=${offset}`;
  let data: any;

  try {
    const response = await fetch(url);
    data = await response.json();
  } catch (error: any) {
    console.error('Failed to fetch data from PokeAPI:', error);
    res.status(500).json({ message: 'Failed to fetch data from PokeAPI', error: error.message });
    return;
  }

  if (data && data.results) {
    try {
      const pokemonUrls = data.results.map((pokemon: any) => pokemon.url);
      const pokemonData = await Promise.all(pokemonUrls.map((url: string) => fetch(url).then((response) => response.json())));
      
      // Determine if there is a next page
      const hasNextPage = data.count > offset + limit;

      // Modify the response to include next page information
      res.status(200).json({
        pokemonData,
        nextPage: hasNextPage ? page + 1 : null, // Provide the next page number or null if no more data
        hasNextPage,
      });
    } catch (error: any) {
      console.error('Failed to fetch data for individual Pokemon:', error);
      res.status(500).json({ message: 'Failed to fetch data for individual Pokemon', error: error.message });
    }
  } else {
    // No data found, possibly end of data
    res.status(404).json({ message: 'No more Pokemon found' });
  }
}