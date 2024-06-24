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
        <div className="bg-[#f9f9f9] max-md:hidden rounded flex-grow">
            {pokemonInfo && (
                <div className="flex flex-row justify-between bg-white rounded-lg shadow-md py-16 px-24">
                    <div className="p-4">
                        <h2 className="text-3xl font-extrabold text-gray-800 mb-4 capitalize">{pokemonInfo.name}</h2>
                        {pokemonInfo.sprites.versions['generation-v']['black-white'].animated.front_default ? (
                            <img 
                                src={pokemonInfo.sprites.versions['generation-v']['black-white'].animated.front_default} 
                                alt={pokemonInfo.name} 
                                className="w-40 h-40 mb-6 object-contain"
                            />
                        ) : (
                            <img 
                                src={selectedPokemon.sprite} 
                                alt={selectedPokemon.name} 
                                className="w-40 h-40 mx-auto mb-6 object-contain"
                            />
                        )}
                        <div className="flex flex-col">
                            <p className="flex flex-row items-center text-lg text-gray-600 mb-4 gap-2.5">
                                Type:
                                <div className="flex flex-row px-2 gap-2">
                                    <span className="font-semibold capitalize px-4 py-2 border rounded-xl bg-red-500 text-white">{pokemonInfo.types[0].type.name}</span>
                                    {pokemonInfo.types[1] && (
                                        <span className="font-semibold capitalize px-4 py-2 border rounded-xl bg-blue-500 text-white">{pokemonInfo.types[1].type.name}</span>
                                    )}
                                </div>
                            </p>
                            <div className="flex gap-4">
                                <h3 className="text-xl text-gray-600 mb-3">Abilities:</h3>
                                <ul className="flex space-x-2">
                                    {pokemonInfo.abilities.map((ability: any, index: number) => (
                                        <li key={index} className="text-gray-600 font-bold capitalize">{ability.ability.name}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="flex flex-col">
                                <div className="w-full flex md:justify-end justify-center pt-2 relative text-gray-600">
                                    <input className="border-2 border-gray-300 bg-white h-10 px-5 pr-16 rounded-lg text-sm focus:outline-none" type="text" name="move1" placeholder="Move 1" />
                                </div>
                                <div className="w-full flex md:justify-end justify-center pt-2 relative text-gray-600">
                                    <input className="border-2 border-gray-300 bg-white h-10 px-5 pr-16 rounded-lg text-sm focus:outline-none" type="text" name="move2" placeholder="Move 2" />
                                </div>
                                <div className="w-full flex md:justify-end justify-center pt-2 relative text-gray-600">
                                    <input className="border-2 border-gray-300 bg-white h-10 px-5 pr-16 rounded-lg text-sm focus:outline-none" type="text" name="move3" placeholder="Move 3" />
                                </div>
                                <div className="w-full flex md:justify-end justify-center pt-2 relative text-gray-600">
                                    <input className="border-2 border-gray-300 bg-white h-10 px-5 pr-16 rounded-lg text-sm focus:outline-none" type="text" name="move4" placeholder="Move 4" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col justify-evenly w-3/5 border rounded-xl px-16 py-8">
                        <StatBar label={'HP'} initialValue={pokemonInfo.stats[0].base_stat} />
                        <StatBar label={'Atk'} initialValue={pokemonInfo.stats[1].base_stat} />
                        <StatBar label={'Def'} initialValue={pokemonInfo.stats[2].base_stat} />
                        <StatBar label={'Sp. Atk'} initialValue={pokemonInfo.stats[3].base_stat} />
                        <StatBar label={'Sp. Def'} initialValue={pokemonInfo.stats[4].base_stat} />
                        <StatBar label={'Speed'} initialValue={pokemonInfo.stats[5].base_stat} />
                        <a className="text-gray-500 hover:underline pt-8" target="_blank" href={`https://www.smogon.com/dex/sv/pokemon/${pokemonInfo.name}`}>Smogon Breakdown</a>
                    </div>
                </div>
            )}
        </div>
    );
}