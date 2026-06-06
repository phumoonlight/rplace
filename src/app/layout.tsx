import type { Metadata } from 'next'
import { AuthProvider } from '@/lib/auth/auth-context'
import { ThemeProvider, THEME_INIT_SCRIPT } from '@/lib/theme/theme-context'
import './globals.css'

export const metadata: Metadata = {
  title: 'r/place clone',
  description: 'A collaborative pixel canvas',
}

type RootLayoutProps = Readonly<{ children: React.ReactNode }>

const RootLayout = ({ children }: RootLayoutProps) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

export default RootLayout
