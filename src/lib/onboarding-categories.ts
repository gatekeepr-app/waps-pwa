export const DEFAULT_ONBOARDING_CATEGORIES = [
  'Work',
  'Personal',
  'Reading',
  'Shopping',
  'Learning',
  'Entertainment',
  'Health',
  'Finance',
  'Other'
] as const

export function splitOnboardingCategories(names: string[]): {
  defaultNames: string[]
  customNames: string[]
} {
  const defaults = new Set<string>()
  const custom = new Set<string>()
  const defaultLookup = new Map(
    DEFAULT_ONBOARDING_CATEGORIES.map(name => [name.toLowerCase(), name])
  )

  for (const rawName of names) {
    const name = rawName.trim().slice(0, 40)
    if (!name) continue
    const defaultName = defaultLookup.get(name.toLowerCase())
    if (defaultName) defaults.add(defaultName)
    else if (
      Array.from(custom).every(
        existing => existing.toLowerCase() !== name.toLowerCase()
      )
    ) {
      custom.add(name)
    }
  }

  return {
    defaultNames: Array.from(defaults),
    customNames: Array.from(custom)
  }
}
