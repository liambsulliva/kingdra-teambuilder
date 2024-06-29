import { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import dbConnect, { User } from "../../../lib/db";
import { pokemon } from "../../../lib/pokemonInterface";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  await dbConnect();
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const user = await User.findOne({ clerkUserId: userId });

  if (!user) {
    console.log("User not found. Creating new user.");
    const newUser = new User({ clerkUserId: userId, pokemonParty: [] });
    await newUser.save();
    console.log("New user created:", newUser);
    return res.status(200).json({ pokemonParty: [] });
  }

  if (req.method === "POST") {
    const { pokemonParty } = req.body;
    if (!Array.isArray(pokemonParty)) {
      res
        .status(400)
        .json({
          message: "Invalid request body. Expected pokemonParty array.",
        });
      return;
    }

    try {
      // Validate each Pokemon in the party
      for (const pokemon of pokemonParty) {
        const { name, id, sprite, level, moves, iv, ev } = pokemon;
        if (
          !name ||
          !id ||
          !sprite ||
          !level ||
          moves.length === 0 ||
          iv.length !== 6 ||
          ev.length !== 6
        ) {
          res
            .status(400)
            .json({ message: "Invalid Pokemon data in the party" });
          return;
        }
      }

      // Check if party size is valid
      if (pokemonParty.length > 6) {
        res.status(409).json({ message: "Party size cannot exceed 6 Pokemon" });
        return;
      }

      // Update the user's Pokemon party
      user.pokemonParty = pokemonParty;
      await user.save();
      res.status(201).json({ message: "Pokemon party updated successfully" });
    } catch (error: any) {
      console.error("Failed to update Pokemon party:", error);
      res
        .status(500)
        .json({
          message: "Failed to update Pokemon party",
          error: error.message,
        });
    }
  } else if (req.method === "DELETE") {
    try {
      const { id } = req.query;
      if (user.pokemonParty.length === 0) {
        res.status(409).json({ message: "Party is empty" });
        return;
      }
      const existingPokemon = user.pokemonParty.find(
        (pokemon: pokemon) => pokemon.id === Number(id),
      );
      if (!existingPokemon) {
        res.status(404).json({ message: "Pokemon not found in the party" });
        return;
      }
      const index = user.pokemonParty.findIndex(
        (pokemon: pokemon) => pokemon.id === Number(id),
      );
      if (index !== -1) {
        user.pokemonParty.splice(index, 1);
        await user.save();
      }
      res.status(200).json({ message: "Pokemon removed successfully" });
    } catch (error: any) {
      console.error("Failed to remove Pokemon:", error);
      res
        .status(500)
        .json({ message: "Failed to remove Pokemon", error: error.message });
    }
  } else if (req.method === "GET") {
    try {
      res.status(200).json({ pokemonParty: user.pokemonParty });
    } catch (error: any) {
      console.error("Failed to fetch Pokemon party:", error);
      res
        .status(500)
        .json({
          message: "Failed to fetch Pokemon party",
          error: error.message,
        });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST", "DELETE"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
