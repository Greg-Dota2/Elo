import Link from 'next/link'
import type { Participant } from '@/lib/types'

export interface RosterPlayer {
  ign: string
  slug: string
  photo_url: string | null
  position: number | null
}

export interface ParticipantWithRoster extends Participant {
  slug: string | null
  logo_url: string | null
  players: RosterPlayer[]
}

interface Props {
  participants: ParticipantWithRoster[]
}

const POS_LABEL: Record<number, string> = {
  1: 'Carry', 2: 'Mid', 3: 'Offlane', 4: 'Soft Support', 5: 'Hard Support',
}

const POS_COLOR: Record<number, string> = {
  1: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  2: 'text-primary bg-primary/10 border-primary/20',
  3: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  4: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  5: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
}

export default function ParticipantsGrid({ participants }: Props) {
  if (!participants || participants.length === 0) return null

  const hasTypes = participants.some(p => p.type != null)
  const invited = participants.filter(p => p.type === 'invited')
  const qualifiers = participants.filter(p => p.type === 'qualifier')
  const ungrouped = participants.filter(p => !p.type)

  const groups: { label: string | null; items: ParticipantWithRoster[] }[] = hasTypes
    ? [
        ...(invited.length > 0 ? [{ label: 'Invited', items: invited }] : []),
        ...(qualifiers.length > 0 ? [{ label: 'Qualifier', items: qualifiers }] : []),
      ]
    : [{ label: null, items: ungrouped }]

  const TeamCard = ({ p }: { p: ParticipantWithRoster }) => (
    <details className="group/team" style={{ background: 'var(--surface)' }}>
      <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none list-none hover:bg-primary/5 transition-colors">
        {/* Logo */}
        {p.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.logo_url} alt={p.team} className="w-8 h-8 object-contain shrink-0 rounded p-0.5" style={{ background: 'rgba(255,255,255,0.08)' }} loading="lazy" />
        ) : (
          <div
            className="w-8 h-8 rounded shrink-0 flex items-center justify-center text-[10px] font-black"
            style={{ background: 'hsl(var(--secondary))', color: 'var(--text-muted)' }}
          >
            {p.team.slice(0, 2).toUpperCase()}
          </div>
        )}

        {/* Name */}
        <div className="flex-1 min-w-0">
          {p.slug ? (
            <Link
              href={`/teams/${p.slug}`}
              className="text-sm font-semibold truncate block hover:text-primary transition-colors"
              style={{ color: 'var(--text)' }}
            >
              {p.team}
            </Link>
          ) : (
            <span className="text-sm font-semibold truncate block" style={{ color: 'var(--text)' }}>
              {p.team}
            </span>
          )}
        </div>

        {/* Expand toggle */}
        {p.players.length > 0 && (
          <span
            className="text-[10px] font-semibold px-2 py-1 rounded shrink-0"
            style={{ background: 'hsl(var(--secondary))', color: 'hsl(var(--primary))' }}
          >
            <span className="group-open/team:hidden">Roster ▾</span>
            <span className="hidden group-open/team:inline">Hide ▴</span>
          </span>
        )}
      </summary>

      {/* Roster dropdown */}
      {p.players.length > 0 && (
        <div style={{ borderTop: '1px solid hsl(var(--border) / 0.5)' }}>
          {p.players.map(player => (
            <Link
              key={player.slug}
              href={`/players/${player.slug}`}
              className="flex items-center gap-2.5 px-4 py-2 hover:bg-primary/5 transition-colors"
              style={{ borderTop: '1px solid hsl(var(--border) / 0.3)' }}
            >
              {/* Player photo */}
              <div className="w-7 h-7 rounded-full overflow-hidden shrink-0" style={{ background: 'hsl(var(--secondary))' }}>
                {player.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={player.photo_url} alt={player.ign} className="w-full h-full object-cover object-top" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[9px] font-black" style={{ color: 'var(--text-muted)' }}>
                    {player.ign.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="text-sm font-semibold flex-1 truncate" style={{ color: 'var(--text)' }}>
                {player.ign}
              </span>
              {player.position && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${POS_COLOR[player.position]}`}>
                  {POS_LABEL[player.position]}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </details>
  )

  return (
    <div
      className="rounded-xl overflow-hidden mb-5"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div
        className="px-4 py-3"
        style={{ borderBottom: '1px solid var(--border)', background: 'hsl(var(--secondary) / 0.3)' }}
      >
        <p className="section-label">Participants ({participants.length})</p>
      </div>

      {groups.map(({ label, items }) => (
        <div key={label ?? 'all'}>
          {label && (
            <div
              className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest"
              style={{
                background: 'hsl(var(--secondary) / 0.2)',
                borderTop: '1px solid hsl(var(--border) / 0.5)',
                borderBottom: '1px solid hsl(var(--border) / 0.4)',
                color: label === 'Invited' ? 'hsl(var(--primary))' : 'var(--text-muted)',
              }}
            >
              {label}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '1px', background: 'hsl(var(--border) / 0.4)' }}>
            {items.map(p => <TeamCard key={p.team} p={p} />)}
          </div>
        </div>
      ))}
    </div>
  )
}
