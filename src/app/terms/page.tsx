import Link from 'next/link'

export default function TermsPage() {
  return (
    <main className='waps-bg min-h-dvh px-4 py-12 text-white'>
      <div className='mx-auto max-w-3xl space-y-6'>
        <Link href='/' className='text-sm text-white/60 hover:text-white'>
          &larr; Back to Waps
        </Link>

        <h1 className='text-3xl font-semibold tracking-tight'>
          Terms of Service
        </h1>
        <p className='text-sm text-white/60'>Last updated: May 2026</p>

        <section className='space-y-4 text-sm leading-relaxed text-white/80'>
          <h2 className='text-lg font-semibold text-white'>1. Acceptance</h2>
          <p>
            By using Waps, you agree to these terms. If you do not agree, do not
            use the service.
          </p>

          <h2 className='text-lg font-semibold text-white'>2. Description</h2>
          <p>
            Waps is a bookmarking service that lets you save, organize, and
            share websites. You create boards, add websites to them, and can
            optionally make boards public for others to explore.
          </p>

          <h2 className='text-lg font-semibold text-white'>
            3. User Responsibilities
          </h2>
          <p>
            You are responsible for the content you save and share. Do not use
            Waps to store or distribute illegal, harmful, or infringing
            material. You must not attempt to abuse, overload, or compromise the
            service.
          </p>

          <h2 className='text-lg font-semibold text-white'>4. Account</h2>
          <p>
            You are responsible for safeguarding your account credentials. Waps
            uses email and password for authentication. We are not liable for
            unauthorized access resulting from compromised credentials.
          </p>

          <h2 className='text-lg font-semibold text-white'>
            5. Acceptable Use
          </h2>
          <p>
            Waps may enforce rate limits, block abusive behavior, or suspend
            accounts that violate these terms. We reserve the right to remove
            content that we deem inappropriate.
          </p>

          <h2 className='text-lg font-semibold text-white'>
            6. Service Availability
          </h2>
          <p>
            Waps is provided &ldquo;as is&rdquo; without warranty. We strive for
            high availability but do not guarantee uninterrupted service. We may
            modify or discontinue features with notice.
          </p>

          <h2 className='text-lg font-semibold text-white'>
            7. Limitation of Liability
          </h2>
          <p>
            Waps and its contributors are not liable for any damages arising
            from your use of the service. This includes but is not limited to
            data loss, service interruption, or content disputes.
          </p>

          <h2 className='text-lg font-semibold text-white'>8. Changes</h2>
          <p>
            We may update these terms. Continued use after changes constitutes
            acceptance. We will notify users of material changes via email.
          </p>

          <h2 className='text-lg font-semibold text-white'>9. Contact</h2>
          <p>
            For questions about these terms, email{' '}
            <a
              href='mailto:legal@waps.app'
              className='text-orange-400 underline'
            >
              legal@waps.app
            </a>{' '}
            or use our{' '}
            <Link href='/contact' className='text-orange-400 underline'>
              contact form
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  )
}
