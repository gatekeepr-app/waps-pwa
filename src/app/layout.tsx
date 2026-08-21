import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import { ConvexClientProvider } from './ConvexClientProvider'
import './globals.css'
import PwaRegister from './pwa-register'

const inter = Inter({ subsets: ['latin'] })

const APP_NAME = 'Waps'
const APP_DEFAULT_TITLE = 'Waps'
const APP_TITLE_TEMPLATE = '%s - Waps'
const APP_DESCRIPTION = 'Your Bookmarking Buddy'

export const metadata: Metadata = {
  metadataBase: new URL('https://waps.app'),
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE
  },
  description: APP_DESCRIPTION,
  manifest: '/manifest.json',
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent'
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: APP_DEFAULT_TITLE
  },
  formatDetection: {
    telephone: false
  },
  openGraph: {
    type: 'website',
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE
    },
    description: APP_DESCRIPTION
  },
  twitter: {
    card: 'summary',
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE
    },
    description: APP_DESCRIPTION
  }
}

export const viewport: Viewport = {
  themeColor: '#000000'
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en' className='dark'>
      <head>
        <meta
          name='viewport'
          content='width=device-width, initial-scale=1, viewport-fit=cover'
        />
        <link rel='manifest' href='/manifest.json' />
        <meta name='mobile-web-app-capable' content='yes' />
        <meta
          name='apple-mobile-web-app-status-bar-style'
          content='black-translucent'
        />
        <link rel='apple-touch-icon' href='/favicon/icon-192.png' />
      </head>
      <body className={inter.className}>
        <ConvexClientProvider>
          <PwaRegister />
          <div className='mx-auto flex min-h-screen flex-col bg-background'>
            <main className='flex grow flex-col'>{children}</main>
          </div>
          <Toaster position='bottom-center' theme='dark' />
        </ConvexClientProvider>
      </body>
    </html>
  )
}
