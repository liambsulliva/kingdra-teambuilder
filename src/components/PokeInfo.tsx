"use client";

import "@/app/globals.css";
import typeColors from "../../lib/typeColors.json";
import natures from "../../lib/natures.json";
import { Button } from "flowbite-react";
import { useEffect, useState } from "react";
import axios from "axios";
import StatBar from "./StatBar";
import type { pokemon } from "../../lib/pokemonInterface";
import LocalIETabber from "./LocalIETabber";
import NatureSelect from "./NatureSelect";
import ItemSelect from "./ItemSelect";
import TeraSelect from "./TeraSelect";
import LevelSelect from "./LevelSelect";

type PokemonType = keyof typeof typeColors;

export default function PokeInfo({
  selectedPokemon,
  pokemonParty,
  setPokemonParty,
}: {
  selectedPokemon: number;
  pokemonParty: pokemon[];
  setPokemonParty: React.Dispatch<React.SetStateAction<pokemon[]>>;
}) {
  const [pokemonInfo, setPokemonInfo] = useState<any>();
  const [totalEVs, setTotalEVs] = useState(0);

  useEffect(() => {
    const fetchPokemonInfo = async () => {
      try {
        if (pokemonParty[selectedPokemon].id !== 0) {
          const response = await axios.get(
            `/api/pokemon-info?id=${pokemonParty[selectedPokemon].id}`,
          );
          setPokemonInfo(response.data);
          if (
            !pokemonParty[selectedPokemon].ability &&
            response.data.abilities.length > 0
          ) {
            handleAbilitySelect(response.data.abilities[0].ability.name);
          }
        }
      } catch (error) {
        console.error(`Server returned ${error}`);
      }
    };
    if (
      pokemonParty &&
      pokemonParty[selectedPokemon] &&
      pokemonParty[selectedPokemon].ev
    ) {
      const newTotalEVs = pokemonParty[selectedPokemon].ev.reduce(
        (sum, ev) => sum + ev,
        0,
      );
      setTotalEVs(newTotalEVs);
    }
    fetchPokemonInfo();
  }, [selectedPokemon]);

  const handleMoveChange = (index: number, value: string) => {
    setPokemonParty((prevParty) => {
      const newParty = [...prevParty];
      newParty[selectedPokemon] = {
        ...newParty[selectedPokemon],
        // @ts-ignore
        moves: newParty[selectedPokemon].moves.map((move, i) =>
          i === index ? value : move,
        ),
      };
      return newParty;
    });
  };

  const handleAbilitySelect = (abilityName: string) => {
    setPokemonParty((prevParty) => {
      const newParty = [...prevParty];
      newParty[selectedPokemon] = {
        ...newParty[selectedPokemon],
        ability: abilityName,
      };
      return newParty;
    });
  };

  return (
    <div className="bg-[#f9f9f9] rounded flex-grow">
      {pokemonInfo && pokemonParty[selectedPokemon] && (
        <div className="flex flex-row max-md:flex-col justify-between gap-6 bg-white rounded-lg shadow-md py-12 pl-16 pr-8">
          <div>
            <h2 className="text-4xl font-extrabold text-black mb-3 capitalize">
              {pokemonInfo.name}
            </h2>
            <LevelSelect
              selectedPokemon={selectedPokemon}
              pokemonParty={pokemonParty}
              setPokemonParty={setPokemonParty}
            />
            {pokemonInfo.sprites.versions["generation-v"]["black-white"]
              .animated.front_default ? (
              <img
                src={
                  pokemonInfo.sprites.versions["generation-v"]["black-white"]
                    .animated.front_default
                }
                alt={pokemonInfo.name}
                className="w-40 h-40 mb-6 object-contain"
              />
            ) : (
              <img
                src={pokemonParty[selectedPokemon].sprite}
                alt={pokemonParty[selectedPokemon].name}
                className="w-40 h-40 mx-auto mb-6 object-contain"
              />
            )}
            <div className="flex flex-col">
              <p className="flex text-xl items-center text-lg text-gray-600 mb-4 gap-2.5">
                Type:
                <div className="flex max-md:flex-wrap items-center px-2 gap-2">
                  <span
                    className="font-semibold select-none capitalize px-4 py-2 border rounded-xl text-white"
                    style={{
                      backgroundColor: `#${typeColors[pokemonInfo.types[0].type.name as PokemonType]}`,
                    }}
                  >
                    {pokemonInfo.types[0].type.name}
                  </span>
                  {pokemonInfo.types[1] && (
                    <span
                      className="font-semibold select-none capitalize px-4 py-2 border rounded-xl text-white"
                      style={{
                        backgroundColor: `#${typeColors[pokemonInfo.types[1].type.name as PokemonType]}`,
                      }}
                    >
                      {pokemonInfo.types[1].type.name}
                    </span>
                  )}
                  <TeraSelect
                    selectedPokemon={selectedPokemon}
                    pokemonParty={pokemonParty}
                    setPokemonParty={setPokemonParty}
                  />
                </div>
              </p>
              <div className="flex gap-4 items-center mb-4">
                <h3 className="text-xl text-gray-600">Ability:</h3>
                <ul className="flex flex-wrap text-nowrap gap-2">
                  {pokemonInfo.abilities.map((ability: any, index: number) => (
                    <Button
                      key={index}
                      color={
                        pokemonParty[selectedPokemon].ability ===
                        ability.ability.name
                          ? "blue"
                          : "light"
                      }
                      onClick={() => handleAbilitySelect(ability.ability.name)}
                      className={`font-bold capitalize`}
                    >
                      {ability.ability.name}
                    </Button>
                  ))}
                </ul>
              </div>
              <NatureSelect
                selectedPokemon={selectedPokemon}
                pokemonParty={pokemonParty}
                setPokemonParty={setPokemonParty}
              />
              <ItemSelect
                selectedPokemon={selectedPokemon}
                pokemonParty={pokemonParty}
                setPokemonParty={setPokemonParty}
              />
            </div>
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className="w-full flex md:justify-end justify-center pt-2 relative text-gray-600"
                  >
                    <input
                      className="border-2 border-gray-300 bg-white h-10 px-5 pr-16 rounded-lg text-sm focus:outline-none"
                      type="text"
                      name={`move${index + 1}`}
                      placeholder={`Move ${index + 1}`}
                      value={pokemonParty[selectedPokemon].moves[index]}
                      onChange={(e) => handleMoveChange(index, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="mb-4">
              <p className="text-gray-500">
                Remaining EV points: {508 - totalEVs}
              </p>
            </div>
            <div className="grid grid-cols-2 max-md:grid-cols-1 gap-16 h-full flex-wrap justify-evenly md:border rounded-xl md:p-12">
              <StatBar
                label={"HP"}
                id={0}
                baseValue={pokemonInfo.stats[0].base_stat}
                level={pokemonParty[selectedPokemon].level}
                iv={pokemonParty[selectedPokemon].iv[0]}
                ev={pokemonParty[selectedPokemon].ev[0]}
                totalEVs={totalEVs}
                setTotalEVs={setTotalEVs}
                selectedPokemon={selectedPokemon}
                setPokemonParty={setPokemonParty}
                selectedNature={pokemonParty[selectedPokemon].nature}
                natures={natures}
              />
              <StatBar
                label={"Atk"}
                id={1}
                baseValue={pokemonInfo.stats[1].base_stat}
                level={pokemonParty[selectedPokemon].level}
                iv={pokemonParty[selectedPokemon].iv[1]}
                ev={pokemonParty[selectedPokemon].ev[1]}
                totalEVs={totalEVs}
                setTotalEVs={setTotalEVs}
                selectedPokemon={selectedPokemon}
                setPokemonParty={setPokemonParty}
                selectedNature={pokemonParty[selectedPokemon].nature}
                natures={natures}
              />
              <StatBar
                label={"Def"}
                id={2}
                baseValue={pokemonInfo.stats[2].base_stat}
                level={pokemonParty[selectedPokemon].level}
                iv={pokemonParty[selectedPokemon].iv[2]}
                ev={pokemonParty[selectedPokemon].ev[2]}
                totalEVs={totalEVs}
                setTotalEVs={setTotalEVs}
                selectedPokemon={selectedPokemon}
                setPokemonParty={setPokemonParty}
                selectedNature={pokemonParty[selectedPokemon].nature}
                natures={natures}
              />
              <StatBar
                label={"Sp. Atk"}
                id={3}
                baseValue={pokemonInfo.stats[3].base_stat}
                level={pokemonParty[selectedPokemon].level}
                iv={pokemonParty[selectedPokemon].iv[3]}
                ev={pokemonParty[selectedPokemon].ev[3]}
                totalEVs={totalEVs}
                setTotalEVs={setTotalEVs}
                selectedPokemon={selectedPokemon}
                setPokemonParty={setPokemonParty}
                selectedNature={pokemonParty[selectedPokemon].nature}
                natures={natures}
              />
              <StatBar
                label={"Sp. Def"}
                id={4}
                baseValue={pokemonInfo.stats[4].base_stat}
                level={pokemonParty[selectedPokemon].level}
                iv={pokemonParty[selectedPokemon].iv[4]}
                ev={pokemonParty[selectedPokemon].ev[4]}
                totalEVs={totalEVs}
                setTotalEVs={setTotalEVs}
                selectedPokemon={selectedPokemon}
                setPokemonParty={setPokemonParty}
                selectedNature={pokemonParty[selectedPokemon].nature}
                natures={natures}
              />
              <StatBar
                label={"Speed"}
                id={5}
                baseValue={pokemonInfo.stats[5].base_stat}
                level={pokemonParty[selectedPokemon].level}
                iv={pokemonParty[selectedPokemon].iv[5]}
                ev={pokemonParty[selectedPokemon].ev[5]}
                totalEVs={totalEVs}
                setTotalEVs={setTotalEVs}
                selectedPokemon={selectedPokemon}
                setPokemonParty={setPokemonParty}
                selectedNature={pokemonParty[selectedPokemon].nature}
                natures={natures}
              />
            </div>
            <div className="flex max-md:flex-col items-center max-md:pt-8 justify-between">
              <a
                className="text-gray-500 hover:underline max-md:text-center"
                target="_blank"
                href={`https://www.smogon.com/dex/sv/pokemon/${pokemonInfo.name}`}
              >
                Smogon Breakdown
              </a>
              <LocalIETabber
                selectedPokemon={selectedPokemon}
                pokemonParty={pokemonParty}
                setPokemonParty={setPokemonParty}
                setTotalEVs={setTotalEVs}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
