export interface pokemon {
	name: string;
	id: number;
	generation?: number;
	sprite: string;
	level: number;
	ability: string;
	nature: string;
	item: string;
	tera_type: string;
	moves: [move1: string, move2: string, move3: string, move4: string];
	iv: [
		HP: number,
		Atk: number,
		Def: number,
		SpA: number,
		SpD: number,
		Spd: number,
	];
	ev: [
		HP: number,
		Atk: number,
		Def: number,
		SpA: number,
		SpD: number,
		Spd: number,
	];
}

export interface pokemonInfo {
	name: string;
	id: number;
	types: {
		type: {
			name: string;
		};
	}[];
	abilities: {
		ability: {
			name: string;
		};
		effect?: string;
	}[];
	sprites: {
		versions: {
			'generation-v': {
				'black-white': {
					animated: {
						front_default: string | null;
					};
				};
			};
		};
	};
	cries: {
		latest: string;
		legacy: string;
	};
	species: {
		url: string;
	};
	stats: {
		base_stat: number;
	}[];
	moves: {
		version_group_details: {
			version_group: { name: string };
			level_learned_at: number;
		}[];
		move: {
			name: string;
			url: string;
		};
	}[];
	forms: {
		name: string;
		url: string;
	}[];
	location_area_encounters: string;
}
