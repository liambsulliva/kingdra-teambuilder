"use client"
import React, { useState } from "react";
import { Accordion } from "flowbite-react";
import { Button } from "flowbite-react";
import pokemondata from "./pokemon-data.json";

export default function PokePicker({ pokemonName, setPokemonName, pokemonData, setPokemonData, points, setPoints }: { pokemonName: string[], setPokemonName: React.Dispatch<React.SetStateAction<string[]>>, pokemonData: any[], setPokemonData: React.Dispatch<React.SetStateAction<any[]>>, points: number, setPoints: React.Dispatch<React.SetStateAction<number>>}) {
    const addPokemon = (pokemon: string, negPoints: number) => {
        if (pokemonName.length < 12 && points >= negPoints) {
            setPokemonName([...pokemonName, pokemon]);
            setPoints(points - negPoints);
            //console.log("Pokemon added");
        }
    };
    const removePokemon = (pokemon: string, posPoints: number) => {
        setPokemonName(pokemonName.filter((p) => p !== pokemon));
        setPokemonData(pokemonData.filter((data) => data.name !== pokemon));
        setPoints(points + posPoints);
        //console.log("Pokemon removed");
    };

    return (
        <div style={{ overflowY: "auto", maxHeight: "100vh", overflowX: "hidden" }}>
            <Accordion className="whitespace-nowrap">
                {pokemondata.map((item) => (
                    <Accordion.Panel key={item.Points}>
                        <Accordion.Title>{`${item.Points} Points`}</Accordion.Title>
                        <Accordion.Content>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {item.Pokemon.map((pokemon) => (
                                    <Button key={pokemon} color="gray" className="transition duration-200 active:scale-95" onClick={() => {
                                        if (pokemonName.includes(pokemon)) {
                                            removePokemon(pokemon, item.Points);
                                        } else {
                                            addPokemon(pokemon, item.Points);
                                        }
                                    }}>{pokemon}</Button>
                                ))}
                            </div>
                        </Accordion.Content>
                    </Accordion.Panel>
                ))}
            </Accordion>
        </div>
    );
}
