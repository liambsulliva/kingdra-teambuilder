import React from 'react';
import { Card } from "flowbite-react";
import { Button } from "flowbite-react";
import pokemontypes from "./pokemon-types.json";

interface PokeCardProps {
  pokemon: {
    name: string;
    type: string[];
    sprite: string;
    isTera: boolean;
  };
}

interface PokemonTypes {
  [key: string]: string;
}

//TODO: Implement Tera Captains w/ Relevant Clauses
export default function PokeCard({ pokemon }: PokeCardProps) {
  const pokemonTypes: PokemonTypes = require("./pokemon-types.json");
  const [isTera, setIsTera] = React.useState<boolean>(false);
  return (
    <Card>
      <img src={pokemon.sprite} alt={pokemon.name} />
      <h5 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        {pokemon.name}
      </h5>
      <div className="flex flex-row gap-2">
        {pokemon.type.map((type, index) => (
          <img
            key={index}
            src={pokemonTypes[type]}
            alt={type}
            className="w-8 h-8"
          />
        ))}
      </div>
      <Button
        outline={!isTera}
        gradientDuoTone={"purpleToBlue"}
        className="transition duration-200 active:scale-95"
        onClick={() => setIsTera(!isTera)}
      >
        Tera Captain
      </Button>
    </Card>
  );
}