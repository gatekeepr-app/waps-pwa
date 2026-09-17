import Link from 'next/link'

export default function ExtensionPage() {
  return (
    <div className='mx-auto max-w-lg px-4 pb-24 pt-8'>
      <h1 className='mb-2 text-heading font-bold text-text-primary'>
        Waps browser extension
      </h1>
      <p className='mb-5 text-sm leading-relaxed text-text-secondary'>
        Download the latest Chrome extension package and load it manually.
      </p>

      <a
        href='/downloads/waps-extension.zip'
        download
        className='waps-btn mb-4 block w-full py-3 text-center'
      >
        Download extension zip
      </a>

      <div className='waps-card mb-4 p-4 text-sm leading-relaxed text-text-secondary'>
        <ol className='list-decimal space-y-2 pl-5'>
          <li>Download and unzip the file.</li>
          <li>Open Chrome Extensions.</li>
          <li>Enable Developer Mode.</li>
          <li>Click Load unpacked and choose the unzipped folder.</li>
          <li>Open the extension and pair from Profile.</li>
        </ol>
      </div>

      <Link
        href='/bookmarks'
        className='block text-center text-sm text-text-secondary underline underline-offset-4'
      >
        Go to my waps
      </Link>
    </div>
  )
}
