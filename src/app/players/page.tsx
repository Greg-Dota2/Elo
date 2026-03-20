import { getPlayers } from '@/lib/queries'
import Link from 'next/link'
import type { Player } from '@/lib/types'

export const revalidate = 300

const POSITION_LABEL: Record<number, string> = { 1: 'Carry', 2: 'Mid', 3: 'Offlane', 4: 'Soft Support', 5: 'Hard Support' }
const POSITION_COLOR: Record<number, string> = {
  1: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  2: 'text-primary bg-primary/10 border-primary/20',
  3: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  4: 'text-success bg-success/10 border-success/20',
  5: 'text-success bg-success/10 border-success/20',
}

function PlayerCard({ player }: { player: Player }) {
  const posColor = player.position ? POSITION_COLOR[player.position] : 'text-muted-foreground bg-muted/50 border-border'

  return (
    <Link href={`/players/${player.slug}`}>
      <article className="group rounded-2xl border border-border/60 bg-card/60 overflow-hidden hover:border-primary/40 hover:bg-card/80 transition-all duration-300 hover:-translate-y-1">
        {/* Photo */}
        <div className="relative h-52 bg-secondary/60 overflow-hidden">
          {player.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={player.photo_url}
              alt={player.ign}
              className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="font-display text-5xl font-black text-muted-foreground/30">
                {player.ign.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          {/* Position badge overlay */}
          {player.position && (
            <span className={`absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full border ${posColor}`}>
              Pos {player.position}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-display text-lg font-bold text-foreground leading-tight">{player.ign}</h3>
            {player.nationality && (
              <span className="text-xs text-muted-foreground shrink-0 mt-0.5">{player.nationality}</span>
            )}
          </div>
          {player.full_name && (
            <p className="text-xs text-muted-foreground mb-2">{player.full_name}</p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            {player.team && (
              <div className="flex items-center gap-1.5">
                {player.team.logo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img loading="lazy" src={player.team.logo_url} alt={player.team.name} className="w-4 h-4 object-contain rounded" />
                )}
                <span className="text-xs font-semibold text-muted-foreground">{player.team.name}</span>
              </div>
            )}
            {player.position && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${posColor}`}>
                {POSITION_LABEL[player.position]}
              </span>
            )}
          </div>
          {player.signature_heroes && player.signature_heroes.length > 0 && (
            <p className="text-xs text-muted-foreground/60 mt-2 truncate">
              {player.signature_heroes.slice(0, 3).join(' · ')}
            </p>
          )}
        </div>
      </article>
    </Link>
  )
}

export default async function PlayersPage() {
  let players: Player[] = []
  try { players = await getPlayers() } catch { /* db error */ }

  // Group by team
  const byTeam = new Map<string, { teamName: string; players: Player[] }>()
  const noTeam: Player[] = []
  for (const p of players) {
    if (p.team) {
      const k = p.team.id
      if (!byTeam.has(k)) byTeam.set(k, { teamName: p.team.name, players: [] })
      byTeam.get(k)!.players.push(p)
    } else {
      noTeam.push(p)
    }
  }
  const groups = Array.from(byTeam.values()).sort((a, b) => a.teamName.localeCompare(b.teamName))

  return (
    <div className="fade-in-up">
      <div className="mb-8">
        <p className="section-label mb-2">Tier 1 Scene</p>
        <h1 className="text-3xl font-black tracking-tight mb-1">Dota 2 Players</h1>
        <p className="text-sm text-muted-foreground">{players.length} player profiles</p>
      </div>

      {players.length === 0 ? (
        <div className="rounded-2xl p-12 text-center border border-border/60 bg-card/40">
          <p className="text-4xl mb-3">🎮</p>
          <p className="font-semibold mb-1">No player profiles yet</p>
          <p className="text-sm text-muted-foreground">Add players via the admin panel.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {groups.map(({ teamName, players: roster }) => (
            <div key={teamName}>
              <p className="section-label mb-4">{teamName}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {roster.map(p => <PlayerCard key={p.id} player={p} />)}
              </div>
            </div>
          ))}
          {noTeam.length > 0 && (
            <div>
              <p className="section-label mb-4">Free Agents</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {noTeam.map(p => <PlayerCard key={p.id} player={p} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
