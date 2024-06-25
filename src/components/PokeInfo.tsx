"use client"

import "@/app/globals.css";
import typeColors from '../../lib/typeColors.json';
import { Button } from 'flowbite-react';
import { useEffect, useState } from 'react';
import axios from 'axios';
import StatBar from "./StatBar";
import type { pokemon } from '../../lib/pokemonInterface';

type PokemonType = keyof typeof typeColors;

export default function PokeInfo({ selectedPokemon, pokemonParty, setPokemonParty }: { selectedPokemon: number, pokemonParty: pokemon[], setPokemonParty: React.Dispatch<React.SetStateAction<pokemon[]>> }) {
    const [pokemonInfo, setPokemonInfo] = useState<any>();

    useEffect(() => {
        const fetchPokemonInfo = async () => {
            try {
                if (pokemonParty[selectedPokemon].id !== 0) {
                    const response = await axios.get(`/api/pokemon-info?id=${pokemonParty[selectedPokemon].id}`);
                    setPokemonInfo(response.data);
                }
            } catch (error) {
                console.error(`Server returned ${error}`);
            }
        };
        console.log(pokemonParty);
        fetchPokemonInfo();
    }, [selectedPokemon]);

    const handleMoveChange = (index: number, value: string) => {
        setPokemonParty(prevParty => {
            const newParty = [...prevParty];
            newParty[selectedPokemon] = {
                ...newParty[selectedPokemon],
                // @ts-ignore
                moves: newParty[selectedPokemon].moves.map((move, i) => i === index ? value : move)
            };
            return newParty;
        });
    };

    return (
        <div className="bg-[#f9f9f9] max-md:hidden rounded flex-grow">
            {pokemonInfo && (
                <div className="flex flex-row bg-white rounded-lg shadow-md py-16 px-24 gap-16">
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
                                src={pokemonParty[selectedPokemon].sprite} 
                                alt={pokemonParty[selectedPokemon].name} 
                                className="w-40 h-40 mx-auto mb-6 object-contain"
                            />
                        )}
                        <div className="flex flex-col">
                            <p className="flex flex-row items-center text-lg text-gray-600 mb-4 gap-2.5">
                                Type:
                                <div className="flex flex-row px-2 gap-2">
                                    <span 
                                        className="font-semibold capitalize px-4 py-2 border rounded-xl text-white"
                                        style={{ backgroundColor: `#${typeColors[pokemonInfo.types[0].type.name as PokemonType]}` }}
                                    >
                                        {pokemonInfo.types[0].type.name}
                                    </span>
                                        {pokemonInfo.types[1] && (
                                            <span 
                                                className="font-semibold capitalize px-4 py-2 border rounded-xl text-white"
                                                style={{ backgroundColor: `#${typeColors[pokemonInfo.types[1].type.name as PokemonType]}` }}
                                            >
                                                {pokemonInfo.types[1].type.name}
                                            </span>
                                        )}
                                </div>
                            </p>
                            <div className="flex gap-4 items-center mb-4">
                                <h3 className="text-xl text-gray-600">Abilities:</h3>
                                <ul className="flex flex-wrap gap-2">
                                    {pokemonInfo.abilities.map((ability: any, index: number) => (
                                        <Button color='gray' key={index} className="text-gray-600 font-bold capitalize">{ability.ability.name}</Button>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="flex flex-col">
                                {[0, 1, 2, 3].map((index) => (
                                    <div key={index} className="w-full flex md:justify-end justify-center pt-2 relative text-gray-600">
                                        <input 
                                            className="border-2 border-gray-300 bg-white h-10 px-5 pr-16 rounded-lg text-sm focus:outline-none" 
                                            type="text" 
                                            name={`move${index + 1}`} 
                                            placeholder={`Move ${index + 1}`} 
                                            value={pokemonParty[selectedPokemon].moves[index]} 
                                            onChange={(e) => handleMoveChange(index, e.target.value)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col w-full justify-evenly border rounded-xl px-16 py-8">
                        <StatBar label={'HP'} id={0} baseValue={pokemonInfo.stats[0].base_stat} ev={pokemonParty[selectedPokemon].ev[0]} selectedPokemon={selectedPokemon} setPokemonParty={setPokemonParty} />
                        <StatBar label={'Atk'} id={1} baseValue={pokemonInfo.stats[1].base_stat} ev={pokemonParty[selectedPokemon].ev[1]} selectedPokemon={selectedPokemon} setPokemonParty={setPokemonParty} />
                        <StatBar label={'Def'} id={2} baseValue={pokemonInfo.stats[2].base_stat} ev={pokemonParty[selectedPokemon].ev[2]} selectedPokemon={selectedPokemon} setPokemonParty={setPokemonParty} />
                        <StatBar label={'Sp. Atk'} id={3} baseValue={pokemonInfo.stats[3].base_stat} ev={pokemonParty[selectedPokemon].ev[3]} selectedPokemon={selectedPokemon} setPokemonParty={setPokemonParty} />
                        <StatBar label={'Sp. Def'} id={4} baseValue={pokemonInfo.stats[4].base_stat} ev={pokemonParty[selectedPokemon].ev[4]} selectedPokemon={selectedPokemon} setPokemonParty={setPokemonParty} />
                        <StatBar label={'Speed'} id={5} baseValue={pokemonInfo.stats[5].base_stat} ev={pokemonParty[selectedPokemon].ev[5]} selectedPokemon={selectedPokemon} setPokemonParty={setPokemonParty} />
                        <a className="text-gray-500 hover:underline pt-8" target="_blank" href={`https://www.smogon.com/dex/sv/pokemon/${pokemonInfo.name}`}>Smogon Breakdown</a>
                    </div>
                </div>
            )}
        </div>
    );
}