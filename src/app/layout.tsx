'use client'

import './globals.css'
import { Toaster } from 'sonner'
import AppLayout from '@/components/layout/AppLayout'

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="cs">
        <head>
            <title>SMS Manager</title>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
            <link
                href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300;0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700&display=swap"
                rel="stylesheet"
            />
        </head>
        <body className="bg-[#f5f5f7] text-[#111827] h-screen overflow-hidden">
        <AppLayout>{children}</AppLayout>
        <Toaster
            position="bottom-right"
            toastOptions={{
                style: {
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    color: '#111827',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                },
            }}
        />
        </body>
        </html>
    )
}