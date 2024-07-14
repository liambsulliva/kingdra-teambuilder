import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
	throw new Error(
		'Please define the MONGODB_URI environment variable inside .env.local'
	);
}

const PokemonSchema = new mongoose.Schema({
	name: String,
	id: Number,
	sprite: String,
	level: Number,
	ability: String,
	nature: String,
	item: String,
	tera_type: String,
	moves: [String],
	iv: [Number],
	ev: [Number],
});

const UserSchema = new mongoose.Schema({
	clerkUserId: { type: String, unique: true },
	pokemonParty: [[PokemonSchema]],
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
