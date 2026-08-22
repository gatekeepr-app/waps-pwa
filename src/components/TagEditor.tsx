'use client'

import { CloseIcon, TagIcon } from '@/components/GeometricIcons'
import { useState } from 'react'

export const MAX_TAGS = 12

function normalizeTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^#+/, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_]/g, '')
    .slice(0, 30)
}

interface TagEditorProps {
  tags: string[]
  onChange: (tags: string[]) => void
  suggestions?: { tag: string; count: number }[]
  placeholder?: string
}

export function TagEditor({
  tags,
  onChange,
  suggestions,
  placeholder = 'Add a tag and press Enter'
}: TagEditorProps) {
  const [draft, setDraft] = useState('')

  function commit() {
    const t = normalizeTag(draft)
    setDraft('')
    if (!t || tags.includes(t) || tags.length >= MAX_TAGS) return
    onChange([...tags, t])
  }

  function toggle(tag: string) {
    if (tags.includes(tag)) onChange(tags.filter(t => t !== tag))
    else if (tags.length < MAX_TAGS) onChange([...tags, tag])
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Backspace' && !draft && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  const available = (suggestions ?? [])
    .filter(s => !tags.includes(s.tag))
    .slice(0, 8)

  return (
    <div>
      {tags.length > 0 && (
        <div className='mb-2 flex flex-wrap gap-2'>
          {tags.map(tag => (
            <span
              key={tag}
              className='flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-primary'
            >
              <TagIcon size={10} className='text-primary' />
              {tag}
              <button
                type='button'
                onClick={() => toggle(tag)}
                aria-label={`Remove ${tag}`}
                className='ml-0.5 text-text-secondary transition-colors hover:text-destructive'
              >
                <CloseIcon size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        type='text'
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        disabled={tags.length >= MAX_TAGS}
        placeholder={
          tags.length >= MAX_TAGS ? `Max ${MAX_TAGS} tags` : placeholder
        }
        className='waps-input w-full min-w-0'
      />

      {available.length > 0 && (
        <div className='mt-2 flex flex-wrap items-center gap-1.5'>
          <span className='text-tag font-bold uppercase tracking-wider text-text-secondary'>
            Yours
          </span>
          {available.map(s => (
            <button
              key={s.tag}
              type='button'
              onClick={() => toggle(s.tag)}
              className='rounded-full border border-border px-2.5 py-1 text-tag font-bold uppercase tracking-wider text-text-secondary transition-colors hover:border-primary hover:text-primary'
            >
              + {s.tag}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
