'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const ROLES = [
  { label: 'All', value: '' },
  { label: 'Carry', value: '1' },
  { label: 'Mid', value: '2' },
  { label: 'Offlane', value: '3' },
  { label: 'Soft Support', value: '4' },
  { label: 'Hard Support', value: '5' },
]

export default function PlayersFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const current = searchParams.get('pos') ?? ''

  return (
    <div className="flex flex-wrap gap-2 mb-8">
      {ROLES.map(r => {
        const active = r.value === current
        return (
          <button
            key={r.value}
            onClick={() => router.push(r.value ? `/players?pos=${r.value}` : '/players')}
            className="text-xs font-bold px-3 py-1.5 rounded-full border transition-colors duration-200"
            style={active
              ? { background: 'hsl(var(--primary))', color: 'hsl(var(--background))', borderColor: 'hsl(var(--primary))' }
              : { background: 'var(--surface)', color: 'var(--text-muted)', borderColor: 'var(--border)' }
            }
          >
            {r.label}
          </button>
        )
      })}
    </div>
  )
}
