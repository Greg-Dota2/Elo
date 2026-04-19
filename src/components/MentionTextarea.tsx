'use client'

import { useState, useRef, useEffect } from 'react'

interface MentionEntity {
  label: string
  href: string
  type: 'team' | 'player' | 'hero' | 'item'
}

const TYPE_COLOR = {
  team: '#f97316',
  player: '#6366f1',
  hero: '#10b981',
  item: '#eab308',
}

// Module-level cache so every textarea instance shares one fetch
let cachedEntities: MentionEntity[] | null = null
let fetchPromise: Promise<MentionEntity[]> | null = null

function getEntities(): Promise<MentionEntity[]> {
  if (cachedEntities) return Promise.resolve(cachedEntities)
  if (!fetchPromise) {
    fetchPromise = fetch('/api/admin/mentions')
      .then(r => r.json())
      .then((data: MentionEntity[]) => { cachedEntities = data; return data })
      .catch(() => [] as MentionEntity[])
  }
  return fetchPromise
}

const inputClass =
  'w-full rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-orange-500' +
  ' bg-[var(--surface)] border border-[var(--border)] text-[var(--text)]' +
  ' placeholder:text-[var(--text-muted)]'

interface Props {
  name: string
  defaultValue?: string
  rows?: number
  placeholder?: string
}

export default function MentionTextarea({ name, defaultValue, rows = 8, placeholder }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [value, setValue] = useState(defaultValue ?? '')
  const [entities, setEntities] = useState<MentionEntity[]>([])
  const [query, setQuery] = useState<string | null>(null)
  const [atPos, setAtPos] = useState(-1)
  const [selectedIdx, setSelectedIdx] = useState(0)

  useEffect(() => {
    getEntities().then(setEntities)
  }, [])

  const filtered = query !== null
    ? entities.filter(e => e.label.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : []

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    const cursor = e.target.selectionStart ?? val.length
    setValue(val)

    const before = val.slice(0, cursor)
    const match = before.match(/@(\w*)$/)
    if (match) {
      setQuery(match[1])
      setAtPos(cursor - match[0].length)
      setSelectedIdx(0)
    } else {
      setQuery(null)
      setAtPos(-1)
    }
  }

  function insertMention(entity: MentionEntity) {
    const ta = ref.current
    if (!ta) return
    const cursor = ta.selectionStart ?? value.length
    const before = value.slice(0, atPos)
    const after = value.slice(cursor)
    const insert = `[${entity.label}](${entity.href})`
    const newVal = before + insert + after
    setValue(newVal)
    setQuery(null)
    setAtPos(-1)
    requestAnimationFrame(() => {
      ta.focus()
      const pos = before.length + insert.length
      ta.setSelectionRange(pos, pos)
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (query === null || filtered.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(filtered[selectedIdx]) }
    else if (e.key === 'Escape') { setQuery(null); setAtPos(-1) }
  }

  return (
    <div className="relative">
      <textarea
        ref={ref}
        name={name}
        rows={rows}
        className={inputClass}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />

      {query !== null && filtered.length > 0 && (
        <div
          className="absolute left-0 right-0 z-50 rounded-lg overflow-hidden shadow-xl"
          style={{ top: '100%', marginTop: 4, background: 'var(--surface-2)', border: '1px solid var(--border)' }}
        >
          {filtered.map((entity, i) => (
            <button
              key={entity.href}
              type="button"
              onMouseDown={e => { e.preventDefault(); insertMention(entity) }}
              onMouseEnter={() => setSelectedIdx(i)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors"
              style={{ background: i === selectedIdx ? 'var(--surface-3)' : 'transparent', color: 'var(--text)' }}
            >
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                style={{ background: 'var(--surface-3)', color: TYPE_COLOR[entity.type] }}
              >
                {entity.type}
              </span>
              {entity.label}
            </button>
          ))}
        </div>
      )}

      <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>
        Type <kbd className="px-1 rounded text-[10px]" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>@</kbd> to link a hero, player, or team — use ↑↓ to navigate, Enter to insert
      </p>
    </div>
  )
}
