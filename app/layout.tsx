import React from "react"
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import ToasterProvider from "@/components/ToasterProvider"
import { UserProvider } from "@/context/UserContext"
import LogoutSync from "@/components/Logout"

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'POS Sistema',
  description: 'Zamonaviy Savdo Nuqtasi (POS) Tizimi',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {

  return (
    <html lang="uz">
      <body className={`font-sans antialiased`}>
        <UserProvider>
          <LogoutSync>
            {children}
          </LogoutSync>
          <ToasterProvider />
          <Analytics />
        </UserProvider>
      </body>
    </html>
  )
}

