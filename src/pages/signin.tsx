import React, { useState } from 'react';
import '@/app/globals.css';
import { Button } from 'flowbite-react';

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
            <Button href='/'>Home</Button>
            <div className="flex flex-col items-center justify-center">
                <h1 className="text-2xl font-bold">Sign In</h1>
                <p className="py-2 mb-4 text-gray-600 text-sm">Don't have an account? <a href="/signup" className="text-blue-500 hover:text-blue-700 underline">Register Here</a></p>
                <form onSubmit={handleSubmit} className="w-64">
                    <div className="mb-4">
                        <label className="block mb-2">Email:</label>
                        <input className="w-full border border-gray-300 rounded px-2 py-1" type="email" value={email} onChange={handleEmailChange} />
                    </div>
                    <div className="mb-4">
                        <label className="block mb-2">Password:</label>
                        <input className="w-full border border-gray-300 rounded px-2 py-1" type="password" value={password} onChange={handlePasswordChange} />
                    </div>
                    <button className="bg-blue-500 text-white px-4 py-2 rounded" type="submit">Sign In</button>
                </form>
            </div>
        </div>
    );
};

export default SigninPage;