import React, { useState } from 'react';
import Header from '@/components/header';

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
        <div className="flex flex-col items-center justify-center h-screen">
            <h1 className="text-2xl font-bold mb-4">Sign In</h1>
            <form onSubmit={handleSubmit} className="w-64">
                <p className="text-sm mb-2">Don't have an account? <a href="/signup" className="text-blue-500">Register Here</a></p>
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
    );
};

export default SigninPage;