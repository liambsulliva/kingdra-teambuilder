import { useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import PokeSlot from "@/components/PokeSlot";
import GlobalIETabber from "@/components/GlobalIETabber";
import debounce from "lodash.debounce";
import "@/app/globals.css";
import type { pokemon } from "../../lib/pokemonInterface";

export default function PokeParty({
  pokemonParty,
  setPokemonParty,
  setSelectedPokemon,
  setEnableToast,
  selectedTeam
}: {
  pokemonParty: pokemon[][];
  setPokemonParty: React.Dispatch<React.SetStateAction<pokemon[][]>>;
  setSelectedPokemon: React.Dispatch<React.SetStateAction<number>>;
  setEnableToast: React.Dispatch<React.SetStateAction<{ enabled: boolean, type: string, message: string }>>;
  selectedTeam: number;
}) {
  const { isSignedIn } = useAuth();

  const debouncedFetchPokemonParty = useCallback(
    debounce(async () => {
      if (isSignedIn) {
        try {
          const response = await axios.get("/api/pokemon-party");
          setPokemonParty(response.data.pokemonParty);
        } catch (error) {
          setEnableToast({ enabled: true, type: "error", message: `Failed to fetch Pokémon team from server: `});
        }
      } else {
        setPokemonParty([[]]);
      }
    }, 500),
    [isSignedIn],
  );

  const debouncedPostPokemonParty = useCallback(
    debounce(async () => {
      if (isSignedIn) {
        try {
          const response = await axios.post("/api/pokemon-party", {
            pokemonParty,
          });
          // Handle the response here
          if (response.status === 201) {
            //console.log("POST Success");
          } else {
            console.log("POST Failure");
          }
        } catch (error) {
          setEnableToast({ enabled: true, type: "error", message: `Failed to submit Pokémon team to server: ${error}`});
        }
      }
    }, 500),
    [pokemonParty],
  );

  useEffect(() => {
    debouncedFetchPokemonParty();
  }, [isSignedIn, debouncedFetchPokemonParty]);

  useEffect(() => {
    debouncedPostPokemonParty();
  }, [pokemonParty, debouncedPostPokemonParty]);

  return (
    <div className="flex flex-col items-center py-4">
      <div className="p-6 grid md:grid-cols-2 grid-cols-3 gap-4">
        {pokemonParty[selectedTeam]?.map((pokemon, index) => (
          <PokeSlot
            key={pokemon.id}
            pokemon={pokemon}
            index={index}
            setPokemonParty={setPokemonParty}
            setSelectedPokemon={setSelectedPokemon}
            selectedTeam={selectedTeam}
          />
        ))}
        {Array(Math.max(0, 6 - (pokemonParty[selectedTeam]?.length || 0))).fill(
          <PokeSlot
            pokemon={null}
            index={-1}
            setPokemonParty={setPokemonParty}
            setSelectedPokemon={setSelectedPokemon}
            selectedTeam={selectedTeam}
          />,
        )}
      </div>
      <div>
        <GlobalIETabber
          pokemonParty={pokemonParty}
          setPokemonParty={setPokemonParty}
          setEnableToast={setEnableToast}
          selectedTeam={selectedTeam}
        />
      </div>
    </div>
  );
}
