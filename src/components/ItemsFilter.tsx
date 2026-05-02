'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const CATEGORIES = [
  { key: 'all',        label: 'All' },
  { key: 'upgrade',    label: 'Upgrades' },
  { key: 'basic',      label: 'Basic' },
  { key: 'neutral',    label: 'Neutral' },
  { key: 'consumable', label: 'Consumables' },
]

const CATEGORY_STYLES: Record<string, { inactive: string; active: string }> = {
  all:        {
    inactive: 'text-muted-foreground border-border/50 hover:text-foreground hover:border-border hover:bg-secondary/40',
    active:   'text-foreground bg-secondary border-border',
  },
  upgrade:    {
    inactive: 'text-amber-400/55 bg-amber-400/5 border-amber-400/15 hover:text-amber-400/80 hover:bg-amber-400/10 hover:border-amber-400/25',
    active:   'text-amber-400 bg-amber-400/15 border-amber-400/40',
  },
  basic:      {
    inactive: 'text-sky-400/55 bg-sky-400/5 border-sky-400/15 hover:text-sky-400/80 hover:bg-sky-400/10 hover:border-sky-400/25',
    active:   'text-sky-400 bg-sky-400/15 border-sky-400/40',
  },
  neutral:    {
    inactive: 'text-emerald-400/55 bg-emerald-400/5 border-emerald-400/15 hover:text-emerald-400/80 hover:bg-emerald-400/10 hover:border-emerald-400/25',
    active:   'text-emerald-400 bg-emerald-400/15 border-emerald-400/40',
  },
  consumable: {
    inactive: 'text-rose-400/55 bg-rose-400/5 border-rose-400/15 hover:text-rose-400/80 hover:bg-rose-400/10 hover:border-rose-400/25',
    active:   'text-rose-400 bg-rose-400/15 border-rose-400/40',
  },
}

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
        const styles = CATEGORY_STYLES[key]
        return (
          <button
            key={key}
            onClick={() => navigate(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-200 ${isActive ? styles.active : styles.inactive}`}
          >
            {label}
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-black/20">{counts[key]}</span>
          </button>
        )
      })}
    </div>
  )
}
