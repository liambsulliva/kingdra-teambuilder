//"use client"
//import Draggable from 'react-draggable';
import "@/app/globals.css";

interface PokeFinderCard {
    pokemon: {
        sprites: {
            front_default: string;
        };
        name: string;
    };
}

export default function PokeFinderCard({ pokemon }: PokeFinderCard) {
    return (
        <div className="flex flex-col justify-center items-center bg-[#fff] h-32 w-32 rounded shadow cursor-pointer">
            <img src={pokemon.sprites.front_default} alt="" />
            <p>{pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}</p>
        </div>
    );
}