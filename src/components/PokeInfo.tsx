'use client';

import '@/app/globals.css';
import typeMatchups from '../../lib/typeMatchups.json';
import TypeBadge from './TypeBadge';
import natures from '../../lib/natures.json';
import { Button, Tooltip } from 'flowbite-react';
import { useEffect, useMemo, useCallback, useState } from 'react';
import axios from 'axios';
import StatBar from './StatBar';
import type { pokemon } from '../../lib/pokemonInterface';
import LocalIETabber from './LocalIETabber';
import NatureSelect from './NatureSelect';
import ItemSelect from './ItemSelect';
import TeraSelect from './TeraSelect';
import MoveSelect from './MoveSelect';
import LevelSelect from './LevelSelect';
import type { pokemonInfo } from '../../lib/pokemonInterface';

export default function PokeInfo({
	gameMode,
	selectedPokemon,
	pokemonParty,
	setPokemonParty,
	setEnableToast,
	selectedTeam,
}: {
	gameMode: string;
	selectedPokemon: number;
	pokemonParty: pokemon[][];
	setPokemonParty: React.Dispatch<React.SetStateAction<pokemon[][]>>;
	setEnableToast: React.Dispatch<
		React.SetStateAction<{ enabled: boolean; type: string; message: string }>
	>;
	selectedTeam: number;
}) {
	const [pokemonInfo, setPokemonInfo] = useState<pokemonInfo | undefined>();
	const [totalEVs, setTotalEVs] = useState(0);
	const [validMoves, setValidMoves] = useState<{ name: string; url: string }[]>(
		[]
	);

	useEffect(() => {
		const fetchPokemonInfo = async () => {
			try {
				if (pokemonParty[selectedTeam][selectedPokemon].id !== 0) {
					const response = await axios.get(
						`/api/pokemon-info?id=${pokemonParty[selectedTeam][selectedPokemon].id}`
					);
					setPokemonInfo(response.data);
					if (
						!pokemonParty[selectedTeam][selectedPokemon].ability &&
						response.data.abilities.length > 0
					) {
						handleAbilitySelect(response.data.abilities[0].ability.name);
					}

					const moves = response.data.moves.map(
						(move: { move: { name: string; url: string } }) => ({
							name: move.move.name,
							url: move.move.url,
						})
					);
					setValidMoves(moves);
				}
			} catch (error) {
				console.error('Failed to fetch Pokemon info:', error);
			}
		};

		if (
			pokemonParty &&
			selectedPokemon !== -1 &&
			pokemonParty[selectedTeam][selectedPokemon] &&
			pokemonParty[selectedTeam][selectedPokemon].ev
		) {
			const newTotalEVs = pokemonParty[selectedTeam][selectedPokemon].ev.reduce(
				(sum, ev) => sum + ev,
				0
			);
			setTotalEVs(newTotalEVs);
		}
		fetchPokemonInfo();
	}, [selectedTeam, selectedPokemon, pokemonParty]);

	const calculateCombinedMatchups = useCallback((types: string[]) => {
		const effectiveness: { [key: string]: number } = {};

		types.forEach((type) => {
			const matchups = typeMatchups[type as keyof typeof typeMatchups];

			matchups.weaknesses.forEach((w) => {
				effectiveness[w] = (effectiveness[w] || 1) * 2;
			});
			matchups.resistances.forEach((r) => {
				effectiveness[r] = (effectiveness[r] || 1) * 0.5;
			});
			matchups.immunities.forEach((i) => {
				effectiveness[i] = 0;
			});
		});

		const weaknesses: string[] = [];
		const resistances: string[] = [];
		const immunities: string[] = [];

		Object.entries(effectiveness).forEach(([type, value]) => {
			if (value > 1) weaknesses.push(type);
			else if (value < 1 && value > 0) resistances.push(type);
			else if (value === 0) immunities.push(type);
		});

		return { weaknesses, resistances, immunities };
	}, []);

	const combinedMatchups = useMemo(() => {
		if (pokemonInfo && pokemonInfo.types) {
			return calculateCombinedMatchups(
				pokemonInfo.types.map((t: { type: { name: string } }) => t.type.name)
			);
		}
		return { weaknesses: [], resistances: [], immunities: [] };
	}, [pokemonInfo?.types, calculateCombinedMatchups]);

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

	if (!pokemonInfo || !pokemonParty[selectedTeam][selectedPokemon]) {
		return null;
	}

	return (
		<div className='flex-grow rounded bg-[#f9f9f9]'>
			{pokemonInfo && pokemonParty[selectedTeam][selectedPokemon] && (
				<div className='flex justify-evenly gap-24 rounded-lg bg-white py-12 pl-14 pr-8 shadow-md max-lg:flex-col max-md:pl-8'>
					<div className='flex flex-col gap-2'>
						<div className='flex max-md:justify-center max-md:gap-4'>
							<div className='flex h-32 w-32 items-center justify-center'>
								{pokemonInfo.sprites.versions['generation-v']['black-white']
									.animated.front_default ? (
									<img
										src={
											pokemonInfo.sprites.versions['generation-v'][
												'black-white'
											].animated.front_default
										}
										alt={pokemonInfo.name}
										className='object-contain'
									/>
								) : (
									<img
										src={pokemonParty[selectedTeam][selectedPokemon].sprite}
										alt={pokemonParty[selectedTeam][selectedPokemon].name}
										className='object-contain'
									/>
								)}
							</div>
							<div
								className={`flex flex-col ${gameMode === 'competitive' ? 'justify-end' : 'justify-center'}`}
							>
								<h2 className='mb-3 text-4xl font-bold capitalize text-black'>
									{(() => {
										const nameParts = pokemonInfo.name.split('-');
										if (nameParts.length > 1) {
											const form: string | undefined = nameParts.pop();
											if (form && ['galar', 'hisui', 'alola'].includes(form)) {
												const regionName =
													form === 'galar'
														? 'Galarian'
														: form === 'hisui'
															? 'Hisuian'
															: 'Alolan';
												return `${regionName} ${nameParts
													.map(
														(part) =>
															part.charAt(0).toUpperCase() + part.slice(1)
													)
													.join(' ')}`;
											}
										}
										return pokemonInfo.name
											.split('-')
											.map(
												(part) => part.charAt(0).toUpperCase() + part.slice(1)
											)
											.join(' ');
									})()}
								</h2>
								{gameMode === 'competitive' && (
									<LevelSelect
										selectedPokemon={selectedPokemon}
										pokemonParty={pokemonParty}
										setPokemonParty={setPokemonParty}
										selectedTeam={selectedTeam}
									/>
								)}
							</div>
						</div>
						<div className='flex flex-col'>
							<p className='mb-4 flex items-center gap-2.5 text-lg text-xl text-gray-600 max-md:flex-col'>
								Type:
								<div className='relative flex items-center gap-2 px-2 max-md:flex-wrap'>
									<Tooltip
										content={
											<div className='w-64 p-2'>
												<p className='mb-2 font-bold'>Weaknesses:</p>
												<div className='mb-2 flex flex-wrap gap-1'>
													{combinedMatchups.weaknesses.length > 0 ? (
														combinedMatchups.weaknesses.map((type, index) => (
															<TypeBadge key={index} type={type} size={3} />
														))
													) : (
														<span>None</span>
													)}
												</div>
												<p className='mb-2 font-bold'>Resistances:</p>
												<div className='mb-2 flex flex-wrap gap-1'>
													{combinedMatchups.resistances.length > 0 ? (
														combinedMatchups.resistances.map((type, index) => (
															<TypeBadge key={index} type={type} size={3} />
														))
													) : (
														<span>None</span>
													)}
												</div>
												<p className='mb-2 font-bold'>Immunities:</p>
												<div className='flex flex-wrap gap-1'>
													{combinedMatchups.immunities.length > 0 ? (
														combinedMatchups.immunities.map((type, index) => (
															<TypeBadge key={index} type={type} size={3} />
														))
													) : (
														<span>None</span>
													)}
												</div>
											</div>
										}
										style='light'
									>
										<div className='flex gap-2'>
											{pokemonInfo.types.map(
												(
													typeInfo: { type: { name: string } },
													index: number
												) => (
													<TypeBadge
														key={index}
														type={typeInfo.type.name}
														size={5}
													/>
												)
											)}
										</div>
									</Tooltip>
								</div>
							</p>
							<p className='mb-4 flex items-center gap-2.5 text-lg text-xl text-gray-600 max-md:flex-col'>
								Tera Type:
								<div className='flex items-center gap-2 px-2 max-md:flex-wrap'>
									<TeraSelect
										selectedPokemon={selectedPokemon}
										pokemonParty={pokemonParty}
										setPokemonParty={setPokemonParty}
										selectedTeam={selectedTeam}
									/>
								</div>
							</p>
							<div className='mb-4 flex items-center gap-4 max-md:flex-col'>
								<h3 className='text-xl text-gray-600'>Ability:</h3>
								<ul className='relative flex flex-wrap gap-2 text-nowrap'>
									{Array.from(
										new Set<string>(
											pokemonInfo.abilities.map(
												(ability: { ability: { name: string } }) =>
													ability.ability.name
											)
										)
									).map((abilityName: string, index: number) => {
										let effectText =
											pokemonInfo.abilities.find(
												(a: { ability: { name: string } }) =>
													a.ability.name === abilityName
											)?.effect || '';
										effectText = effectText.split('Overworld:')[0].trim();

										// Convert ability name to "This Case" format
										const displayName = abilityName
											.split('-')
											.map(
												(word) => word.charAt(0).toUpperCase() + word.slice(1)
											)
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
														pokemonParty[selectedTeam][selectedPokemon]
															.ability === abilityName
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
							<NatureSelect
								selectedPokemon={selectedPokemon}
								pokemonParty={pokemonParty}
								setPokemonParty={setPokemonParty}
								selectedTeam={selectedTeam}
							/>
							<ItemSelect
								selectedPokemon={selectedPokemon}
								pokemonParty={pokemonParty}
								setPokemonParty={setPokemonParty}
								selectedTeam={selectedTeam}
							/>
						</div>
						<div className='flex items-center justify-between'>
							<div className='flex flex-col max-md:mx-auto'>
								{[0, 1, 2, 3].map((index) => (
									<MoveSelect
										key={index}
										index={index}
										validMoves={validMoves}
										selectedPokemon={selectedPokemon}
										pokemonParty={pokemonParty}
										setPokemonParty={setPokemonParty}
										setEnableToast={setEnableToast}
										selectedTeam={selectedTeam}
									/>
								))}
							</div>
						</div>
					</div>
					{gameMode === 'competitive' && (
						<div className='flex flex-col'>
							<div className='mb-4'>
								<p className='text-gray-500 max-md:text-center'>
									Remaining EV points: {508 - totalEVs}
								</p>
							</div>
							<div className='grid h-full grid-cols-2 flex-wrap justify-evenly gap-16 rounded-xl max-xl:grid-cols-1 max-md:mx-auto md:border md:p-12'>
								<StatBar
									label={'HP'}
									id={0}
									baseValue={pokemonInfo.stats[0].base_stat}
									level={pokemonParty[selectedTeam][selectedPokemon].level}
									iv={pokemonParty[selectedTeam][selectedPokemon].iv[0]}
									ev={pokemonParty[selectedTeam][selectedPokemon].ev[0]}
									totalEVs={totalEVs}
									setTotalEVs={setTotalEVs}
									selectedPokemon={selectedPokemon}
									setPokemonParty={setPokemonParty}
									selectedNature={
										pokemonParty[selectedTeam][selectedPokemon].nature
									}
									natures={natures}
									selectedTeam={selectedTeam}
								/>
								<StatBar
									label={'Atk'}
									id={1}
									baseValue={pokemonInfo.stats[1].base_stat}
									level={pokemonParty[selectedTeam][selectedPokemon].level}
									iv={pokemonParty[selectedTeam][selectedPokemon].iv[1]}
									ev={pokemonParty[selectedTeam][selectedPokemon].ev[1]}
									totalEVs={totalEVs}
									setTotalEVs={setTotalEVs}
									selectedPokemon={selectedPokemon}
									setPokemonParty={setPokemonParty}
									selectedNature={
										pokemonParty[selectedTeam][selectedPokemon].nature
									}
									natures={natures}
									selectedTeam={selectedTeam}
								/>
								<StatBar
									label={'Def'}
									id={2}
									baseValue={pokemonInfo.stats[2].base_stat}
									level={pokemonParty[selectedTeam][selectedPokemon].level}
									iv={pokemonParty[selectedTeam][selectedPokemon].iv[2]}
									ev={pokemonParty[selectedTeam][selectedPokemon].ev[2]}
									totalEVs={totalEVs}
									setTotalEVs={setTotalEVs}
									selectedPokemon={selectedPokemon}
									setPokemonParty={setPokemonParty}
									selectedNature={
										pokemonParty[selectedTeam][selectedPokemon].nature
									}
									natures={natures}
									selectedTeam={selectedTeam}
								/>
								<StatBar
									label={'Sp. Atk'}
									id={3}
									baseValue={pokemonInfo.stats[3].base_stat}
									level={pokemonParty[selectedTeam][selectedPokemon].level}
									iv={pokemonParty[selectedTeam][selectedPokemon].iv[3]}
									ev={pokemonParty[selectedTeam][selectedPokemon].ev[3]}
									totalEVs={totalEVs}
									setTotalEVs={setTotalEVs}
									selectedPokemon={selectedPokemon}
									setPokemonParty={setPokemonParty}
									selectedNature={
										pokemonParty[selectedTeam][selectedPokemon].nature
									}
									natures={natures}
									selectedTeam={selectedTeam}
								/>
								<StatBar
									label={'Sp. Def'}
									id={4}
									baseValue={pokemonInfo.stats[4].base_stat}
									level={pokemonParty[selectedTeam][selectedPokemon].level}
									iv={pokemonParty[selectedTeam][selectedPokemon].iv[4]}
									ev={pokemonParty[selectedTeam][selectedPokemon].ev[4]}
									totalEVs={totalEVs}
									setTotalEVs={setTotalEVs}
									selectedPokemon={selectedPokemon}
									setPokemonParty={setPokemonParty}
									selectedNature={
										pokemonParty[selectedTeam][selectedPokemon].nature
									}
									natures={natures}
									selectedTeam={selectedTeam}
								/>
								<StatBar
									label={'Speed'}
									id={5}
									baseValue={pokemonInfo.stats[5].base_stat}
									level={pokemonParty[selectedTeam][selectedPokemon].level}
									iv={pokemonParty[selectedTeam][selectedPokemon].iv[5]}
									ev={pokemonParty[selectedTeam][selectedPokemon].ev[5]}
									totalEVs={totalEVs}
									setTotalEVs={setTotalEVs}
									selectedPokemon={selectedPokemon}
									setPokemonParty={setPokemonParty}
									selectedNature={
										pokemonParty[selectedTeam][selectedPokemon].nature
									}
									natures={natures}
									selectedTeam={selectedTeam}
								/>
							</div>
							<div className='flex items-center justify-between max-md:flex-col max-md:pt-8'>
								<a
									className='text-gray-500 hover:underline max-md:text-center'
									target='_blank'
									rel='noreferrer'
									href={`https://www.smogon.com/dex/sv/pokemon/${pokemonInfo.name}`}
								>
									Smogon Breakdown
								</a>
								<LocalIETabber
									selectedPokemon={selectedPokemon}
									pokemonParty={pokemonParty}
									setPokemonParty={setPokemonParty}
									setTotalEVs={setTotalEVs}
									setEnableToast={setEnableToast}
									selectedTeam={selectedTeam}
								/>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
