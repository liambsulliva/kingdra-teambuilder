import React, { useEffect, useState } from 'react';
import { pokemon } from '../../lib/pokemonInterface';

interface LevelSelectProps {
	selectedPokemon: number;
	pokemonParty: pokemon[][];
	setPokemonParty: React.Dispatch<React.SetStateAction<pokemon[][]>>;
	selectedTeam: number;
}

const LevelSelect = ({
	selectedPokemon,
	pokemonParty,
	setPokemonParty,
	selectedTeam,
}: LevelSelectProps) => {
	const [levelInput, setLevelInput] = useState<string>('');
	const [levelError, setLevelError] = useState<string>('');

	useEffect(() => {
		if (
			pokemonParty[selectedTeam][selectedPokemon] &&
			pokemonParty[selectedTeam][selectedPokemon].level
		) {
			setLevelInput(
				pokemonParty[selectedTeam][selectedPokemon].level.toString()
			);
		} else {
			setLevelInput('');
		}
	}, [selectedPokemon, selectedTeam, pokemonParty]);

	const handleLevelInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setLevelInput(value);

		// Clear error if input is empty
		if (value === '') {
			setLevelError('');
		}
	};

	const validateAndSetLevel = (level: number) => {
		if (level >= 1 && level <= 100) {
			setPokemonParty((prevParty) => {
				const newParty = [...prevParty];
				if (newParty[selectedTeam][selectedPokemon]) {
					newParty[selectedTeam][selectedPokemon] = {
						...newParty[selectedTeam][selectedPokemon],
						level: level,
					};
				}
				return newParty;
			});
			setLevelError('');
			return true;
		} else {
			setLevelError('Level must be between 1 and 100');
			return false;
		}
	};

	const handleLevelInputBlur = () => {
		const level = parseInt(levelInput, 10);
		if (isNaN(level)) {
			setLevelError('Please enter a valid number');
		} else {
			validateAndSetLevel(level);
		}
	};

	const handleLevelInputKeyPress = (
		e: React.KeyboardEvent<HTMLInputElement>
	) => {
		if (e.key === 'Enter') {
			const level = parseInt(levelInput, 10);
			if (!isNaN(level)) {
				validateAndSetLevel(level);
			}
		}
	};

	return (
		<div className='mb-4 flex items-center gap-4'>
			<h3 className='text-xl text-gray-600'>Lv.</h3>
			<div className='relative'>
				<input
					className={`border-2 ${levelError ? 'border-red-500' : 'border-gray-300'} h-10 w-20 rounded-lg bg-white px-4 text-sm focus:outline-none`}
					type='number'
					name='Level'
					autoComplete='off'
					value={levelInput}
					onChange={handleLevelInputChange}
					onBlur={handleLevelInputBlur}
					onKeyDown={handleLevelInputKeyPress}
					min='1'
					max='100'
				/>
				{levelError && (
					<p className='mt-1 text-xs text-red-500'>{levelError}</p>
				)}
			</div>
		</div>
	);
};

export default LevelSelect;
