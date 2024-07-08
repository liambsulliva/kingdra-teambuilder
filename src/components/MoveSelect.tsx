import { useEffect, useState, useRef } from "react";
import { pokemon } from "../../lib/pokemonInterface";

interface MoveSuggestion {
  name: string;
  effect: string;
}

export default function moveSelect({
  index,
  selectedPokemon,
  validMoves,
  pokemonParty,
  setPokemonParty,
  setEnableToast
}: {
  index: number;
  validMoves: { name: string, url: string }[];
  selectedPokemon: number;
  pokemonParty: pokemon[];
  setPokemonParty: React.Dispatch<React.SetStateAction<pokemon[]>>;
  setEnableToast: React.Dispatch<React.SetStateAction<{ enabled: boolean, type: string,  message: string }>>;
}) {
  const [moveInput, setMoveInput] = useState<string>("");
  const [moveSuggestions, setMoveSuggestions] = useState<MoveSuggestion[]>([]);
  const [moveError, setMoveError] = useState<string>("");
  const moveInputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pokemonParty[selectedPokemon] && pokemonParty[selectedPokemon].moves[index]) {
      setMoveInput(formatMoveName(pokemonParty[selectedPokemon].moves[index]));
    } else {
      setMoveInput("");
    }
  }, [selectedPokemon, pokemonParty]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        moveInputRef.current &&
        !moveInputRef.current.contains(event.target as Node)
      ) {
        setMoveSuggestions([]);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const formatMoveName = (name: string) => {
    return name
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const fetchMoveEffect = async (url: string) => {
    try {
      const response = await fetch(url);
      const data = await response.json();
      const effect = data.effect_entries.find((entry: any) => entry.language.name === "en")?.short_effect || "";
      return effect;
    } catch (error) {
      setEnableToast({enabled: true, type: "error", message: `Error fetching moves: ${error}`});
      return "";
    }
  };

  const handleMoveInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMoveInput(value);
  
    if (value === "") {
      setMoveSuggestions([]);
      setMoveError("");
      return;
    }
  
    // Filter move suggestions based on input
    const filteredMoves = validMoves.filter((move: { name: string, url: string }) =>
      formatMoveName(move.name).toLowerCase().includes(value.toLowerCase())
    );
  
    // Fetch effects and create combined suggestions
    const suggestions: MoveSuggestion[] = await Promise.all(
      filteredMoves.map(async (move) => {
        const effect = await fetchMoveEffect(move.url);
        return {
          name: formatMoveName(move.name),
          effect: effect
        };
      })
    );
  
    setMoveSuggestions(suggestions);
  };

  const handleMoveInputBlur = () => {
    const formattedInput = moveInput.toLowerCase().replace(/\s/g, "-");
    if (
      moveInput === "" ||
      validMoves.some((move) => move.name === formattedInput)
    ) {
    setPokemonParty((prevParty) => {
        const newParty = [...prevParty];
          if (newParty[selectedPokemon]) {
              newParty[selectedPokemon].moves[index] = formattedInput;
          }
          return newParty;
      });
      setMoveError("");
    } else {
      setMoveError("Please enter a valid move");
    }
  };

  const handleMoveSuggestionSelect = (moveName: string) => {
    setMoveInput(moveName);
    setPokemonParty((prevParty) => {
      const newParty = [...prevParty];
      if (newParty[selectedPokemon]) {
        newParty[selectedPokemon].moves[index] = moveName.toLowerCase().replace(/\s/g, "-");
      }
      return newParty;
    });
    setMoveSuggestions([]);
    setMoveError("");
  };

  return (
    <div className="flex max-md:flex-col gap-4 items-center mb-4 relative">
      <h3 className="text-xl text-gray-600">Move {index+1}: </h3>
      <div className="relative" ref={moveInputRef}>
        <input
          className={`border-2 ${moveError ? "border-red-500" : "border-gray-300"} bg-white h-10 max-md:w-40 px-5 pr-12 rounded-lg text-sm focus:outline-none`}
          type="text"
          name="Move"
          autoComplete="off"
          placeholder="Move"
          value={moveInput}
          onChange={handleMoveInputChange}
          onBlur={handleMoveInputBlur}
        />
        {moveError && <p className="text-red-500 text-xs mt-1">{moveError}</p>}
        {moveSuggestions.length > 0 && moveInput !== "" && (
          <ul className="absolute z-10 w-full bg-white border border-gray-300 mt-1 rounded-lg shadow-lg">
            {moveSuggestions.slice(0, 10).map((move, index) => (
              <li
                key={index}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => handleMoveSuggestionSelect(move.name)}
              >
                <div>{move.name}</div>
                <div className="text-xs text-gray-500">{move.effect}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
