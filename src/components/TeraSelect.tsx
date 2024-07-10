import { useEffect, useState, useRef, KeyboardEvent } from "react";
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
  selectedTeam
}: {
  selectedPokemon: number;
  pokemonParty: pokemon[][];
  setPokemonParty: React.Dispatch<React.SetStateAction<pokemon[][]>>;
  selectedTeam: number;
}) {
  const [teraInput, setTeraInput] = useState<string>("");
  const [teraSuggestions, setTeraSuggestions] = useState<TeraType[]>([]);
  const [teraError, setTeraError] = useState<string>("");
  const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState<number>(-1);
  const teraInputRef = useRef<HTMLDivElement>(null);
  const teraTypesArray = Object.keys(typeColors) as TeraType[];

  useEffect(() => {
    if (
      pokemonParty[selectedTeam][selectedPokemon] &&
      pokemonParty[selectedTeam][selectedPokemon].tera_type
    ) {
      setTeraInput(formatTeraType(pokemonParty[selectedTeam][selectedPokemon].tera_type));
    } else {
      setTeraInput("");
    }
  }, [selectedPokemon, selectedTeam, pokemonParty]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        teraInputRef.current &&
        !teraInputRef.current.contains(event.target as Node)
      ) {
        setTeraSuggestions([]);
        setFocusedSuggestionIndex(-1);
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
    setFocusedSuggestionIndex(-1);

    // Clear error if input is empty
    if (value === "") {
      setTeraError("");
    }
  };

  const handleTeraInputBlur = () => {
    setTimeout(() => {
      const lowercaseInput = teraInput.toLowerCase();
      if (
        teraInput === "" ||
        teraTypesArray.includes(lowercaseInput as TeraType)
      ) {
        setPokemonParty((prevParty) => {
          const newParty = [...prevParty];
          if (newParty[selectedTeam][selectedPokemon]) {
            newParty[selectedTeam][selectedPokemon] = {
              ...newParty[selectedTeam][selectedPokemon],
              tera_type: lowercaseInput as TeraType,
            };
          }
          return newParty;
        });
        setTeraError("");
      } else {
        setTeraError("Please enter a valid Tera Type");
      }
      setTeraSuggestions([]);
      setFocusedSuggestionIndex(-1);
    }, 100);
  };

  const handleTeraSuggestionSelect = (type: TeraType) => {
    setTeraInput(formatTeraType(type));
    setPokemonParty((prevParty) => {
      const newParty = [...prevParty];
      if (newParty[selectedTeam][selectedPokemon]) {
        newParty[selectedTeam][selectedPokemon] = {
          ...newParty[selectedTeam][selectedPokemon],
          tera_type: type.toLowerCase() as TeraType,
        };
      }
      return newParty;
    });
    setTeraSuggestions([]);
    setFocusedSuggestionIndex(-1);
    setTeraError("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (teraSuggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedSuggestionIndex((prevIndex) =>
          prevIndex < teraSuggestions.length - 1 ? prevIndex + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedSuggestionIndex((prevIndex) =>
          prevIndex > 0 ? prevIndex - 1 : teraSuggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (focusedSuggestionIndex !== -1) {
          handleTeraSuggestionSelect(teraSuggestions[focusedSuggestionIndex]);
        }
        break;
      case "Escape":
        setTeraSuggestions([]);
        setFocusedSuggestionIndex(-1);
        break;
    }
  };

  const isExactMatch = teraTypesArray.includes(teraInput.toLowerCase() as TeraType);
  const backgroundColor = isExactMatch ? `#${typeColors[teraInput.toLowerCase() as TeraType]}` : 'white';
  const fontWeight = isExactMatch ? 600 : 400;
  const fontSize = isExactMatch ? `1.25rem` : '1rem';
  const textAlign = isExactMatch ? `center` : 'left';
  const textColor = isExactMatch ? 'white' : 'black';

  return (
    <div className="flex gap-4 items-center relative">
      <div className="relative" ref={teraInputRef}>
        <input
          className={`border-2 ${teraError ? "border-red-500" : "border-gray-300"} h-12 w-32 px-4 rounded-xl text-xl/8 focus:outline-none`}
          style={{
            backgroundColor,
            color: textColor,
            fontSize: fontSize,
            fontWeight: fontWeight,
            textAlign: textAlign,
          }}
          type="text"
          name="Tera Type"
          placeholder="Tera"
          autoComplete="off"
          value={teraInput}
          onChange={handleTeraInputChange}
          onBlur={handleTeraInputBlur}
          onKeyDown={handleKeyDown}
        />
        {teraError && <p className="text-red-500 text-xs mt-1">{teraError}</p>}
        {teraSuggestions.length > 0 && teraInput !== "" && (
          <ul className="absolute z-10 w-full bg-white border border-gray-300 mt-1 rounded-lg shadow-lg">
            {teraSuggestions.slice(0, 10).map((type, index) => (
              <li
                key={index}
                className={`px-4 py-2 hover:bg-gray-100 cursor-pointer ${
                  index === focusedSuggestionIndex ? "bg-gray-200" : ""
                }`}
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