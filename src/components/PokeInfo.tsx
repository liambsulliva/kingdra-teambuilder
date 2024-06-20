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
    const [pokemonInfo, setPokemonInfo] = useState(null);

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
        <div className="bg-[#f9f9f9] max-md:hidden rounded flex-grow">
            {pokemonInfo ? (
                <div>
                    <h2>{pokemonInfo.name}</h2>
                    <img src={selectedPokemon.sprite} alt={selectedPokemon.name} />
                    <p>Base Experience: {pokemonInfo.base_experience}</p>
                    <p>Height: {pokemonInfo.height}</p>
                    <p>Weight: {pokemonInfo.weight}</p>
                    <h3>Abilities:</h3>
                    <ul>
                        {pokemonInfo.abilities.map((ability, index) => (
                            <li key={index}>{ability.ability.name}</li>
                        ))}
                    </ul>
                </div>
            ) : (
                <p>No Pokemon Selected</p>
            )}
        </div>
    );
}