"use client";
import React, { use, useEffect, useState } from "react";
import Header from "./header";
import PokePicker from "./poke-picker";
import PokeCard from "./poke-card";

export default function Home() {
  const [pokemonName, setPokemonName] = useState<string[]>([]);
  const [pokemonData, setPokemonData] = useState<any[]>([]);
  const [points, setPoints] = useState<number>(120);

  useEffect(() => {
    console.log(pokemonName);
    const fetchPokemon = async (pokemon: string) => {
      const formattedPokemon = pokemon.toLowerCase().replace(/\s/g, "-");
      let sprite: string = "https://archives.bulbagarden.net/media/upload/8/8e/Spr_3r_000.png";
      try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${formattedPokemon}/`);
        const data = await response.json();
        
        const response2 = await fetch(data.sprites.front_default);
        const data2 = await response2.blob();

        sprite = URL.createObjectURL(data2);
        
        
        setPokemonData(prevData => [...prevData, { name: pokemon, type: data.types.map((type: any) => type.type.name), sprite }]);
      } catch (error) {
        setPokemonData(prevData => [...prevData, { name: pokemon, type: [], sprite }]);
      }
    }
    pokemonName.forEach(pokemon => {
      if (!pokemonData.some(p => p.name === pokemon)) {
        fetchPokemon(pokemon);
      }
    });
  }, [pokemonName]);

  return (
    <div className="flex flex-col h-screen">
      <Header points={points} />
      <div className="flex flex-row flex-grow h-5/6">
        <div className="flex flex-col m-4 ml-8 w-1/3">
          <PokePicker
            pokemonName={pokemonName}
            setPokemonName={setPokemonName}
            pokemonData={pokemonData}
            setPokemonData={setPokemonData}
            points={points}
            setPoints={setPoints}
            />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 gap-4 m-4 flex-grow overflow-auto">
          {pokemonData.map((pokemon, index) => (
            <PokeCard
              key={index}
              pokemon={{
                name: pokemon.name,
                type: pokemon.type,
                sprite: pokemon.sprite
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
