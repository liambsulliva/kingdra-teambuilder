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

const dbConnect = async (): Promise<typeof mongoose> => {
	const opts = {
		bufferCommands: false,
		serverSelectionTimeoutMS: 5000,
		socketTimeoutMS: 45000,
	};

	return mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
		return mongoose;
	});
};

export default dbConnect;
export { User };
