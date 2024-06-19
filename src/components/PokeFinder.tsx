import "@/app/globals.css";
import PokeFinderCard from "./PokeFinderCard";

export default function PokeFinder() {
    return (
        <div className="grid xl:grid-cols-9 lg:grid-cols-6 grid-cols-3 gap-6 bg-[#f9f9f9] p-6 justify-center items-center rounded">
            {Array(18).fill(<PokeFinderCard />)}
        </div>
    );
}