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
                <div className="flex justify-between">
                    <p className="flex flex-row text-lg text-gray-600 mb-4">
                        Type:
                        <div className="px-2">
                            <span className="font-semibold capitalize">{pokemonInfo.types[0].type.name}</span>
                            {pokemonInfo.types[1] && (
                                <span className="font-semibold capitalize"> / {pokemonInfo.types[1].type.name}</span>
                            )}
                        </div>
                    </p>
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-3">Abilities:</h3>
                        <ul className="space-y-2">
                            {pokemonInfo.abilities.map((ability: any, index: number) => (
                                <li key={index} className="text-gray-600 capitalize">{ability.ability.name}</li>
                            ))}
                        </ul>
                    </div>
                </div>
                <div className="py-2">
                    <StatBar label={'HP'} initialValue={pokemonInfo.stats[0].base_stat} />
                    <StatBar label={'Atk'} initialValue={pokemonInfo.stats[1].base_stat} />
                    <StatBar label={'Def'} initialValue={pokemonInfo.stats[2].base_stat} />
                    <StatBar label={'Sp. Atk'} initialValue={pokemonInfo.stats[3].base_stat} />
                    <StatBar label={'Sp. Def'} initialValue={pokemonInfo.stats[4].base_stat} />
                    <StatBar label={'Speed'} initialValue={pokemonInfo.stats[5].base_stat} />
                </div>
                <a className="text-gray-500 hover:underline" target="_blank" href={`https://www.smogon.com/dex/sv/pokemon/${pokemonInfo.name}`}>Smogon Breakdown</a>
            </div>
            )}
        </div>
    );
}