"use client"

import Header from "@/components/header";
import Footer from "@/components/footer";
import PokeParty from "@/components/PokeParty";
import PokeInfo from "@/components/PokeInfo";
import PokeFinder from "@/components/PokeFinder";
import { useState } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import type { pokemon } from '../../lib/pokemonInterface';

export default function Home() {
  const [pokemonParty, setPokemonParty] = useState<pokemon[]>([]);
  const [numTeams, setNumTeams] = useState<number>(1);
  const [selectedPokemon, setSelectedPokemon] = useState<number>(-1);
  const [selectedTeam, setSelectedTeam] = useState<number>(1);

  return (
    <>
      <ClerkProvider>
        <Header numTeams={numTeams} setNumTeams={setNumTeams} selectedTeam={selectedTeam} setSelectedTeam={setSelectedTeam} />
          <div className="flex flex-col gap-8 p-8">
            <div className="flex md:flex-row flex-col gap-4">
              <PokeParty pokemonParty={pokemonParty} setPokemonParty={setPokemonParty} setSelectedPokemon={setSelectedPokemon} />
              <PokeInfo selectedPokemon={selectedPokemon} pokemonParty={pokemonParty} setPokemonParty={setPokemonParty} />
            </div>
            <PokeFinder setPokemonParty={setPokemonParty} />
          </div>
        <Footer />
      </ClerkProvider>
    </>   
  );
}
