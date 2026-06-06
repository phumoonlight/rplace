import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'
import { AuthProvider } from '@/lib/auth/auth-context'
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/seo/site'
import {
  THEME_COOKIE,
  THEME_DEFAULT,
  ThemeProvider,
  type Theme,
} from '@/lib/theme/theme-context'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — collaborative pixel canvas`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'r/place',
    'rplace',
    'pixel canvas',
    'collaborative art',
    'place clone',
    'pixel art',
    'multiplayer canvas',
  ],
  authors: [{ name: SITE_NAME }],
  category: 'games',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — collaborative pixel canvas`,
    description: SITE_DESCRIPTION,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — collaborative pixel canvas`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  formatDetection: {
    email: false,
    telephone: false,
    address: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f5f5' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
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
