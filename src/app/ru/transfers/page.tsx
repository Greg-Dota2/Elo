import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { getTransfers, getAllTeams } from '@/lib/queries'
import type { Transfer } from '@/lib/types'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Ð¢Ñ€Ð°Ð½ÑÑ„ÐµÑ€Ñ‹ Ð¸ Ð¿ÐµÑ€ÐµÑ…Ð¾Ð´Ñ‹ Ð¸Ð³Ñ€Ð¾ÐºÐ¾Ð² Dota 2',
  description: 'ÐŸÐ¾ÑÐ»ÐµÐ´Ð½Ð¸Ðµ Ð¸Ð·Ð¼ÐµÐ½ÐµÐ½Ð¸Ñ ÑÐ¾ÑÑ‚Ð°Ð²Ð¾Ð² Ð¸ Ð¿ÐµÑ€ÐµÑ…Ð¾Ð´Ñ‹ Ð¸Ð³Ñ€Ð¾ÐºÐ¾Ð² Ð² Ð¿Ñ€Ð¾Ñ„ÐµÑÑÐ¸Ð¾Ð½Ð°Ð»ÑŒÐ½Ð¾Ð¹ ÑÑ†ÐµÐ½Ðµ Dota 2. ÐŸÐ¾Ð´Ð¿Ð¸ÑÐ°Ð½Ð¸Ñ, ÑƒÑ…Ð¾Ð´Ñ‹, Ð°Ñ€ÐµÐ½Ð´Ñ‹ Ð¸ Ð·Ð°Ð²ÐµÑ€ÑˆÐµÐ½Ð¸Ñ ÐºÐ°Ñ€ÑŒÐµÑ€Ñ‹.',
  alternates: { canonical: '/ru/transfers', languages: { 'x-default': '/transfers', 'en': '/transfers', 'ru': '/ru/transfers' } },
  openGraph: { title: 'Ð¢Ñ€Ð°Ð½ÑÑ„ÐµÑ€Ñ‹ Ð¸ Ð¿ÐµÑ€ÐµÑ…Ð¾Ð´Ñ‹ Ð¸Ð³Ñ€Ð¾ÐºÐ¾Ð² Dota 2', description: 'ÐŸÐ¾ÑÐ»ÐµÐ´Ð½Ð¸Ðµ Ð¸Ð·Ð¼ÐµÐ½ÐµÐ½Ð¸Ñ ÑÐ¾ÑÑ‚Ð°Ð²Ð¾Ð² Ð¸ Ð¿ÐµÑ€ÐµÑ…Ð¾Ð´Ñ‹ Ð¸Ð³Ñ€Ð¾ÐºÐ¾Ð² Ð² Ð¿Ñ€Ð¾Ñ„ÐµÑÑÐ¸Ð¾Ð½Ð°Ð»ÑŒÐ½Ð¾Ð¹ ÑÑ†ÐµÐ½Ðµ Dota 2. ÐŸÐ¾Ð´Ð¿Ð¸ÑÐ°Ð½Ð¸Ñ, ÑƒÑ…Ð¾Ð´Ñ‹, Ð°Ñ€ÐµÐ½Ð´Ñ‹ Ð¸ Ð·Ð°Ð²ÐµÑ€ÑˆÐµÐ½Ð¸Ñ ÐºÐ°Ñ€ÑŒÐµÑ€Ñ‹.', url: '/ru/transfers' },
  twitter: { card: 'summary', title: 'Ð¢Ñ€Ð°Ð½ÑÑ„ÐµÑ€Ñ‹ Ð¸ Ð¿ÐµÑ€ÐµÑ…Ð¾Ð´Ñ‹ Ð¸Ð³Ñ€Ð¾ÐºÐ¾Ð² Dota 2', description: 'ÐŸÐ¾ÑÐ»ÐµÐ´Ð½Ð¸Ðµ Ð¸Ð·Ð¼ÐµÐ½ÐµÐ½Ð¸Ñ ÑÐ¾ÑÑ‚Ð°Ð²Ð¾Ð² Ð¸ Ð¿ÐµÑ€ÐµÑ…Ð¾Ð´Ñ‹ Ð¸Ð³Ñ€Ð¾ÐºÐ¾Ð² Ð² Ð¿Ñ€Ð¾Ñ„ÐµÑÑÐ¸Ð¾Ð½Ð°Ð»ÑŒÐ½Ð¾Ð¹ ÑÑ†ÐµÐ½Ðµ Dota 2.' },
}

const TYPE_LABELS: Record<Transfer['type'], string> = {
  permanent:  'ÐŸÐ¾Ð´Ð¿Ð¸ÑÐ°Ð½',
  loan:       'ÐÑ€ÐµÐ½Ð´Ð°',
  'stand-in': 'Ð—Ð°Ð¼ÐµÐ½Ð°',
  free_agent: 'Ð¡Ð²Ð¾Ð±Ð¾Ð´Ð½Ñ‹Ð¹ Ð°Ð³ÐµÐ½Ñ‚',
  retired:    'Ð—Ð°Ð²ÐµÑ€ÑˆÐ¸Ð» ÐºÐ°Ñ€ÑŒÐµÑ€Ñƒ',
}

const TYPE_COLORS: Record<Transfer['type'], { bg: string; color: string }> = {
  permanent:  { bg: 'hsl(var(--success) / 0.12)', color: 'hsl(var(--success))' },
  loan:       { bg: 'hsl(var(--primary) / 0.12)', color: 'hsl(var(--primary))' },
  'stand-in': { bg: 'hsl(var(--accent) / 0.14)',  color: 'hsl(var(--accent))' },
  free_agent: { bg: 'hsl(var(--muted))',           color: 'var(--text-muted)' },
  retired:    { bg: 'hsl(var(--muted))',           color: 'var(--text-muted)' },
}

const FALLBACK_DESTINATION: Partial<Record<Transfer['type'], string>> = {
  free_agent: 'Ð¡Ð²Ð¾Ð±Ð¾Ð´Ð½Ñ‹Ð¹ Ð°Ð³ÐµÐ½Ñ‚',
  retired:    'Ð—Ð°Ð²ÐµÑ€ÑˆÐ¸Ð» ÐºÐ°Ñ€ÑŒÐµÑ€Ñƒ',
}

type TeamMap = Record<string, { slug: string | null; logo_url: string | null }>

function TeamChip({ name, logo, slug, fallback }: {
  name: string | null; logo: string | null; slug?: string | null; fallback?: string
}) {
  if (!name) {
    return (
      <span className="flex items-center gap-1.5">
        <span className="text-sm italic font-medium" style={{ color: 'var(--text-muted)' }}>{fallback ?? 'â€”'}</span>
      </span>
    )
  }

  const content = (
    <span className="flex items-center gap-1.5">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt={name} className="w-6 h-6 object-contain shrink-0" />
      ) : (
        <span
          className="w-6 h-6 rounded flex items-center justify-center font-display font-black text-[10px] shrink-0"
          style={{ background: 'hsl(var(--secondary))', color: 'var(--text-muted)' }}
        >
          {name.slice(0, 2).toUpperCase()}
        </span>
      )}
      <span className="font-semibold text-sm truncate">{name}</span>
    </span>
  )

  if (slug) return <Link href={`/ru/teams/${slug}`} className="hover:opacity-75 transition-opacity">{content}</Link>
  return content
}

function TransferRow({ t, teamMap, hideNotes = false }: { t: Transfer; teamMap: TeamMap; hideNotes?: boolean }) {
  const { bg, color } = TYPE_COLORS[t.type]
  const date = new Date(t.transfer_date + 'T00:00:00').toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'short',
  })
  const fromSlug = t.from_team ? (teamMap[t.from_team.toLowerCase()]?.slug ?? null) : null
  const toSlug   = t.to_team   ? (teamMap[t.to_team.toLowerCase()]?.slug   ?? null) : null

  return (
    <div className="px-5 py-4" style={{ borderBottom: '1px solid hsl(var(--border) / 0.5)' }}>

      {/* Player row */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3 min-w-0">
          {t.player_photo_url ? (
            <Image src={t.player_photo_url} alt={t.player_ign} width={36} height={36}
              className="rounded-full object-cover shrink-0" style={{ width: 36, height: 36 }} />
          ) : (
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-display font-black text-xs"
              style={{ background: 'hsl(var(--secondary))', color: 'var(--text-muted)' }}>
              {t.player_ign.slice(0, 2).toUpperCase()}
            </div>
          )}
          {t.player_slug ? (
            <Link href={`/ru/players/${t.player_slug}`} className="font-bold text-base hover:text-primary transition-colors truncate">
              {t.player_ign}
            </Link>
          ) : (
            <span className="font-bold text-base truncate">{t.player_ign}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: bg, color }}>
            {TYPE_LABELS[t.type]}
          </span>
          <span className="text-xs w-14 text-right shrink-0" style={{ color: 'var(--text-muted)' }}>{date}</span>
        </div>
      </div>

      {/* Teams row */}
      <div className="flex items-center justify-center gap-2 mt-2">
        <TeamChip name={t.from_team} logo={t.from_team_logo_url} slug={fromSlug} fallback="ÐÐµÐ¸Ð·Ð²ÐµÑÑ‚Ð½Ð¾" />
        <svg width="16" height="10" viewBox="0 0 20 12" fill="none" className="shrink-0" style={{ color: 'var(--text-muted)' }}>
          <path d="M0 6h16M11 1l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <TeamChip name={t.to_team} logo={t.to_team_logo_url} slug={toSlug} fallback={FALLBACK_DESTINATION[t.type]} />
      </div>

      {!hideNotes && (t.notes_ru ?? t.notes) && (
        <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-muted)' }}>{t.notes_ru ?? t.notes}</p>
      )}
    </div>
  )
}

type TransferBatch = { transfers: Transfer[]; sharedNote: string | null }

function groupIntoBatches(items: Transfer[]): TransferBatch[] {
  const batches: TransferBatch[] = []
  for (const t of items) {
    const last = batches[batches.length - 1]
    const first = last?.transfers[0]
    if (
      last && t.notes &&
      first?.from_team === t.from_team &&
      first?.to_team === t.to_team &&
      first?.type === t.type &&
      first?.notes === t.notes
    ) {
      last.transfers.push(t)
    } else {
      batches.push({ transfers: [t], sharedNote: null })
    }
  }
  for (const b of batches) {
    if (b.transfers.length > 1 && (b.transfers[0].notes_ru ?? b.transfers[0].notes)) {
      b.sharedNote = b.transfers[0].notes_ru ?? b.transfers[0].notes
    }
  }
  return batches
}

export default async function RuTransfersPage() {
  const [transfers, teams] = await Promise.all([
    getTransfers().catch(() => [] as Transfer[]),
    getAllTeams().catch(() => []),
  ])

  const teamMap: TeamMap = {}
  for (const t of teams) {
    teamMap[t.name.toLowerCase()] = { slug: t.slug, logo_url: t.logo_url }
  }

  const grouped: { label: string; items: Transfer[] }[] = []
  for (const t of transfers) {
    const label = new Date(t.transfer_date + 'T00:00:00').toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
    const last = grouped[grouped.length - 1]
    if (last?.label === label) last.items.push(t)
    else grouped.push({ label, items: [t] })
  }

  return (
    <div className="max-w-3xl mx-auto">

      {/* Header */}
      <div className="text-center mb-12">
        <p className="section-label mb-3">ÐŸÐµÑ€ÐµÑ…Ð¾Ð´Ñ‹</p>
        <h1 className="font-display text-4xl font-black tracking-tight mb-4">Ð¢Ñ€Ð°Ð½ÑÑ„ÐµÑ€Ð½Ñ‹Ðµ Ð½Ð¾Ð²Ð¾ÑÑ‚Ð¸</h1>
        <p className="text-base leading-7 max-w-xl mx-auto" style={{ color: 'var(--text-muted)' }}>
          Ð’ÑÐµ Ð·Ð°Ð¼ÐµÑ‚Ð½Ñ‹Ðµ Ð¸Ð·Ð¼ÐµÐ½ÐµÐ½Ð¸Ñ ÑÐ¾ÑÑ‚Ð°Ð²Ð¾Ð² Ð² Ð¿Ñ€Ð¾ ÑÑ†ÐµÐ½Ðµ Dota 2 â€” Ð¿Ð¾Ð´Ð¿Ð¸ÑÐ°Ð½Ð¸Ñ, ÑƒÑ…Ð¾Ð´Ñ‹, Ð°Ñ€ÐµÐ½Ð´Ñ‹ Ð¸ Ð·Ð°Ð²ÐµÑ€ÑˆÐµÐ½Ð¸Ñ ÐºÐ°Ñ€ÑŒÐµÑ€Ñ‹.
          ÐžÐ±Ð½Ð¾Ð²Ð»ÑÐµÑ‚ÑÑ Ð¿Ð¾ Ð¼ÐµÑ€Ðµ Ð¿Ð¾ÑÐ²Ð»ÐµÐ½Ð¸Ñ Ð½Ð¾Ð²Ð¾ÑÑ‚ÐµÐ¹.
        </p>
      </div>

      {transfers.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-4xl mb-3">ðŸ”„</p>
          <p className="font-semibold mb-1">Ð¢Ñ€Ð°Ð½ÑÑ„ÐµÑ€Ð¾Ð² Ð¿Ð¾ÐºÐ° Ð½ÐµÑ‚</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Ð—Ð°Ñ…Ð¾Ð´Ð¸Ñ‚Ðµ Ð¿Ð¾Ð·Ð¶Ðµ, ÐºÐ¾Ð³Ð´Ð° Ð½Ð°Ñ‡Ð½Ñ‘Ñ‚ÑÑ ÑÐ»ÐµÐ´ÑƒÑŽÑ‰Ð¸Ð¹ Ñ‚Ñ€Ð°Ð½ÑÑ„ÐµÑ€Ð½Ñ‹Ð¹ Ð¿ÐµÑ€Ð¸Ð¾Ð´.</p>
        </div>
      ) : (
        <div className="grid gap-8">
          {grouped.map(({ label, items }) => (
            <div key={label}>
              <p className="text-xs font-bold uppercase tracking-widest mb-2 px-5" style={{ color: 'var(--text-muted)' }}>
                {label}
              </p>
              <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                {groupIntoBatches(items).map((batch, bi, arr) => {
                  const isLast = bi === arr.length - 1
                  const borderStyle = !isLast ? { borderBottom: '1px solid hsl(var(--border) / 0.5)' } : {}
                  if (batch.transfers.length === 1) {
                    return (
                      <div key={batch.transfers[0].id} style={isLast ? { borderBottom: 'none' } : {}}>
                        <TransferRow t={batch.transfers[0]} teamMap={teamMap} />
                      </div>
                    )
                  }
                  return (
                    <div key={`batch-${bi}`} style={borderStyle}>
                      {batch.transfers.map(t => (
                        <TransferRow key={t.id} t={t} teamMap={teamMap} hideNotes />
                      ))}
                      {batch.sharedNote && (
                        <div className="px-5 pb-4">
                          <p className="text-sm leading-6" style={{ color: 'var(--text-muted)' }}>{batch.sharedNote}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
