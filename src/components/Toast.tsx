import { Toast as FlowbiteToast } from 'flowbite-react'
import { HiCheck, HiX } from 'react-icons/hi'
import { useState, useEffect } from 'react'

export default function Toast({
  enabled,
  type,
  message,
}: {
  enabled: boolean
  type: string
  message: string
}) {
  const [isVisible, setIsVisible] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    if (enabled) {
      setShouldRender(true)
      setTimeout(() => setIsVisible(true), 10)
    } else {
      setIsVisible(false)
      setTimeout(() => setShouldRender(false), 300)
    }
  }, [enabled])

  const isSuccess = type === 'success'

  if (!shouldRender) return null

  return (
    <div
      className={`fixed bottom-2 left-2 z-50 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
    >
      <FlowbiteToast>
        <div
          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isSuccess ? 'bg-green-100 text-green-500 dark:bg-green-800 dark:text-green-200' : 'bg-red-100 text-red-500 dark:bg-red-800 dark:text-red-200'}`}
        >
          {isSuccess ? (
            <HiCheck className="h-5 w-5" />
          ) : (
            <HiX className="h-5 w-5" />
          )}
        </div>
        <div className="ml-3 text-sm font-normal">{message}</div>
      </FlowbiteToast>
    </div>
  )
}
