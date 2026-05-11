'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const ROLES_EN = [
  { label: 'All',          value: '' },
  { label: 'Carry',        value: '1' },
  { label: 'Mid',          value: '2' },
  { label: 'Offlane',      value: '3' },
  { label: 'Soft Support', value: '4' },
  { label: 'Hard Support', value: '5' },
]
const ROLES_RU = [
  { label: 'Все',          value: '' },
  { label: 'Керри',        value: '1' },
  { label: 'Мид',          value: '2' },
  { label: 'Офлейн',       value: '3' },
  { label: 'Саппорт',      value: '4' },
  { label: 'Хард саппорт', value: '5' },
]

const ROLE_STYLES: Record<string, { inactive: string; active: string }> = {
  '': {
    inactive: 'text-muted-foreground border-border/60 hover:text-foreground hover:border-border hover:bg-secondary/40',
    active:   'text-foreground bg-secondary border-border',
  },
  '1': {
    inactive: 'text-yellow-400/80 bg-yellow-400/10 border-yellow-400/30 hover:text-yellow-400 hover:bg-yellow-400/15 hover:border-yellow-400/50',
    active:   'text-yellow-400 bg-yellow-400/20 border-yellow-400/50',
  },
  '2': {
    inactive: 'text-sky-400/80 bg-sky-400/10 border-sky-400/30 hover:text-sky-400 hover:bg-sky-400/15 hover:border-sky-400/50',
    active:   'text-sky-400 bg-sky-400/20 border-sky-400/50',
  },
  '3': {
    inactive: 'text-orange-400/80 bg-orange-400/10 border-orange-400/30 hover:text-orange-400 hover:bg-orange-400/15 hover:border-orange-400/50',
    active:   'text-orange-400 bg-orange-400/20 border-orange-400/50',
  },
  '4': {
    inactive: 'text-emerald-400/80 bg-emerald-400/10 border-emerald-400/30 hover:text-emerald-400 hover:bg-emerald-400/15 hover:border-emerald-400/50',
    active:   'text-emerald-400 bg-emerald-400/20 border-emerald-400/50',
  },
  '5': {
    inactive: 'text-violet-400/80 bg-violet-400/10 border-violet-400/30 hover:text-violet-400 hover:bg-violet-400/15 hover:border-violet-400/50',
    active:   'text-violet-400 bg-violet-400/20 border-violet-400/50',
  },
}

interface Props {
  counts: Record<string, number>
  locale?: 'ru'
}

export default function PlayersFilter({ counts, locale }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const current = searchParams.get('pos') ?? ''
  const ROLES = locale === 'ru' ? ROLES_RU : ROLES_EN
  const base = locale === 'ru' ? '/ru/players' : '/players'

  return (
    <div className="flex flex-wrap gap-2 mb-8">
      {ROLES.map(r => {
        const isActive = r.value === current
        const styles = ROLE_STYLES[r.value]
        return (
          <button
            key={r.value}
            onClick={() => router.push(r.value ? `${base}?pos=${r.value}` : base)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-200 ${isActive ? styles.active : styles.inactive}`}
          >
            {r.label}
            {counts[r.value] !== undefined && (
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-black/20">
                {counts[r.value]}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
