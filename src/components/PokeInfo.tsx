import "@/app/globals.css";

interface pokemon {
    name: string;
    id: number;
    sprite: string;
}

export default function PokeInfo({ selectedPokemon }: { selectedPokemon: pokemon }) {
    return (
        <div className="bg-[#f9f9f9] max-md:hidden rounded flex-grow">
            <img src={selectedPokemon.sprite} alt={selectedPokemon.name} />
        </div>
    );
}