import PokeSlot from "@/components/PokeSlot";
import IETabber from "@/components/IETabber";
import "@/app/globals.css";

export default function PokeParty() {
    return (
    <div className="flex flex-col items-center py-4">
        <div className="p-6 grid md:grid-cols-2 grid-cols-3 gap-4">
            <PokeSlot />
            <PokeSlot />
            <PokeSlot />
            <PokeSlot />
            <PokeSlot />
            <PokeSlot />
        </div>
        <div>
            <IETabber leftLabel={"Import"} rightLabel={"Export"} />
        </div>
    </div>
      
    );
}