import { useEffect, useState, useRef } from "react";
import { pokemon } from "../../lib/pokemonInterface";

export default function moveSelect({
  index,
  selectedPokemon,
  validMoves,
  pokemonParty,
  setPokemonParty,
}: {
  index: number;
  validMoves: string[]
  selectedPokemon: number;
  pokemonParty: pokemon[];
  setPokemonParty: React.Dispatch<React.SetStateAction<pokemon[]>>;
}) {
  const [moveInput, setMoveInput] = useState<string>("");
  const [moveSuggestions, setMoveSuggestions] = useState<string[]>([]);
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

  const handleMoveInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMoveInput(value);

    // Filter move suggestions based on input
    const filteredSuggestions = validMoves.filter((move: string) =>
      formatMoveName(move).toLowerCase().includes(value.toLowerCase()),
    );
    
    const formattedSuggestions = filteredSuggestions.map((move: string) => formatMoveName(move)) as string[];

    setMoveSuggestions(formattedSuggestions);

    // Clear error if input is empty
    if (value === "") {
      setMoveError("");
    }
  };

  const handleMoveInputBlur = () => {
    const formattedInput = moveInput.toLowerCase().replace(/\s/g, "-");
    if (
      moveInput === "" ||
      validMoves.some((move: string) => move === formattedInput)
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

  const handleMoveSuggestionSelect = (move: string) => {
    setMoveInput(move);
    setPokemonParty((prevParty) => {
      const newParty = [...prevParty];
      if (newParty[selectedPokemon]) {
        newParty[selectedPokemon] = {
          ...newParty[selectedPokemon],
          moves: newParty[selectedPokemon].moves.map((move, i) => i === index ? move.toLowerCase().replace(/\s/g, "-") : move),
        };
      }
      return newParty;
    });
    setMoveSuggestions([]);
    setMoveError("");
  };

  return (
    <div className="flex gap-4 items-center mb-4 relative">
      <h3 className="text-xl text-gray-600">Move {index+1}:</h3>
      <div className="relative" ref={moveInputRef}>
        <input
          className={`border-2 ${moveError ? "border-red-500" : "border-gray-300"} bg-white h-10 max-md:w-40 px-5 pr-12 rounded-lg text-sm focus:outline-none`}
          type="text"
          name="Move"
          placeholder="Move"
          value={moveInput}
          onChange={handleMoveInputChange}
          onBlur={handleMoveInputBlur}
        />
        {moveError && <p className="text-red-500 text-xs mt-1">{moveError}</p>}
        {moveSuggestions.length > 0 && (
          <ul className="absolute z-10 w-full bg-white border border-gray-300 mt-1 rounded-lg shadow-lg">
            {moveSuggestions.slice(0, 10).map((move, index) => (
              <li
                key={index}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => handleMoveSuggestionSelect(move)}
              >
                {move}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
