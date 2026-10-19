import { ConvexHttpClient } from 'convex/browser'
import type { Metadata } from 'next'
import Image from 'next/image'
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
    const collection = await getClient().query(
      api.bookmarks.getPublicCollection,
      { publicId }
    )
    if (collection) {
      return {
        title: collection.name,
        description: `A collection of ${collection.bookmarks.length} waps`
      }
    }
  } catch {}
  return { title: 'Collection', description: 'A shared collection on Waps' }
}

export default async function CollectionPage({ params }: Props) {
  const { publicId } = await params

  let collection: any = null
  try {
    collection = await getClient().query(api.bookmarks.getPublicCollection, {
      publicId
    })
  } catch {}

  if (!collection) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-background px-4'>
        <div className='w-full max-w-md text-center'>
          <div className='mb-4 text-4xl font-bold text-primary'>W</div>
          <h1 className='mb-2 text-xl font-bold text-text-primary'>
            Collection not found
          </h1>
          <p className='mb-6 text-sm text-text-secondary'>
            This collection doesn&apos;t exist or is no longer shared.
          </p>
          <Link href='/explore' className='waps-btn inline-block'>
            Explore waps
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className='mx-auto max-w-lg px-4 py-10 pb-24'>
      <div className='mb-6 text-center text-3xl font-bold tracking-tight text-primary'>
        W
      </div>
      <h1 className='mb-1 text-heading font-bold text-text-primary'>
        {collection.name}
      </h1>
      <p className='mb-6 text-sm text-text-secondary'>
        {collection.bookmarks.length} waps in this collection
      </p>

      {collection.bookmarks.length === 0 ? (
        <div className='waps-empty text-text-secondary'>
          Nothing in this collection yet.
        </div>
      ) : (
        <div className='space-y-3'>
          {collection.bookmarks.map((b: any) => {
            let host = b.url
            try {
              host = new URL(b.url).hostname.replace(/^www\./, '')
            } catch {}
            return (
              <a
                key={b._id}
                href={b.url}
                target='_blank'
                rel='noopener noreferrer'
                className='waps-card flex gap-3 p-3'
              >
                {b.favicon && (
                  <Image
                    src={b.favicon}
                    alt=''
                    width={24}
                    height={24}
                    className='mt-1 h-6 w-6 flex-shrink-0'
                  />
                )}
                <div className='min-w-0 flex-1'>
                  <div className='truncate text-sm font-bold text-text-primary'>
                    {b.title || host}
                  </div>
                  <div className='truncate text-xs text-text-secondary'>
                    {host}
                  </div>
                  {b.description && (
                    <div className='mt-1 line-clamp-2 text-xs text-text-secondary'>
                      {b.description}
                    </div>
                  )}
                </div>
              </a>
            )
          })}
        </div>
      )}

      <div className='mt-6 text-center'>
        <Link
          href='/explore'
          className='text-xs font-bold uppercase tracking-widest text-text-secondary hover:text-primary'
        >
          Curated with Waps
        </Link>
      </div>
    </div>
  )
}
