import type { pokemon } from "../../lib/pokemonInterface";
import typeColors from "../../lib/typeColors.json";

interface TypeCoverageProps {
    pokemonParty: Array<pokemon>;
}

export default function TypeCoverage({ pokemonParty }: TypeCoverageProps) {
    return (
        <div className="flex max-md:flex-col gap-4">
            <div className="bg-[#f9f9f9] rounded p-4 w-1/2">
                <p className="text-center font-semibold p-2 pb-4">Offensive Coverage</p>
                <div className="grid grid-cols-5">
                    {Object.entries(typeColors).map(([type, color]) => (
                        <div className="flex flex-col gap-2 p-2 items-center" key={type}>
                            <div
                                className="rounded-xl px-4 py-2"
                                style={{ backgroundColor: `#${color}` }}
                            >
                                <p className="text-center capitalize text-white font-semibold">{type}</p>
                            </div>
                            <p>0</p>
                        </div>
                    ))}
                </div>
            </div>
            <div className="bg-[#f9f9f9] rounded p-4 w-1/2">
                <p className="text-center font-semibold p-2 pb-4">Defensive Coverage</p>
                <div className="grid grid-cols-5">
                    {Object.entries(typeColors).map(([type, color]) => (
                        <div className="flex flex-col gap-2 p-2 items-center" key={type}>
                            <div
                                className="rounded-xl px-4 py-2"
                                style={{ backgroundColor: `#${color}` }}
                            >
                                <p className="text-center capitalize text-white font-semibold">{type}</p>
                            </div>
                            <p>0</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}