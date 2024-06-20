"use client"

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PokeParty from "@/components/PokeParty";
import PokeInfo from "@/components/PokeInfo";
import PokeFinder from "@/components/PokeFinder";
import PokeSearch from "@/components/PokeSearch";

export default function Home() {
  return (
    <>
      <Header />
        <div className="flex flex-col gap-8 p-8">
          <div className="flex md:flex-row flex-col gap-4">
            <PokeParty />
            <PokeInfo />
          </div>
          <div className="flex flex-col gap-4">
            <PokeSearch />
            <PokeFinder />
          </div>
        </div>
      <Footer />
    </>   
  );
}
