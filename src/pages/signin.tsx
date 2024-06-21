import '@/app/globals.css';
import { Button, FloatingLabel } from 'flowbite-react';
import BackIcon from "@/components/BackIcon";

const SigninPage: React.FC = () => {
    const handleSubmit = async (event: any) => {
        event.preventDefault();
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen gap-6">
            <Button color="gray" href='/'>
                <BackIcon />
                Back
            </Button>
            <div className="flex flex-col py-8 px-12 bg-[#f9f9f9] rounded-xl items-center justify-center">
                <h1 className="text-2xl font-bold p-1">Sign In</h1>
                <h2 className="text-md font-light p-1 pb-8">Let's start with your email.</h2>
                <form onSubmit={handleSubmit} className="w-64">
                    <div className="mb-4">
                        <FloatingLabel className='bg-[#f9f9f9]' variant="outlined" label="Email" type="email" />
                    </div>
                    <div className="flex justify-center">
                        <Button color="dark" type='submit'>Submit</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SigninPage;