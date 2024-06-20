import "@/app/globals.css";

interface PokeInfoProps {
    pokemon?: string;
}

export default function PokeInfo({ pokemon }: PokeInfoProps) {
    return (
        <div className="bg-[#f9f9f9] max-md:hidden rounded flex-grow">
            {/* Use the 'pokemon' prop here */}
        </div>
    );
}