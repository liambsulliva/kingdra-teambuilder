import type { pokemon } from "../../lib/pokemonInterface";
import typeColors from "../../lib/typeColors.json";
import typeMatchups from "../../lib/typeMatchups.json";
import { useState, useEffect } from "react";
import axios from "axios";

interface TypeCoverageProps {
    pokemonParty: Array<pokemon>;
}

interface PokemonInfo {
    types: Array<{ type: { name: string } }>;
}

interface TypeMatchup {
  weaknesses: string[];
  resistances: string[];
  immunities: string[];
}

interface TypeMatchups {
  [key: string]: TypeMatchup;
}

const typedTypeMatchups: TypeMatchups = typeMatchups as TypeMatchups;

export default function TypeCoverage({ pokemonParty }: TypeCoverageProps) {
    const [defensiveCoverage, setDefensiveCoverage] = useState<Record<string, number>>({});
    const [offensiveCoverage, setOffensiveCoverage] = useState<Record<string, number>>({});
    const [pokemonInfoList, setPokemonInfoList] = useState<Array<PokemonInfo>>([]);

    useEffect(() => {
        const fetchPokemonInfo = async () => {
            const infoList: Array<PokemonInfo> = [];
            for (const pokemon of pokemonParty) {
                if (pokemon.id !== 0) {
                    try {
                        const response = await axios.get(`/api/pokemon-info?id=${pokemon.id}`);
                        infoList.push(response.data);
                    } catch (error) {
                        //console.error(`Error fetching Pokemon ID ${pokemon.id}:`, error);
                    }
                }
            }
            setPokemonInfoList(infoList);
        };

        fetchPokemonInfo();
    }, [pokemonParty]);

    useEffect(() => {
        const calculateDefensiveCoverage = () => {
            const coverage: Record<string, number> = {};
            
            Object.keys(typeColors).forEach(attackingType => {
                coverage[attackingType] = pokemonInfoList.reduce((count, pokemon) => {
                    let weaknessCount = 0;
                    let resistanceCount = 0;

                    for (const typeObj of pokemon.types) {
                        const defenderType = typeObj.type.name;
                        
                        if (typedTypeMatchups[defenderType]?.weaknesses.includes(attackingType)) {
                            weaknessCount++;
                        }
                        if (typedTypeMatchups[defenderType]?.resistances.includes(attackingType)) {
                            resistanceCount++;
                        }
                        if (typedTypeMatchups[defenderType]?.immunities.includes(attackingType)) {
                            return count;
                        }
                    }

                    const netEffect = weaknessCount - resistanceCount;

                    if (netEffect > 0) {
                        return count + 1;
                    }
                    return count;
                }, 0);
            });

            setDefensiveCoverage(coverage);
        };

        const calculateOffensiveCoverage = () => {
            const coverage: Record<string, number> = {};
            
            Object.keys(typeColors).forEach(type => {
                coverage[type] = 0;
            });

            pokemonInfoList.forEach(pokemon => {
                pokemon.types.forEach(typeObj => {
                    const type = typeObj.type.name;
                    Object.keys(typeColors).forEach(otherType => {
                        if (otherType !== type && typedTypeMatchups[otherType]?.weaknesses.includes(type)) {
                            coverage[otherType] += 1;
                        }
                    });
                });
            });

            setOffensiveCoverage(coverage);
        };

        if (pokemonInfoList.length > 0) {
            calculateDefensiveCoverage();
            calculateOffensiveCoverage();
        }
    }, [pokemonInfoList]);

    return (
        <div className="flex max-md:flex-col gap-4">
            <div className="bg-[#f9f9f9] rounded p-4 w-1/2">
                <p className="text-center font-semibold p-2 pb-4">Offensive STAB Spread</p>
                <div className="grid grid-cols-5">
                    {Object.entries(typeColors).map(([type, color]) => (
                        <div className="flex flex-col gap-2 p-2 items-center" key={type}>
                            <div
                                className="rounded-xl px-4 py-2"
                                style={{ backgroundColor: `#${color}` }}
                            >
                                <p className="text-center capitalize text-white font-semibold">{type}</p>
                            </div>
                            <p className={offensiveCoverage[type] >= 3 ? "text-green-500" : ""}>
                                {offensiveCoverage[type] || 0}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
            <div className="bg-[#f9f9f9] rounded p-4 w-1/2">
                <p className="text-center font-semibold p-2 pb-4">Weakness Spread</p>
                <div className="grid grid-cols-5">
                    {Object.entries(typeColors).map(([type, color]) => (
                        <div className="flex flex-col gap-2 p-2 items-center" key={type}>
                            <div
                                className="rounded-xl px-4 py-2"
                                style={{ backgroundColor: `#${color}` }}
                            >
                                <p className="text-center capitalize text-white font-semibold">{type}</p>
                            </div>
                            <p className={defensiveCoverage[type] >= 3 ? "text-red-500" : ""}>
                                {defensiveCoverage[type] || 0}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}