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
	stats: {
		base_stat: number;
	}[];
	moves: {
		move: {
			name: string;
			url: string;
		};
	}[];
}
