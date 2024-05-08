"use client"
import React, { useEffect, useState } from "react";
import Header from "./header";
import PokePicker from "./poke-picker";
import PokeCard from "./poke-card";
import { Button, Alert } from "flowbite-react";

export default function Home() {
  const [points, setPoints] = useState<number>(120);
  const [pokemonName, setPokemonName] = useState<string[]>([]);
  const [pokemonPoints, setPokemonPoints] = useState<number[]>([]);
  const [pokemonData, setPokemonData] = useState<any[]>([]);
  const [exportAlert, setExportAlert] = useState<string | null>(null);

  const updatePokemonData = async () => {
    const updatedPokemonData = [];
    for (let i = 0; i < pokemonName.length; i++) {
      const formattedPokemon = pokemonName[i].toLowerCase().replace(/\s/g, "-");
      let sprite = "/unknown-sprite.png";
      try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${formattedPokemon}/`);
        const data = await response.json();
        const response2 = await fetch(data.sprites.front_default);
        const data2 = await response2.blob();
        sprite = URL.createObjectURL(data2);
        updatedPokemonData.push({ name: pokemonName[i], points: pokemonPoints[i], type: data.types.map((type: any) => type.type.name), sprite, tera: false });
      } catch (error) {
        updatedPokemonData.push({ name: pokemonName[i], points: pokemonPoints[i], type: [], sprite, tera: false });
      }
    }
    setPokemonData(updatedPokemonData);
  };

  const handleImport = () => {
    const inputData = prompt("Enter your data (No Tera Captains): ");
    if (inputData) {
      try {
        const { pokemonName, pokemonPoints } = JSON.parse(inputData);
        setPokemonName(pokemonName);
        setPokemonPoints(pokemonPoints);
        setPoints(120);
        for (let i = 0; i < pokemonName.length; i++) {
          setPoints((prevPoints) => prevPoints - pokemonPoints[i]);
        }
        updatePokemonData();
      } catch (error) {
        alert("Invalid Input. Please try again.");
      }
    }
  };

  const handleClearAll = () => {
    setPokemonData([]);
    setPokemonName([]);
    setPokemonPoints([]);
    setPoints(120);
  };

  const handleExport = () => {
    const data = JSON.stringify({ pokemonName, pokemonPoints });
    navigator.clipboard.writeText(data);
    setExportAlert("Data Copied to Clipboard! (Tera Captains not included)");
    setTimeout(() => {
      setExportAlert(null);
    }, 3000);
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
            pokemonPoints={pokemonPoints}
            setPokemonPoints={setPokemonPoints}
          />
          <Button.Group className="m-auto my-2">
            <Button onClick={handleImport}>Import</Button>
            <Button onClick={handleClearAll}>Clear All</Button>
            <Button onClick={handleExport}>Export</Button>
          </Button.Group>
          {exportAlert && (
            <Alert className="absolute top-0 left-0 right-0 m-auto" color="success" onDismiss={() => setExportAlert(null)}>
              <span>{exportAlert}</span>
            </Alert>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 gap-4 m-4 flex-grow overflow-auto">
          {pokemonData.map((pokemon, index) => (
            <PokeCard
              key={index}
              pokemon={{
                name: pokemon.name,
                points: pokemon.points,
                type: pokemon.type,
                sprite: pokemon.sprite,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
