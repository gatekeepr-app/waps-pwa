import type { Metadata } from 'next'

type Props = { params: Promise<{ publicId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { publicId } = await params
  return {
    title: `Wap - ${publicId}`,
    description: 'Shared bookmark on Waps'
  }
}

export default async function SharePage({ params }: Props) {
  const { publicId } = await params

  return (
    <div className='flex min-h-screen items-center justify-center bg-background px-4'>
      <div className='w-full max-w-md text-center'>
        <div className='mb-4 text-4xl font-bold text-primary'>W</div>
        <h1 className='mb-2 text-xl font-bold text-text-primary'>Shared Wap</h1>
        <p className='mb-4 text-sm text-text-secondary'>
          This bookmark is shared on Waps.
        </p>
        <p className='text-xs text-text-secondary'>ID: {publicId}</p>
      </div>
    </div>
  )
}
