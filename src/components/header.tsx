import ModeTabber from "@/components/ModeTabber";
import TeamSelector from "./TeamSelector";
import PokeballLogo from "./PokeballLogo";
import { Button } from 'flowbite-react';
import "@/app/globals.css";
import {
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton
} from '@clerk/nextjs';

export default function Header() {
    return (
      <div className="p-6 pb-4 flex flex-row justify-between items-center">
        <div className='flex flex-row gap-4 items-center'>
          <h1 className="text-3xl font-semibold font-custom max-md:hidden">Pokémon Teambuilder</h1>
          <PokeballLogo className="md:hidden" />
          <ModeTabber leftLabel={"Casual"} rightLabel={"Competitive"} />
        </div>
        <div className='flex flex-row gap-6 px-6 max-md:hidden'>
          <Button color="gray">New Team</Button>
          <TeamSelector />
          <SignedOut>
            <Button color="gray"><SignInButton /></Button>
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
        {/* Hamburger Menu Here on md: */}
      </div>
    );
}