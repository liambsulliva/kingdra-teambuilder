import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local",
  );
}

interface Cached {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

let cached: Cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

// Define the Pokemon schema
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

// Define the User schema
const UserSchema = new mongoose.Schema({
  clerkUserId: { type: String, unique: true },
  pokemonParty: [[PokemonSchema]],
});

// Define models only if they haven't been defined yet
const Pokemon =
  mongoose.models.Pokemon || mongoose.model("Pokemon", PokemonSchema);
const User = mongoose.models.User || mongoose.model("User", UserSchema);

async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
export { User, Pokemon };
