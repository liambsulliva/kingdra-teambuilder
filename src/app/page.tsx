"use client";

import Header from "@/components/header";
import Footer from "@/components/footer";
import PokeParty from "@/components/PokeParty";
import PokeInfo from "@/components/PokeInfo";
import PokeFinder from "@/components/PokeFinder";
import Toast from "@/components/Toast";
import TypeCoverage from "@/components/TypeCoverage";
import { useEffect, useState } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import type { pokemon } from "../../lib/pokemonInterface";

export default function Home() {
  const [pokemonParty, setPokemonParty] = useState<pokemon[][]>([[]]);
  const [numTeams, setNumTeams] = useState<number>(1);
  const [selectedPokemon, setSelectedPokemon] = useState<number>(-1);
  const [selectedTeam, setSelectedTeam] = useState<number>(0);
  const [enableToast, setEnableToast] = useState({ enabled: false, type: "", message: "" });

  useEffect(() => {
    let timer: any;
    if (enableToast.enabled) {
      timer = setTimeout(() => {
        setEnableToast(prev => ({ ...prev, enabled: false }));
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [enableToast.enabled]);

  const handleNewTeam = () => {
    setNumTeams((prevNumTeams) => {
      const newNumTeams = prevNumTeams + 1;
      setPokemonParty((prevParty) => [...prevParty, []]);
      setSelectedTeam(newNumTeams - 1);
      return newNumTeams;
    });
  };

  return (
    <body className="mx-auto" style={{ width: "1850px", maxWidth: "calc(100% - 1rem)" }}>
      <ClerkProvider>
        <Header
          numTeams={numTeams}
          setNumTeams={setNumTeams}
          selectedTeam={selectedTeam}
          setSelectedTeam={setSelectedTeam}
          onNewTeam={handleNewTeam}
        />
        <div
          className="font-serif flex flex-col gap-8 p-8 mx-auto"
        >
          <div className="flex md:flex-row flex-col gap-4">
            <PokeParty
              pokemonParty={pokemonParty}
              setPokemonParty={setPokemonParty}
              setSelectedPokemon={setSelectedPokemon}
              selectedTeam={selectedTeam}
              setEnableToast={setEnableToast}
              setNumTeams={setNumTeams}
            />
            <PokeInfo
              selectedPokemon={selectedPokemon}
              pokemonParty={pokemonParty}
              setPokemonParty={setPokemonParty}
              selectedTeam={selectedTeam}
              setEnableToast={setEnableToast}
            />
          </div>
          {pokemonParty[selectedTeam]?.length > 0 && (
            <TypeCoverage 
              pokemonParty={pokemonParty} 
              selectedTeam={selectedTeam} 
              setEnableToast={setEnableToast} 
            />
          )}
          <PokeFinder setPokemonParty={setPokemonParty} selectedTeam={selectedTeam} setEnableToast={setEnableToast} />
        </div>
        {enableToast && (
          <Toast 
            enabled={enableToast.enabled} 
            type={enableToast.type} 
            message={enableToast.message} 
          />
        )}     
        <Footer />
      </ClerkProvider>
    </body>
  );
}
