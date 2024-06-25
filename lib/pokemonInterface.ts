export interface pokemon {
    name: string,
    id: number,
    sprite: string,
    tera_type: string,
    moves: [
      move1: string,
      move2: string,
      move3: string,
      move4: string,
    ]
    iv: [
      HP: number,
      Atk: number,
      Def: number,
      SpA: number,
      SpD: number,
      Spd: number
    ]
    ev: [
      HP: number,
      Atk: number,
      Def: number,
      SpA: number,
      SpD: number,
      Spd: number
    ]
}