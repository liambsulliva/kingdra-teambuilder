"use client"

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PokeParty from "@/components/PokeParty";
import PokeInfo from "@/components/PokeInfo";
import PokeFinder from "@/components/PokeFinder";
import PokeSearch from "@/components/PokeSearch";

import { useState } from "react";

interface pokemon {
  name: string,
  id: number,
  sprite: string
}

export default function Home() {
  const [pokemonParty, setPokemonParty] = useState<pokemon[]>([]);
  const [selectedPokemon, setSelectedPokemon] = useState<pokemon>({ name: "", id: 0, sprite: "" });

  return (
    <>
      <Header />
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
    </>   
  );
}
