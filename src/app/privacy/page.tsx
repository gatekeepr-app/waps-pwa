import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <main className='waps-bg min-h-dvh px-4 py-12 text-white'>
      <div className='mx-auto max-w-3xl space-y-6'>
        <Link href='/' className='text-sm text-white/60 hover:text-white'>
          &larr; Back to Waps
        </Link>

        <h1 className='text-3xl font-semibold tracking-tight'>
          Privacy Policy
        </h1>
        <p className='text-sm text-white/60'>Last updated: May 2026</p>

        <section className='space-y-4 text-sm leading-relaxed text-white/80'>
          <h2 className='text-lg font-semibold text-white'>
            1. What We Collect
          </h2>
          <p>
            When you sign up for Waps, we collect your email address and
            optionally your name. We use this solely for authentication and to
            send essential service communications.
          </p>
          <p>
            When you use Waps to save or share websites, we store the URLs,
            titles, descriptions, and categories you provide. This data is
            associated with your account and used only to power the service.
          </p>

          <h2 className='text-lg font-semibold text-white'>
            2. How We Use Data
          </h2>
          <p>
            Your saved websites and boards are private by default. Only the
            boards you explicitly mark as public are visible to other users in
            the Explore section.
          </p>
          <p>
            We do not sell, rent, or share your personal data with third parties
            for their marketing purposes.
          </p>

          <h2 className='text-lg font-semibold text-white'>
            3. Cookies & Sessions
          </h2>
          <p>
            We use a single HTTP-only cookie (`waps_session`) to keep you signed
            in. No tracking cookies, analytics cookies, or third-party cookies
            are used.
          </p>

          <h2 className='text-lg font-semibold text-white'>
            4. Data Retention
          </h2>
          <p>
            You can delete your account and all associated data at any time by
            contacting us. We retain data only as long as necessary to provide
            the service.
          </p>

          <h2 className='text-lg font-semibold text-white'>
            5. Third-Party Services
          </h2>
          <p>
            Waps uses Convex for database and serverless functions, and Resend
            for transactional emails. Each service processes data according to
            their own privacy policies. We have selected providers that align
            with our commitment to data minimization.
          </p>

          <h2 className='text-lg font-semibold text-white'>6. Contact</h2>
          <p>
            For privacy inquiries or data deletion requests, email us at{' '}
            <a
              href='mailto:privacy@waps.app'
              className='text-orange-400 underline'
            >
              privacy@waps.app
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
