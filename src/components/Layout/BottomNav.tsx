'use client'

import { CirclePlus, List, Telescope } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/explore', label: 'Explore', icon: Telescope },
  { href: '/add', label: 'Add', icon: CirclePlus },
  { href: '/waps', label: 'Waps', icon: List }
] as const

export default function BottomNav() {
  const pathname = usePathname()

  // Hide the navbar on the home page
  if (!pathname || pathname === '/' || pathname === '/auth') return null

  return (
    <nav className='fixed inset-x-0 bottom-0 z-50'>
      <div className='mx-auto max-w-screen-sm px-4 pb-[env(safe-area-inset-bottom)]'>
        <div className='waps-card mb-4 rounded-2xl p-2'>
          <div className='grid grid-cols-3 gap-1'>
            {tabs.map(({ href, label, icon: Icon }) => {
              const active =
                pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  prefetch={false}
                  aria-current={active ? 'page' : undefined}
                  className={[
                    'flex flex-col items-center rounded-xl px-3 py-2 text-[11px] transition',
                    active
                      ? 'bg-white/15 text-white'
                      : 'text-white/50 hover:bg-white/5 hover:text-white'
                  ].join(' ')}
                >
                  <Icon className='mb-1 h-5 w-5' />
                  <span className='leading-none'>{label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
