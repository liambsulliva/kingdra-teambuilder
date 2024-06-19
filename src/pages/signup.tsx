import React, { useState } from 'react';
import { Button, FloatingLabel } from 'flowbite-react';
import BackIcon from "@/components/BackIcon"
import '@/app/globals.css';

const SignupPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPassword(e.target.value);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Add your signup logic here
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen gap-6">
            <Button color="gray" href='/'>
                <BackIcon />
                Back
            </Button>
            <div className="flex flex-col py-8 px-12 bg-[#f9f9f9] rounded-xl items-center justify-center">
                <h1 className="text-2xl font-bold mb-6">Sign Up</h1>
                <form onSubmit={handleSubmit} className="w-64">
                    <div className="mb-4">
                        <FloatingLabel className='bg-[#f9f9f9]' variant="outlined" label="Email" type="email" value={email} onChange={handleEmailChange} />
                    </div>
                    <div className="mb-4">
                        <FloatingLabel className='bg-[#f9f9f9]' variant='outlined' label='Password' type='password' value={password} onChange={handlePasswordChange} />
                    </div>
                    <div className="flex justify-center">
                        <Button color="dark" type='submit'>Submit</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SignupPage;