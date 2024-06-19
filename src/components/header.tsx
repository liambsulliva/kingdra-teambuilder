import Tabber from "@/components/Tabber";
import { Button } from 'flowbite-react';
import "@/app/globals.css";

export default function Header() {
    return (
      <div className="p-6 pb-4 flex flex-row justify-between items-center">
        <div className='flex flex-row gap-4 items-center'>
          <h1 className="text-3xl font-semibold font-custom">Teambuilder</h1>
          <Tabber />
        </div>
        <div className='flex flex-row gap-4'>
          <Button color="gray" href='/signin'>Account</Button>
          <Button color="gray" href='' disabled>Settings</Button>
        </div>
      </div>
    );
}