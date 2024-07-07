import { useEffect, useState, useRef } from "react";
import { pokemon } from "../../lib/pokemonInterface";
import typeColors from "../../lib/typeColors.json";

type TeraType = keyof typeof typeColors;

const formatTeraType = (type: string) => {
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
};

export default function TeraSelect({
  selectedPokemon,
  pokemonParty,
  setPokemonParty,
}: {
  selectedPokemon: number;
  pokemonParty: pokemon[];
  setPokemonParty: React.Dispatch<React.SetStateAction<pokemon[]>>;
}) {
  const [teraInput, setTeraInput] = useState<string>("");
  const [teraSuggestions, setTeraSuggestions] = useState<TeraType[]>([]);
  const [teraError, setTeraError] = useState<string>("");
  const teraInputRef = useRef<HTMLDivElement>(null);
  const teraTypesArray = Object.keys(typeColors) as TeraType[];

  useEffect(() => {
    if (
      pokemonParty[selectedPokemon] &&
      pokemonParty[selectedPokemon].tera_type
    ) {
      setTeraInput(formatTeraType(pokemonParty[selectedPokemon].tera_type));
    } else {
      setTeraInput("");
    }
  }, [selectedPokemon, pokemonParty]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        teraInputRef.current &&
        !teraInputRef.current.contains(event.target as Node)
      ) {
        setTeraSuggestions([]);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleTeraInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTeraInput(value);

    // Filter tera type suggestions based on input
    const filteredSuggestions = teraTypesArray.filter((type) =>
      type.toLowerCase().includes(value.toLowerCase()),
    );
    const formattedSuggestions = filteredSuggestions.map(
      formatTeraType,
    ) as TeraType[];

    setTeraSuggestions(formattedSuggestions);

    // Clear error if input is empty
    if (value === "") {
      setTeraError("");
    }
  };

  const handleTeraInputBlur = () => {
    const lowercaseInput = teraInput.toLowerCase();
    if (
      teraInput === "" ||
      teraTypesArray.includes(lowercaseInput as TeraType)
    ) {
      setPokemonParty((prevParty) => {
        const newParty = [...prevParty];
        if (newParty[selectedPokemon]) {
          newParty[selectedPokemon] = {
            ...newParty[selectedPokemon],
            tera_type: lowercaseInput as TeraType,
          };
        }
        return newParty;
      });
      setTeraError("");
    } else {
      setTeraError("Please enter a valid Tera Type");
    }
  };

  const handleTeraSuggestionSelect = (type: TeraType) => {
    setTeraInput(formatTeraType(type));
    setPokemonParty((prevParty) => {
      const newParty = [...prevParty];
      if (newParty[selectedPokemon]) {
        newParty[selectedPokemon] = {
          ...newParty[selectedPokemon],
          tera_type: type.toLowerCase() as TeraType,
        };
      }
      return newParty;
    });
    setTeraSuggestions([]);
    setTeraError("");
  };

  return (
    <div className="flex gap-4 items-center relative">
      <div className="relative" ref={teraInputRef}>
        <input
          className={`border-2 ${teraError ? "border-red-500" : "border-gray-300"} bg-white h-10 px-4 w-46 rounded-lg text-sm focus:outline-none`}
          type="text"
          name="Tera Type"
          placeholder="Tera"
          autoComplete="off"
          value={teraInput}
          onChange={handleTeraInputChange}
          onBlur={handleTeraInputBlur}
        />
        {teraError && <p className="text-red-500 text-xs mt-1">{teraError}</p>}
        {teraSuggestions.length > 0 && (
          <ul className="absolute z-10 w-full bg-white border border-gray-300 mt-1 rounded-lg shadow-lg">
            {teraSuggestions.slice(0, 10).map((type, index) => (
              <li
                key={index}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => handleTeraSuggestionSelect(type)}
              >
                {type}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
