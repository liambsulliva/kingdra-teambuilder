import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
	throw new Error(
		'Please define the MONGODB_URI environment variable inside .env.local'
	);
}

const UserSchema = new mongoose.Schema({
	clerkUserId: { type: String, unique: true },
	// Redesign: the whole library (teams with mode/format, boxes) as one document.
	library: { type: mongoose.Schema.Types.Mixed, default: null },
	// Pre-redesign fields, read once for migration.
	pokemonParty: { type: mongoose.Schema.Types.Mixed, default: undefined },
	teamNames: [String],
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

// One connection attempt shared by every request (and kept across dev hot reloads). With
// bufferCommands off, a request that skipped ahead of a pending connect would query a closed
// connection, so each waits on the same promise.
const cache = globalThis as typeof globalThis & { mongoosePending?: Promise<typeof mongoose> | null };

const dbConnect = (): Promise<typeof mongoose> => {
	if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose);
	cache.mongoosePending ??= mongoose
		.connect(MONGODB_URI!, {
			bufferCommands: false,
			serverSelectionTimeoutMS: 5000,
			socketTimeoutMS: 45000,
		})
		.catch((error) => {
			// A failed attempt (e.g. a DNS timeout) must not stick: the next request tries again.
			cache.mongoosePending = null;
			throw error;
		});
	return cache.mongoosePending;
};

export default dbConnect;
export { User };
