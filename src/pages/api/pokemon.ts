import { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";

function getPokemonGeneration(id: number): number {
  if (id <= 151) return 1;
  if (id <= 251) return 2;
  if (id <= 386) return 3;
  if (id <= 493) return 4;
  if (id <= 649) return 5;
  if (id <= 721) return 6;
  if (id <= 809) return 7;
  if (id <= 905) return 8;
  return 9; // Assuming any ID above 905 is Gen 9
}

interface PokemonData {
  id: number;
  sprites: {
    front_default: string | null;
  };
  name: string;
}

interface PokemonListResponse {
  count: number;
  results: Array<{ url: string }>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Return a specific Pokemon if a name is provided
  if (req.query.name) {
    const name = req.query.name;
    const url = `https://pokeapi.co/api/v2/pokemon/${name}`;
    try {
      const response = await fetch(url);
      const data = await response.json() as PokemonData;
      const generation = getPokemonGeneration(data.id);
      res.status(200).json({ ...data, generation });
    } catch (error: unknown) {
      console.error("Failed to fetch data from PokeAPI:", error);
      res
        .status(500)
        .json({
          message: "Failed to fetch data from PokeAPI",
          error: error instanceof Error ? error.message : String(error),
        });
      return;
    }
    // else, return a list of all Pokemon
  } else {
    const limit = 50; // Number of pokemon to fetch at once
    const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
    const generation = req.query.generation ? parseInt(String(req.query.generation), 10) : 0;

    let offset = (page - 1) * limit;
    let url = `https://pokeapi.co/api/v2/pokemon?limit=${limit}&offset=${offset}`;

    // If a specific generation is requested, adjust the offset and limit
    if (generation > 0) {
      const genRanges = [
        {start: 1, end: 151},   // Gen 1
        {start: 152, end: 251}, // Gen 2
        {start: 252, end: 386}, // Gen 3
        {start: 387, end: 493}, // Gen 4
        {start: 494, end: 649}, // Gen 5
        {start: 650, end: 721}, // Gen 6
        {start: 722, end: 809}, // Gen 7
        {start: 810, end: 905}, // Gen 8
        {start: 906, end: 1010} // Gen 9 (adjust end as needed)
      ];

      const genRange = genRanges[generation - 1];
      offset = genRange.start - 1 + ((page - 1) * limit);
      const adjustedLimit = Math.min(limit, genRange.end - offset);
      url = `https://pokeapi.co/api/v2/pokemon?limit=${adjustedLimit}&offset=${offset}`;
    }

    let data: PokemonListResponse;
    try {
      const response = await fetch(url);
      data = await response.json() as PokemonListResponse;
    } catch (error: unknown) {
      console.error("Failed to fetch data from PokeAPI:", error);
      res
        .status(500)
        .json({
          message: "Failed to fetch data from PokeAPI",
          error: error instanceof Error ? error.message : String(error),
        });
      return;
    }

    if (data && data.results) {
      try {
        const pokemonUrls = data.results.map((pokemon) => pokemon.url);
        const pokemonData: PokemonData[] = await Promise.all(
          pokemonUrls.map((url: string) =>
            fetch(url).then((response) => response.json() as unknown as PokemonData),
          ),
        );

        const modifiedPokemonData = pokemonData
          .filter(
            (pokemon) =>
              pokemon.sprites.front_default !== null &&
              !pokemon.name.includes("-gmax") &&
              !pokemon.name.includes("-mega") &&
              !pokemon.name.includes("-totem"),
          )
          .map((pokemon) => ({
            name: pokemon.name,
            id: pokemon.id,
            sprite: pokemon.sprites.front_default,
            generation: getPokemonGeneration(pokemon.id),
          }));

        // Determine if there is a next page
        const hasNextPage = data.count > offset + limit;

        // Modify the response to include next page information
        res.status(200).json({
          pokemonData: modifiedPokemonData,
          nextPage: hasNextPage ? page + 1 : null, // Provide the next page number or null if no more data
          hasNextPage,
        });
      } catch (error: unknown) {
        console.error("Failed to fetch data for individual Pokemon:", error);
        res
          .status(500)
          .json({
            message: "Failed to fetch data for individual Pokemon",
            error: error instanceof Error ? error.message : String(error),
          });
      }
    } else {
      // No data found, possibly end of data
      res.status(404).json({ message: "No more Pokemon found" });
    }
  }
}