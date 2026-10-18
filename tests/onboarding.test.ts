import { describe, expect, it } from 'vitest'
import {
  hasSeenMobileOnboarding,
  isMobileDevice,
  markMobileOnboardingSeen,
  onboardingStorageKey
} from '../src/lib/onboarding'

describe('mobile onboarding eligibility', () => {
  it('recognizes phones and touch iPads as mobile devices', () => {
    expect(isMobileDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)')).toBe(
      true
    )
    expect(isMobileDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 5)).toBe(
      true
    )
    expect(isMobileDevice('Mozilla/5.0 (X11; Linux x86_64)')).toBe(false)
  })

  it('stores completion per user and onboarding version', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value)
    }

    expect(hasSeenMobileOnboarding('user-1', storage)).toBe(false)
    markMobileOnboardingSeen('user-1', storage)
    expect(values.get(onboardingStorageKey('user-1'))).toBe('seen')
    expect(hasSeenMobileOnboarding('user-1', storage)).toBe(true)
    expect(hasSeenMobileOnboarding('user-2', storage)).toBe(false)
  })
})
