//"use client"
//import Draggable from 'react-draggable';
import "@/app/globals.css";

interface PokeFinderCard {
    pokemon: {
        sprite: string;
        name: string;
        id: string
    };
}

export default function PokeFinderCard({ pokemon }: PokeFinderCard) {
    return (
        <div className="flex flex-col justify-center items-center bg-[#fff] h-32 w-32 rounded shadow cursor-pointer">
            <img src={pokemon.sprite} alt={pokemon.name} />
            <p>{pokemon.name}</p>
        </div>
    );
}