export const MOBILE_ONBOARDING_VERSION = 'mobile-v1'

export function isMobileDevice(userAgent: string, maxTouchPoints = 0): boolean {
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(userAgent)) return true
  return /Macintosh/i.test(userAgent) && maxTouchPoints > 1
}

export function onboardingStorageKey(userId: string): string {
  return `waps:onboarding:${MOBILE_ONBOARDING_VERSION}:${userId}`
}

export function hasSeenMobileOnboarding(
  userId: string,
  storage: Pick<Storage, 'getItem'>
): boolean {
  return storage.getItem(onboardingStorageKey(userId)) === 'seen'
}

export function markMobileOnboardingSeen(
  userId: string,
  storage: Pick<Storage, 'setItem'>
): void {
  storage.setItem(onboardingStorageKey(userId), 'seen')
}
