import '@/app/globals.css';
import natures from '@/lib/natures.json';
import { useEffect, useCallback, useState } from 'react';
import axios from 'axios';
import StatBar from '@/components/panel/StatBar';
import type { pokemon } from '@/lib/pokemonInterface';
import LocalIETabber from '@/components/LocalIETabber';
import NatureSelect from '@/components/panel/NatureSelect';
import ItemSelect from '@/components/panel/ItemSelect';
import MoveSelect from '@/components/panel/MoveSelect';
import LocationAreaEncounters from '@/components/LocationAreaEncounters';
import type { pokemonInfo } from '@/lib/pokemonInterface';
import PokemonBasicInfo from '@/components/panel/PokemonBasicInfo';
import PokemonTypeInfo from '@/components/panel/PokemonTypeInfo';
import PokemonAbilitySelector from '@/components/panel/PokemonAbilitySelector';

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
	const [pokemonInfo, setPokemonInfo] = useState<pokemonInfo | undefined>();
	const [totalEVs, setTotalEVs] = useState(0);
	const [validMoves, setValidMoves] = useState<{ name: string; url: string }[]>(
		[]
	);

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
	}, [selectedTeam, selectedPokemon, pokemonParty, handleAbilitySelect]);

	if (!pokemonInfo || !pokemonParty[selectedTeam][selectedPokemon]) {
		return null;
	}

	return (
		<div className='flex-grow rounded bg-stone-50'>
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
						<div className='flex flex-col'>
							<h3 className='mb-4 text-xl font-bold'>Encounter Locations:</h3>
							<LocationAreaEncounters
								url={pokemonInfo.location_area_encounters}
							/>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default PokeInfo;
