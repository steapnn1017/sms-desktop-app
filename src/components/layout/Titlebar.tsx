'use client'

import { useEffect, useState } from 'react'
import { Minus, Square, X, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Titlebar() {
  const [isMaximized, setIsMaximized] = useState(false)
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI

  useEffect(() => {
    if (!isElectron) return
    window.electronAPI.window.isMaximized().then(setIsMaximized)
  }, [isElectron])

  const handleMinimize = () => {
    if (!isElectron) return
    window.electronAPI.window.minimize()
  }

  const handleMaximize = () => {
    if (!isElectron) return
    window.electronAPI.window.maximize()
    setIsMaximized(prev => !prev)
  }

  const handleClose = () => {
    if (!isElectron) return
    window.electronAPI.window.close()
  }

  return (
    <div
      className="flex items-center justify-between h-10 bg-[#0b0b0b] border-b border-[#1a1a1a] flex-shrink-0 drag-region"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* App logo + name */}
      <div className="flex items-center gap-2 px-4 no-drag">
        <div className="w-5 h-5 rounded-md bg-[#fd8408] flex items-center justify-center">
          <MessageSquare className="w-3 h-3 text-black" strokeWidth={2.5} />
        </div>
        <span className="text-xs font-semibold text-[#a3a3a3] tracking-wide">SMS MANAGER</span>
      </div>

      {/* Window controls */}
      <div
        className="flex items-center no-drag"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={handleMinimize}
          className={cn(
            'w-10 h-10 flex items-center justify-center',
            'text-[#525252] hover:text-[#a3a3a3] hover:bg-[#1a1a1a]',
            'transition-all duration-100'
          )}
          title="Minimalizovat"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className={cn(
            'w-10 h-10 flex items-center justify-center',
            'text-[#525252] hover:text-[#a3a3a3] hover:bg-[#1a1a1a]',
            'transition-all duration-100'
          )}
          title={isMaximized ? 'Obnovit' : 'Maximalizovat'}
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          onClick={handleClose}
          className={cn(
            'w-10 h-10 flex items-center justify-center',
            'text-[#525252] hover:text-white hover:bg-red-500/80',
            'transition-all duration-100'
          )}
          title="Skrýt do lišty"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
