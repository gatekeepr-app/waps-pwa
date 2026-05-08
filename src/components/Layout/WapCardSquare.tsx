// components/Layout/WapCardSquare.tsx
'use client'

import { cn } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'

type Props = {
  title: string
  subtitle?: string
  origin?: string
  hero?: string
  countRight?: string
  countLeftNum?: string
  countLeftLabel?: string
  href?: string
  className?: string
  category?: string // 👈 NEW
}

function overlayForCategory(cat?: string) {
  const key = (cat || '').toLowerCase()

  // Two-radial overlay (top-left + top-right), tuned per category.
  const palettes: Record<string, string> = {
    productivity:
      'radial-gradient(circle at 30% 20%, rgba(255,107,87,.45), transparent 55%), radial-gradient(circle at 90% 10%, rgba(255,176,87,.35), transparent 45%)',
    design:
      'radial-gradient(circle at 30% 20%, rgba(124,58,237,.45), transparent 55%), radial-gradient(circle at 90% 10%, rgba(244,114,182,.35), transparent 45%)',
    'dev & infra':
      'radial-gradient(circle at 30% 20%, rgba(56,189,248,.45), transparent 55%), radial-gradient(circle at 90% 10%, rgba(34,211,238,.35), transparent 45%)',
    education:
      'radial-gradient(circle at 30% 20%, rgba(52,211,153,.45), transparent 55%), radial-gradient(circle at 90% 10%, rgba(251,191,36,.35), transparent 45%)',
    reading:
      'radial-gradient(circle at 30% 20%, rgba(245,158,11,.45), transparent 55%), radial-gradient(circle at 90% 10%, rgba(253,224,71,.35), transparent 45%)',
    'music & audio':
      'radial-gradient(circle at 30% 20%, rgba(244,63,94,.45), transparent 55%), radial-gradient(circle at 90% 10%, rgba(251,113,133,.35), transparent 45%)',
    video:
      'radial-gradient(circle at 30% 20%, rgba(249,115,22,.45), transparent 55%), radial-gradient(circle at 90% 10%, rgba(253,186,116,.35), transparent 45%)',
    tools:
      'radial-gradient(circle at 30% 20%, rgba(100,116,139,.45), transparent 55%), radial-gradient(circle at 90% 10%, rgba(148,163,184,.35), transparent 45%)'
  }

  // Fallback to your original red→orange vibe
  const fallback =
    'radial-gradient(circle at 30% 20%, rgba(255,107,87,.45), transparent 55%), radial-gradient(circle at 90% 10%, rgba(255,176,87,.35), transparent 45%)'

  // simple aliasing
  if (key.includes('dev')) return palettes['dev & infra']
  if (key.includes('infra')) return palettes['dev & infra']
  if (key.includes('music')) return palettes['music & audio']

  return palettes[key] ?? fallback
}

export default function WapCardSquare({
  title,
  subtitle = '',
  origin,
  hero,
  countRight,
  countLeftNum,
  countLeftLabel,
  href,
  className,
  category // 👈 NEW
}: Props) {
  return (
    <div
      className={cn(
        'waps-card group relative aspect-square overflow-hidden rounded-2xl',
        'transition-transform hover:-translate-y-0.5 active:scale-[0.99]',
        className
      )}
    >
      {href && (
        <Link
          href={href}
          className='absolute inset-0 z-10 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50'
          aria-label={`Open ${title}`}
          prefetch={false}
        >
          <span className='sr-only'>{`Open ${title}`}</span>
        </Link>
      )}

      {/* Top hero */}
      <div className='relative h-[42%] w-full'>
        {hero && (
          <Image
            src={hero}
            alt=''
            width={300}
            height={300}
            className='absolute inset-0 h-full w-full object-contain p-5 opacity-95 drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)]'
            loading='lazy'
            decoding='async'
          />
        )}

        {/* 🌈 Category-driven overlay */}
        <div
          className='pointer-events-none absolute inset-0 z-10 opacity-90'
          style={{ background: overlayForCategory(category) }}
        />

        <div className='from-[var(--waps-bg-1)]/70 pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10 bg-gradient-to-t to-transparent' />

        {origin && (
          <div className='absolute right-2 top-2 z-20 rounded-lg bg-black/35 px-2 py-1 text-[10px] leading-none backdrop-blur'>
            {origin.replace(/^https?:\/\//, '').replace(/^www\./, '')}
          </div>
        )}
      </div>

      {/* Body */}
      <div className='absolute inset-x-3 top-[34%] rounded-2xl border border-white/10 bg-black/50 px-3 py-3 backdrop-blur'>
        <div className='truncate text-[13px] font-semibold'>{title}</div>
        {subtitle && (
          <div className='mt-0.5 truncate text-[12px] text-white/50'>
            {subtitle}
          </div>
        )}
      </div>

      {(countLeftNum || countRight) && (
        <div className='absolute inset-x-3 bottom-2 flex items-end justify-between text-xs text-white/80'>
          <div className='flex items-baseline gap-1'>
            {countLeftNum && (
              <span className='text-[22px] font-bold leading-none'>
                {countLeftNum}
              </span>
            )}
            {countLeftLabel && (
              <span className='text-white/50'>{countLeftLabel}</span>
            )}
          </div>
          {countRight && <div className='font-medium'>{countRight}</div>}
        </div>
      )}

      <div className='pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100'>
        <div className='absolute inset-0 rounded-3xl bg-gradient-to-b from-white/5 to-transparent' />
      </div>
    </div>
  )
}
