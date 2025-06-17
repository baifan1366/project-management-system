'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Only show the toggle after component has mounted to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Use a placeholder icon during SSR to ensure consistent rendering
  if (!mounted) {
    return (
      <button
        className="flex items-center gap-3 w-full px-4 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground"
        aria-label="Toggle theme"
      >
        <div className="h-4 w-4" />
        <span>Theme</span>
      </button>
    )
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="flex items-center gap-3 w-full px-4 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
      <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
    </button>
  )
}
