import React from 'react';
import type { pokemon } from '../../lib/pokemonInterface'

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

const StatBar: React.FC<StatBarProps> = ({ label, id, baseValue, level, iv, ev, totalEVs, setTotalEVs, selectedPokemon, setPokemonParty, selectedNature, natures }) => {
    const calculateStatTotal = () => {
        if (id === 0) { //Is HP, calculate differently
            return Math.floor(((2 * baseValue + iv + Math.floor(ev / 4) + 100) * level) / level) + 10; // 110 = Level 100 + 10
        } else {
            return Math.floor((Math.floor((2 * baseValue + iv + Math.floor(ev / 4)) * level / 100) + 5) * getNatureMultiplier());
        }
    }

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
        if (!selectedNature || !natures[selectedNature]) return 'text-gray-600';
        if (natures[selectedNature].positive === id) {
            return 'text-red-600';
        }
        if (natures[selectedNature].negative === id) {
            return 'text-blue-600';
        }
        return 'text-gray-600';
    };
    
    const handleIV = (event: React.ChangeEvent<HTMLInputElement>) => {
        setPokemonParty(prevParty => {
            const updatedParty = [...prevParty];
            updatedParty[selectedPokemon].iv[id] = parseInt(event.target.value);
            return updatedParty;
        });
    };
    
    const handleEV = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newEV = parseInt(event.target.value);
        const oldEV = ev;
        const evDifference = newEV - oldEV;
      
        if (totalEVs + evDifference <= 510) {
          setPokemonParty(prevParty => {
            const updatedParty = [...prevParty];
            updatedParty[selectedPokemon].ev[id] = newEV;
            return updatedParty;
          });
          setTotalEVs(prevTotal => prevTotal + evDifference);
        }
    };

    const handleIVDoubleClick = () => {
        setPokemonParty(prevParty => {
            const updatedParty = [...prevParty];
            updatedParty[selectedPokemon].iv[id] = 31;
            return updatedParty;
        });
    };

    const handleEVDoubleClick = () => {
        setPokemonParty(prevParty => {
            const updatedParty = [...prevParty];
            setTotalEVs(prevTotal => prevTotal - updatedParty[selectedPokemon].ev[id]);
            updatedParty[selectedPokemon].ev[id] = 0;
            return updatedParty;
        });
    };

    return (
        <div className='flex flex-col gap-1'>
            <div className='flex gap-2 items-center'>
            <p 
                className={`${getNatureColor()} text-nowrap select-none`}
            >
                {label}
            </p>
            <div className='flex flex-col'>
                <div
                    style={{
                        width: `${0.35 * calculateStatTotal()}px`,
                        height: '5px',
                        backgroundColor: `hsl(${calculateStatTotal() * 0.2}, 100%, 50%)`,
                        borderRadius: '15px',
                        overflow: 'hidden',
                        margin: '1rem 0'
                    }}
                >
                    <div
                        style={{
                            height: '100%',
                            width: `${baseValue + ev}%`,
                            transition: 'width 0.5s ease-out, background-color 0.5s ease-out',
                            backgroundSize: '300% 100%',
                            backgroundPosition: `${100 - calculateStatTotal()}% 0`,
                        }}
                    />
                </div>
            </div>
            <p>{calculateStatTotal()}</p>
        </div>
        <div className='flex gap-2'>
            <p className='text-gray-500 select-none' onDoubleClick={handleIVDoubleClick}>IV</p>
            <input
                className='w-32'
                type="range"
                min="0"
                max="31"
                value={iv}
                onChange={handleIV}
            />
            <p className='text-gray-600'>{iv}</p>
        </div>
        <div className='flex gap-2'>
            <p className='text-gray-500 select-none' onDoubleClick={handleEVDoubleClick}>EV</p>
            <input
                className='w-32'
                type="range"
                min="0"
                max="252"
                value={ev}
                onChange={handleEV}
            />
            <p className='text-gray-600'>{ev}</p>
        </div>
    </div>
    );
};

export default StatBar;