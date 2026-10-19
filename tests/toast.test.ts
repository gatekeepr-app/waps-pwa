import { afterEach, describe, expect, it } from 'vitest'
import { getToastState, toast } from '../src/hooks/use-toast'

describe('toast notifications', () => {
  afterEach(() => toast.dismiss())

  it('creates success and error notifications with the right variants', () => {
    toast.success('Link saved')
    toast.error('Could not save link')

    expect(getToastState()).toMatchObject([
      { description: 'Could not save link', variant: 'destructive' },
      { description: 'Link saved', variant: 'success' }
    ])
  })

  it('supports dismissing one notification', () => {
    const created = toast.info('Waiting for connection')
    toast.success('Saved offline')

    created.dismiss()

    expect(getToastState()).toHaveLength(1)
    expect(getToastState()[0].description).toBe('Saved offline')
  })
})
