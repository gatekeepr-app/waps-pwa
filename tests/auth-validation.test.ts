import { describe, expect, it } from 'vitest'
import { signInBodySchema, signUpBodySchema } from '../src/lib/auth-validation'

describe('manual auth request validation', () => {
  it('accepts short existing passwords for sign-in', () => {
    expect(
      signInBodySchema.safeParse({
        email: 'legacy@example.com',
        password: 'legacy'
      }).success
    ).toBe(true)
  })

  it('keeps the minimum password policy for new accounts', () => {
    expect(
      signUpBodySchema.safeParse({
        email: 'new@example.com',
        password: 'legacy'
      }).success
    ).toBe(false)
  })
})
