import React from 'react';
import { Card, DropdownItem } from "flowbite-react";
import { Button } from "flowbite-react";
import { Dropdown } from "flowbite-react";

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
  const [enableDropdown, setEnableDropdown] = React.useState<boolean>(false);
  const [selectedType, setSelectedType] = React.useState<string>("Tera Type");
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
        onClick={() => {
          setIsTera(!isTera)
          setEnableDropdown(!enableDropdown);
        }}
      >
        Tera Captain
      </Button>
      {enableDropdown && (
        <Dropdown outline gradientDuoTone={"purpleToBlue"} label={selectedType} dismissOnClick={true}>
          {Object.keys(pokemonTypes).map((type, index) => (
            <DropdownItem key={index} onClick={() => setSelectedType(type.charAt(0).toUpperCase() + type.slice(1))}>{type.charAt(0).toUpperCase() + type.slice(1)}</DropdownItem>
          ))}
        </Dropdown>
      )}
    </Card>
  );
}