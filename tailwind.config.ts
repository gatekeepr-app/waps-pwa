import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      colors: {
        background: '#000000',
        surface: '#111111',
        border: '#1a1a1a',
        primary: {
          DEFAULT: '#f97316',
          foreground: '#ffffff'
        },
        'text-primary': '#ffffff',
        'text-secondary': '#555555',
        'text-tertiary': '#333333',
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#ffffff'
        },
        'unread-dot': '#ffffff',
        splash: '#0a0a0f'
      },
      borderRadius: {
        DEFAULT: '6px',
        sm: '4px',
        md: '6px',
        lg: '8px'
      },
      fontSize: {
        heading: [
          '22px',
          { lineHeight: '28px', fontWeight: '700', letterSpacing: '-0.02em' }
        ],
        section: ['16px', { lineHeight: '22px', fontWeight: '700' }],
        body: ['14px', { lineHeight: '20px' }],
        'card-title': ['14px', { lineHeight: '20px', fontWeight: '500' }],
        label: [
          '10px',
          { lineHeight: '14px', fontWeight: '700', letterSpacing: '0.1em' }
        ],
        tag: [
          '9px',
          { lineHeight: '12px', fontWeight: '700', letterSpacing: '0.05em' }
        ],
        tab: [
          '10px',
          { lineHeight: '14px', fontWeight: '700', letterSpacing: '0.15em' }
        ]
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
}
export default config
