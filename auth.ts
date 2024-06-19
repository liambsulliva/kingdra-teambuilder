import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials";
import { ZodError } from "zod";
import { signInSchema } from "./lib/zod";

const mongoose = require("mongoose");
const bcrypt = require('bcryptjs');
const { Schema } = require("mongoose");
require('dotenv').config();

const mongoDb = process.env.DATABASE_URL;
mongoose.connect(mongoDb);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "mongo connection error"));
const userSchema = new Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
 
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      // You can specify which fields should be submitted, by adding keys to the `credentials` object.
      // e.g. domain, username, password, 2FA token, etc.
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        let user = null;

        const { email, password } = await signInSchema.parseAsync(credentials);
 
        // hash PW
        const pwHash = await bcrypt.hash(password, 10);
 
        // logic to verify if user exists
        user = await User.findOne({ email: email, password: pwHash });
 
        if (!user) {
          // No user found, so this is their first attempt to login
          // meaning this is also the place you could do registration
          throw new Error("User not found.")
        }
 
        // return user object with the their profile data
        return user;
      },
    }),
  ],
})