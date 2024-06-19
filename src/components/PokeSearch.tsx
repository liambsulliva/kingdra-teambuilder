import "@/app/globals.css";
export default function PokeSearch() {
    return (
        <div className="w-full flex md:justify-end justify-center pt-2 relative text-gray-600">
            <input className="border-2 border-gray-300 bg-white h-10 px-5 pr-16 rounded-lg text-sm focus:outline-none" type="search" name="search" placeholder="Search" />
        </div>
    );
}