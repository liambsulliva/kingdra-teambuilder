import React, { useState } from 'react';
import '@/app/globals.css';
import { Button, FloatingLabel } from 'flowbite-react';

const SigninPage: React.FC = () => {
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
        // Add your signin logic here
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen gap-6">
            <a className='hover:underline' href='/'>Home</a>
            <div className="flex flex-col items-center justify-center">
                <h1 className="text-2xl font-bold">Sign In</h1>
                <p className="py-2 mb-4 text-gray-600 text-sm">Don't have an account? <a href="/signup" className="text-blue-500 hover:text-blue-700 underline">Register Here</a></p>
                <form onSubmit={handleSubmit} className="w-64">
                    <div className="mb-4">
                        <FloatingLabel variant="outlined" label="Email" type="email" value={email} onChange={handleEmailChange} />
                    </div>
                    <div className="mb-4">
                        <FloatingLabel variant='outlined' label='Password' type='password' value={password} onChange={handlePasswordChange} />
                    </div>
                    <div className="flex justify-center">
                        <Button type='submit'>Submit</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SigninPage;