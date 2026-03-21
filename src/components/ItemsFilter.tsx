'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const CATEGORIES = [
  { key: 'all',        label: 'All' },
  { key: 'consumable', label: 'Consumables' },
  { key: 'basic',      label: 'Basic' },
  { key: 'upgrade',    label: 'Upgrades' },
  { key: 'neutral',    label: 'Neutral' },
]

interface Props {
  active: string
  counts: Record<string, number>
}

export default function ItemsFilter({ active, counts }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const navigate = (cat: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (cat === 'all') params.delete('cat')
    else params.set('cat', cat)
    router.push(`/items?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIES.map(({ key, label }) => {
        const isActive = active === key
        return (
          <button
            key={key}
            onClick={() => navigate(key)}
            className="px-4 py-2 rounded-full text-sm font-semibold transition-colors"
            style={
              isActive
                ? { background: 'hsl(var(--primary))', color: 'hsl(var(--background))' }
                : { background: 'hsl(var(--secondary) / 0.6)', color: 'hsl(var(--muted-foreground))' }
            }
          >
            {label}
            <span className="ml-1.5 text-xs opacity-70">{counts[key]}</span>
          </button>
        )
      })}
    </div>
  )
}
