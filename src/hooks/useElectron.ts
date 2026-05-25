'use client'

import { useEffect, useState } from 'react'

/**
 * Returns true when running inside Electron (window.electronAPI is available).
 * Always returns false during SSR / static export.
 */
export function useElectron(): boolean {
  const [isElectron, setIsElectron] = useState(false)

  useEffect(() => {
    setIsElectron(typeof window !== 'undefined' && !!window.electronAPI)
  }, [])

  return isElectron
}

/**
 * Returns the electronAPI object, or null when not in Electron context.
 */
export function useElectronAPI() {
  const isElectron = useElectron()
  if (!isElectron) return null
  return typeof window !== 'undefined' ? window.electronAPI : null
}
