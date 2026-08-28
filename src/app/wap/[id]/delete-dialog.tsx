'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useState } from 'react'

interface DeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete: (reason: string) => void
}

const REASONS = [
  ['not_useful', 'Not useful anymore'],
  ['saved_by_mistake', 'Saved by mistake'],
  ['duplicate', 'Duplicate or wrong link'],
  ['privacy', 'Privacy cleanup']
] as const

export default function DeleteDialog({
  open,
  onOpenChange,
  onDelete
}: DeleteDialogProps) {
  const [reason, setReason] = useState('not_useful')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='border-border bg-background text-text-primary'>
        <DialogHeader>
          <DialogTitle>Why remove this wap?</DialogTitle>
          <DialogDescription>
            This helps keep cleanup behavior understandable later.
          </DialogDescription>
        </DialogHeader>
        <RadioGroup value={reason} onValueChange={setReason}>
          {REASONS.map(([value, label]) => (
            <label
              key={value}
              className='flex items-center gap-2 text-sm text-text-secondary'
            >
              <RadioGroupItem value={value} />
              {label}
            </label>
          ))}
        </RadioGroup>
        <DialogFooter className='gap-2 sm:space-x-0'>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
            className='flex-1 border-border bg-transparent text-text-primary hover:bg-surface'
          >
            Cancel
          </Button>
          <Button
            type='button'
            onClick={() => onDelete(reason)}
            className='flex-1'
          >
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
