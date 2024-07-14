import type { pokemon } from '@/lib/pokemonInterface';
import { Tooltip } from 'flowbite-react';
import typeColors from '@/lib/typeColors.json';
import typeMatchups from '@/lib/typeMatchups.json';
import TypeBadge from '@/components/icons/TypeBadge';
import { useState, useEffect } from 'react';
import axios from 'axios';

interface TypeCoverageProps {
	pokemonParty: Array<Array<pokemon>>;
	selectedTeam: number;
	setEnableToast: React.Dispatch<
		React.SetStateAction<{ enabled: boolean; type: string; message: string }>
	>;
}

interface PokemonInfo {
	types: Array<{ type: { name: string } }>;
}

interface TypeMatchup {
	weaknesses: string[];
	resistances: string[];
	immunities: string[];
}

interface TypeMatchups {
	[key: string]: TypeMatchup;
}

type MoveData = {
	name: string;
	base: number;
	type: string;
	acc: number;
	effect: string;
	moveClass: string;
};

const renderTypeBadge = (type: string, size: number = 2) => (
	<TypeBadge type={type} size={size} />
);

const offensiveTooltipContent = (
	<div>
		<p>
			This component takes the moves of each of your pokemon (except status
			moves) and aggregates their types to get a picture of all of the types
			your team covers super-effectively. For instance, if you had a 1 pokemon
			team of Venusaur with the moves Giga Drain and Sludge Bomb, your total
			offensive spread would be...
		</p>
		<ul className='p-2'>
			<li className='flex items-center gap-2'>
				{renderTypeBadge('grass')} Giga Drain → {renderTypeBadge('water')}
				{renderTypeBadge('ground')}
				{renderTypeBadge('rock')} + 1
			</li>
			<li className='mt-1 flex items-center gap-2'>
				{renderTypeBadge('poison')} Sludge Bomb → {renderTypeBadge('grass')}
				{renderTypeBadge('fairy')} + 1
			</li>
		</ul>
	</div>
);

const defensiveTooltipContent = (
	<div>
		<p>
			This component calculates every weakness for a given pokemon and adds 1 to
			every type it is weak to. For instance, if you had a 1 pokemon team of
			Venusaur with the types Grass and Poison, your total defensive spread
			would be...
		</p>
		<ul className='p-2'>
			<li className='flex items-center gap-2'>
				{renderTypeBadge('fire')} + 1 → {renderTypeBadge('grass')} |{' '}
				{renderTypeBadge('flying')} + 1 → {renderTypeBadge('grass')}
			</li>
			<li className='mt-1 flex items-center gap-2'>
				{renderTypeBadge('ice')} + 1 → {renderTypeBadge('grass')} |{' '}
				{renderTypeBadge('psychic')} + 1 → {renderTypeBadge('poison')}
			</li>
		</ul>
	</div>
);

const typedTypeMatchups: TypeMatchups = typeMatchups as TypeMatchups;

const TypeCoverage = ({
	pokemonParty,
	selectedTeam,
	setEnableToast,
}: TypeCoverageProps): JSX.Element => {
	const [defensiveCoverage, setDefensiveCoverage] = useState<
		Record<string, number>
	>({});
	const [offensiveCoverage, setOffensiveCoverage] = useState<
		Record<string, number>
	>({});
	const [pokemonInfoList, setPokemonInfoList] = useState<Array<PokemonInfo>>(
		[]
	);
	const [movesList, setMovesList] = useState<Array<Array<MoveData>>>([[]]);

	useEffect(() => {
		const generateMovesList = async () => {
			const movesList: Array<Array<MoveData>> = [];
			for (const pokemon of pokemonParty[selectedTeam]) {
				const pokemonMoves: Array<MoveData> = [];
				for (const move of pokemon.moves) {
					const formattedMove = move.toLowerCase().replace(/\s/g, '-');
					try {
						const response = await axios.get(
							`/api/pokemon-moves?url=https://pokeapi.co/api/v2/move/${formattedMove}`
						);
						const moveData: MoveData = {
							name: response.data.name,
							base: response.data.base,
							type: response.data.type,
							acc: response.data.acc,
							effect: response.data.effect,
							moveClass: response.data.moveClass,
						};
						pokemonMoves.push(moveData);
					} catch (error) {
						setEnableToast({
							enabled: true,
							type: 'error',
							message: `Error fetching move data: ${error}`,
						});
					}
				}
				movesList.push(pokemonMoves);
			}
			setMovesList(movesList);
		};
		generateMovesList();
	}, [pokemonParty, selectedTeam, setMovesList, setEnableToast]);

	useEffect(() => {
		const fetchPokemonInfo = async () => {
			const infoList: Array<PokemonInfo> = [];
			for (const pokemon of pokemonParty[selectedTeam]) {
				if (pokemon.id !== 0) {
					try {
						const response = await axios.get<PokemonInfo>(
							`/api/pokemon-info?id=${pokemon.id}`
						);
						infoList.push(response.data);
					} catch (error) {
						setEnableToast({
							enabled: true,
							type: 'error',
							message: `Error fetching party data for type calculations: ${error}`,
						});
					}
				}
			}
			setPokemonInfoList(infoList);
		};

		fetchPokemonInfo();
	}, [pokemonParty, selectedTeam, setEnableToast]);

	useEffect(() => {
		const calculateDefensiveCoverage = () => {
			const coverage: Record<string, number> = {};

			Object.keys(typeColors).forEach((attackingType) => {
				coverage[attackingType] = pokemonInfoList.reduce((count, pokemon) => {
					let weaknessCount = 0;
					let resistanceCount = 0;

					for (const typeObj of pokemon.types) {
						const defenderType = typeObj.type.name;

						if (
							typedTypeMatchups[defenderType]?.weaknesses.includes(
								attackingType
							)
						) {
							weaknessCount++;
						}
						if (
							typedTypeMatchups[defenderType]?.resistances.includes(
								attackingType
							)
						) {
							resistanceCount++;
						}
						if (
							typedTypeMatchups[defenderType]?.immunities.includes(
								attackingType
							)
						) {
							return count;
						}
					}

					const netEffect = weaknessCount - resistanceCount;

					if (netEffect > 0) {
						return count + 1;
					}
					return count;
				}, 0);
			});

			setDefensiveCoverage(coverage);
		};

		const calculateOffensiveCoverage = () => {
			const coverage: Record<string, number> = {};

			Object.keys(typeColors).forEach((type) => {
				coverage[type] = 0;
			});

			movesList.forEach((pokemonMoves: Array<MoveData>) => {
				const coveredTypes: Array<string> = [];
				pokemonMoves.forEach((move) => {
					const moveType = move.type.toLowerCase();
					Object.keys(typeColors).forEach((defenderType) => {
						if (
							typedTypeMatchups[defenderType]?.weaknesses.includes(moveType) &&
							move.moveClass !== 'status' &&
							!coveredTypes.includes(defenderType)
						) {
							coverage[defenderType] += 1;
							coveredTypes.push(defenderType);
						}
					});
				});
			});

			setOffensiveCoverage(coverage);
		};

		if (pokemonInfoList.length > 0 && movesList.length > 0) {
			calculateDefensiveCoverage();
			calculateOffensiveCoverage();
		}
	}, [pokemonInfoList, movesList]);

	return (
		<div className='flex gap-4 max-md:flex-col'>
			<div className='relative rounded bg-[#f9f9f9] p-4 md:w-1/2'>
				<p className='p-2 pb-4 text-center font-semibold'>Offensive Spread</p>
				<div className='absolute right-5 top-5'>
					<Tooltip
						content={offensiveTooltipContent}
						style='light'
						className='w-96'
					>
						<svg
							xmlns='http://www.w3.org/2000/svg'
							width='1.5rem'
							height='1.5rem'
							viewBox='0 0 24 24'
						>
							<path
								fill='black'
								d='M12 17q.425 0 .713-.288T13 16v-4q0-.425-.288-.712T12 11t-.712.288T11 12v4q0 .425.288.713T12 17m0-8q.425 0 .713-.288T13 8t-.288-.712T12 7t-.712.288T11 8t.288.713T12 9m0 13q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22'
							/>
						</svg>
					</Tooltip>
				</div>
				<div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
					{Object.keys(typeColors).map((type) => (
						<div className='flex flex-col items-center gap-2 p-2' key={type}>
							<TypeBadge type={type} size={4} />
							<p
								className={offensiveCoverage[type] === 0 ? 'text-red-500' : ''}
							>
								{offensiveCoverage[type] || 0}
							</p>
						</div>
					))}
				</div>
			</div>
			<div className='relative rounded bg-[#f9f9f9] p-4 md:w-1/2'>
				<p className='p-2 pb-4 text-center font-semibold'>Defensive Spread</p>
				<div className='absolute right-5 top-5'>
					<Tooltip
						content={defensiveTooltipContent}
						style='light'
						className='w-96'
					>
						<svg
							xmlns='http://www.w3.org/2000/svg'
							width='1.5rem'
							height='1.5rem'
							viewBox='0 0 24 24'
						>
							<path
								fill='black'
								d='M12 17q.425 0 .713-.288T13 16v-4q0-.425-.288-.712T12 11t-.712.288T11 12v4q0 .425.288.713T12 17m0-8q.425 0 .713-.288T13 8t-.288-.712T12 7t-.712.288T11 8t.288.713T12 9m0 13q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22'
							/>
						</svg>
					</Tooltip>
				</div>
				<div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
					{Object.keys(typeColors).map((type) => (
						<div className='flex flex-col items-center gap-2 p-2' key={type}>
							<TypeBadge type={type} size={4} />
							<p className={defensiveCoverage[type] >= 3 ? 'text-red-500' : ''}>
								{defensiveCoverage[type] || 0}
							</p>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

export default TypeCoverage;
