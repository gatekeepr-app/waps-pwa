import Link from 'next/link'

export default function NotFound() {
  return (
    <div className='flex min-h-screen flex-col items-center justify-center bg-background px-4'>
      <div className='text-center'>
        <div className='mb-4 text-6xl font-bold text-primary'>404</div>
        <h1 className='mb-2 text-xl font-bold text-text-primary'>
          Page not found
        </h1>
        <p className='mb-6 text-sm text-text-secondary'>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href='/bookmarks'
          className='inline-block rounded-md bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-primary/90'
        >
          Back to Bookmarks
        </Link>
      </div>
    </div>
  )
}
