// app/(marketing)/page.tsx
'use client'

import { WapsButton } from '@/components/Elements/WapsButton'
import WaitlistForm from '@/components/Features/WaitlistForm'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import {
  ArrowDown,
  Ghost,
  Globe,
  Link2,
  Search,
  ShieldCheck,
  Sparkles
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePwaInstall } from 'utils/usePwaInstall'

/* --- tiny parallax hook (reads scroll and returns offsets for layers) --- */
function useParallax() {
  const [y, setY] = useState(0)
  useEffect(() => {
    const onScroll = () => setY(window.scrollY || 0)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  // multipliers per depth
  return {
    far: y * 0.15,
    mid: y * 0.3,
    near: y * 0.45
  }
}

export default function LandingPage() {
  const { installed, install } = usePwaInstall()

  const p = useParallax()

  const bg =
    'radial-gradient(1200px 700px at 10% -10%, rgba(255,107,87,0.22), transparent 55%), ' +
    'radial-gradient(1100px 700px at 110% 10%, rgba(255,176,87,0.16), transparent 50%), #0B0B10'

  const features = useMemo(
    () => [
      {
        icon: <Globe className='h-5 w-5' />,
        title: 'Explore (Play Store vibes)',
        desc: 'See websites shared from public boards—auto-deduped and organized. Discover like an app store, but for the web.'
      },
      {
        icon: <Search className='h-5 w-5' />,
        title: 'Smart ‘Scan’',
        desc: 'Paste a link. Waps checks its database; if new, it scans the site to suggest title, category, and a rich description.'
      },
      {
        icon: <Link2 className='h-5 w-5' />,
        title: 'Boards & Sharing',
        desc: 'Create boards and keep a default one. On the free plan, you can share one board publicly for people to explore.'
      },
      {
        icon: <ShieldCheck className='h-5 w-5' />,
        title: 'No duplicates',
        desc: 'Websites are stored canonically. One site can belong to multiple users/boards without duplicate records.'
      },
      {
        icon: <Sparkles className='h-5 w-5' />,
        title: 'Offline-friendly',
        desc: 'Your Waps are also stored locally for offline access. Sync kicks in when you’re back online.'
      },
      {
        icon: <Ghost className='h-5 w-5' />,
        title: 'Install Anywhere',
        desc: 'Use as a PWA or get the Android APK. Designed mobile-first with a clean, glassy UI.'
      }
    ],
    []
  )

  return (
    <main className='min-h-dvh text-white' style={{ background: bg }}>
      {/* ====================== HERO ====================== */}
      <section className='relative overflow-hidden'>
        {/* Parallax BG layers */}
        <div
          className='pointer-events-none absolute -left-36 -top-36 h-96 w-96 rounded-full blur-3xl'
          style={{
            transform: `translateY(${p.far}px)`,
            background:
              'radial-gradient(closest-side, rgba(255,107,87,0.28), transparent)'
          }}
        />
        <div
          className='pointer-events-none absolute -right-24 top-24 h-[26rem] w-[26rem] rounded-full blur-3xl'
          style={{
            transform: `translateY(${p.mid}px)`,
            background:
              'radial-gradient(closest-side, rgba(255,176,87,0.22), transparent)'
          }}
        />
        <div
          className='pointer-events-none absolute -bottom-24 left-10 h-[22rem] w-[22rem] rounded-full blur-3xl'
          style={{
            transform: `translateY(${p.near}px)`,
            background:
              'radial-gradient(closest-side, rgba(255,107,87,0.18), transparent)'
          }}
        />

        {/* Hero content */}
        <div className='relative mx-auto max-w-5xl px-5 pb-10 pt-16 md:pb-16 md:pt-24'>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className='mx-auto max-w-2xl text-center'
          >
            <div className='inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs backdrop-blur'>
              <span className='inline-block h-2 w-2 rounded-full bg-orange-400' />
              New: Explore public boards without an account
            </div>

            <h1 className='mt-4 text-4xl font-semibold leading-tight md:text-5xl'>
              Waps — Your Bookmarking Buddy
            </h1>
            <p className='mt-3 text-white/80'>
              A Play-Store-like directory for the web. Save sites into boards,
              share one publicly, explore others’ boards without duplicates, and
              get smart descriptions via Scan.
            </p>

            <Link
              href={'#wishlist'}
              className='mt-6 flex items-center justify-center gap-3'
            >
              <WapsButton variant='glow'>Join the Waitlist</WapsButton>
            </Link>
          </motion.div>

          {/* Hero mock / device frame */}
          <div className='h-72 overflow-hidden'>
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.6 }}
              className='mx-auto mt-10 w-full max-w-sm rounded-[2rem] border border-white/15 bg-white/10 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl'
            >
              <div className='aspect-[9/19.5] rounded-[1.6rem] border border-white/20 bg-zinc-950/80'>
                {/* Faux header */}
                <div className='flex items-center justify-between px-4 pt-6 text-xs text-white/60'>
                  <span>Waps</span>
                  <Badge className='border-orange-500/30 bg-orange-500/20 text-orange-200'>
                    Explore
                  </Badge>
                </div>
                {/* Faux content rows */}
                <div className='space-y-3 p-4'>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className='rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur'
                    >
                      <div className='h-4 w-28 rounded bg-white/10' />
                      <div className='mt-3 flex gap-3 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
                        {Array.from({ length: 5 }).map((__, j) => (
                          <div
                            key={j}
                            className='h-28 w-28 shrink-0 rounded-2xl border border-white/10 bg-white/5'
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ====================== FEATURES ====================== */}
      <section className='mx-auto max-w-6xl px-5 py-10 md:py-16'>
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10% 0px' }}
          transition={{ duration: 0.45 }}
          className='text-center text-2xl font-semibold'
        >
          Everything you want in a web app store
        </motion.h2>

        <div className='mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-10% 0px' }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className='rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur'
            >
              <div className='waps-brand-bg mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl'>
                {f.icon}
              </div>
              <div className='text-base font-semibold'>{f.title}</div>
              <p className='mt-1 text-sm text-white/80'>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ====================== HOW IT WORKS ====================== */}
      <section className='mx-auto max-w-5xl px-5 py-10 md:py-16'>
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className='text-center text-2xl font-semibold'
        >
          How Waps works
        </motion.h2>

        <div className='mt-6 grid gap-4 md:grid-cols-4'>
          {[
            {
              step: '1',
              title: 'Paste a link',
              text: 'Use “Scan” on the Add page.'
            },
            {
              step: '2',
              title: 'We check DB',
              text: 'If it exists, we reuse its clean details.'
            },
            {
              step: '3',
              title: 'We scan it',
              text: 'If new, Waps fetches title & description and suggests a category.'
            },
            {
              step: '4',
              title: 'Save to a board',
              text: 'No duplicates. Offline-friendly local copy.'
            }
          ].map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className='rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur'
            >
              <Badge className='mb-2 border-white/20 bg-white/10 text-white'>
                {s.step}
              </Badge>
              <div className='font-semibold'>{s.title}</div>
              <p className='mt-1 text-sm text-white/80'>{s.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ====================== APK DOWNLOAD ====================== */}
      <section id='download' className='mx-auto max-w-4xl px-5 pb-16 md:pb-24'>
        <div className='rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur'>
          <div className='flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between'>
            <div>
              <h3 className='text-xl font-semibold'>Get the Android APK</h3>
              <p className='mt-1 text-sm text-white/80'>
                Prefer a native-like install? Download the APK and get quick
                access on your phone.
              </p>
            </div>
            <div className='flex justify-between gap-5 text-xs'>
              <WapsButton
                variant={'glow'}
                onClick={() => install()}
                disabled={installed}
              >
                <Ghost className='mr-2 h-4 w-4' />
                Install
              </WapsButton>
              <Link
                href={
                  'https://github.com/mmohsin18/waps/releases/download/Apk/Waps.apk'
                }
              >
                <WapsButton variant={'outline'} disabled={installed}>
                  <ArrowDown className='mr-2 h-4 w-4' />
                  Download
                </WapsButton>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div
        id='wishlist'
        className='mx-auto flex max-w-4xl items-center justify-center px-5 pb-16 md:pb-24'
      >
        <WaitlistForm source='hero' />
      </div>

      {/* ====================== FOOTER ====================== */}
      <footer className='mx-auto max-w-6xl px-5 pb-10 text-sm text-white/70'>
        <div className='rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur'>
          <div className='flex flex-col items-center justify-between gap-2 md:flex-row'>
            <div>
              © {new Date().getFullYear()} Waps — Your Bookmarking Buddy
            </div>
            <div className='flex items-center gap-4'>
              <Link href='/privacy' className='hover:text-white'>
                Privacy
              </Link>
              <Link href='/terms' className='hover:text-white'>
                Terms
              </Link>
              <Link href='/contact' className='hover:text-white'>
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
