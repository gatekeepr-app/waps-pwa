import { MobileOnboardingGuard } from '@/components/onboarding/mobile-onboarding-guard'
import TabBar from '@/components/TabBar'

export default function TabsLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <MobileOnboardingGuard>
      <div className='flex min-h-screen flex-col bg-background'>
        <main className='flex-1 pb-16'>{children}</main>
        <TabBar />
      </div>
    </MobileOnboardingGuard>
  )
}
