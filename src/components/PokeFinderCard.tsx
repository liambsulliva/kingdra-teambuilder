"use client";
import "@/app/globals.css";
import type { pokemon } from "../../lib/pokemonInterface";

interface PokeFinderCardProps {
  setEnableToast: React.Dispatch<React.SetStateAction<{ enabled: boolean, message: string }>>;
  pokemon: pokemon;
  setPokemonParty: React.Dispatch<React.SetStateAction<pokemon[]>>;
}

const PokeFinderCard: React.FC<PokeFinderCardProps> = ({
  setEnableToast,
  pokemon,
  setPokemonParty,
}: PokeFinderCardProps) => {
  const handleClick = async () => {
    try {
      setPokemonParty((prevPokemonParty: pokemon[]) => {
        if (prevPokemonParty.length >= 6) {
          setEnableToast({ enabled: true, message: "Your current team is full!"});
          return prevPokemonParty;
        } else if (!prevPokemonParty.some((p) => p.id === pokemon.id)) {
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
          return [...prevPokemonParty, updatedPokemon];
        }
        setEnableToast({ enabled: true, message: "This Pokémon is already on your team!"});
        return prevPokemonParty;
      });
    } catch (error) {
      // Handle the error here
      setEnableToast({ enabled: true, message: "There was an error adding your Pokémon."});
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
