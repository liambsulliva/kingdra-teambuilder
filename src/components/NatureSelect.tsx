import { useEffect, useState, useRef, KeyboardEvent } from 'react'
import natures from '../../lib/natures.json'
import { pokemon } from '../../lib/pokemonInterface'

type Nature = keyof typeof natures

const formatNatureName = (name: string) => {
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
}

const natureDescriptions = {
  adamant: (
    <>
      <span style={{ color: 'red' }}>Atk ↑</span> /{' '}
      <span style={{ color: 'blue' }}>SpA ↓</span>
    </>
  ),
  bold: (
    <>
      <span style={{ color: 'red' }}>Def ↑</span> /{' '}
      <span style={{ color: 'blue' }}>Atk ↓</span>
    </>
  ),
  calm: (
    <>
      <span style={{ color: 'red' }}>SpD ↑</span> /{' '}
      <span style={{ color: 'blue' }}>Atk ↓</span>
    </>
  ),
  careful: (
    <>
      <span style={{ color: 'red' }}>SpD ↑</span> /{' '}
      <span style={{ color: 'blue' }}>SpA ↓</span>
    </>
  ),
  gentle: (
    <>
      <span style={{ color: 'red' }}>SpD ↑</span> /{' '}
      <span style={{ color: 'blue' }}>Def ↓</span>
    </>
  ),
  hasty: (
    <>
      <span style={{ color: 'red' }}>Spe ↑</span> /{' '}
      <span style={{ color: 'blue' }}>Def ↓</span>
    </>
  ),
  impish: (
    <>
      <span style={{ color: 'red' }}>Def ↑</span> /{' '}
      <span style={{ color: 'blue' }}>SpA ↓</span>
    </>
  ),
  jolly: (
    <>
      <span style={{ color: 'red' }}>Spe ↑</span> /{' '}
      <span style={{ color: 'blue' }}>SpA ↓</span>
    </>
  ),
  lax: (
    <>
      <span style={{ color: 'red' }}>Def ↑</span> /{' '}
      <span style={{ color: 'blue' }}>SpD ↓</span>
    </>
  ),
  modest: (
    <>
      <span style={{ color: 'red' }}>SpA ↑</span> /{' '}
      <span style={{ color: 'blue' }}>Atk ↓</span>
    </>
  ),
  naive: (
    <>
      <span style={{ color: 'red' }}>Spe ↑</span> /{' '}
      <span style={{ color: 'blue' }}>SpD ↓</span>
    </>
  ),
  quiet: (
    <>
      <span style={{ color: 'red' }}>SpA ↑</span> /{' '}
      <span style={{ color: 'blue' }}>Spe ↓</span>
    </>
  ),
  rash: (
    <>
      <span style={{ color: 'red' }}>SpA ↑</span> /{' '}
      <span style={{ color: 'blue' }}>SpD ↓</span>
    </>
  ),
  relaxed: (
    <>
      <span style={{ color: 'red' }}>Def ↑</span> /{' '}
      <span style={{ color: 'blue' }}>Spe ↓</span>
    </>
  ),
  sassy: (
    <>
      <span style={{ color: 'red' }}>SpD ↑</span> /{' '}
      <span style={{ color: 'blue' }}>Spe ↓</span>
    </>
  ),
  timid: (
    <>
      <span style={{ color: 'red' }}>Spe ↑</span> /{' '}
      <span style={{ color: 'blue' }}>Atk ↓</span>
    </>
  ),
}

export default function NatureSelect({
  selectedPokemon,
  pokemonParty,
  setPokemonParty,
  selectedTeam,
}: {
  selectedPokemon: number
  pokemonParty: pokemon[][]
  setPokemonParty: React.Dispatch<React.SetStateAction<pokemon[][]>>
  selectedTeam: number
}) {
  const [natureInput, setNatureInput] = useState<string>('')
  const [natureSuggestions, setNatureSuggestions] = useState<Nature[]>([])
  const [natureError, setNatureError] = useState<string>('')
  const [focusedSuggestionIndex, setFocusedSuggestionIndex] =
    useState<number>(-1)
  const natureInputRef = useRef<HTMLDivElement>(null)
  const naturesArray = Object.keys(natures) as Nature[]

  useEffect(() => {
    if (
      pokemonParty[selectedTeam][selectedPokemon] &&
      pokemonParty[selectedTeam][selectedPokemon].nature
    ) {
      setNatureInput(
        formatNatureName(pokemonParty[selectedTeam][selectedPokemon].nature)
      )
    } else {
      setNatureInput('')
    }
  }, [selectedPokemon, selectedTeam, pokemonParty])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        natureInputRef.current &&
        !natureInputRef.current.contains(event.target as Node)
      ) {
        setNatureSuggestions([])
        setFocusedSuggestionIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleNatureInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setNatureInput(value)

    // Filter nature suggestions based on input
    const filteredSuggestions = naturesArray.filter((nature) =>
      nature.toLowerCase().includes(value.toLowerCase())
    )
    const formattedSuggestions = filteredSuggestions.map(
      formatNatureName
    ) as Nature[]

    setNatureSuggestions(formattedSuggestions)
    setFocusedSuggestionIndex(-1)

    // Clear error if input is empty
    if (value === '') {
      setNatureError('')
    }
  }

  const handleNatureInputBlur = () => {
    // Delay the blur effect to allow time for suggestion selection
    setTimeout(() => {
      const lowercaseInput = natureInput.toLowerCase()
      if (
        natureInput === '' ||
        naturesArray.includes(lowercaseInput as Nature)
      ) {
        setPokemonParty((prevParty) => {
          const newParty = [...prevParty]
          if (newParty[selectedTeam][selectedPokemon]) {
            newParty[selectedTeam][selectedPokemon] = {
              ...newParty[selectedTeam][selectedPokemon],
              nature: lowercaseInput,
            }
          }
          return newParty
        })
        setNatureError('')
      } else {
        setNatureError('Please enter a valid nature')
      }
      setNatureSuggestions([])
      setFocusedSuggestionIndex(-1)
    }, 100)
  }

  const handleNatureSuggestionSelect = (nature: Nature) => {
    setNatureInput(formatNatureName(nature))
    setPokemonParty((prevParty) => {
      const newParty = [...prevParty]
      if (newParty[selectedTeam][selectedPokemon]) {
        newParty[selectedTeam][selectedPokemon] = {
          ...newParty[selectedTeam][selectedPokemon],
          nature: nature.toLowerCase(),
        }
      }
      return newParty
    })
    setNatureSuggestions([])
    setFocusedSuggestionIndex(-1)
    setNatureError('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (natureSuggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedSuggestionIndex((prevIndex) =>
          prevIndex < natureSuggestions.length - 1 ? prevIndex + 1 : -1
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedSuggestionIndex((prevIndex) =>
          prevIndex > -1 ? prevIndex - 1 : natureSuggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (focusedSuggestionIndex !== -1) {
          handleNatureSuggestionSelect(
            natureSuggestions[focusedSuggestionIndex]
          )
        }
        break
      case 'Escape':
        e.preventDefault()
        setNatureSuggestions([])
        setFocusedSuggestionIndex(-1)
        break
    }
  }

  return (
    <div className="relative mb-4 flex items-center gap-4 max-md:flex-col">
      <h3 className="text-xl text-gray-600">Nature:</h3>
      <div className="relative" ref={natureInputRef}>
        <input
          className={`border-2 ${natureError ? 'border-red-500' : 'border-gray-300'} h-10 rounded-lg bg-white px-5 pr-16 text-sm focus:outline-none max-md:w-40`}
          type="text"
          name="Nature"
          placeholder="Nature"
          autoComplete="off"
          value={natureInput}
          onChange={handleNatureInputChange}
          onBlur={handleNatureInputBlur}
          onKeyDown={handleKeyDown}
        />
        {natureError && (
          <p className="mt-1 text-xs text-red-500">{natureError}</p>
        )}
        {natureSuggestions.length > 0 && natureInput !== '' && (
          <ul className="absolute z-10 mt-1 w-full rounded-lg border border-gray-300 bg-white shadow-lg">
            {natureSuggestions.slice(0, 10).map((nature, index) => (
              <li
                key={index}
                className={`cursor-pointer px-4 py-2 hover:bg-gray-100 ${
                  index === focusedSuggestionIndex ? 'bg-gray-200' : ''
                }`}
                onClick={() => handleNatureSuggestionSelect(nature)}
              >
                <div>{nature}</div>
                <div className="text-xs">
                  {natureDescriptions[nature.toLowerCase() as Nature]}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
