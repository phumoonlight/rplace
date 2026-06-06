import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { AuthProvider } from '@/lib/auth/auth-context'
import {
  THEME_COOKIE,
  THEME_DEFAULT,
  ThemeProvider,
  type Theme,
} from '@/lib/theme/theme-context'
import './globals.css'

export const metadata: Metadata = {
  title: 'r/place clone',
  description: 'A collaborative pixel canvas',
}

type RootLayoutProps = Readonly<{ children: React.ReactNode }>

const RootLayout = async ({ children }: RootLayoutProps) => {
  const stored = (await cookies()).get(THEME_COOKIE)?.value
  const theme: Theme = stored === 'dark' || stored === 'light' ? stored : THEME_DEFAULT

  return (
    <html
      className={theme === 'dark' ? 'dark' : undefined}
      lang="en"
      style={{ colorScheme: theme }}
    >
      <body>
        <ThemeProvider initialTheme={theme}>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

export default RootLayout
