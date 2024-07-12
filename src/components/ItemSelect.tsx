import { useEffect, useState, useRef, KeyboardEvent } from 'react';
import items from '../../lib/items.json';
import { pokemon } from '../../lib/pokemonInterface';

interface ItemSuggestion {
	name: string;
	effect: string;
}

const ItemSelect = ({
	selectedPokemon,
	pokemonParty,
	setPokemonParty,
	selectedTeam,
}: {
	selectedPokemon: number;
	pokemonParty: pokemon[][];
	setPokemonParty: React.Dispatch<React.SetStateAction<pokemon[][]>>;
	selectedTeam: number;
}) => {
	const [itemInput, setItemInput] = useState<string>('');
	const [itemSuggestions, setItemSuggestions] = useState<ItemSuggestion[]>([]);
	const [itemError, setItemError] = useState<string>('');
	const [focusedSuggestionIndex, setFocusedSuggestionIndex] =
		useState<number>(-1);
	const itemInputRef = useRef<HTMLDivElement>(null);
	const itemsArray = items.items as { name: string; url: string }[];

	useEffect(() => {
		if (
			pokemonParty[selectedTeam][selectedPokemon] &&
			pokemonParty[selectedTeam][selectedPokemon].item
		) {
			setItemInput(
				formatItemName(pokemonParty[selectedTeam][selectedPokemon].item)
			);
		} else {
			setItemInput('');
		}
	}, [selectedPokemon, selectedTeam, pokemonParty]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				itemInputRef.current &&
				!itemInputRef.current.contains(event.target as Node)
			) {
				setItemSuggestions([]);
				setFocusedSuggestionIndex(-1);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	const formatItemName = (name: string) => {
		return name
			.split('-')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	};

	const fetchItemEffect = async (itemName: string): Promise<string> => {
		try {
			const response = await fetch(
				`https://pokeapi.co/api/v2/item/${itemName.toLowerCase()}/`
			);
			const data = await response.json();
			const effect =
				data.effect_entries.find(
					(entry: { language: { name: string } }) =>
						entry.language.name === 'en'
				)?.short_effect || '';
			return effect;
		} catch (error) {
			console.error('Error fetching item effect:', error);
			return '';
		}
	};

	const handleItemInputChange = async (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		const value = e.target.value;
		setItemInput(value);

		if (value === '') {
			setItemSuggestions([]);
			setItemError('');
			setFocusedSuggestionIndex(-1);
			return;
		}

		// Filter item suggestions based on input
		const filteredItems = itemsArray.filter((item) =>
			formatItemName(item.name).toLowerCase().includes(value.toLowerCase())
		);

		// Fetch effects for filtered items
		const suggestions: ItemSuggestion[] = await Promise.all(
			filteredItems.slice(0, 10).map(async (item) => {
				const effect = await fetchItemEffect(item.name);
				return {
					name: formatItemName(item.name),
					effect: effect,
				};
			})
		);

		setItemSuggestions(suggestions);
		setFocusedSuggestionIndex(-1);
	};

	const handleItemInputBlur = () => {
		setTimeout(() => {
			const formattedInput = itemInput.toLowerCase().replace(/\s/g, '-');
			if (
				itemInput === '' ||
				itemsArray.some((item) => item.name === formattedInput)
			) {
				setPokemonParty((prevParty) => {
					const newParty = [...prevParty];
					if (newParty[selectedTeam][selectedPokemon]) {
						newParty[selectedTeam][selectedPokemon] = {
							...newParty[selectedTeam][selectedPokemon],
							item: formattedInput,
						};
					}
					return newParty;
				});
				setItemError('');
			} else {
				setItemError('Please enter a valid item');
			}
			setItemSuggestions([]);
			setFocusedSuggestionIndex(-1);
		}, 100);
	};

	const handleItemSuggestionSelect = (itemName: string) => {
		setItemInput(itemName);
		setPokemonParty((prevParty) => {
			const newParty = [...prevParty];
			if (newParty[selectedTeam][selectedPokemon]) {
				newParty[selectedTeam][selectedPokemon] = {
					...newParty[selectedTeam][selectedPokemon],
					item: itemName.toLowerCase().replace(/\s/g, '-'),
				};
			}
			return newParty;
		});
		setItemSuggestions([]);
		setFocusedSuggestionIndex(-1);
		setItemError('');
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (itemSuggestions.length === 0) return;

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setFocusedSuggestionIndex((prevIndex) =>
					prevIndex < itemSuggestions.length - 1 ? prevIndex + 1 : -1
				);
				break;
			case 'ArrowUp':
				e.preventDefault();
				setFocusedSuggestionIndex((prevIndex) =>
					prevIndex > -1 ? prevIndex - 1 : itemSuggestions.length - 1
				);
				break;
			case 'Enter':
				e.preventDefault();
				if (focusedSuggestionIndex !== -1) {
					handleItemSuggestionSelect(
						itemSuggestions[focusedSuggestionIndex].name
					);
				}
				break;
			case 'Escape':
				e.preventDefault();
				setItemSuggestions([]);
				setFocusedSuggestionIndex(-1);
				break;
		}
	};

	return (
		<div className='relative mb-4 flex items-center gap-4 max-md:flex-col'>
			<h3 className='text-xl text-gray-600'>Item:</h3>
			<div className='relative' ref={itemInputRef}>
				<input
					className={`border-2 ${itemError ? 'border-red-500' : 'border-gray-300'} h-10 rounded-lg bg-white px-5 pr-16 text-sm focus:outline-none max-md:w-40`}
					type='text'
					name='Item'
					placeholder='Item'
					autoComplete='off'
					value={itemInput}
					onChange={handleItemInputChange}
					onBlur={handleItemInputBlur}
					onKeyDown={handleKeyDown}
				/>
				{itemError && <p className='mt-1 text-xs text-red-500'>{itemError}</p>}
				{itemSuggestions.length > 0 && itemInput !== '' && (
					<ul className='absolute z-10 mt-1 w-full rounded-lg border border-gray-300 bg-white shadow-lg'>
						{itemSuggestions.map((item, index) => (
							<li
								key={index}
								className={`cursor-pointer px-4 py-2 hover:bg-gray-100 ${
									index === focusedSuggestionIndex ? 'bg-gray-200' : ''
								}`}
								onClick={() => handleItemSuggestionSelect(item.name)}
							>
								<div>{item.name}</div>
								<div className='text-xs text-gray-500'>{item.effect}</div>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
};

export default ItemSelect;
