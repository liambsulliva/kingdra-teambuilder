import "@/app/globals.css";

interface PokeSlot {
    pokemon?: {
        sprite: string;
        name: string;
    };
}

export default function PokeSlot({ pokemon }: PokeSlot) {
    return (
        <div>
            {pokemon ? (
                <div className="flex flex-col justify-center items-center bg-[#fff] h-24 w-24 rounded shadow cursor-pointer">
                    <img src={pokemon.sprite} alt={pokemon.name} />
                </div>
            ) : (
                <div className="bg-[#f9f9f9] h-24 w-24 rounded" />
            )}
        </div>
    );
}

