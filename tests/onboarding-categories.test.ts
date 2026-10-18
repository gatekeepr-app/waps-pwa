import { describe, expect, it } from 'vitest'
import { splitOnboardingCategories } from '../src/lib/onboarding-categories'

describe('onboarding category selection', () => {
  it('keeps defaults separate from custom categories', () => {
    expect(splitOnboardingCategories(['Work', 'Reading', 'Deep Work'])).toEqual(
      {
        defaultNames: ['Work', 'Reading'],
        customNames: ['Deep Work']
      }
    )
  })

  it('removes duplicate names while preserving the first selection', () => {
    expect(
      splitOnboardingCategories(['Work', 'work', 'Custom', 'Custom'])
    ).toEqual({
      defaultNames: ['Work'],
      customNames: ['Custom']
    })
  })
})
