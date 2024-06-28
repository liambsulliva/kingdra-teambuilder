import React, { useState } from 'react';
import { Button, ButtonGroup, Modal, Textarea } from "flowbite-react";
import DownloadIcon from "./DownloadIcon";
import UploadIcon from "./UploadIcon";
import { pokemon } from '../../lib/pokemonInterface';

export default function Component({ selectedPokemon, pokemonParty, setPokemonParty, setTotalEVs }: { selectedPokemon: number, pokemonParty: pokemon[], setPokemonParty: React.Dispatch<React.SetStateAction<pokemon[]>>, setTotalEVs: React.Dispatch<React.SetStateAction<number>> }) {
  const [showModal, setShowModal] = useState(false);
  const [importText, setImportText] = useState('');
  
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

  const importPokemon = () => {
    const importedPokemon = parsePokemonData(importText);
    if (importedPokemon) {
      setPokemonParty(prevParty => {
        const newParty = [...prevParty];
        newParty[selectedPokemon] = {
          ...newParty[selectedPokemon],
          ...importedPokemon
        };
        return newParty;
      });
      if (importedPokemon.ev) {
        const totalEVs = importedPokemon.ev.reduce((sum, ev) => sum + ev, 0);
        setTotalEVs(prevTotal => prevTotal + totalEVs);
      }
      setShowModal(false);
      setImportText('');
      alert('Pokémon data imported successfully!');
    } else {
      alert('Invalid Pokémon data format. Please check the input.');
    }
  };

  const parsePokemonData = (data: string): Partial<pokemon> | null => {
    const lines = data.split('\n').map(line => line.trim());
    if (lines.length < 3) return null;

    const [nameItem, abilityLine, ...rest] = lines;
    const [name, item] = nameItem.split('@').map(s => s.trim());
    const ability = abilityLine.split(':')[1].trim();

    let ev: [number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0];
    let iv: [number, number, number, number, number, number] = [31, 31, 31, 31, 31, 31];
    let tera_type: string | undefined;
    let nature: string = '';
    let moves: [string, string, string, string] = ['', '', '', ''];

    rest.forEach(line => {
      if (line.startsWith('EVs:')) {
        const evs = line.substring(4).split('/');
        evs.forEach(stat => {
          const [value, name] = stat.trim().split(' ');
          const index = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'].indexOf(name);
          if (index !== -1) {
            ev[index] = parseInt(value);
          }
        });
      } else if (line.startsWith('IVs:')) {
        const ivs = line.substring(4).split('/');
        ivs.forEach(stat => {
          const [value, name] = stat.trim().split(' ');
          const index = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'].indexOf(name);
          if (index !== -1) {
            iv[index] = parseInt(value);
          }
        });
      } else if (line.startsWith('Tera Type:')) {
        tera_type = line.split(':')[1].trim();
      } else if (line.endsWith('Nature')) {
        nature = line.split(' ')[0];
      } else if (line.startsWith('-')) {
        const moveIndex = moves.findIndex(move => move === '');
        if (moveIndex !== -1) {
          moves[moveIndex] = line.substring(1).trim();
        }
      }
    });

    return {
      name: name.toLowerCase(),
      item: item.toLowerCase(),
      ability: ability.toLowerCase(),
      ev: ev,
      iv: iv,
      tera_type: tera_type?.toLowerCase(),
      nature: nature.toLowerCase(),
      moves: moves
    };
  };

  return (
    <div className="flex flex-col items-center gap-2 m-4">
      <ButtonGroup>
        <Button color="gray" onClick={() => setShowModal(true)}>
          <DownloadIcon className="mr-3" />
          Import
        </Button>
        <Button color="gray" onClick={exportSelectedPokemon}>
          <UploadIcon className="mr-3" />
          Export
        </Button>
      </ButtonGroup>

      <Modal show={showModal} onClose={() => setShowModal(false)}>
        <Modal.Header>Import Pokémon Data</Modal.Header>
        <Modal.Body>
          <Textarea
            rows={10}
            placeholder="Paste Pokémon data here..."
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={importPokemon}>Import</Button>
          <Button color="gray" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}