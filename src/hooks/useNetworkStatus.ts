import { useState, useEffect } from 'react'

export const useNetworkStatus = (): boolean => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const intervalId = setInterval(() => {
      setIsOnline((currentStatus) => {
        if (currentStatus !== navigator.onLine) {
          return navigator.onLine
        }
        return currentStatus
      })
    }, 1000)
    return () => {
      clearInterval(intervalId)
    }
  }, [])

  return isOnline
}