import { useEffect, useState, useRef, KeyboardEvent } from 'react';
import { pokemon } from '@/lib/pokemonInterface';

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

	const fetchItemSuggestions = async (
		input: string
	): Promise<ItemSuggestion[]> => {
		try {
			const response = await fetch(
				`/api/pokemon-items?input=${encodeURIComponent(input)}`
			);
			if (!response.ok) {
				throw new Error('Network response was not ok');
			}
			return await response.json();
		} catch (error) {
			console.error('Error fetching item suggestions:', error);
			return [];
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

		const suggestions = await fetchItemSuggestions(value);
		setItemSuggestions(suggestions);
		setFocusedSuggestionIndex(-1);
	};

	const handleItemInputBlur = () => {
		setTimeout(() => {
			const formattedInput = itemInput.toLowerCase().replace(/\s/g, '-');
			if (
				itemInput === '' ||
				itemSuggestions.some(
					(item) =>
						item.name.toLowerCase().replace(/\s/g, '-') === formattedInput
				)
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
