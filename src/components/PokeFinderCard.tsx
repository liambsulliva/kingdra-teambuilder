"use client";
import "@/app/globals.css";
import type { pokemon } from "../../lib/pokemonInterface";

interface PokeFinderCardProps {
  pokemon: pokemon;
  setPokemonParty: React.Dispatch<React.SetStateAction<pokemon[]>>;
}

const PokeFinderCard: React.FC<PokeFinderCardProps> = ({
  pokemon,
  setPokemonParty,
}: PokeFinderCardProps) => {
  const handleClick = async () => {
    try {
      setPokemonParty((prevPokemonParty: pokemon[]) => {
        if (prevPokemonParty.length >= 6) {
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
        return prevPokemonParty;
      });
    } catch (error) {
      // Handle the error here
      console.log("Internal Server Error");
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
      <p className="text-center">{pokemon.name}</p>
    </div>
  );
};

export default PokeFinderCard;
