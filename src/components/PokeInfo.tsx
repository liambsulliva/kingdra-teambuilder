"use client"

import "@/app/globals.css";
import { useEffect, useState } from 'react';
import axios from 'axios';

interface pokemon {
    name: string;
    id: number;
    sprite: string;
}


export default function PokeInfo({ selectedPokemon }: { selectedPokemon: pokemon }) {
    const [pokemonInfo, setPokemonInfo] = useState<any>(null);

    useEffect(() => {
        const fetchPokemonInfo = async () => {
            try {
                const response = await axios.get(`/api/pokemon-info?id=${selectedPokemon.id}`);
                setPokemonInfo(response.data);
            } catch (error) {
                console.error(`Server returned ${error}`);
            }
        };

        fetchPokemonInfo();
    }, [selectedPokemon]);

    return (
        <div className="bg-[#f9f9f9] max-md:hidden rounded flex-grow p-8">
            {pokemonInfo ? (
                <div>
                    <h2 className="text-2xl font-bold mb-2">{pokemonInfo.name}</h2>
                    <img src={pokemonInfo.sprites.versions['generation-v']['black-white'].animated.front_default} alt={pokemonInfo.name} className="w-auto h-auto mb-4" />
                    <p className="mb-2">Base Experience: {pokemonInfo.base_experience}</p>
                    <p className="mb-2">Height: {pokemonInfo.height}</p>
                    <p className="mb-2">Weight: {pokemonInfo.weight}</p>
                    <h3 className="text-lg font-bold mb-2">Abilities:</h3>
                    <ul>
                        {pokemonInfo.abilities.map((ability: any, index: number) => (
                            <li key={index} className="mb-1">{ability.ability.name}</li>
                        ))}
                    </ul>
                </div>
            ) : (
                <p>No Pokemon Selected</p>
            )}
        </div>
    );
}