'use client'

import { useEffect, useState } from 'react'

export type ToastVariant = 'default' | 'success' | 'destructive'

export type ToastAction = {
  label: string
  onClick: () => void
}

export type ToastOptions = {
  title?: string
  description?: string
  variant?: ToastVariant
  duration?: number
  action?: ToastAction
}

export type ToastItem = ToastOptions & {
  id: string
}

type ToastInput = string | ToastOptions
type ToastListener = (items: ToastItem[]) => void

const listeners = new Set<ToastListener>()
const timers = new Map<string, ReturnType<typeof setTimeout>>()
let items: ToastItem[] = []
let nextId = 0

function publish() {
  const snapshot = [...items]
  listeners.forEach(listener => listener(snapshot))
}

function dismiss(id?: string) {
  if (!id) {
    items = []
    timers.forEach(timer => clearTimeout(timer))
    timers.clear()
  } else {
    items = items.filter(item => item.id !== id)
    const timer = timers.get(id)
    if (timer) clearTimeout(timer)
    timers.delete(id)
  }
  publish()
}

function createToast(input: ToastInput, options: ToastOptions = {}) {
  const toastOptions =
    typeof input === 'string' ? { ...options, description: input } : input
  const id = `toast-${++nextId}`
  const item: ToastItem = { ...toastOptions, id }
  items = [item, ...items].slice(0, 4)
  publish()

  if (item.duration !== Infinity) {
    const timer = setTimeout(() => dismiss(id), item.duration ?? 4000)
    timers.set(id, timer)
  }

  return { id, dismiss: () => dismiss(id) }
}

type ToastApi = {
  (
    input: ToastInput,
    options?: ToastOptions
  ): { id: string; dismiss: () => void }
  success: (
    description: string,
    options?: Omit<ToastOptions, 'variant' | 'description'>
  ) => { id: string; dismiss: () => void }
  error: (
    description: string,
    options?: Omit<ToastOptions, 'variant' | 'description'>
  ) => { id: string; dismiss: () => void }
  info: (
    description: string,
    options?: Omit<ToastOptions, 'variant' | 'description'>
  ) => { id: string; dismiss: () => void }
  dismiss: (id?: string) => void
}

export const toast = Object.assign(
  ((input: ToastInput, options?: ToastOptions) =>
    createToast(input, options)) as ToastApi,
  {
    success: (
      description: string,
      options: Omit<ToastOptions, 'variant' | 'description'> = {}
    ) => createToast({ ...options, description, variant: 'success' }),
    error: (
      description: string,
      options: Omit<ToastOptions, 'variant' | 'description'> = {}
    ) => createToast({ ...options, description, variant: 'destructive' }),
    info: (
      description: string,
      options: Omit<ToastOptions, 'variant' | 'description'> = {}
    ) => createToast({ ...options, description }),
    dismiss
  }
)

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>(items)

  useEffect(() => {
    const listener: ToastListener = nextItems => setToasts(nextItems)
    listeners.add(listener)
    setToasts(items)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  return { toasts, dismiss }
}

export function getToastState() {
  return [...items]
}
