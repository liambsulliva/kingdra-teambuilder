import React, { useState } from "react";
import { Accordion, Button, Alert } from "flowbite-react";
import pokemondata from "./pokemon-data.json";

interface PokePickerProps {
    pokemonName: string[];
    setPokemonName: React.Dispatch<React.SetStateAction<string[]>>;
    pokemonData: any[];
    setPokemonData: React.Dispatch<React.SetStateAction<any[]>>;
    points: number;
    setPoints: React.Dispatch<React.SetStateAction<number>>;
    pokemonPoints: number[];
    setPokemonPoints: React.Dispatch<React.SetStateAction<number[]>>;
}

export default function PokePicker({
    pokemonName,
    setPokemonName,
    pokemonData,
    setPokemonData,
    points,
    setPoints,
    pokemonPoints,
    setPokemonPoints,
}: PokePickerProps) {
    const [alert, setAlert] = useState<string | null>(null);

    const addPokemon = (pokemon: string, negPoints: number) => {
        if (pokemonName.length >= 12) {
            setAlert("Team is Full!");
            setTimeout(() => {
                setAlert(null);
            }, 3000);
        } else if (points < negPoints) {
            setAlert("Not Enough Points!");
            setTimeout(() => {
                setAlert(null);
            }, 3000);
        } else {
            setPokemonName([...pokemonName, pokemon]);
            setPoints(points - negPoints);
            setPokemonPoints([...pokemonPoints, negPoints]);
        }
        console.log(pokemonPoints);
    };

    const removePokemon = (pokemon: string, posPoints: number) => {
        const pokemonIndex = pokemonName.indexOf(pokemon);
        const updatedPokemonName = [...pokemonName];
        updatedPokemonName.splice(pokemonIndex, 1);
        setPokemonName(updatedPokemonName);

        const pointsIndex = pokemonPoints.indexOf(posPoints);
        const updatedPokemonPoints = [...pokemonPoints];
        updatedPokemonPoints.splice(pointsIndex, 1);
        setPokemonPoints(updatedPokemonPoints);

        const dataIndex = pokemonData.findIndex((data) => data.name === pokemon);
        const updatedPokemonData = [...pokemonData];
        updatedPokemonData.splice(dataIndex, 1);
        setPokemonData(updatedPokemonData);

        setPoints(points + posPoints);
    };

    return (
        <div style={{ overflowY: "auto", maxHeight: "100vh", overflowX: "hidden" }}>
            {alert && (
                <Alert className="absolute top-0 left-0 right-0 m-auto" color="warning" onDismiss={() => setAlert(null)}>
                    <span>{alert}</span>
                </Alert>
            )}
            <Accordion className="whitespace-nowrap">
                {pokemondata.map((item) => (
                    <Accordion.Panel key={item.Points}>
                        <Accordion.Title>{`${item.Points} Points`}</Accordion.Title>
                        <Accordion.Content>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {item.Pokemon.map((pokemon) => (
                                    <Button
                                        key={pokemon}
                                        color="gray"
                                        className="transition duration-200 active:scale-95"
                                        onClick={() => {
                                            if (pokemonName.includes(pokemon)) {
                                                removePokemon(pokemon, item.Points);
                                            } else {
                                                addPokemon(pokemon, item.Points);
                                            }
                                        }}
                                    >
                                        {pokemon}
                                    </Button>
                                ))}
                            </div>
                        </Accordion.Content>
                    </Accordion.Panel>
                ))}
            </Accordion>
        </div>
    );
}
