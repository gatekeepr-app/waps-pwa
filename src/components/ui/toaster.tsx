'use client'

import { useToast } from '@/hooks/use-toast'
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastTitle,
  ToastViewport
} from './toast'

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <ToastViewport>
      {toasts.map(item => (
        <Toast key={item.id} variant={item.variant}>
          <div className='min-w-0 flex-1'>
            {item.title && <ToastTitle>{item.title}</ToastTitle>}
            {item.description && (
              <ToastDescription>{item.description}</ToastDescription>
            )}
          </div>
          {item.action && (
            <ToastAction
              onClick={() => {
                item.action?.onClick()
                dismiss(item.id)
              }}
            >
              {item.action.label}
            </ToastAction>
          )}
          <ToastClose onClick={() => dismiss(item.id)} />
        </Toast>
      ))}
    </ToastViewport>
  )
}
