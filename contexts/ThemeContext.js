'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { themes } from '@/lib/themes'

const ThemeContext = createContext({
  theme: 'light',
  currentTheme: themes.light,
  toggleTheme: () => {},
  setTheme: () => {}
})

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('dark') // Default to dark theme

  useEffect(() => {
    // Load theme from localStorage on mount
    const savedTheme = localStorage.getItem('orbit-theme')
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      setTheme(savedTheme)
    } else {
      // Default to dark theme like Linear
      setTheme('dark')
    }
  }, [])

  useEffect(() => {
    // Save theme to localStorage
    localStorage.setItem('orbit-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  const value = {
    theme,
    currentTheme: themes[theme],
    toggleTheme,
    setTheme
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}
