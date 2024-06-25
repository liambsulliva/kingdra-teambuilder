import React from 'react';
import type { pokemon } from '../../lib/pokemonInterface'

interface StatBarProps {
    label: string;
    id: number;
    baseValue: number;
    iv: number;
    ev: number;
    selectedPokemon: number;
    setPokemonParty: React.Dispatch<React.SetStateAction<pokemon[]>>;
}

const StatBar: React.FC<StatBarProps> = ({ label, id, baseValue, iv, ev, selectedPokemon, setPokemonParty }) => {
    const handleIV = (event: React.ChangeEvent<HTMLInputElement>) => {
        setPokemonParty(prevParty => {
            const updatedParty = [...prevParty];
            updatedParty[selectedPokemon].iv[id] = parseInt(event.target.value);
            return updatedParty;
        });
    };
    
    const handleEV = (event: React.ChangeEvent<HTMLInputElement>) => {
        setPokemonParty(prevParty => {
            const updatedParty = [...prevParty];
            updatedParty[selectedPokemon].ev[id] = parseInt(event.target.value);
            return updatedParty;
        });
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
            updatedParty[selectedPokemon].ev[id] = 0;
            return updatedParty;
        });
    };

    return (
        <div className='flex flex-col gap-1'>
            <div className='flex gap-2 items-center'>
            <p 
                className='text-gray-600 text-nowrap select-none'
            >
                {label}
            </p>
            <div className='flex flex-col'>
                <div
                    style={{
                        width: `${0.75 * baseValue + ev}px`,
                        height: '5px',
                        backgroundColor: `hsl(${baseValue + ev * 0.25}, 100%, 50%)`,
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
                            backgroundPosition: `${100 - baseValue + ev}% 0`,
                        }}
                    />
                </div>
            </div>
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
                max="255"
                value={ev}
                onChange={handleEV}
            />
            <p className='text-gray-600'>{ev}</p>
        </div>
    </div>
    );
};

export default StatBar;