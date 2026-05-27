'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Send, FileText, History, Users, Settings, MessageSquareText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect } from 'react'

const navItems = [
    { href: '/send', label: 'Odeslat SMS', icon: Send },
    { href: '/templates', label: 'Šablony', icon: FileText },
    { href: '/history', label: 'Historie', icon: History },
    { href: '/customers', label: 'Zákazníci', icon: Users },
]

export default function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const isElectron = typeof window !== 'undefined' && !!window.electronAPI

    useEffect(() => {
        if (!isElectron) return
        window.electronAPI.window.onNavigate((route) => { router.push(route) })
    }, [isElectron, router])

    return (
        <aside className="w-52 flex-shrink-0 flex flex-col bg-white border-r border-[#e5e7eb] h-full">
            <div className="px-4 py-4 border-b border-[#f3f4f6]">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#f07820] flex items-center justify-center shadow-sm">
                        <MessageSquareText className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-sm font-bold text-[#111827]">SMS Manager</p>
                </div>
            </div>

            <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto">
                {navItems.map((item, index) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href ||
                        (item.href !== '/' && pathname?.startsWith(item.href))
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn('nav-item animate-sidebar-item', isActive && 'active')}
                            style={{ animationDelay: `${index * 40}ms` }}
                        >
                            <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-[#f07820]' : 'text-[#9ca3af]')} />
                            <span>{item.label}</span>
                        </Link>
                    )
                })}
            </nav>

            <div className="p-2.5 border-t border-[#f3f4f6]">
                <Link href="/settings" className={cn('nav-item', pathname === '/settings' && 'active')}>
                    <Settings className={cn('w-4 h-4 flex-shrink-0', pathname === '/settings' ? 'text-[#f07820]' : 'text-[#9ca3af]')} />
                    <span>Nastavení</span>
                </Link>
            </div>
        </aside>
    )
}