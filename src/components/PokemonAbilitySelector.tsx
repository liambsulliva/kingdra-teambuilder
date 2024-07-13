import React, { useCallback } from 'react';
import { Button, Tooltip } from 'flowbite-react';
import { pokemon } from '../../lib/pokemonInterface';

interface PokemonAbilitySelectorProps {
	pokemonInfo: {
		abilities: Array<{
			ability: {
				name: string;
			};
			effect?: string;
		}>;
	};
	pokemonParty: pokemon[][];
	selectedTeam: number;
	selectedPokemon: number;
	setPokemonParty: React.Dispatch<React.SetStateAction<pokemon[][]>>;
}

const PokemonAbilitySelector: React.FC<PokemonAbilitySelectorProps> = ({
	pokemonInfo,
	pokemonParty,
	selectedTeam,
	selectedPokemon,
	setPokemonParty,
}) => {
	const handleAbilitySelect = useCallback(
		(abilityName: string) => {
			setPokemonParty((prevParty) => {
				const newParty = [...prevParty];
				newParty[selectedTeam][selectedPokemon] = {
					...newParty[selectedTeam][selectedPokemon],
					ability: abilityName,
				};
				return newParty;
			});
		},
		[selectedTeam, selectedPokemon, setPokemonParty]
	);

	return (
		<div className='mb-4 flex items-center gap-4 max-md:flex-col'>
			<h3 className='text-xl text-gray-600'>Ability:</h3>
			<ul className='relative flex flex-wrap gap-2 text-nowrap'>
				{Array.from(
					new Set(pokemonInfo.abilities.map((ability) => ability.ability.name))
				).map((abilityName, index) => {
					let effectText =
						pokemonInfo.abilities.find((a) => a.ability.name === abilityName)
							?.effect || '';
					effectText = effectText.split('Overworld:')[0].trim();

					const displayName = abilityName
						.split('-')
						.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
						.join(' ');

					return (
						<Tooltip
							key={index}
							className='w-64 text-wrap'
							content={effectText}
							style='light'
						>
							<Button
								color={
									pokemonParty[selectedTeam][selectedPokemon].ability ===
									abilityName
										? 'blue'
										: 'light'
								}
								onClick={() => handleAbilitySelect(abilityName)}
								className={`font-bold capitalize`}
							>
								{displayName}
							</Button>
						</Tooltip>
					);
				})}
			</ul>
		</div>
	);
};

export default PokemonAbilitySelector;
