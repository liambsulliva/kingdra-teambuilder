"use client";
import React, { use, useEffect, useState } from "react";
import Header from "./header";
import PokePicker from "./poke-picker";
import PokeCard from "./poke-card";
import { Button } from "flowbite-react";

export default function Home() {
  const [points, setPoints] = useState<number>(120);
  const [pokemonName, setPokemonName] = useState<string[]>([]);
  const [pokemonData, setPokemonData] = useState<any[]>([]);

  const updatePokemonData = async () => {
    const updatedPokemonData = [];
    for (const pokemon of pokemonName) {
      const formattedPokemon = pokemon.toLowerCase().replace(/\s/g, "-");
      let sprite = "https://archives.bulbagarden.net/media/upload/8/8e/Spr_3r_000.png";
      try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${formattedPokemon}/`);
        const data = await response.json();
        const response2 = await fetch(data.sprites.front_default);
        const data2 = await response2.blob();
        sprite = URL.createObjectURL(data2);
        updatedPokemonData.push({ name: pokemon, type: data.types.map((type: any) => type.type.name), sprite, tera: false });
      } catch (error) {
        updatedPokemonData.push({ name: pokemon, type: [], sprite, tera: false });
      }
    }
    setPokemonData(updatedPokemonData);
  };

  useEffect(() => {
    updatePokemonData();
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
          <Button.Group className="m-auto my-2">
            <Button onClick={() => {
              const inputData = prompt("Enter your data: ");
              if (inputData) {
                setPokemonName(JSON.parse(inputData));
                updatePokemonData();
              } else {
                alert("Invalid Input. Please try again.");
              }
            }}>
              Import
            </Button>
            <Button onClick={() => {
              setPokemonData([]);
              setPokemonName([]);
              setPoints(120);
            }}>
              Clear All
            </Button>
            <Button onClick={() => {
                const data = JSON.stringify(pokemonName);
                navigator.clipboard.writeText(data);
                alert("Data Copied to Clipboard!");
              }
            }>
              Export
            </Button>
          </Button.Group>
          
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 gap-4 m-4 flex-grow overflow-auto">
          {pokemonData.map((pokemon, index) => (
            <PokeCard
              key={index}
              pokemon={{
                name: pokemon.name,
                type: pokemon.type,
                sprite: pokemon.sprite,
                isTera: pokemon.tera,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
