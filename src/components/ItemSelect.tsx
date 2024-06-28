import { useEffect, useState, useRef } from 'react';
import items from '../../lib/items.json';
import { pokemon } from '../../lib/pokemonInterface'

type Item = {
    name: string;
    url: string;
};

export default function itemSelect({ selectedPokemon, pokemonParty, setPokemonParty }: { selectedPokemon: number, pokemonParty: pokemon[], setPokemonParty: React.Dispatch<React.SetStateAction<pokemon[]>> }) {
    const [itemInput, setItemInput] = useState<string>('');
    const [itemSuggestions, setItemSuggestions] = useState<Item[]>([]);
    const [itemError, setItemError] = useState<string>('');
    const itemInputRef = useRef<HTMLDivElement>(null);
    const itemsArray = items.items as Item[];

    useEffect(() => {
        if (pokemonParty[selectedPokemon] && pokemonParty[selectedPokemon].item) {
            setItemInput(formatItemName(pokemonParty[selectedPokemon].item));
        } else {
            setItemInput('');
        }
    }, [selectedPokemon, pokemonParty]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (itemInputRef.current && !itemInputRef.current.contains(event.target as Node)) {
                setItemSuggestions([]);
            }
        }
    
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const formatItemName = (name: string) => {
        return name
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const handleitemInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setItemInput(value);
    
        // Filter item suggestions based on input
        const filteredSuggestions = itemsArray.filter(item =>
            formatItemName(item.name).toLowerCase().includes(value.toLowerCase())
        );
        const formattedSuggestions = filteredSuggestions.map(item => ({
            name: formatItemName(item.name),
            url: item.url
        })) as Item[];
    
        setItemSuggestions(formattedSuggestions);
    
        // Clear error if input is empty
        if (value === '') {
            setItemError('');
        }
    };

    const handleitemInputBlur = () => {
        const formattedInput = itemInput.toLowerCase().replace(/\s/g, '-');
        if (itemInput === '' || itemsArray.some(item => item.name === formattedInput)) {
            setPokemonParty(prevParty => {
                const newParty = [...prevParty];
                if (newParty[selectedPokemon]) {
                    newParty[selectedPokemon] = {
                        ...newParty[selectedPokemon],
                        item: formattedInput
                    };
                }
                return newParty;
            });
            setItemError('');
        } else {
            setItemError('Please enter a valid item');
        }
    };

    const handleItemSuggestionSelect = (item: Item) => {
        setItemInput(item.name);
        setPokemonParty(prevParty => {
            const newParty = [...prevParty];
            if (newParty[selectedPokemon]) {
                newParty[selectedPokemon] = {
                    ...newParty[selectedPokemon],
                    item: item.name.toLowerCase().replace(/\s/g, '-')
                };
            }
            return newParty;
        });
        setItemSuggestions([]);
        setItemError('');
    };

    return (
        <div className="flex gap-4 items-center mb-4 relative">
            <h3 className="text-xl text-gray-600">Item:</h3>
            <div className="relative" ref={itemInputRef}>
                <input 
                    className={`border-2 ${itemError ? 'border-red-500' : 'border-gray-300'} bg-white h-10 max-md:w-40 px-5 pr-16 rounded-lg text-sm focus:outline-none`}
                    type="text" 
                    name="Item" 
                    placeholder="Item" 
                    value={itemInput}
                    onChange={handleitemInputChange}
                    onBlur={handleitemInputBlur}
                />
                {itemError && (
                    <p className="text-red-500 text-xs mt-1">{itemError}</p>
                )}
                {itemSuggestions.length > 0 && (
                    <ul className="absolute z-10 w-full bg-white border border-gray-300 mt-1 rounded-lg shadow-lg">
                        {itemSuggestions.slice(0, 10).map((item, index) => (
                            <li 
                                key={index}
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                onClick={() => handleItemSuggestionSelect(item)}
                            >
                                {item.name}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}