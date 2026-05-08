import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function NotFound() {
  return (
    <main className='waps-bg flex min-h-screen flex-col items-center justify-center p-6 text-white'>
      <h1 className='text-6xl font-bold text-orange-400 drop-shadow-lg'>404</h1>
      <p className='mt-4 text-lg text-white/70'>
        This page could not be found.
      </p>

      <div className='mt-6'>
        <Link href='/'>
          <Button className='waps-btn'>Go Home</Button>
        </Link>
      </div>
    </main>
  )
}
