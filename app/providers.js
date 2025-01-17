'use client'

import { Provider } from 'react-redux'
import { store } from '@/lib/redux/store'
import { ThemeProvider } from 'next-themes'

export function Providers({ children }) {
  return (
    <Provider store={store}>
      <ThemeProvider attribute="class">
        {children}
      </ThemeProvider>
    </Provider>
  )
}
