import { z } from 'zod'

const email = z.string().trim().email().max(254)

export const signInBodySchema = z.object({
  email,
  // Sign-in verifies an existing credential. Password strength belongs to
  // account creation and reset, not to the lookup request.
  password: z.string().min(1).max(128)
})

export const signUpBodySchema = z.object({
  email,
  password: z.string().min(8).max(128),
  name: z.string().trim().max(80).optional()
})
