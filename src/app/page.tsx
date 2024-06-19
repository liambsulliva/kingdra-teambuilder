import Layout from "./layout";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PokeParty from "@/components/PokeParty";
import PokeInfo from "@/components/PokeInfo";
import PokeFinder from "@/components/PokeFinder";

export default function Home() {
  return (
      <Layout>
        <Header />
        <div className="w-full flex flex-col gap-8 p-8">
          <div className="w-full flex flex-row">
            <PokeParty />
            <PokeInfo />
          </div>
          <PokeFinder />
        </div>
        <Footer />
      </Layout>
  );
}
