import mongoose from 'mongoose';

const PokemonSchema = new mongoose.Schema({
  name: String,
  id: Number,
  sprite: String,
});

const UserSchema = new mongoose.Schema({
  clerkUserId: { type: String, unique: true },
  email: String,
  pokemonParty: [PokemonSchema],
});

export const User = mongoose.models.User || mongoose.model('User', UserSchema);