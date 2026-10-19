'use client'

import type { ToastVariant } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import * as React from 'react'

export const Toast = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: ToastVariant }
>(({ className, variant = 'default', ...props }, ref) => (
  <div
    ref={ref}
    role={variant === 'destructive' ? 'alert' : 'status'}
    aria-live={variant === 'destructive' ? 'assertive' : 'polite'}
    className={cn(
      'pointer-events-auto relative flex w-full items-start gap-3 rounded-lg border p-4 pr-10 shadow-lg',
      'border-border bg-surface text-text-primary',
      variant === 'success' && 'border-emerald-500/40 bg-emerald-500/10',
      variant === 'destructive' && 'border-destructive/40 bg-destructive/10',
      className
    )}
    {...props}
  />
))
Toast.displayName = 'Toast'

export const ToastTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm font-semibold', className)} {...props} />
))
ToastTitle.displayName = 'ToastTitle'

export const ToastDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-text-secondary', className)}
    {...props}
  />
))
ToastDescription.displayName = 'ToastDescription'

export const ToastAction = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    type='button'
    className={cn(
      'shrink-0 rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-text-primary transition-colors hover:bg-background',
      className
    )}
    {...props}
  />
))
ToastAction.displayName = 'ToastAction'

export const ToastClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    type='button'
    aria-label='Dismiss notification'
    className={cn(
      'absolute right-2 top-2 rounded-md p-1 text-text-secondary transition-colors hover:bg-background hover:text-text-primary',
      className
    )}
    {...props}
  >
    <X size={15} />
  </button>
))
ToastClose.displayName = 'ToastClose'

export function ToastViewport({
  className,
  ...props
}: React.HTMLAttributes<HTMLOListElement>) {
  return (
    <ol
      aria-label='Notifications'
      className={cn(
        'fixed bottom-0 left-1/2 z-[100] flex w-full max-w-md -translate-x-1/2 flex-col gap-2 p-4',
        className
      )}
      {...props}
    />
  )
}
