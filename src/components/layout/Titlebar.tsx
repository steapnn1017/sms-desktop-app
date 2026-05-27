'use client'

import { useEffect, useState } from 'react'
import { Minus, Square, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Titlebar() {
    const [isMaximized, setIsMaximized] = useState(false)
    const isElectron = typeof window !== 'undefined' && !!window.electronAPI

    useEffect(() => {
        if (!isElectron) return
        window.electronAPI.window.isMaximized().then(setIsMaximized)
    }, [isElectron])

    return (
        <div
            className="flex items-center justify-between h-9 bg-white border-b border-[#e5e7eb] flex-shrink-0 drag-region"
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
            <div className="px-4 flex items-center gap-2 no-drag">
                <span className="text-xs font-semibold text-[#9ca3af] tracking-widest uppercase">SMS Manager</span>
            </div>

            <div
                className="flex items-center no-drag"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
                <button
                    onClick={() => isElectron && window.electronAPI.window.minimize()}
                    className={cn(
                        'w-9 h-9 flex items-center justify-center',
                        'text-[#9ca3af] hover:text-[#6b7280] hover:bg-[#f3f4f6]',
                        'transition-all duration-100'
                    )}
                    title="Minimalizovat"
                >
                    <Minus className="w-3 h-3" />
                </button>
                <button
                    onClick={() => {
                        if (!isElectron) return
                        window.electronAPI.window.maximize()
                        setIsMaximized(p => !p)
                    }}
                    className={cn(
                        'w-9 h-9 flex items-center justify-center',
                        'text-[#9ca3af] hover:text-[#6b7280] hover:bg-[#f3f4f6]',
                        'transition-all duration-100'
                    )}
                    title={isMaximized ? 'Obnovit' : 'Maximalizovat'}
                >
                    <Square className="w-2.5 h-2.5" />
                </button>
                <button
                    onClick={() => isElectron && window.electronAPI.window.close()}
                    className={cn(
                        'w-9 h-9 flex items-center justify-center',
                        'text-[#9ca3af] hover:text-white hover:bg-red-500',
                        'transition-all duration-100'
                    )}
                    title="Skrýt do lišty"
                >
                    <X className="w-3 h-3" />
                </button>
            </div>
        </div>
    )
}