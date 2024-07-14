import React, { useState } from 'react';
import { Button, ButtonGroup, Modal, Textarea } from 'flowbite-react';
import DownloadIcon from './ui/DownloadIcon';
import UploadIcon from './ui/UploadIcon';
import { pokemon } from '../../lib/pokemonInterface';

const Component = ({
	selectedPokemon,
	pokemonParty,
	setPokemonParty,
	setTotalEVs,
	setEnableToast,
	selectedTeam,
}: {
	selectedPokemon: number;
	pokemonParty: pokemon[][];
	setPokemonParty: React.Dispatch<React.SetStateAction<pokemon[][]>>;
	setTotalEVs: React.Dispatch<React.SetStateAction<number>>;
	setEnableToast: React.Dispatch<
		React.SetStateAction<{ enabled: boolean; type: string; message: string }>
	>;
	selectedTeam: number;
}) => {
	const [showModal, setShowModal] = useState(false);
	const [importText, setImportText] = useState('');

	const capitalizeFirstLetter = (str: string): string => {
		return str.replace(/\b\w/g, (char) => char.toUpperCase());
	};

	const statIndexToName = (index: number): string => {
		switch (index) {
			case 0:
				return 'HP';
			case 1:
				return 'Atk';
			case 2:
				return 'Def';
			case 3:
				return 'SpA';
			case 4:
				return 'SpD';
			case 5:
				return 'Spe';
			default:
				return '';
		}
	};

	const formatPokemonData = (pokemon: pokemon): string => {
		let output = `${capitalizeFirstLetter(pokemon.name)} @ ${capitalizeFirstLetter(pokemon.item)}\n`;
		output += `Ability: ${capitalizeFirstLetter(pokemon.ability)}\n`;

		if (pokemon.ev) {
			const evs = Object.entries(pokemon.ev)
				.filter(([value]) => parseInt(value) > 0)
				.map(([stat, value]) => `${value} ${statIndexToName(parseInt(stat))}`)
				.join(' / ');
			output += `EVs: ${evs}\n`;
		}

		if (pokemon.iv) {
			const ivs = Object.entries(pokemon.iv)
				.filter(([value]) => parseInt(value) !== 31)
				.map(([stat, value]) => `${value} ${statIndexToName(parseInt(stat))}`)
				.join(' / ');
			if (ivs) output += `IVs: ${ivs}\n`;
		}

		if (pokemon.tera_type) {
			output += `Tera Type: ${capitalizeFirstLetter(pokemon.tera_type)}\n`;
		}

		output += `${capitalizeFirstLetter(pokemon.nature)} Nature\n`;

		pokemon.moves.forEach((move) => {
			output += `- ${capitalizeFirstLetter(move)}\n`;
		});

		return output;
	};

	const exportSelectedPokemon = () => {
		if (selectedPokemon >= 0 && selectedPokemon < pokemonParty.length) {
			const formattedData = formatPokemonData(
				pokemonParty[selectedTeam][selectedPokemon]
			);
			navigator.clipboard
				.writeText(formattedData)
				.then(() => {
					setEnableToast({
						enabled: true,
						type: 'success',
						message: `Selected Pokémon copied to clipboard!`,
					});
				})
				.catch((err) => {
					setEnableToast({
						enabled: true,
						type: 'error',
						message: `Failed to copy Pokémon data to clipboard: ${err}`,
					});
				});
		} else {
			setEnableToast({
				enabled: true,
				type: 'error',
				message: `Selected pokemon is invalid.`,
			});
		}
	};

	const importPokemon = async () => {
		const importedPokemon = await parsePokemonData(importText);
		if (importedPokemon) {
			setPokemonParty((prevParty) => {
				const newParty = [...prevParty];
				newParty[selectedTeam][selectedPokemon] = {
					...newParty[selectedTeam][selectedPokemon],
					...importedPokemon,
				};
				return newParty;
			});
			if (importedPokemon.ev) {
				const totalEVs = importedPokemon.ev.reduce((sum, ev) => sum + ev, 0);
				setTotalEVs((prevTotal) => prevTotal + totalEVs);
			}
			setShowModal(false);
			setImportText('');
			setEnableToast({
				enabled: true,
				type: 'success',
				message: `Pokémon data imported successfully!`,
			});
		} else {
			setEnableToast({
				enabled: true,
				type: 'error',
				message: `Pokémon data formatting is invalid. Check your input.`,
			});
		}
	};

	const parsePokemonData = async (
		data: string
	): Promise<Partial<pokemon> | null> => {
		const lines = data.split('\n').map((line) => line.trim());
		if (lines.length < 3) return null;

		const capitalizeWords = (str: string): string => {
			return str
				.split(/[-\s]/)
				.map(
					(word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
				)
				.join(' ');
		};

		const [nameItem, abilityLine, ...rest] = lines;
		const [nameWithNicknameAndGender, rawItem] = nameItem
			.split('@')
			.map((s) => s.trim());

		const nameMatch = nameWithNicknameAndGender.match(
			/(?:\(([^()]+)\))?(?:\s*\([MF]\))?$/
		);
		const name = nameMatch
			? nameMatch[1] ||
				nameWithNicknameAndGender.replace(/\s*\([MF]\)\s*$/, '').trim()
			: nameWithNicknameAndGender.replace(/\s*\([MF]\)\s*$/, '').trim();

		const item = rawItem ? capitalizeWords(rawItem) : '';

		const abilityMatch = abilityLine.match(/Ability:\s*(.*)/);
		const ability = abilityMatch
			? abilityMatch[1].trim().toLowerCase().replace(/\s+/g, '-')
			: '';

		let sprite: string = '';
		let id: number = 0;
		const ev: [number, number, number, number, number, number] = [
			0, 0, 0, 0, 0, 0,
		];
		const iv: [number, number, number, number, number, number] = [
			31, 31, 31, 31, 31, 31,
		];
		let tera_type: string | undefined;
		let nature: string = '';
		const moves: [string, string, string, string] = ['', '', '', ''];

		rest.forEach((line) => {
			if (line.startsWith('EVs:')) {
				const evs = line.substring(4).split('/');
				evs.forEach((stat) => {
					const [value, name] = stat.trim().split(' ');
					const index = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'].indexOf(name);
					if (index !== -1) {
						ev[index] = parseInt(value);
					}
				});
			} else if (line.startsWith('IVs:')) {
				const ivs = line.substring(4).split('/');
				ivs.forEach((stat) => {
					const [value, name] = stat.trim().split(' ');
					const index = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'].indexOf(name);
					if (index !== -1) {
						iv[index] = parseInt(value);
					}
				});
			} else if (line.startsWith('Tera Type:')) {
				tera_type = line.split(':')[1].trim();
			} else if (line.endsWith('Nature')) {
				nature = line.split(' ')[0];
			} else if (line.startsWith('-')) {
				const moveIndex = moves.findIndex((move) => move === '');
				if (moveIndex !== -1) {
					moves[moveIndex] = line.substring(1).trim();
				}
			}
		});

		try {
			const response = await fetch(
				`/api/pokemon?name=${encodeURIComponent(name.toLowerCase())}`
			);
			if (!response.ok) {
				throw new Error('Failed to fetch Pokémon data');
			}
			const data = await response.json();
			//console.log('Fetched Pokémon data:', data);
			id = data.id;
			sprite = data.sprites.front_default;
		} catch (error) {
			setEnableToast({
				enabled: true,
				type: 'error',
				message: `Failed to fetch imported Pokémon data from server: ${error}`,
			});
		}

		return {
			name: name.toLowerCase(),
			id: id,
			sprite: sprite.toLowerCase(),
			level: 100,
			item: item,
			ability: ability.toLowerCase(),
			ev: ev,
			iv: iv,
			tera_type: tera_type?.toLowerCase(),
			nature: nature.toLowerCase(),
			moves: moves,
		};
	};

	return (
		<div className='m-4 flex flex-col items-center gap-2'>
			<ButtonGroup>
				<Button color='light' onClick={() => setShowModal(true)}>
					<DownloadIcon className='mr-3' />
					Import
				</Button>
				<Button color='light' onClick={exportSelectedPokemon}>
					<UploadIcon className='mr-3' />
					Export
				</Button>
			</ButtonGroup>

			<Modal show={showModal} onClose={() => setShowModal(false)} dismissible>
				<Modal.Header>Import Pokémon Data</Modal.Header>
				<Modal.Body>
					<Textarea
						rows={12}
						placeholder={`Expected Formatting (No Nicknames):

Name @ Item
Ability: Ability
Tera Type: Type
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Move 1
- Move 2
- Move 3
- Move 4`}
						value={importText}
						onChange={(e) => setImportText(e.target.value)}
					/>
				</Modal.Body>
				<Modal.Footer>
					<Button color='blue' onClick={importPokemon}>
						Import
					</Button>
					<Button color='light' onClick={() => setShowModal(false)}>
						Cancel
					</Button>
				</Modal.Footer>
			</Modal>
		</div>
	);
};

export default Component;
