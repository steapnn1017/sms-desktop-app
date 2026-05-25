'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Send,
  FileText,
  History,
  Users,
  Settings,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

const navItems = [
  {
    href: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/send',
    label: 'Odeslat SMS',
    icon: Send,
  },
  {
    href: '/templates',
    label: 'Šablony',
    icon: FileText,
  },
  {
    href: '/history',
    label: 'Historie',
    icon: History,
  },
  {
    href: '/customers',
    label: 'Zákazníci',
    icon: Users,
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isConnected, setIsConnected] = useState<boolean | null>(null)

  const isElectron = typeof window !== 'undefined' && !!window.electronAPI

  // Check gateway connection status
  useEffect(() => {
    if (!isElectron) return

    const checkConnection = async () => {
      try {
        const result = await window.electronAPI.sms.testConnection()
        setIsConnected(result.connected)
      } catch {
        setIsConnected(false)
      }
    }

    checkConnection()
    const interval = setInterval(checkConnection, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [isElectron])

  // Listen for navigation events from main process
  useEffect(() => {
    if (!isElectron) return
    window.electronAPI.window.onNavigate((route) => {
      router.push(route)
    })
  }, [isElectron, router])

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col bg-[#0b0b0b] border-r border-[#1a1a1a] h-full">
      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item, index) => {
          const Icon = item.icon
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname?.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'nav-item animate-sidebar-item',
                isActive && 'active'
              )}
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <Icon
                className={cn(
                  'w-4 h-4 flex-shrink-0',
                  isActive ? 'text-[#fd8408]' : 'text-[#525252]'
                )}
              />
              <span>{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#fd8408]" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-[#1a1a1a] space-y-0.5">
        {/* Connection status */}
        <div className={cn(
          'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs',
          isConnected === true && 'text-green-400',
          isConnected === false && 'text-red-400',
          isConnected === null && 'text-[#525252]'
        )}>
          {isConnected === true ? (
            <Wifi className="w-3.5 h-3.5" />
          ) : (
            <WifiOff className="w-3.5 h-3.5" />
          )}
          <span>
            {isConnected === true ? 'Gateway online' :
             isConnected === false ? 'Gateway offline' :
             'Kontroluji...'}
          </span>
          <div className={cn(
            'ml-auto w-1.5 h-1.5 rounded-full',
            isConnected === true && 'bg-green-400 animate-pulse',
            isConnected === false && 'bg-red-400',
            isConnected === null && 'bg-[#525252]'
          )} />
        </div>

        {/* Settings */}
        <Link
          href="/settings"
          className={cn(
            'nav-item',
            pathname === '/settings' && 'active'
          )}
        >
          <Settings className={cn(
            'w-4 h-4 flex-shrink-0',
            pathname === '/settings' ? 'text-[#fd8408]' : 'text-[#525252]'
          )} />
          <span>Nastavení</span>
          {pathname === '/settings' && (
            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#fd8408]" />
          )}
        </Link>
      </div>
    </aside>
  )
}
