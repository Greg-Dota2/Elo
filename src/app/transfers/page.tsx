import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { getTransfers, getAllTeams } from '@/lib/queries'
import type { Transfer } from '@/lib/types'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Dota 2 Transfer News — Roster Moves & Signings',
  description: 'Latest Dota 2 pro player transfers, signings, and roster changes across Tier 1 teams. Updated as moves are announced.',
  keywords: ['Dota 2 transfers', 'Dota 2 roster changes', 'Dota 2 signings', 'pro Dota 2 roster', 'Dota 2 free agents'],
  alternates: { canonical: '/transfers' },
  openGraph: {
    title: 'Dota 2 Transfer News — Roster Moves & Signings',
    description: 'Latest Dota 2 pro player transfers, signings, and roster changes across Tier 1 teams.',
    url: '/transfers',
  },
}

const TYPE_LABELS: Record<Transfer['type'], string> = {
  permanent:  'Signed',
  loan:       'Loan',
  'stand-in': 'Stand-in',
  free_agent: 'Free Agent',
  retired:    'Retired',
}

const TYPE_COLORS: Record<Transfer['type'], { bg: string; color: string }> = {
  permanent:  { bg: 'hsl(var(--success) / 0.12)', color: 'hsl(var(--success))' },
  loan:       { bg: 'hsl(var(--primary) / 0.12)', color: 'hsl(var(--primary))' },
  'stand-in': { bg: 'hsl(var(--accent) / 0.14)',  color: 'hsl(var(--accent))' },
  free_agent: { bg: 'hsl(var(--muted))',           color: 'var(--text-muted)' },
  retired:    { bg: 'hsl(var(--muted))',           color: 'var(--text-muted)' },
}

const FALLBACK_DESTINATION: Partial<Record<Transfer['type'], string>> = {
  free_agent: 'Free Agent',
  retired:    'Retired',
}

type TeamMap = Record<string, { slug: string | null; logo_url: string | null }>

function TeamChip({ name, logo, slug, fallback }: {
  name: string | null; logo: string | null; slug?: string | null; fallback?: string
}) {
  if (!name) {
    return (
      <span className="flex items-center gap-2 w-36 justify-center">
        <span className="text-sm italic font-medium" style={{ color: 'var(--text-muted)' }}>{fallback ?? '—'}</span>
      </span>
    )
  }

  const content = (
    <span className="flex items-center gap-2 w-36 justify-center">
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

  if (slug) return <Link href={`/teams/${slug}`} className="hover:opacity-75 transition-opacity">{content}</Link>
  return content
}

function TransferRow({ t, teamMap }: { t: Transfer; teamMap: TeamMap }) {
  const { bg, color } = TYPE_COLORS[t.type]
  const date = new Date(t.transfer_date + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short',
  })
  const fromSlug = t.from_team ? (teamMap[t.from_team.toLowerCase()]?.slug ?? null) : null
  const toSlug   = t.to_team   ? (teamMap[t.to_team.toLowerCase()]?.slug   ?? null) : null

  return (
    <div className="px-5 py-4" style={{ borderBottom: '1px solid hsl(var(--border) / 0.5)' }}>
      {/* Main row */}
      <div className="grid items-center gap-4" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
        {/* Player — left */}
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
            <Link href={`/players/${t.player_slug}`} className="font-bold text-base hover:text-primary transition-colors truncate">
              {t.player_ign}
            </Link>
          ) : (
            <span className="font-bold text-base truncate">{t.player_ign}</span>
          )}
        </div>

        {/* Transfer arrow — center */}
        <div className="flex items-center gap-3 shrink-0">
          <TeamChip name={t.from_team} logo={t.from_team_logo_url} slug={fromSlug} fallback="Unknown" />
          <svg width="20" height="12" viewBox="0 0 20 12" fill="none" className="shrink-0" style={{ color: 'var(--text-muted)' }}>
            <path d="M0 6h16M11 1l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <TeamChip name={t.to_team} logo={t.to_team_logo_url} slug={toSlug} fallback={FALLBACK_DESTINATION[t.type]} />
        </div>

        {/* Meta — right */}
        <div className="flex items-center gap-2 justify-end">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: bg, color }}>
            {TYPE_LABELS[t.type]}
          </span>
          <span className="text-xs w-14 text-right shrink-0" style={{ color: 'var(--text-muted)' }}>{date}</span>
        </div>
      </div>

      {/* Notes — full width below the row */}
      {t.notes && (
        <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-muted)' }}>{t.notes}</p>
      )}
    </div>
  )
}

export default async function TransfersPage() {
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
    const label = new Date(t.transfer_date + 'T00:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    const last = grouped[grouped.length - 1]
    if (last?.label === label) last.items.push(t)
    else grouped.push({ label, items: [t] })
  }

  return (
    <div className="max-w-3xl mx-auto">

      {/* Header — centered */}
      <div className="text-center mb-12">
        <p className="section-label mb-3">Roster moves</p>
        <h1 className="font-display text-4xl font-black tracking-tight mb-4">Transfer News</h1>
        <p className="text-base leading-7 max-w-xl mx-auto" style={{ color: 'var(--text-muted)' }}>
          Every notable roster move in the Dota 2 pro scene — signings, releases, loans, and retirements.
          Updated as moves are announced.
        </p>
      </div>

      {transfers.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-4xl mb-3">🔄</p>
          <p className="font-semibold mb-1">No transfers yet</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Check back when the next roster shuffle hits.</p>
        </div>
      ) : (
        <div className="grid gap-8">
          {grouped.map(({ label, items }) => (
            <div key={label}>
              <p className="text-xs font-bold uppercase tracking-widest mb-2 px-5" style={{ color: 'var(--text-muted)' }}>
                {label}
              </p>
              <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                {items.map((t, i) => (
                  <div key={t.id} style={i === items.length - 1 ? { borderBottom: 'none' } : {}}>
                    <TransferRow t={t} teamMap={teamMap} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
