import { useEffect, useState, useRef } from 'react';
import natures from '../../lib/natures.json';
import { pokemon } from '../../lib/pokemonInterface'

type Nature = keyof typeof natures;

const formatNatureName = (name: string) => {
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
};

export default function NatureSelect({ selectedPokemon, pokemonParty, setPokemonParty }: { selectedPokemon: number, pokemonParty: pokemon[], setPokemonParty: React.Dispatch<React.SetStateAction<pokemon[]>> }) {
    const [natureInput, setNatureInput] = useState<string>('');
    const [natureSuggestions, setNatureSuggestions] = useState<Nature[]>([]);
    const [natureError, setNatureError] = useState<string>('');
    const natureInputRef = useRef<HTMLDivElement>(null);
    const naturesArray = Object.keys(natures) as Nature[];

    useEffect(() => {
        if (pokemonParty[selectedPokemon] && pokemonParty[selectedPokemon].nature) {
            setNatureInput(formatNatureName(pokemonParty[selectedPokemon].nature));
        } else {
            setNatureInput('');
        }
    }, [selectedPokemon, pokemonParty]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (natureInputRef.current && !natureInputRef.current.contains(event.target as Node)) {
                setNatureSuggestions([]);
            }
        }
    
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleNatureInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setNatureInput(value);
    
        // Filter nature suggestions based on input
        const filteredSuggestions = naturesArray.filter(nature =>
            nature.toLowerCase().includes(value.toLowerCase())
        );
        const formattedSuggestions = filteredSuggestions.map(formatNatureName) as Nature[];

        setNatureSuggestions(formattedSuggestions);
    
        // Clear error if input is empty
        if (value === '') {
            setNatureError('');
        }
    };

    const handleNatureInputBlur = () => {
        const lowercaseInput = natureInput.toLowerCase();
        if (natureInput === '' || naturesArray.includes(lowercaseInput as Nature)) {
            setPokemonParty(prevParty => {
                const newParty = [...prevParty];
                if (newParty[selectedPokemon]) {
                    newParty[selectedPokemon] = {
                        ...newParty[selectedPokemon],
                        nature: lowercaseInput
                    };
                }
                return newParty;
            });
            setNatureError('');
        } else {
            setNatureError('Please enter a valid nature');
        }
    };

    const handleNatureSuggestionSelect = (nature: Nature) => {
        setNatureInput(formatNatureName(nature));
        setPokemonParty(prevParty => {
            const newParty = [...prevParty];
            if (newParty[selectedPokemon]) {
                newParty[selectedPokemon] = {
                    ...newParty[selectedPokemon],
                    nature: nature.toLowerCase()
                };
            }
            return newParty;
        });
        setNatureSuggestions([]);
        setNatureError('');
    };

    return (
        <div className="flex gap-4 items-center mb-4 relative">
            <h3 className="text-xl text-gray-600">Nature:</h3>
            <div className="relative" ref={natureInputRef}>
                <input 
                    className={`border-2 ${natureError ? 'border-red-500' : 'border-gray-300'} bg-white h-10 px-5 pr-16 rounded-lg text-sm focus:outline-none`}
                    type="text" 
                    name="Nature" 
                    placeholder="Nature" 
                    value={natureInput}
                    onChange={handleNatureInputChange}
                    onBlur={handleNatureInputBlur}
                />
                {natureError && (
                    <p className="text-red-500 text-xs mt-1">{natureError}</p>
                )}
                {natureSuggestions.length > 0 && (
                    <ul className="absolute z-10 w-full bg-white border border-gray-300 mt-1 rounded-lg shadow-lg">
                        {natureSuggestions.slice(0, 10).map((nature, index) => (
                            <li 
                                key={index}
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                onClick={() => handleNatureSuggestionSelect(nature)}
                            >
                                {nature}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}