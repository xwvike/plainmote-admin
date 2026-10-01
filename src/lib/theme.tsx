import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

// Light, dark, or whatever the system says. index.html applies the stored
// choice before the first paint; this keeps it in step afterwards.

export type ThemeChoice = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'plainmote-admin.theme'
const query = '(prefers-color-scheme: dark)'

function readChoice(): ThemeChoice {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

function isDark(choice: ThemeChoice) {
  return choice === 'dark' || (choice === 'system' && window.matchMedia(query).matches)
}

function apply(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
}

const ThemeContext = createContext<{ theme: ThemeChoice; dark: boolean; setTheme: (choice: string) => void }>({
  theme: 'system',
  dark: false,
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setChoice] = useState<ThemeChoice>(readChoice)
  // What is on screen, which under 'system' follows the OS as it changes.
  const [dark, setDark] = useState(() => isDark(readChoice()))

  useEffect(() => {
    const update = () => {
      const next = isDark(theme)
      apply(next)
      setDark(next)
    }
    update()
    if (theme !== 'system') return
    const media = window.matchMedia(query)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [theme])

  const setTheme = useCallback((choice: string) => {
    const next: ThemeChoice = choice === 'light' || choice === 'dark' ? choice : 'system'
    try {
      if (next === 'system') localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Not remembered, but still applied.
    }
    setChoice(next)
  }, [])

  return <ThemeContext.Provider value={{ theme, dark, setTheme }}>{children}</ThemeContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useTheme() {
  return useContext(ThemeContext)
}
