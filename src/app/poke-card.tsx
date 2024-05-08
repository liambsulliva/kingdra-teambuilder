import React from 'react';
import { Card, DropdownItem } from "flowbite-react";
import { Button } from "flowbite-react";
import { Dropdown } from "flowbite-react";
import { Alert } from "flowbite-react";

interface PokeCardProps {
  pokemon: {
    name: string;
    points: number;
    type: string[];
    sprite: string;
  };
}

interface PokemonTypes {
  [key: string]: string;
}

//TODO: Implement Tera Captains w/ Relevant Clauses
export default function PokeCard({ pokemon }: PokeCardProps) {
  const pokemonTypes: PokemonTypes = require("./pokemon-types.json");
  const bannedTera: string[] = require("./banned-tera.json");
  const [isTera, setIsTera] = React.useState<boolean>(false);
  const [enableDropdown, setEnableDropdown] = React.useState<boolean>(false);
  const [alert, setAlert] = React.useState<string | null>(null);
  const [selectedType, setSelectedType] = React.useState<string>("Type 1");
  const [selectedType2, setSelectedType2] = React.useState<string>("Type 2");
  const [selectedType3, setSelectedType3] = React.useState<string>("Type 3");

  const uppercaseFirstLetter = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  return (
    <Card>
      <img src={pokemon.sprite} alt={pokemon.name} />
      <div>
        <h5 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          {pokemon.name}
        </h5>
        <p>
          {`${pokemon.points} Points`}
        </p>
      </div>
      
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
          if (!bannedTera.includes(pokemon.name)) {
            setIsTera(!isTera)
            setSelectedType("Type 1");
            setSelectedType2("Type 2");
            setSelectedType3("Type 3");
            setEnableDropdown(!enableDropdown);
          } else {
            setAlert("This Pokemon is Banned from being a Tera Captain!");
            setTimeout(() => {
              setAlert(null);
            }, 3000);
          }
        }}
      >
        Tera Captain
      </Button>
      {alert && (
        <Alert className="absolute top-0 left-0 right-0 m-auto" color="failure" onDismiss={() => setAlert(null)} >
          <span>{alert}</span>
        </Alert>
      )}
      {enableDropdown && (
        <>
          <Dropdown outline gradientDuoTone={"purpleToBlue"} label={selectedType} dismissOnClick={true}>
            {Object.keys(pokemonTypes).map((type, index) => (
              <DropdownItem key={index} onClick={() => setSelectedType(uppercaseFirstLetter(type))}>{uppercaseFirstLetter(type)}</DropdownItem>
            ))}
          </Dropdown>
          <Dropdown outline gradientDuoTone={"purpleToBlue"} label={selectedType2} dismissOnClick={true}>
            {Object.keys(pokemonTypes).map((type, index) => (
              <DropdownItem key={index} onClick={() => setSelectedType2(uppercaseFirstLetter(type))}>{uppercaseFirstLetter(type)}</DropdownItem>
            ))}
          </Dropdown>
          <Dropdown outline gradientDuoTone={"purpleToBlue"} label={selectedType3} dismissOnClick={true}>
            {Object.keys(pokemonTypes).map((type, index) => (
              <DropdownItem key={index} onClick={() => setSelectedType3(uppercaseFirstLetter(type))}>{uppercaseFirstLetter(type)}</DropdownItem>
            ))}
          </Dropdown>
        </>
      )}
    </Card>
  );
}