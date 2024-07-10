"use client";
import "@/app/globals.css";
import type { pokemon } from "../../lib/pokemonInterface";

interface PokeFinderCardProps {
  setEnableToast: React.Dispatch<React.SetStateAction<{ enabled: boolean, type: string, message: string }>>;
  pokemon: pokemon;
  setPokemonParty: React.Dispatch<React.SetStateAction<pokemon[][]>>;
  selectedTeam: number;
}

const PokeFinderCard: React.FC<PokeFinderCardProps> = ({
  setEnableToast,
  pokemon,
  setPokemonParty,
  selectedTeam,
}: PokeFinderCardProps) => {
  const handleClick = async () => {
    try {
      setPokemonParty((prevPokemonParty: pokemon[][]) => {
        // Ensure prevPokemonParty is an array and selectedTeam is valid
        if (!Array.isArray(prevPokemonParty) || selectedTeam < 0 || selectedTeam >= prevPokemonParty.length) {
          setEnableToast({ enabled: true, type: "error", message: `Invalid team selection: ${prevPokemonParty}` });
          return prevPokemonParty;
        }
  
        // Ensure the selected team exists, if not, create it
        const newPokemonParty = [...prevPokemonParty];
        if (!Array.isArray(newPokemonParty[selectedTeam])) {
          newPokemonParty[selectedTeam] = [];
        }
  
        if (newPokemonParty[selectedTeam].length >= 6) {
          setEnableToast({ enabled: true, type: "error", message: "Your current team is full!" });
          return newPokemonParty;
        } else if (!newPokemonParty[selectedTeam].some((p) => p.id === pokemon.id)) {
          const updatedPokemon: pokemon = {
            ...pokemon,
            name: pokemon.name || "",
            id: pokemon.id || 0,
            sprite: pokemon.sprite || "",
            level: 100,
            ability: "",
            nature: "",
            item: "",
            tera_type: "",
            moves: ["", "", "", ""],
            iv: [31, 31, 31, 31, 31, 31],
            ev: [0, 0, 0, 0, 0, 0],
          };
          newPokemonParty[selectedTeam].push(updatedPokemon);
          return newPokemonParty;
        }
        setEnableToast({ enabled: true, type: "error", message: "This Pokémon is already on your team!" });
        return newPokemonParty;
      });
    } catch (error) {
      setEnableToast({ enabled: true, type: "error", message: "There was an error adding your Pokémon." });
    }
  };

  return (
    <div
      className="flex flex-col justify-center items-center bg-[#fff] md:h-32 h-44 w-32 rounded shadow cursor-pointer transition-transform duration-200 hover:bg-gray-50"
      onClick={handleClick}
    >
      <img
        className="md:h-24 md:w-24"
        src={pokemon.sprite}
        alt={pokemon.name}
      />
      <p className="text-center text-sm">{pokemon.name}</p>
    </div>
  );
};

export default PokeFinderCard;