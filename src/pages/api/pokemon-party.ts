// Impossible not to use "any" for error handling :D
/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextApiRequest, NextApiResponse } from 'next'
import { getAuth } from '@clerk/nextjs/server'
import dbConnect, { User } from '../../../lib/db'
import { pokemon } from '../../../lib/pokemonInterface'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect()
  const { userId } = getAuth(req)
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' })
  }
  const user = await User.findOne({ clerkUserId: userId })

  if (!user) {
    const newUser = new User({ clerkUserId: userId, pokemonParty: [[]] })
    await newUser.save()
    console.log('New user created:', newUser)
    return res.status(200).json({ pokemonParty: [[]] })
  }

  if (req.method === 'POST') {
    const { pokemonParty } = req.body
    if (!Array.isArray(pokemonParty) || !pokemonParty.every(Array.isArray)) {
      res.status(400).json({
        message: 'Invalid request body. Expected 2D pokemonParty array.',
      })
      return
    }

    try {
      // Validate each Pokemon in each team
      for (const team of pokemonParty) {
        if (team.length > 6) {
          res.status(409).json({ message: 'Team size cannot exceed 6 Pokemon' })
          return
        }
        for (const pokemon of team) {
          const { name, id, sprite, level, moves, iv, ev } = pokemon
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
              .json({ message: 'Invalid Pokemon data in the party' })
            return
          }
        }
      }

      // Update the user's Pokemon party
      user.pokemonParty = pokemonParty
      await user.save()
      res.status(201).json({ message: 'Pokemon party updated successfully' })
    } catch (error: any) {
      res.status(500).json({
        message: 'Failed to update Pokemon party',
        error: error.message,
      })
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id, teamIndex } = req.query
      const teamIdx = Number(teamIndex)

      if (
        !user.pokemonParty[teamIdx] ||
        user.pokemonParty[teamIdx].length === 0
      ) {
        res.status(409).json({ message: "Team is empty or doesn't exist" })
        return
      }

      const existingPokemon = user.pokemonParty[teamIdx].find(
        (pokemon: pokemon) => pokemon.id === Number(id)
      )

      if (!existingPokemon) {
        res.status(404).json({ message: 'Pokemon not found in the team' })
        return
      }

      const index = user.pokemonParty[teamIdx].findIndex(
        (pokemon: pokemon) => pokemon.id === Number(id)
      )

      if (index !== -1) {
        user.pokemonParty[teamIdx].splice(index, 1)
        await user.save()
      }

      res.status(200).json({ message: 'Pokemon removed successfully' })
    } catch (error: any) {
      console.error('Failed to remove Pokemon:', error)
      res
        .status(500)
        .json({ message: 'Failed to remove Pokemon', error: error.message })
    }
  } else if (req.method === 'GET') {
    try {
      res.status(200).json({ pokemonParty: user.pokemonParty })
    } catch (error: any) {
      console.error('Failed to fetch Pokemon party:', error)
      res.status(500).json({
        message: 'Failed to fetch Pokemon party',
        error: error.message,
      })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'DELETE'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
