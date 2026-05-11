'use client'

import { useState } from 'react'
import Link from 'next/link'
import { heroPortraitUrl } from '@/lib/heroes'

export interface HeroMetaEntry {
  id: number
  slug: string
  localized_name: string
  primary_attr: string
  roles: string[]
  winRate: number
  pickRate: number
  winRateDelta: number
  winRateTrend: number[]
  proPick: number
  proBan: number
}

type SortKey = 'winRate' | 'pickRate' | 'winRateDelta' | 'proPick'

const ROLES_RU: Record<string, string> = {
  Carry: 'Керри', Support: 'Саппорт', Nuker: 'Нюкер',
  Disabler: 'Дизейблер', Durable: 'Живучий', Escape: 'Бегство',
  Pusher: 'Пушер', Initiator: 'Инициатор', Jungler: 'Джанглер',
}

const ROLE_STYLE: Record<string, string> = {
  'Carry':     'bg-orange-500/15 text-orange-400 border-orange-500/25',
  'Support':   'bg-sky-500/15 text-sky-400 border-sky-500/25',
  'Nuker':     'bg-red-500/15 text-red-400 border-red-500/25',
  'Disabler':  'bg-purple-500/15 text-purple-400 border-purple-500/25',
  'Durable':   'bg-green-500/15 text-green-400 border-green-500/25',
  'Escape':    'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  'Pusher':    'bg-lime-500/15 text-lime-400 border-lime-500/25',
  'Initiator': 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',
  'Jungler':   'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
}

const ATTR_DOT: Record<string, string> = {
  str: 'bg-red-400',
  agi: 'bg-green-400',
  int: 'bg-blue-400',
  all: 'bg-purple-400',
}

function winRateColor(wr: number) {
  if (wr >= 53) return 'text-emerald-400'
  if (wr >= 51) return 'text-emerald-400/70'
  if (wr >= 49) return 'text-foreground'
  if (wr >= 47) return 'text-red-400/70'
  return 'text-red-400'
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return <span className="text-muted-foreground/30 text-xs">—</span>
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = (max - min) || 0.5
  const W = 64, H = 22, PAD = 2
  const rising = points[points.length - 1] >= points[0]
  const color = rising ? '#34d399' : '#f87171'
  const coords = points.map((v, i) => {
    const x = PAD + (i / (points.length - 1)) * (W - PAD * 2)
    const y = PAD + (1 - (v - min) / range) * (H - PAD * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const firstY = PAD + (1 - (points[0] - min) / range) * (H - PAD * 2)
  const lastY  = PAD + (1 - (points[points.length - 1] - min) / range) * (H - PAD * 2)
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <polyline points={coords} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
      <circle cx={PAD} cy={firstY.toFixed(1)} r="1.5" fill={color} opacity="0.5" />
      <circle cx={(W - PAD).toFixed(1)} cy={lastY.toFixed(1)} r="2" fill={color} />
    </svg>
  )
}

function SpotlightCard({ hero, label, stat, statColor, accent, heroPrefix }: {
  hero: HeroMetaEntry
  label: string
  stat: string
  statColor: string
  accent: string
  heroPrefix: string
}) {
  return (
    <Link href={`${heroPrefix}/${hero.slug}`} className="group relative rounded-xl border border-border/50 bg-card overflow-hidden hover:border-primary/40 transition-all duration-200 flex flex-col">
      <div className={`h-[3px] w-full ${accent}`} />
      <div className="relative h-28 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroPortraitUrl(hero.slug)}
          alt={hero.localized_name}
          className="w-full h-full object-cover object-top scale-105 opacity-75 group-hover:opacity-90 group-hover:scale-110 transition-all duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
        <span className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-black/50 text-white/70 backdrop-blur-sm">
          {label}
        </span>
      </div>
      <div className="px-3 py-2.5">
        <p className="font-bold text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors">{hero.localized_name}</p>
        <p className={`font-mono font-black text-xl mt-0.5 ${statColor}`}>{stat}</p>
      </div>
    </Link>
  )
}

export default function HeroMetaTable({
  heroes,
  updatedAt,
  heroPrefix = '/heroes',
  locale = 'en',
}: {
  heroes: HeroMetaEntry[]
  updatedAt: string
  heroPrefix?: string
  locale?: 'en' | 'ru'
}) {
  const [sort, setSort] = useState<SortKey>('winRate')
  const [asc, setAsc] = useState(false)
  const [search, setSearch] = useState('')
  const [attrFilter, setAttrFilter] = useState('')

  const L = locale === 'ru' ? {
    sectionLabel: 'Знание игры',
    title: 'Мета героев',
    subtitle: `Процент побед и популярность в публичных матчах · ${heroes.length} героев`,
    liveData: 'Обновлено',
    allHeroes: 'Все герои',
    spotlightWR: 'Лучший % побед',
    spotlightPick: 'Самый популярный',
    spotlightRiser: 'Растёт быстрее всех',
    spotlightFaller: 'Падает быстрее всех',
    searchPlaceholder: 'Поиск героя...',
    attrAll: 'Все',
    colHero: 'Герой',
    colRoles: 'Роли',
    colWR: '% Побед',
    colTrend: 'Тренд',
    colChange: 'Изм.',
    colPickRate: '% Выбора',
    colProPicks: 'Про пики',
    noHeroes: 'Герои не найдены.',
    footer: 'Данные OpenDota · Публичные матчи всех уровней · Тренд = % побед за 7 периодов',
    countLabel: (n: number) => `${n} героев`,
  } : {
    sectionLabel: 'Game Knowledge',
    title: 'Hero Meta',
    subtitle: `Public match win & pick rates across all brackets · ${heroes.length} heroes`,
    liveData: 'Live data',
    allHeroes: 'All Heroes',
    spotlightWR: 'Highest Win Rate',
    spotlightPick: 'Most Picked',
    spotlightRiser: 'Biggest Riser',
    spotlightFaller: 'Biggest Faller',
    searchPlaceholder: 'Search hero...',
    attrAll: 'All',
    colHero: 'Hero',
    colRoles: 'Roles',
    colWR: 'Win Rate',
    colTrend: 'Trend',
    colChange: 'Change',
    colPickRate: 'Pick Rate',
    colProPicks: 'Pro Picks',
    noHeroes: 'No heroes found.',
    footer: 'Data from OpenDota · Public matches across all skill brackets · Trend = win rate over last 7 periods',
    countLabel: (n: number) => `${n} heroes`,
  }

  const topWR    = [...heroes].sort((a, b) => b.winRate - a.winRate)[0]
  const topPick  = [...heroes].sort((a, b) => b.pickRate - a.pickRate)[0]
  const topRiser = [...heroes].filter(h => h.winRateDelta > 0).sort((a, b) => b.winRateDelta - a.winRateDelta)[0]
  const topFaller = [...heroes].filter(h => h.winRateDelta < 0).sort((a, b) => a.winRateDelta - b.winRateDelta)[0]

  const filtered = heroes
    .filter(h => !search || h.localized_name.toLowerCase().includes(search.toLowerCase()))
    .filter(h => !attrFilter || h.primary_attr === attrFilter)
    .sort((a, b) => {
      const diff = a[sort] - b[sort]
      return asc ? diff : -diff
    })

  function handleSort(key: SortKey) {
    if (sort === key) setAsc(v => !v)
    else { setSort(key); setAsc(false) }
  }

  function SortTh({ col, children }: { col: SortKey; children: React.ReactNode }) {
    const active = sort === col
    return (
      <th
        onClick={() => handleSort(col)}
        className={[
          'px-4 py-3 text-right text-xs font-semibold cursor-pointer select-none whitespace-nowrap transition-colors',
          active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80',
        ].join(' ')}
      >
        {children} {active ? (asc ? '↑' : '↓') : ''}
      </th>
    )
  }

  const attrFilters = [
    { val: '',    label: L.attrAll,  dot: '' },
    { val: 'str', label: 'STR', dot: 'bg-red-400' },
    { val: 'agi', label: 'AGI', dot: 'bg-green-400' },
    { val: 'int', label: 'INT', dot: 'bg-blue-400' },
    { val: 'all', label: 'UNI', dot: 'bg-purple-400' },
  ]

  return (
    <div className="fade-in-up">

      {/* Page header */}
      <div className="relative rounded-2xl overflow-hidden mb-8 px-6 py-7 border border-border/40 bg-card/60">
        <div className="pointer-events-none absolute -top-10 -right-10 w-56 h-56 rounded-full blur-3xl opacity-20" style={{ background: 'hsl(var(--primary))' }} />

        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <p className="section-label mb-2">{L.sectionLabel}</p>
            <h1 className="text-4xl font-black tracking-tight mb-1">{L.title}</h1>
            <p className="text-sm text-muted-foreground">{L.subtitle}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 px-3 py-2 rounded-xl border border-border/40 bg-[var(--surface)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none mb-0.5">{L.liveData}</p>
              <p className="text-xs font-mono font-semibold">{updatedAt} EET</p>
            </div>
          </div>
        </div>

        <Link
          href={heroPrefix}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border/50 bg-[var(--surface)] text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-border transition-all"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          {L.allHeroes}
        </Link>
      </div>

      {/* Explanation */}
      {locale === 'ru' ? (
        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          Данные о проценте побед и популярности героев получены из OpenDota — такие же данные, которые используют все аналитики.
          Искра рядом с каждым героем показывает динамику процента побед за последние 7 периодов:
          зелёная линия вверх означает рост силы в текущем патче, красная вниз — нёрф, сдвиг меты или рост контр-пиков.
          Колонка <span className="text-foreground font-medium">«Изм.»</span> — точная разница между первым и последним снапшотом.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          Win rate and pick rate are pulled from OpenDota once a day — same raw data every analyst uses.
          The sparkline next to each hero shows where their win rate was heading across the last 7 data snapshots:
          green line going up means they&apos;re gaining strength in the current patch, red going down means either a nerf
          landed, the meta shifted, or their counters became popular. The <span className="text-foreground font-medium">Change</span> column
          is the exact win rate difference between the first and last snapshot.
        </p>
      )}

      {/* Spotlight cards */}
      {(topWR || topPick || topRiser || topFaller) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {topWR    && <SpotlightCard hero={topWR}    label={L.spotlightWR}    stat={`${topWR.winRate.toFixed(1)}%`}           statColor="text-emerald-400" accent="bg-emerald-400" heroPrefix={heroPrefix} />}
          {topPick  && <SpotlightCard hero={topPick}  label={L.spotlightPick}  stat={`${topPick.pickRate.toFixed(2)}%`}         statColor="text-sky-400"     accent="bg-sky-400"     heroPrefix={heroPrefix} />}
          {topRiser && <SpotlightCard hero={topRiser} label={L.spotlightRiser} stat={`+${topRiser.winRateDelta.toFixed(2)}%`}  statColor="text-emerald-400" accent="bg-emerald-400" heroPrefix={heroPrefix} />}
          {topFaller && <SpotlightCard hero={topFaller} label={L.spotlightFaller} stat={`${topFaller.winRateDelta.toFixed(2)}%`} statColor="text-red-400"   accent="bg-red-400"     heroPrefix={heroPrefix} />}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap items-center rounded-xl px-4 py-3 border border-border/40 bg-card/40">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="search"
            placeholder={L.searchPlaceholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="rounded-lg pl-7 pr-3 py-1.5 text-sm bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] outline-none focus:ring-1 focus:ring-orange-500 w-44 placeholder:text-[var(--text-muted)]"
          />
        </div>

        <div className="w-px h-5 bg-border/40 hidden sm:block" />

        <div className="flex gap-1.5">
          {attrFilters.map(({ val, label, dot }) => (
            <button
              key={val}
              onClick={() => setAttrFilter(val)}
              className={[
                'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all',
                attrFilter === val
                  ? 'border-primary/60 bg-primary/15 text-primary'
                  : 'border-border/50 text-muted-foreground hover:border-border hover:text-foreground',
              ].join(' ')}
            >
              {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
              {label}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs font-semibold tabular-nums px-2.5 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] text-muted-foreground">
          {L.countLabel(filtered.length)}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/40 overflow-hidden bg-card/30">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-card/80">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground w-10">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{L.colHero}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{L.colRoles}</th>
                <SortTh col="winRate">{L.colWR}</SortTh>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">{L.colTrend}</th>
                <SortTh col="winRateDelta">{L.colChange}</SortTh>
                <SortTh col="pickRate">{L.colPickRate}</SortTh>
                <SortTh col="proPick">{L.colProPicks}</SortTh>
              </tr>
            </thead>
            <tbody>
              {filtered.map((hero, i) => (
                <tr
                  key={hero.id}
                  className="border-b border-border/20 last:border-0 hover:bg-white/[0.03] transition-colors"
                >
                  <td className="px-4 py-2.5 text-muted-foreground/40 font-mono text-xs tabular-nums">{i + 1}</td>
                  <td className="px-4 py-2.5">
                    <Link href={`${heroPrefix}/${hero.slug}`} className="flex items-center gap-2.5 group">
                      <div className="relative w-16 h-10 rounded-md overflow-hidden border border-border/30 flex-shrink-0 group-hover:border-primary/40 transition-colors">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={heroPortraitUrl(hero.slug)} alt={hero.localized_name} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ATTR_DOT[hero.primary_attr] ?? 'bg-muted'}`} />
                          <p className="font-semibold text-xs leading-tight group-hover:text-primary transition-colors truncate">
                            {hero.localized_name}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {hero.roles.map(role => (
                        <span
                          key={role}
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap ${ROLE_STYLE[role] ?? 'bg-muted/20 text-muted-foreground border-border/30'}`}
                        >
                          {(locale === 'ru' ? ROLES_RU[role] : null) ?? role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`font-mono font-bold text-sm ${winRateColor(hero.winRate)}`}>
                      {hero.winRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <div className="inline-flex">
                      <Sparkline points={hero.winRateTrend} />
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`font-mono text-xs font-semibold ${
                      hero.winRateDelta > 0 ? 'text-emerald-400' :
                      hero.winRateDelta < 0 ? 'text-red-400' : 'text-muted-foreground/50'
                    }`}>
                      {hero.winRateDelta > 0 ? '+' : ''}{hero.winRateDelta.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground tabular-nums">
                    {hero.pickRate.toFixed(2)}%
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground tabular-nums">
                    {hero.proPick > 0 ? hero.proPick : <span className="opacity-30">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <p className="text-center py-12 text-muted-foreground text-sm">{L.noHeroes}</p>
        )}
      </div>

      <p className="mt-4 text-xs text-muted-foreground/50 text-center">
        {L.footer}
      </p>
    </div>
  )
}
