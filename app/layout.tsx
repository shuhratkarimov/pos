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
        url: '/pos-icon.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/pos-icon.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/pos-icon.png',
        type: 'image/png',
      },
    ],
    apple: '/pos-icon.png',
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

