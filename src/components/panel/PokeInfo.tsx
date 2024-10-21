'use client';

import '@/app/globals.css';
import natures from '@/lib/natures.json';
import { useEffect, useCallback, useState, useMemo } from 'react';
import StatBar from '@/components/panel/StatBar';
import type { pokemon } from '@/lib/pokemonInterface';
import LocalIETabber from '@/components/LocalIETabber';
import NatureSelect from '@/components/panel/NatureSelect';
import ItemSelect from '@/components/panel/ItemSelect';
import MoveSelect from '@/components/panel/MoveSelect';
import LocationAreaEncounters from '@/components/panel/LocationAreaEncounters';
import type { pokemonInfo } from '@/lib/pokemonInterface';
import PokemonBasicInfo from '@/components/panel/PokemonBasicInfo';
import PokemonTypeInfo from '@/components/panel/PokemonTypeInfo';
import PokemonAbilitySelector from '@/components/panel/PokemonAbilitySelector';
import PokemonForms from './PokemonForms';
import { Tabs } from 'flowbite-react';
import PokemonSpeciesInfo from './PokemonSpeciesInfo';
import { useQuery, gql } from '@apollo/client';
import client from '@/lib/apolloClient';

const GET_POKEMON_INFO = gql`
	query GetPokemonInfo($id: Int!) {
		pokemon_v2_pokemon(where: { id: { _eq: $id } }) {
			name
			id
			pokemon_v2_pokemontypes {
				pokemon_v2_type {
					name
				}
			}
			pokemon_v2_pokemonabilities {
				pokemon_v2_ability {
					name
				}
				is_hidden
			}
			pokemon_v2_pokemonsprites {
				sprites
			}
			pokemon_v2_pokemonspecy {
				pokemon_v2_pokemonspeciesflavortexts(
					where: { language_id: { _eq: 9 } }
					limit: 1
				) {
					flavor_text
				}
			}
			pokemon_v2_pokemonstats {
				base_stat
			}
			pokemon_v2_pokemonmoves(
				where: { pokemon_v2_versiongroup: { name: { _eq: "scarlet-violet" } } }
			) {
				level
				pokemon_v2_move {
					name
				}
			}
			pokemon_v2_pokemonforms {
				name
				form_name
			}
		}
	}
`;

const PokeInfo = ({
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
}) => {
	const [totalEVs, setTotalEVs] = useState(0);
	const [validMoves, setValidMoves] = useState<{ name: string; url: string }[]>(
		[]
	);
	const [pokemonInfo, setPokemonInfo] = useState<pokemonInfo | null>(null);

	const currentPokemon = useMemo(() => {
		return pokemonParty[selectedTeam][selectedPokemon];
	}, [pokemonParty, selectedTeam, selectedPokemon]);

	const { loading, error, data } = useQuery(GET_POKEMON_INFO, {
		variables: { id: currentPokemon?.id },
		skip: !currentPokemon || currentPokemon.id === 0,
		client: client,
	});

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

	useEffect(() => {
		if (data && data.pokemon_v2_pokemon.length > 0) {
			const fetchedPokemon = data.pokemon_v2_pokemon[0];
			const formattedPokemonInfo: pokemonInfo = {
				name: fetchedPokemon.name,
				id: fetchedPokemon.id,
				types: fetchedPokemon.pokemon_v2_pokemontypes.map(
					(type: { pokemon_v2_type: { name: string } }) => ({
						type: { name: type.pokemon_v2_type.name },
					})
				),
				abilities: fetchedPokemon.pokemon_v2_pokemonabilities.map(
					(ability: {
						pokemon_v2_ability: { name: string };
						is_hidden: boolean;
					}) => ({
						ability: { name: ability.pokemon_v2_ability.name },
						is_hidden: ability.is_hidden,
					})
				),
				sprites: fetchedPokemon.pokemon_v2_pokemonsprites[0].sprites,
				cries: {
					latest: '', // Not available in the current GraphQL schema
					legacy: '', // Not available in the current GraphQL schema
				},
				species: {
					url: `https://pokeapi.co/api/v2/pokemon-species/${fetchedPokemon.id}/`,
				},
				stats: fetchedPokemon.pokemon_v2_pokemonstats.map(
					(stat: { base_stat: number }) => ({
						base_stat: stat.base_stat,
					})
				),
				moves: fetchedPokemon.pokemon_v2_pokemonmoves.map(
					(move: {
						pokemon_v2_move: { name: string };
						pokemon_v2_versiongroup: { name: string };
						level: number;
					}) => ({
						version_group_details: [
							{
								level_learned_at: move.level,
							},
						],
						move: {
							name: move.pokemon_v2_move.name,
							url: `https://pokeapi.co/api/v2/move/${move.pokemon_v2_move.name}/`,
						},
					})
				),
				forms: fetchedPokemon.pokemon_v2_pokemonforms.map(
					(form: { name: string }) => ({
						name: form.name,
						url: `https://pokeapi.co/api/v2/pokemon-form/${form.name}/`,
					})
				),
				location_area_encounters: `https://pokeapi.co/api/v2/pokemon/${fetchedPokemon.id}/encounters`,
			};

			setPokemonInfo(formattedPokemonInfo);

			const moves = formattedPokemonInfo.moves.map((move) => ({
				name: move.move.name,
				url: move.move.url,
			}));
			setValidMoves(moves);

			if (
				!currentPokemon.ability &&
				formattedPokemonInfo.abilities.length > 0
			) {
				handleAbilitySelect(formattedPokemonInfo.abilities[0].ability.name);
			}
		}
	}, [data, currentPokemon, handleAbilitySelect]);

	if (loading) return <p>Loading...</p>;
	if (error) return <p>Error: {error.message}</p>;

	return (
		<div className='relative flex-grow rounded bg-stone-50'>
			{pokemonInfo && pokemonParty[selectedTeam][selectedPokemon] && (
				<div className='flex justify-evenly gap-16 rounded-lg bg-white py-12 pl-14 pr-8 shadow-md max-lg:flex-col max-md:pl-8'>
					<div className='flex flex-col gap-2'>
						<PokemonBasicInfo
							pokemonInfo={pokemonInfo}
							pokemonParty={pokemonParty}
							selectedTeam={selectedTeam}
							selectedPokemon={selectedPokemon}
							gameMode={gameMode}
							setPokemonParty={setPokemonParty}
							setEnableToast={setEnableToast}
						/>
						<PokemonTypeInfo
							pokemonInfo={pokemonInfo}
							selectedPokemon={selectedPokemon}
							pokemonParty={pokemonParty}
							setPokemonParty={setPokemonParty}
							selectedTeam={selectedTeam}
						/>
						<PokemonAbilitySelector
							pokemonInfo={pokemonInfo}
							pokemonParty={pokemonParty}
							selectedTeam={selectedTeam}
							selectedPokemon={selectedPokemon}
							setPokemonParty={setPokemonParty}
						/>
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
					{gameMode === 'casual' && (
						<div>
							<Tabs
								className='flex flex-nowrap'
								aria-label='Tabs with underline'
							>
								<Tabs.Item active title='Basic Info'>
									<PokemonSpeciesInfo url={pokemonInfo.species.url} />
								</Tabs.Item>
								<Tabs.Item active title='Encounter Locations'>
									<LocationAreaEncounters
										url={pokemonInfo.location_area_encounters}
									/>
								</Tabs.Item>
								{pokemonInfo.forms.length > 1 && (
									<Tabs.Item title='Cosmetic Forms'>
										<PokemonForms forms={pokemonInfo.forms} />
									</Tabs.Item>
								)}
							</Tabs>
							<div className='flex items-center justify-between max-md:flex-col max-md:pt-8'>
								<a
									className='text-gray-500 hover:underline max-md:text-center'
									target='_blank'
									rel='noreferrer'
									href={`https://www.serebii.net/pokedex-sv/${pokemonInfo.name}`}
								>
									Serebii Breakdown
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
};

export default PokeInfo;
