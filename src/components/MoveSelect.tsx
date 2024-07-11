import { useEffect, useState, useRef, KeyboardEvent } from 'react'
import { pokemon } from '../../lib/pokemonInterface'
import TypeBadge from './TypeBadge'

interface MoveSuggestion {
  name: string
  base: number
  acc: number
  type: string
  effect: string
  moveClass: string
}

export default function moveSelect({
  index,
  selectedPokemon,
  validMoves,
  pokemonParty,
  setPokemonParty,
  setEnableToast,
  selectedTeam,
}: {
  index: number
  validMoves: { name: string; url: string }[]
  selectedPokemon: number
  pokemonParty: pokemon[][]
  setPokemonParty: React.Dispatch<React.SetStateAction<pokemon[][]>>
  setEnableToast: React.Dispatch<
    React.SetStateAction<{ enabled: boolean; type: string; message: string }>
  >
  selectedTeam: number
}) {
  const [moveInput, setMoveInput] = useState<string>('')
  const [moveSuggestions, setMoveSuggestions] = useState<MoveSuggestion[]>([])
  const [moveError, setMoveError] = useState<string>('')
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] =
    useState<number>(-1)
  const moveInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (
      pokemonParty[selectedTeam][selectedPokemon] &&
      pokemonParty[selectedTeam][selectedPokemon].moves[index]
    ) {
      setMoveInput(
        formatMoveName(pokemonParty[selectedTeam][selectedPokemon].moves[index])
      )
    } else {
      setMoveInput('')
    }
  }, [selectedPokemon, selectedTeam, pokemonParty])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        moveInputRef.current &&
        !moveInputRef.current.contains(event.target as Node)
      ) {
        setMoveSuggestions([])
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const formatMoveName = (name: string) => {
    return name
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const fetchMoveData = async (url: string): Promise<MoveSuggestion> => {
    try {
      const response = await fetch(url)
      const data = await response.json()

      const name =
        data.names.find(
          (entry: { language: { name: string } }) =>
            entry.language.name === 'en'
        )?.name || ''
      const base = data.power
      const type = data.type.name
      const acc = data.accuracy
      const effect =
        data.effect_entries.find(
          (entry: { language: { name: string } }) =>
            entry.language.name === 'en'
        )?.short_effect || ''
      const moveClass = data.damage_class.name || ''

      return { name, base, type, acc, effect, moveClass }
    } catch (error) {
      setEnableToast({
        enabled: true,
        type: 'error',
        message: `Error fetching move: ${error}`,
      })
      return { name: '', base: 0, acc: 0, type: '', effect: '', moveClass: '' }
    }
  }

  const handleMoveInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value
    setMoveInput(value)
    setSelectedSuggestionIndex(-1)

    if (value === '') {
      setMoveSuggestions([])
      setMoveError('')
      return
    }

    const filteredMoves = validMoves.filter(
      (move: { name: string; url: string }) =>
        formatMoveName(move.name).toLowerCase().includes(value.toLowerCase())
    )

    const suggestions: MoveSuggestion[] = await Promise.all(
      filteredMoves.map(async (move) => {
        const { name, base, acc, type, effect, moveClass }: MoveSuggestion =
          await fetchMoveData(move.url)
        return {
          name: name,
          base: base,
          acc: acc,
          type: type,
          effect: effect,
          moveClass: moveClass,
        }
      })
    )

    setMoveSuggestions(suggestions)
  }

  const handleMoveInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (moveSuggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedSuggestionIndex((prevIndex) =>
          prevIndex < moveSuggestions.length - 1 ? prevIndex + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedSuggestionIndex((prevIndex) =>
          prevIndex > 0 ? prevIndex - 1 : moveSuggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedSuggestionIndex >= 0) {
          handleMoveSuggestionSelect(
            moveSuggestions[selectedSuggestionIndex].name
          )
        }
        break
    }
  }

  const handleMoveInputBlur = () => {
    const formattedInput = moveInput.toLowerCase().replace(/\s/g, '-')
    if (
      moveInput === '' ||
      validMoves.some((move) => move.name === formattedInput)
    ) {
      setPokemonParty((prevParty) => {
        const newParty = [...prevParty]
        if (newParty[selectedTeam][selectedPokemon]) {
          newParty[selectedTeam][selectedPokemon].moves[index] = formattedInput
        }
        return newParty
      })
      setMoveError('')
    } else {
      setMoveError('Please enter a valid move')
    }
  }

  const handleMoveSuggestionSelect = (moveName: string) => {
    setMoveInput(moveName)
    setPokemonParty((prevParty) => {
      const newParty = [...prevParty]
      if (newParty[selectedTeam][selectedPokemon]) {
        newParty[selectedTeam][selectedPokemon].moves[index] = moveName
          .toLowerCase()
          .replace(/\s/g, '-')
      }
      return newParty
    })
    setMoveSuggestions([])
    setMoveError('')
  }

  return (
    <div className="relative mb-4 flex items-center gap-4 max-md:flex-col">
      <h3 className="text-xl text-gray-600">Move {index + 1}: </h3>
      <div className="relative" ref={moveInputRef}>
        <input
          className={`border-2 ${moveError ? 'border-red-500' : 'border-gray-300'} h-10 rounded-lg bg-white px-5 pr-12 text-sm focus:outline-none max-md:w-40`}
          type="text"
          name="Move"
          autoComplete="off"
          placeholder="Move"
          value={moveInput}
          onChange={handleMoveInputChange}
          onBlur={handleMoveInputBlur}
          onKeyDown={handleMoveInputKeyDown}
          ref={moveInputRef}
        />
        {moveError && <p className="mt-1 text-xs text-red-500">{moveError}</p>}
        {moveSuggestions.length > 0 && moveInput !== '' && (
          <ul className="absolute z-10 mt-1 w-full rounded-lg border border-gray-300 bg-white shadow-lg">
            {moveSuggestions.slice(0, 10).map((move, index) => (
              <li
                key={index}
                className={`cursor-pointer px-4 py-2 hover:bg-gray-100 ${
                  index === selectedSuggestionIndex ? 'bg-gray-100' : ''
                }`}
                onClick={() => handleMoveSuggestionSelect(move.name)}
              >
                <div className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg">{move.name}</h3>
                    <p className="text-xs capitalize text-gray-800">
                      BP:{' '}
                      <strong className="font-medium">
                        {move.base || 'N/A'}
                      </strong>
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TypeBadge type={move.type} size={2} />
                      {move.moveClass === 'physical' && (
                        <img src="physical.png" />
                      )}
                      {move.moveClass === 'special' && (
                        <img src="special.png" />
                      )}
                      {move.moveClass === 'status' && <img src="status.png" />}
                    </div>
                    <p className="text-xs text-gray-800">
                      ACC: <strong className="font-medium">{move.acc}%</strong>
                    </p>
                  </div>
                  {move.effect !==
                    'Inflicts regular damage with no additional effect.' &&
                    move.effect !== 'Inflicts regular damage.' && (
                      <p className="pt-1 text-xs text-gray-500">
                        {move.effect}
                      </p>
                    )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
