import { describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
process.env.MONGODB_URI = 'mongodb+srv://x:y@nowhere.invalid/db';
// Concurrent requests must wait on one connect: with bufferCommands off, a request that skips ahead queries a closed connection.
describe('dbConnect', () => {
	it('shares one attempt and retries after a failure', async () => {
		let fail = true;
		const connect = vi.spyOn(mongoose, 'connect').mockImplementation(() => new Promise((res, rej) => setTimeout(() => (fail ? rej(new Error('querySrv ETIMEOUT')) : res(mongoose)), 20)) as never);
		const { default: dbConnect } = await import('@/lib/db');
		const a = dbConnect(), b = dbConnect();
		expect(a).toBe(b);
		await expect(a).rejects.toThrow('ETIMEOUT');
		expect(connect).toHaveBeenCalledTimes(1);
		fail = false;
		await expect(dbConnect()).resolves.toBe(mongoose);
		expect(connect).toHaveBeenCalledTimes(2);
	});
});
