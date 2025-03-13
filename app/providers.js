'use client'

import { Provider } from 'react-redux'
import { store } from '@/lib/redux/store'
import { ThemeProvider } from 'next-themes'
import { ChatProvider } from '@/contexts/ChatContext'
import { ChatDialogProvider } from '@/contexts/ChatDialogContext';

export function Providers({ children }) {
  return (
    <Provider store={store}>
      <ThemeProvider attribute="class">
        <ChatProvider>
          <ChatDialogProvider>
            {children}
          </ChatDialogProvider>
        </ChatProvider>
      </ThemeProvider>
    </Provider>
  )
}
