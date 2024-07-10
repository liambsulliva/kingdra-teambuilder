import "@/app/globals.css";
import CloseIcon from "./CloseIcon";
import axios from "axios";
import { useAuth } from "@clerk/nextjs";
import type { pokemon } from "../../lib/pokemonInterface";

export default function PokeSlot({
  pokemon,
  index,
  setPokemonParty,
  setSelectedPokemon,
  selectedTeam
}: {
  pokemon: pokemon | null;
  index: number;
  setPokemonParty: React.Dispatch<React.SetStateAction<pokemon[][]>>;
  setSelectedPokemon: React.Dispatch<React.SetStateAction<number>>;
  selectedTeam: number;
}) {
  const { isSignedIn } = useAuth();
  const handleDelete = async () => {
    if (!pokemon) {
      return null;
    }
    try {
      setPokemonParty((prevPokemonParty: pokemon[][]) => {
        return prevPokemonParty.map((team, teamIndex) => {
          if (teamIndex === selectedTeam) {
        return team.filter((p) => p.id !== pokemon.id);
          }
          return team;
        });
      });
      if (isSignedIn) {
        const response = await axios.delete(
          `/api/pokemon-party/?id=${pokemon.id}`,
        );
        if (response.status === 201) {
          //console.log("DELETE Success");
        } else {
          console.log("DELETE Failure");
        }
      }
    } catch (error) {
      console.log("Internal Server Error");
    }
  };
  return (
    <div className="relative">
      {pokemon ? (
        <div
          className="flex flex-col justify-center items-center bg-[#fff] h-24 w-24 rounded shadow cursor-pointer transition-transform duration-200 hover:bg-gray-50"
          onClick={() => {
            setSelectedPokemon((selected) => (selected === index ? -1 : index));
          }}
        >
          <div
            className="absolute top-0 right-0 translate-x-2 -translate-y-2"
            onClick={() => {
              handleDelete();
            }}
          >
            <CloseIcon />
          </div>
          <img src={pokemon.sprite} alt={pokemon.name} />
        </div>
      ) : (
        <div className="bg-[#f9f9f9] h-24 w-24 rounded" />
      )}
    </div>
  );
}
