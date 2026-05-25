'use client'

import Titlebar from './Titlebar'
import Sidebar from './Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen bg-[#0b0b0b] overflow-hidden">
      {/* Custom titlebar */}
      <Titlebar />

      {/* Main area: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-[#0b0b0b]">
          <div className="animate-page p-6 min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
