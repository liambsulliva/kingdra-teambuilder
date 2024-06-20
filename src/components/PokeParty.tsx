import PokeSlot from "@/components/PokeSlot";
import IETabber from "@/components/IETabber";
import "@/app/globals.css";

interface pokemon {
    name: string,
    id: number,
    sprite: string
}

export default function PokeParty({ pokemonParty }: { pokemonParty: pokemon[] }) {
    return (
        <div className="flex flex-col items-center py-4">
            <div className="p-6 grid md:grid-cols-2 grid-cols-3 gap-4">
                {pokemonParty.map((pokemon, index) => (
                    <PokeSlot key={pokemon.id} pokemon={pokemon} />
                ))}
                {Array(Math.max(0, 6 - pokemonParty.length)).fill(
                    <PokeSlot />
                )}
            </div>
            <div>
                <IETabber leftLabel={"Import"} rightLabel={"Export"} />
            </div>
        </div>
    );
}