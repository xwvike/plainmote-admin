import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/i18n'
import './index.css'
import App from './App.tsx'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { TargetProvider } from '@/lib/target-context'
import { ThemeProvider } from '@/lib/theme'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <TooltipProvider>
        <TargetProvider>
          <App />
        </TargetProvider>
        <Toaster position="bottom-right" richColors={false} />
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>,
)
