"use client";
import React, { use, useEffect, useState } from "react";
import Header from "./header";
import PokePicker from "./poke-picker";
import PokeCard from "./poke-card";
import { Button } from "flowbite-react";

export default function Home() {
  const [points, setPoints] = useState<number>(() => {
    const storedPoints = localStorage.getItem("points");
    return storedPoints ? parseInt(storedPoints) : 120;
  });

  const [pokemonName, setPokemonName] = useState<string[]>(() => {
    const storedPokemonName = localStorage.getItem("pokemonName");
    return storedPokemonName ? JSON.parse(storedPokemonName) : [];
  });

  const [pokemonData, setPokemonData] = useState<any[]>(() => {
    const storedPokemonData = localStorage.getItem("pokemonData");
    return storedPokemonData ? JSON.parse(storedPokemonData) : [];
  });

  useEffect(() => {
    localStorage.setItem("points", points.toString());
  }, [points]);

  useEffect(() => {
    localStorage.setItem("pokemonName", JSON.stringify(pokemonName));
  }, [pokemonName]);

  useEffect(() => {
    localStorage.setItem("pokemonData", JSON.stringify(pokemonData));
  }, [pokemonData]);

  useEffect(() => {
    //console.log(pokemonName);
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
        <div className="flex flex-col m-4 ml-8 w-1/3 gap-2">
          <PokePicker
            pokemonName={pokemonName}
            setPokemonName={setPokemonName}
            pokemonData={pokemonData}
            setPokemonData={setPokemonData}
            points={points}
            setPoints={setPoints}
          />
          <Button onClick={() => {
            setPokemonData([]);
            setPokemonName([]);
            setPoints(120);
          }} className="m-4 transition duration-200 active:scale-95">
            Clear All
          </Button>
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
