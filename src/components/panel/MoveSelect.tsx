import React, {
	useEffect,
	useState,
	useCallback,
	useRef,
	KeyboardEvent,
} from 'react';
import { pokemon } from '@/lib/pokemonInterface';
import TypeBadge from '@/components/icons/TypeBadge';

interface MoveSuggestion {
	name: string;
	base: number;
	acc: number;
	type: string;
	effect: string;
	moveClass: string;
}

interface MoveSelectProps {
	index: number;
	selectedPokemon: number;
	validMoves: { name: string; url: string }[];
	pokemonParty: pokemon[][];
	setPokemonParty: React.Dispatch<React.SetStateAction<pokemon[][]>>;
	setEnableToast: React.Dispatch<
		React.SetStateAction<{ enabled: boolean; type: string; message: string }>
	>;
	selectedTeam: number;
}

const MoveSelect = ({
	index,
	selectedPokemon,
	validMoves,
	pokemonParty,
	setPokemonParty,
	setEnableToast,
	selectedTeam,
}: MoveSelectProps) => {
	const [moveInput, setMoveInput] = useState<string>('');
	const [moveSuggestions, setMoveSuggestions] = useState<MoveSuggestion[]>([]);
	const [moveError, setMoveError] = useState<string>('');
	const [selectedSuggestionIndex, setSelectedSuggestionIndex] =
		useState<number>(-1);
	const moveInputRef = useRef<HTMLInputElement>(null);
	const moveCache = useRef<Record<string, MoveSuggestion>>({});
	const [isInputFocused, setIsInputFocused] = useState<boolean>(false);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				moveInputRef.current &&
				!moveInputRef.current.contains(event.target as Node)
			) {
				setMoveSuggestions([]);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	const formatMoveName = useCallback((name: string) => {
		return name
			.split('-')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}, []);

	useEffect(() => {
		if (
			pokemonParty[selectedTeam][selectedPokemon] &&
			pokemonParty[selectedTeam][selectedPokemon].moves[index]
		) {
			setMoveInput(
				formatMoveName(pokemonParty[selectedTeam][selectedPokemon].moves[index])
			);
		} else {
			setMoveInput('');
		}
	}, [selectedPokemon, selectedTeam, pokemonParty, index, formatMoveName]);

	const handleMoveInputFocus = () => {
		setIsInputFocused(true);
		handleMoveSuggestions('');
	};

	const fetchMoveData = async (url: string): Promise<MoveSuggestion> => {
		if (moveCache.current[url]) {
			return moveCache.current[url];
		}

		try {
			const response = await fetch(
				`/api/pokemon-moves?url=${encodeURIComponent(url)}`
			);
			if (!response.ok) {
				throw new Error('Network response was not ok');
			}
			const moveData: MoveSuggestion = await response.json();

			moveCache.current[url] = moveData;
			return moveData;
		} catch (error) {
			setEnableToast({
				enabled: true,
				type: 'error',
				message: `Error fetching move: ${error}`,
			});
			return {
				name: '',
				base: 0,
				acc: 0,
				type: '',
				effect: '',
				moveClass: '',
			};
		}
	};

	const handleMoveSuggestions = async (value: string) => {
		let filteredMoves;

		if (value === '') {
			filteredMoves = validMoves;
		} else {
			filteredMoves = validMoves.filter((move: { name: string; url: string }) =>
				formatMoveName(move.name).toLowerCase().startsWith(value.toLowerCase())
			);
		}

		filteredMoves = validMoves.filter((move: { name: string; url: string }) =>
			formatMoveName(move.name).toLowerCase().startsWith(value.toLowerCase())
		);

		const suggestions: MoveSuggestion[] = await Promise.all(
			filteredMoves.map(async (move) => {
				return await fetchMoveData(move.url);
			})
		);

		setMoveSuggestions(suggestions);
	};

	const handleMoveInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setMoveInput(value);
		setSelectedSuggestionIndex(-1);
		handleMoveSuggestions(value);
	};

	const handleMoveInputBlur = () => {
		const formattedInput = moveInput.toLowerCase().replace(/\s/g, '-');
		if (
			moveInput === '' ||
			validMoves.some((move) => move.name === formattedInput)
		) {
			setPokemonParty((prevParty) => {
				const newParty = [...prevParty];
				if (newParty[selectedTeam][selectedPokemon]) {
					newParty[selectedTeam][selectedPokemon].moves[index] = formattedInput;
				}
				return newParty;
			});
			setMoveError('');
		} else {
			setMoveError('Please enter a valid move');
		}
	};

	const handleMoveSuggestionSelect = (moveName: string) => {
		setMoveInput(moveName);
		setPokemonParty((prevParty) => {
			const newParty = [...prevParty];
			if (newParty[selectedTeam][selectedPokemon]) {
				newParty[selectedTeam][selectedPokemon].moves[index] = moveName
					.toLowerCase()
					.replace(/\s/g, '-');
			}
			return newParty;
		});
		setMoveSuggestions([]);
		setMoveError('');
	};

	const handleMoveInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (moveSuggestions.length === 0) return;

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setSelectedSuggestionIndex((prevIndex) =>
					prevIndex < moveSuggestions.length - 1 ? prevIndex + 1 : 0
				);
				break;
			case 'ArrowUp':
				e.preventDefault();
				setSelectedSuggestionIndex((prevIndex) =>
					prevIndex > 0 ? prevIndex - 1 : moveSuggestions.length - 1
				);
				break;
			case 'Enter':
				e.preventDefault();
				if (selectedSuggestionIndex >= 0) {
					handleMoveSuggestionSelect(
						moveSuggestions[selectedSuggestionIndex].name
					);
				}
				break;
		}
	};

	const renderMoveSuggestions = () => {
		return moveSuggestions.map((move, index) => (
			<li
				key={move.name}
				className={`cursor-pointer px-4 py-2 hover:bg-gray-100 ${
					index === selectedSuggestionIndex ? 'bg-gray-100' : ''
				}`}
				onClick={() => handleMoveSuggestionSelect(move.name)}
			>
				<div className='flex flex-col'>
					<div className='flex items-center justify-between'>
						<h3 className='text-lg'>{move.name}</h3>
						<p className='text-xs capitalize text-gray-800'>
							BP: <strong className='font-medium'>{move.base || 'N/A'}</strong>
						</p>
					</div>
					<div className='flex items-center justify-between'>
						<div className='flex items-center gap-2'>
							<TypeBadge type={move.type} size={2} />
							{move.moveClass === 'physical' && (
								<img src='class/physical.png' alt='Physical move' />
							)}
							{move.moveClass === 'special' && (
								<img src='class/special.png' alt='Special move' />
							)}
							{move.moveClass === 'status' && (
								<img src='class/status.png' alt='Status move' />
							)}
						</div>
						<p className='text-xs text-gray-800'>
							ACC:
							<strong className='font-medium'>
								{move.acc !== null ? ` ${move.acc}%` : ' N/A'}
							</strong>
						</p>
					</div>
					{move.effect !==
						'Inflicts regular damage with no additional effect.' &&
						move.effect !== 'Inflicts regular damage.' && (
							<p className='pt-1 text-xs text-gray-500'>{move.effect}</p>
						)}
				</div>
			</li>
		));
	};

	return (
		<div className='relative mb-4 flex items-center gap-4'>
			<h3 className='max-md:text-nowrap text-xl text-gray-600'>Move {index + 1}: </h3>
			<div className='relative' ref={moveInputRef}>
				<input
					className={`border-2 ${
						moveError ? 'border-red-500' : 'border-gray-300'
					} h-10 rounded-lg bg-white px-5 pr-12 text-sm focus:outline-none max-md:w-full`}
					type='text'
					name='Move'
					autoComplete='off'
					placeholder='Move'
					value={moveInput}
					onChange={handleMoveInputChange}
					onFocus={handleMoveInputFocus}
					onBlur={handleMoveInputBlur}
					onKeyDown={handleMoveInputKeyDown}
					ref={moveInputRef}
				/>
				{moveError && <p className='mt-1 text-xs text-red-500'>{moveError}</p>}
				{isInputFocused && moveSuggestions.length > 0 && (
					<ul className='absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-300 bg-white shadow-lg'>
						{renderMoveSuggestions()}
					</ul>
				)}
			</div>
		</div>
	);
};

export default MoveSelect;
