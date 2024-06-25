import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import axios from 'axios';
import PokeSlot from "@/components/PokeSlot";
import IETabber from "@/components/IETabber";
import "@/app/globals.css";
import type { pokemon } from '../../lib/pokemonInterface';

export default function PokeParty({ pokemonParty, setPokemonParty, setSelectedPokemon }: { pokemonParty: pokemon[], setPokemonParty: React.Dispatch<React.SetStateAction<pokemon[]>>, setSelectedPokemon: React.Dispatch<React.SetStateAction<number>> }) {
    const { isSignedIn } = useAuth();
    
    useEffect(() => {
        if (isSignedIn) {
            axios.get("/api/pokemon-party")
                .then(response => {
                    setPokemonParty(response.data.pokemonParty);
                })
                .catch(error => {
                    console.error("Error fetching pokemon party:", error);
                });
        } else {
            setPokemonParty([]);
        }
    }, [isSignedIn]);

    return (
        <div className="flex flex-col items-center py-4">
            <div className="p-6 grid md:grid-cols-2 grid-cols-3 gap-4">
                {pokemonParty.map((pokemon, index) => (
                    <PokeSlot key={pokemon.id} pokemon={pokemon} index={index} setPokemonParty={setPokemonParty} setSelectedPokemon={setSelectedPokemon} />
                ))}
                {Array(Math.max(0, 6 - pokemonParty.length)).fill(
                    <PokeSlot pokemon={null} index={-1} setPokemonParty={setPokemonParty} setSelectedPokemon={setSelectedPokemon} />
                )}
            </div>
            <div>
                <IETabber leftLabel={"Import"} rightLabel={"Export"} />
            </div>
        </div>
    );
}