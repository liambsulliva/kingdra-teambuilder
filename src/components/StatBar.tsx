import React, { useState, useEffect } from 'react'
import { Tooltip } from 'flowbite-react'
import type { pokemon } from '../../lib/pokemonInterface'

interface StatBarProps {
  label: string
  id: number
  baseValue: number
  level: number
  iv: number
  ev: number
  totalEVs: number
  setTotalEVs: React.Dispatch<React.SetStateAction<number>>
  selectedPokemon: number
  setPokemonParty: React.Dispatch<React.SetStateAction<pokemon[][]>>
  selectedNature: string
  natures: Record<string, { positive: number; negative: number }>
  selectedTeam: number
}

const StatBar: React.FC<StatBarProps> = ({
  label,
  id,
  baseValue,
  level,
  iv,
  ev,
  totalEVs,
  setTotalEVs,
  selectedPokemon,
  setPokemonParty,
  selectedNature,
  natures,
  selectedTeam,
}) => {
  const [ivInput, setIvInput] = useState<string>('')
  const [ivError, setIvError] = useState<string>('')
  const [evInput, setEvInput] = useState<string>('')
  const [evError, setEvError] = useState<string>('')

  useEffect(() => {
    setEvInput(ev.toString())
    setIvInput(iv.toString())
  }, [ev, iv])

  const calculateStatTotal = () => {
    if (id === 0) {
      //Is HP, calculate differently
      return (
        Math.floor(
          ((2 * baseValue + iv + Math.floor(ev / 4) + 100) * level) / level
        ) + 10
      ) // 110 = Level 100 + 10
    } else {
      return Math.floor(
        (Math.floor(((2 * baseValue + iv + Math.floor(ev / 4)) * level) / 100) +
          5) *
          getNatureMultiplier()
      )
    }
  }

  const getNatureMultiplier = () => {
    if (!selectedNature || !natures[selectedNature]) return 1
    if (natures[selectedNature].positive === id) {
      return 1.1
    }
    if (natures[selectedNature].negative === id) {
      return 0.9
    }
    return 1
  }

  const getNatureColor = () => {
    if (!selectedNature || !natures[selectedNature]) return 'text-gray-600'
    if (natures[selectedNature].positive === id) {
      return 'text-red-600'
    }
    if (natures[selectedNature].negative === id) {
      return 'text-blue-600'
    }
    return 'text-gray-600'
  }

  const handleEV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newEV = parseInt(event.target.value)
    const evValue = isNaN(newEV) ? 0 : newEV
    const oldEV = ev
    const evDifference = evValue - oldEV

    if (totalEVs + evDifference <= 508) {
      setPokemonParty((prevParty) => {
        const updatedParty = [...prevParty]
        updatedParty[selectedTeam][selectedPokemon].ev[id] = evValue
        return updatedParty
      })
      setTotalEVs((prevTotal) => prevTotal + evDifference)
    }
  }

  const handleIvInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setIvInput(value)
    if (value === '') {
      setIvError('')
    }
  }

  const handleEvInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setEvInput(value)
    if (value === '') {
      setEvError('')
    }
  }

  const validateAndSetIV = (newIV: number) => {
    if (newIV >= 0 && newIV <= 31) {
      setPokemonParty((prevParty) => {
        const updatedParty = [...prevParty]
        updatedParty[selectedTeam][selectedPokemon].iv[id] = newIV
        return updatedParty
      })
      setIvError('')
      return true
    } else {
      setIvError('IV must be between 0 and 31')
      return false
    }
  }

  const validateAndSetEV = (newEV: number) => {
    if (newEV >= 0 && newEV <= 252) {
      const evDifference = newEV - ev
      if (totalEVs + evDifference <= 508) {
        setPokemonParty((prevParty) => {
          const updatedParty = [...prevParty]
          updatedParty[selectedTeam][selectedPokemon].ev[id] = newEV
          return updatedParty
        })
        setTotalEVs((prevTotal) => prevTotal + evDifference)
        setEvError('')
        return true
      } else {
        setEvError('Total EVs cannot exceed 508')
        return false
      }
    } else {
      setEvError('EV must be between 0 and 252')
      return false
    }
  }

  const handleIvInputBlur = () => {
    const newIV = parseInt(ivInput, 10)
    if (isNaN(newIV)) {
      setIvError('Please enter a valid number')
    } else {
      validateAndSetIV(newIV)
    }
  }

  const handleEvInputBlur = () => {
    const newEV = parseInt(evInput, 10)
    if (isNaN(newEV)) {
      setEvError('Please enter a valid number')
    } else {
      validateAndSetEV(newEV)
    }
  }

  const handleIvInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const newIV = parseInt(ivInput, 10)
      if (!isNaN(newIV)) {
        validateAndSetIV(newIV)
      }
    }
  }

  const handleEvInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const newEV = parseInt(evInput, 10)
      if (!isNaN(newEV)) {
        validateAndSetEV(newEV)
      }
    }
  }

  const handleIVDoubleClick = () => {
    setPokemonParty((prevParty) => {
      const updatedParty = [...prevParty]
      updatedParty[selectedTeam][selectedPokemon].iv[id] = 31
      return updatedParty
    })
  }

  const handleEVDoubleClick = () => {
    setPokemonParty((prevParty) => {
      const updatedParty = [...prevParty]
      setTotalEVs(
        (prevTotal) =>
          prevTotal - updatedParty[selectedTeam][selectedPokemon].ev[id]
      )
      updatedParty[selectedTeam][selectedPokemon].ev[id] = 0
      return updatedParty
    })
  }

  const speedCalcs = (
    <div>
      <ul className="gap-1 p-2">
        <li className="flex items-center gap-2">
          <p className="text-gray-600">
            +1 Stage / Scarfed: <strong>{calculateStatTotal() * 1.5}</strong>
          </p>
        </li>
        <li className="flex items-center gap-2">
          <p className="text-gray-600">
            +2 Stages: <strong>{calculateStatTotal() * 2}</strong>
          </p>
        </li>
        <li className="flex items-center gap-2">
          <p className="text-gray-600">
            +3 Stages: <strong>{calculateStatTotal() * 2.5}</strong>
          </p>
        </li>
      </ul>
    </div>
  )

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <p className={`${getNatureColor()} select-none text-nowrap`}>{label}</p>
        <div className="flex flex-col">
          <div
            style={{
              width: `${0.35 * calculateStatTotal()}px`,
              maxWidth: '10rem',
              height: '5px',
              backgroundColor: `hsl(${calculateStatTotal() * 0.2}, 100%, 50%)`,
              borderRadius: '15px',
              overflow: 'hidden',
              margin: '1rem 0',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${baseValue + ev}%`,
                transition:
                  'width 0.5s ease-out, background-color 0.5s ease-out',
                backgroundSize: '300% 100%',
                backgroundPosition: `${100 - calculateStatTotal()}% 0`,
              }}
            />
          </div>
        </div>
        <p>{calculateStatTotal()}</p>
        {label === 'Speed' && (
          <Tooltip content={speedCalcs} style="light" className="w-64">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="1.5rem"
              height="1.5rem"
              viewBox="0 0 24 24"
            >
              <path
                fill="black"
                d="M12 17q.425 0 .713-.288T13 16v-4q0-.425-.288-.712T12 11t-.712.288T11 12v4q0 .425.288.713T12 17m0-8q.425 0 .713-.288T13 8t-.288-.712T12 7t-.712.288T11 8t.288.713T12 9m0 13q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22"
              />
            </svg>
          </Tooltip>
        )}
      </div>
      <div className="flex gap-2">
        <p
          className="select-none text-gray-500"
          onDoubleClick={handleIVDoubleClick}
        >
          IV
        </p>
        <input
          className="w-32"
          type="range"
          min="0"
          max="31"
          value={iv}
          onChange={(e) => validateAndSetIV(parseInt(e.target.value, 10))}
        />
        <div className="relative">
          <input
            className={`border-2 ${ivError ? 'border-red-500' : 'border-gray-300'} w-18 h-10 rounded-lg bg-white px-4 text-sm focus:outline-none`}
            type="number"
            value={ivInput}
            onChange={handleIvInputChange}
            onBlur={handleIvInputBlur}
            onKeyDown={handleIvInputKeyPress}
            min="0"
            max="31"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <p
          className="select-none text-gray-500"
          onDoubleClick={handleEVDoubleClick}
        >
          EV
        </p>
        <input
          className="w-32"
          type="range"
          min="0"
          max="252"
          value={ev}
          onChange={handleEV}
        />
        <div className="relative">
          <input
            className={`border-2 ${evError ? 'border-red-500' : 'border-gray-300'} h-10 w-20 rounded-lg bg-white px-4 text-sm focus:outline-none`}
            type="number"
            value={evInput}
            onChange={handleEvInputChange}
            onBlur={handleEvInputBlur}
            onKeyDown={handleEvInputKeyPress}
            min="0"
            max="252"
          />
        </div>
      </div>
    </div>
  )
}

export default StatBar
