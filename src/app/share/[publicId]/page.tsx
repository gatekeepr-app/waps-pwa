import { ConvexHttpClient } from 'convex/browser'
import type { Metadata } from 'next'
import Link from 'next/link'
import { api } from '../../../../convex/_generated/api'

type Props = { params: Promise<{ publicId: string }> }

let _client: ConvexHttpClient | null = null
function getClient() {
  if (!_client)
    _client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
  return _client
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { publicId } = await params
  try {
    const b = await getClient().query(api.bookmarks.getByPublicId, {
      publicId
    })
    if (b) {
      return {
        title: b.title || 'Shared Wap',
        description: b.description || 'Shared bookmark on Waps',
        openGraph: {
          images: b.image ? [b.image] : undefined
        }
      }
    }
  } catch {}
  return {
    title: 'Wap',
    description: 'Shared bookmark on Waps'
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export default async function SharePage({ params }: Props) {
  const { publicId } = await params

  let b: any = null
  try {
    b = await getClient().query(api.bookmarks.getByPublicId, { publicId })
  } catch {}

  if (!b) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-background px-4'>
        <div className='w-full max-w-md text-center'>
          <div className='mb-4 text-4xl font-bold text-primary'>W</div>
          <h1 className='mb-2 text-xl font-bold text-text-primary'>
            Wap not found
          </h1>
          <p className='mb-6 text-sm text-text-secondary'>
            This wap doesn&apos;t exist or is no longer shared.
          </p>
          <Link href='/explore' className='waps-btn inline-block'>
            Explore waps
          </Link>
        </div>
      </div>
    )
  }

  let host = b.url
  try {
    host = new URL(b.url).hostname
  } catch {}

  return (
    <div className='flex min-h-screen items-center justify-center bg-background px-4 py-10'>
      <div className='w-full max-w-sm'>
        <div className='mb-4 text-center text-3xl font-bold tracking-tight text-primary'>
          W
        </div>
        <div className='waps-card overflow-hidden'>
          {b.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.image} alt='' className='h-44 w-full object-cover' />
          )}
          <div className='p-5'>
            <div className='mb-3 flex items-center gap-2'>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {b.favicon && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.favicon} alt='' className='h-4 w-4 flex-shrink-0' />
              )}
              <span className='truncate text-xs text-text-secondary'>
                {escapeHtml(host)}
              </span>
            </div>
            <h1 className='text-heading font-bold leading-tight text-text-primary'>
              {escapeHtml(b.title || host)}
            </h1>
            {b.description && (
              <p className='mt-2 text-sm leading-relaxed text-text-secondary'>
                {escapeHtml(b.description)}
              </p>
            )}
            {b.tags?.length > 0 && (
              <div className='mt-3 flex flex-wrap gap-1.5'>
                {b.tags.map((t: string) => (
                  <span key={t} className='waps-chip'>
                    {escapeHtml(t)}
                  </span>
                ))}
              </div>
            )}
            <a
              href={b.url}
              target='_blank'
              rel='noopener noreferrer'
              className='waps-btn mt-5 block w-full text-center'
            >
              Visit link
            </a>
          </div>
        </div>
        <div className='mt-4 text-center'>
          <Link
            href='/explore'
            className='text-xs font-bold uppercase tracking-widest text-text-secondary hover:text-primary'
          >
            Saved with Waps
          </Link>
        </div>
      </div>
    </div>
  )
}
