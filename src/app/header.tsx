import { Button } from 'flowbite-react';

export default function Header() {
    return (
      <div className="p-6 pb-4 flex flex-row justify-between items-center">
        <h1 className="text-3xl font-semibold font-custom">Teambuilder</h1>
        <div className='flex flex-row gap-4'>
          <Button>Sign Up</Button>
          <Button>Login</Button>
        </div>
      </div>
    );
}