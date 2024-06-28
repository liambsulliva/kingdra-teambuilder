import React from 'react';
import { Button, ButtonGroup } from "flowbite-react";
import DownloadIcon from "./DownloadIcon";
import UploadIcon from "./UploadIcon";
import { pokemon } from '../../lib/pokemonInterface';

export default function Component({ selectedPokemon, pokemonParty, setPokemonParty }: { selectedPokemon: number, pokemonParty: pokemon[], setPokemonParty: React.Dispatch<React.SetStateAction<pokemon[]>> }) {
  const capitalizeFirstLetter = (str: string): string => {
    return str.replace(/\b\w/g, char => char.toUpperCase());
  };

  const statIndexToName = (index: number): string => {
    switch (index) {
      case 0:
        return 'HP';
      case 1:
        return 'Atk';
      case 2:
        return 'Def';
      case 3:
        return 'SpA';
      case 4:
        return 'SpD';
      case 5:
        return 'Spe';
      default:
        return '';
    }
  };

  const formatPokemonData = (pokemon: pokemon): string => {
    let output = `${capitalizeFirstLetter(pokemon.name)} @ ${capitalizeFirstLetter(pokemon.item)}\n`;
    output += `Ability: ${capitalizeFirstLetter(pokemon.ability)}\n`;
    
    if (pokemon.ev) {
      const evs = Object.entries(pokemon.ev)
        .filter(([_, value]) => value > 0)
        .map(([stat, value]) => `${value} ${statIndexToName(parseInt(stat))}`)
        .join(' / ');
      output += `EVs: ${evs}\n`;
    }
    
    if (pokemon.iv) {
      const ivs = Object.entries(pokemon.iv)
        .filter(([_, value]) => value !== 31)
        .map(([stat, value]) => `${value} ${statIndexToName(parseInt(stat))}`)
        .join(' / ');
      if (ivs) output += `IVs: ${ivs}\n`;
    }
    
    if (pokemon.tera_type) {
      output += `Tera Type: ${capitalizeFirstLetter(pokemon.tera_type)}\n`;
    }
    
    output += `${capitalizeFirstLetter(pokemon.nature)} Nature\n`;
    
    pokemon.moves.forEach(move => {
      output += `- ${capitalizeFirstLetter(move)}\n`;
    });
    
    return output;
  };

  const exportSelectedPokemon = () => {
    if (selectedPokemon >= 0 && selectedPokemon < pokemonParty.length) {
      const formattedData = formatPokemonData(pokemonParty[selectedPokemon]);
      navigator.clipboard.writeText(formattedData).then(() => {
        alert('Selected Pokémon data copied to clipboard!');
      }).catch(err => {
        console.error('Failed to copy text: ', err);
      });
    } else {
      alert('No valid Pokémon selected.');
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 m-4">
      <ButtonGroup>
        <Button color="gray" disabled>
          <DownloadIcon className="mr-3" />
          Import
        </Button>
        <Button color="gray" onClick={exportSelectedPokemon}>
          <UploadIcon className="mr-3" />
          Export
        </Button>
      </ButtonGroup>
    </div>
  );
}