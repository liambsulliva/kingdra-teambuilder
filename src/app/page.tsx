"use client"

import Header from "@/components/header";
import Footer from "@/components/footer";
import PokeParty from "@/components/PokeParty";
import PokeInfo from "@/components/PokeInfo";
import PokeFinder from "@/components/PokeFinder";
import PokeSearch from "@/components/PokeSearch";
import { ClerkProvider } from '@clerk/nextjs'

import { useState } from "react";

interface pokemon {
  name: string,
  id: number,
  sprite: string
}

export default function Home() {
  const [pokemonParty, setPokemonParty] = useState<pokemon[]>([]);
  const [numTeams, setNumTeams] = useState<number>(1);
  const [selectedPokemon, setSelectedPokemon] = useState<pokemon>({ name: "", id: 0, sprite: "" });
  const [selectedTeam, setSelectedTeam] = useState<number>(1);

  return (
    <>
      <ClerkProvider>
        <Header numTeams={numTeams} setNumTeams={setNumTeams} selectedTeam={selectedTeam} setSelectedTeam={setSelectedTeam} />
          <div className="flex flex-col gap-8 p-8">
            <div className="flex md:flex-row flex-col gap-4">
              <PokeParty pokemonParty={pokemonParty} setPokemonParty={setPokemonParty} setSelectedPokemon={setSelectedPokemon} />
              <PokeInfo selectedPokemon={selectedPokemon} />
            </div>
            <div className="flex flex-col gap-4">
              <PokeSearch />
              <PokeFinder setPokemonParty={setPokemonParty} />
            </div>
          </div>
        <Footer />
      </ClerkProvider>
    </>   
  );
}
