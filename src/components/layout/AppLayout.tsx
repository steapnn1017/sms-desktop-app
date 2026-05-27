'use client'

import Titlebar from './Titlebar'
import Sidebar from './Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col h-screen bg-[#f5f5f7] overflow-hidden">
            <Titlebar />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-y-auto bg-[#f5f5f7]">
                    <div className="animate-page p-6 min-h-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}