'use client'

import './globals.css'
import { Toaster } from 'sonner'
import AppLayout from '@/components/layout/AppLayout'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs" className="dark">
      <head>
        <title>SMS Manager</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#0b0b0b] text-[#f5f5f5] h-screen overflow-hidden">
        <AppLayout>{children}</AppLayout>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#141414',
              border: '1px solid #262626',
              color: '#f5f5f5',
              borderRadius: '12px',
            },
          }}
        />
      </body>
    </html>
  )
}
