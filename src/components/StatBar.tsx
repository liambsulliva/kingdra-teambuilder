import React, { useState, useEffect } from "react";
import type { pokemon } from "../../lib/pokemonInterface";

interface StatBarProps {
  label: string;
  id: number;
  baseValue: number;
  level: number;
  iv: number;
  ev: number;
  totalEVs: number;
  setTotalEVs: React.Dispatch<React.SetStateAction<number>>;
  selectedPokemon: number;
  setPokemonParty: React.Dispatch<React.SetStateAction<pokemon[]>>;
  selectedNature: string;
  natures: any;
}

const StatBar: React.FC<StatBarProps> = ({
  label,
  id,
  baseValue,
  level,
  iv,
  ev,
  totalEVs,
  setTotalEVs,
  selectedPokemon,
  setPokemonParty,
  selectedNature,
  natures,
}) => {
  const [ivInput, setIvInput] = useState<string>("");
  const [ivError, setIvError] = useState<string>("");
  const [evInput, setEvInput] = useState<string>("");
  const [evError, setEvError] = useState<string>("");

  useEffect(() => {
    setEvInput(ev.toString());
    setIvInput(iv.toString());
  }, [ev, iv]);

  const calculateStatTotal = () => {
    if (id === 0) {
      //Is HP, calculate differently
      return (
        Math.floor(
          ((2 * baseValue + iv + Math.floor(ev / 4) + 100) * level) / level,
        ) + 10
      ); // 110 = Level 100 + 10
    } else {
      return Math.floor(
        (Math.floor(((2 * baseValue + iv + Math.floor(ev / 4)) * level) / 100) +
          5) *
          getNatureMultiplier(),
      );
    }
  };

  const getNatureMultiplier = () => {
    if (!selectedNature || !natures[selectedNature]) return 1;
    if (natures[selectedNature].positive === id) {
      return 1.1;
    }
    if (natures[selectedNature].negative === id) {
      return 0.9;
    }
    return 1;
  };

  const getNatureColor = () => {
    if (!selectedNature || !natures[selectedNature]) return "text-gray-600";
    if (natures[selectedNature].positive === id) {
      return "text-red-600";
    }
    if (natures[selectedNature].negative === id) {
      return "text-blue-600";
    }
    return "text-gray-600";
  };

  const handleEV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newEV = parseInt(event.target.value);
    const evValue = isNaN(newEV) ? 0 : newEV;
    const oldEV = ev;
    const evDifference = evValue - oldEV;

    if (totalEVs + evDifference <= 508) {
      setPokemonParty((prevParty) => {
        const updatedParty = [...prevParty];
        updatedParty[selectedPokemon].ev[id] = evValue;
        return updatedParty;
      });
      setTotalEVs((prevTotal) => prevTotal + evDifference);
    }
  };

  const handleIvInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setIvInput(value);
    if (value === "") {
      setIvError("");
    }
  };

  const handleEvInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setEvInput(value);
    if (value === "") {
      setEvError("");
    }
  };

  const validateAndSetIV = (newIV: number) => {
    if (newIV >= 0 && newIV <= 31) {
      setPokemonParty((prevParty) => {
        const updatedParty = [...prevParty];
        updatedParty[selectedPokemon].iv[id] = newIV;
        return updatedParty;
      });
      setIvError("");
      return true;
    } else {
      setIvError("IV must be between 0 and 31");
      return false;
    }
  };

  const validateAndSetEV = (newEV: number) => {
    if (newEV >= 0 && newEV <= 252) {
      const evDifference = newEV - ev;
      if (totalEVs + evDifference <= 508) {
        setPokemonParty((prevParty) => {
          const updatedParty = [...prevParty];
          updatedParty[selectedPokemon].ev[id] = newEV;
          return updatedParty;
        });
        setTotalEVs((prevTotal) => prevTotal + evDifference);
        setEvError("");
        return true;
      } else {
        setEvError("Total EVs cannot exceed 508");
        return false;
      }
    } else {
      setEvError("EV must be between 0 and 252");
      return false;
    }
  };

  const handleIvInputBlur = () => {
    const newIV = parseInt(ivInput, 10);
    if (isNaN(newIV)) {
      setIvError("Please enter a valid number");
    } else {
      validateAndSetIV(newIV);
    }
  };

  const handleEvInputBlur = () => {
    const newEV = parseInt(evInput, 10);
    if (isNaN(newEV)) {
      setEvError("Please enter a valid number");
    } else {
      validateAndSetEV(newEV);
    }
  };

  const handleIvInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const newIV = parseInt(ivInput, 10);
      if (!isNaN(newIV)) {
        validateAndSetIV(newIV);
      }
    }
  };

  const handleEvInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const newEV = parseInt(evInput, 10);
      if (!isNaN(newEV)) {
        validateAndSetEV(newEV);
      }
    }
  };

  const handleIVDoubleClick = () => {
    setPokemonParty((prevParty) => {
      const updatedParty = [...prevParty];
      updatedParty[selectedPokemon].iv[id] = 31;
      return updatedParty;
    });
  };

  const handleEVDoubleClick = () => {
    setPokemonParty((prevParty) => {
      const updatedParty = [...prevParty];
      setTotalEVs(
        (prevTotal) => prevTotal - updatedParty[selectedPokemon].ev[id],
      );
      updatedParty[selectedPokemon].ev[id] = 0;
      return updatedParty;
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2 items-center">
        <p className={`${getNatureColor()} text-nowrap select-none`}>{label}</p>
        <div className="flex flex-col">
          <div
            style={{
              width: `${0.35 * calculateStatTotal()}px`,
              height: "5px",
              backgroundColor: `hsl(${calculateStatTotal() * 0.2}, 100%, 50%)`,
              borderRadius: "15px",
              overflow: "hidden",
              margin: "1rem 0",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${baseValue + ev}%`,
                transition:
                  "width 0.5s ease-out, background-color 0.5s ease-out",
                backgroundSize: "300% 100%",
                backgroundPosition: `${100 - calculateStatTotal()}% 0`,
              }}
            />
          </div>
        </div>
        <p>{calculateStatTotal()}</p>
      </div>
      <div className="flex gap-2">
        <p
          className="text-gray-500 select-none"
          onDoubleClick={handleIVDoubleClick}
        >
          IV
        </p>
        <input
          className="w-32"
          type="range"
          min="0"
          max="31"
          value={iv}
          onChange={(e) => validateAndSetIV(parseInt(e.target.value, 10))}
        />
        <div className="relative">
          <input
            className={`border-2 ${ivError ? "border-red-500" : "border-gray-300"} bg-white h-10 w-18 px-4 rounded-lg text-sm focus:outline-none`}
            type="number"
            value={ivInput}
            onChange={handleIvInputChange}
            onBlur={handleIvInputBlur}
            onKeyDown={handleIvInputKeyPress}
            min="0"
            max="31"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <p
          className="text-gray-500 select-none"
          onDoubleClick={handleEVDoubleClick}
        >
          EV
        </p>
        <input
          className="w-32"
          type="range"
          min="0"
          max="252"
          value={ev}
          onChange={handleEV}
        />
        <div className="relative">
          <input
            className={`border-2 ${evError ? "border-red-500" : "border-gray-300"} bg-white h-10 w-20 px-4 rounded-lg text-sm focus:outline-none`}
            type="number"
            value={evInput}
            onChange={handleEvInputChange}
            onBlur={handleEvInputBlur}
            onKeyDown={handleEvInputKeyPress}
            min="0"
            max="252"
          />
        </div>
      </div>
    </div>
  );
};

export default StatBar;
