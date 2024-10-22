import React, { useCallback } from 'react';
import { Button, Tooltip } from 'flowbite-react';
import { pokemon } from '@/lib/pokemonInterface';

interface PokemonAbilitySelectorProps {
	pokemonInfo: {
		abilities: Array<{
			ability: {
				name: string;
			};
			is_hidden: boolean;
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

	// Ensure unique abilities...
	const uniqueAbilities: Array<(typeof pokemonInfo.abilities)[0]> = [];
	const abilityNames = new Set<string>();

	pokemonInfo.abilities.forEach((ability) => {
		if (!abilityNames.has(ability.ability.name)) {
			abilityNames.add(ability.ability.name);
			uniqueAbilities.push(ability);
		}
	});

	return (
		<div className='mb-4 flex items-center gap-4'>
			<h3 className='text-xl text-gray-600'>Ability:</h3>
			<ul className='relative flex flex-wrap gap-2 text-nowrap'>
				{uniqueAbilities.map((ability, index) => {
					let effectText = ability.effect || '';
					effectText = effectText.split('Overworld:')[0].trim();
					if (ability.is_hidden) {
						effectText = 'Hidden Ability: ' + effectText;
					}

					const displayName = ability.ability.name
						.split('-')
						.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
						.join(' ');

					const isSelected =
						pokemonParty[selectedTeam][selectedPokemon].ability ===
						ability.ability.name;
					const color =
						isSelected && ability.is_hidden
							? 'purple'
							: isSelected
								? 'blue'
								: 'light';

					return (
						<Tooltip
							key={index}
							className='w-64 text-wrap'
							content={effectText}
							style='light'
						>
							<Button
								color={color}
								onClick={() => handleAbilitySelect(ability.ability.name)}
								className='font-bold capitalize'
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
