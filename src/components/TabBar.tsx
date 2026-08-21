'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AddIcon, ExploreIcon, ListIcon, ProfileIcon } from './GeometricIcons'

const tabs = [
  { href: '/bookmarks', label: 'My Waps', icon: ListIcon },
  { href: '/explore', label: 'Explore', icon: ExploreIcon },
  { href: '/profile', label: 'Profile', icon: ProfileIcon }
]

export default function TabBar() {
  const pathname = usePathname()

  return (
    <>
      <Link
        href='/add'
        className='fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105 active:scale-95'
        aria-label='Add bookmark'
      >
        <AddIcon size={24} />
      </Link>

      <nav className='fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background'>
        <div className='mx-auto flex max-w-lg items-center justify-around py-2'>
          {tabs.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-1 px-4 py-1 transition-colors ${
                  active
                    ? 'text-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Icon size={20} />
                <span className='text-tab font-bold uppercase tracking-widest'>
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
