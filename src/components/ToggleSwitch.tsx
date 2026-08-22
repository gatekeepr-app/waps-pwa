'use client'

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
}

export function ToggleSwitch({
  checked,
  onChange,
  label,
  description
}: ToggleSwitchProps) {
  return (
    <label className='flex cursor-pointer items-center justify-between gap-4'>
      <span className='min-w-0'>
        <span className='block text-sm font-medium text-text-primary'>
          {label}
        </span>
        {description && (
          <span className='mt-0.5 block text-xs leading-relaxed text-text-secondary'>
            {description}
          </span>
        )}
      </span>
      <input
        type='checkbox'
        className='peer sr-only'
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />
      <span
        aria-hidden
        className='relative h-6 w-11 flex-shrink-0 rounded-full bg-text-tertiary transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background [&>span]:transition-transform peer-checked:[&>span]:translate-x-5'
      >
        <span className='absolute left-0.5 top-0.5 block h-5 w-5 rounded-full bg-white shadow' />
      </span>
    </label>
  )
}
