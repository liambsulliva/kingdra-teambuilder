import '@/app/globals.css';
import { Button, FloatingLabel } from 'flowbite-react';
import BackIcon from '@/components/BackIcon';

const SigninPage: React.FC = () => {
	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
	};

	return (
		<div className='flex h-screen flex-col items-center justify-center gap-6'>
			<Button color='light' href='/'>
				<BackIcon />
				Back
			</Button>
			<div className='flex flex-col items-center justify-center rounded-xl bg-[#f9f9f9] px-12 py-8'>
				<h1 className='p-1 text-2xl font-bold'>Sign In</h1>
				<h2 className='text-md p-1 pb-8 font-light'>
					Let&apos;s start with your email.
				</h2>
				<form onSubmit={handleSubmit} className='w-64'>
					<div className='mb-4'>
						<FloatingLabel
							className='bg-[#f9f9f9]'
							variant='outlined'
							label='Email'
							type='email'
						/>
					</div>
					<div className='flex justify-center'>
						<Button color='dark' type='submit'>
							Submit
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default SigninPage;
