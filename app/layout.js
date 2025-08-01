'use client'

import './globals.css'
import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { useTheme } from '@/contexts/ThemeContext'

function ThemeWrapper({ children }) {
  return (
    <ThemeProvider>
      <ThemeContent>{children}</ThemeContent>
    </ThemeProvider>
  )
}

function ThemeContent({ children }) {
  const { theme } = useTheme()
  
  return (
    <html lang="en" className={theme}>
      <body className="antialiased">
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}

export default function RootLayout({ children }) {
  return <ThemeWrapper>{children}</ThemeWrapper>
}
