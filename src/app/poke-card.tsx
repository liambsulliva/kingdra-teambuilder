import React from 'react';
import { Card } from "flowbite-react";
import { Button } from "flowbite-react";

interface PokeCardProps {
  pokemon: {
    name: string;
    type: any;
    sprite: string;
    isTera: boolean;
  };
}

//TODO: Implement Tera Captains w/ Relevant Clauses
export default function PokeCard({ pokemon }: PokeCardProps) {
  return (
    <Card>
      <img src={pokemon.sprite} alt={pokemon.name} />
      <h5 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        {pokemon.name}
      </h5>
      <p className="font-normal text-gray-700 dark:text-gray-400">
        {/*`${type[0]} ${type[1]}`*/}
      </p>
      <Button outline gradientDuoTone={"purpleToBlue"} className="transition duration-200 active:scale-95" onClick={() => pokemon.isTera = true}>Tera Captain</Button>
    </Card>
  );
}