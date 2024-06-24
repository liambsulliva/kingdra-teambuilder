"use client"

import "@/app/globals.css";
import { useEffect, useState } from 'react';
import axios from 'axios';
import StatBar from "./StatBar";

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
                if (selectedPokemon.id !== 0) {
                    const response = await axios.get(`/api/pokemon-info?id=${selectedPokemon.id}`);
                    setPokemonInfo(response.data);
                }
            } catch (error) {
                console.error(`Server returned ${error}`);
            }
        };

        fetchPokemonInfo();
    }, [selectedPokemon]);

    return (
        <div className="bg-[#f9f9f9] max-md:hidden rounded flex-grow p-8">
            {pokemonInfo && (
            <div className="bg-white rounded-lg shadow-md p-6 max-w-sm mx-auto">
                <h2 className="text-3xl font-extrabold text-gray-800 mb-4 capitalize">{pokemonInfo.name}</h2>
                {pokemonInfo.sprites.versions['generation-v']['black-white'].animated.front_default ? (
                    <img 
                        src={pokemonInfo.sprites.versions['generation-v']['black-white'].animated.front_default} 
                        alt={pokemonInfo.name} 
                        className="w-40 h-40 mx-auto mb-6 object-contain"
                    />
                ) : (
                    <img 
                        src={selectedPokemon.sprite} 
                        alt={selectedPokemon.name} 
                        className="w-40 h-40 mx-auto mb-6 object-contain"
                    />
                )}
                <p className="flex flex-row text-lg text-gray-600 mb-4">
                    Type:
                    <div className="px-2">
                        <span className="font-semibold capitalize">{pokemonInfo.types[0].type.name}</span>
                        {pokemonInfo.types[1] && (
                            <span className="font-semibold capitalize"> / {pokemonInfo.types[1].type.name}</span>
                        )}
                    </div>
                </p>
                <h3 className="text-xl font-bold text-gray-800 mb-3">Abilities:</h3>
                <ul className="space-y-2">
                {pokemonInfo.abilities.map((ability: any, index: number) => (
                    <li key={index} className="text-gray-600 capitalize">{ability.ability.name}</li>
                ))}
                </ul>
                {Array(6).fill(0).map((_, index) => (
                    <StatBar key={index} initialValue={50} />
                ))}
            </div>
            )}
        </div>
    );
}