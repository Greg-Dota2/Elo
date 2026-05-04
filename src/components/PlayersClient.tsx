'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { Player } from '@/lib/types'
import PlayersFilter from '@/components/PlayersFilter'

const POSITION_LABEL: Record<number, string> = { 1: 'Carry', 2: 'Mid', 3: 'Offlane', 4: 'Soft Support', 5: 'Hard Support' }
const POSITION_COLOR: Record<number, string> = {
  1: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  2: 'text-primary bg-primary/10 border-primary/20',
  3: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  4: 'text-success bg-success/10 border-success/20',
  5: 'text-success bg-success/10 border-success/20',
}
const POS_ORDER = [1, 2, 3, 4, 5]

function PlayerCard({ player }: { player: Player }) {
  const posColor = player.position ? POSITION_COLOR[player.position] : 'text-muted-foreground bg-muted/50 border-border'
  return (
    <Link href={`/players/${player.slug}`}>
      <article className="group rounded-2xl border border-border/60 bg-card/60 overflow-hidden hover:border-primary/40 hover:bg-card/80 transition-all duration-300 hover:-translate-y-1">
        <div className="relative h-52 bg-secondary/60 overflow-hidden">
          {player.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={player.photo_url} alt={player.ign} className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="font-display text-5xl font-black text-muted-foreground/30">{player.ign.slice(0, 2).toUpperCase()}</span>
            </div>
          )}
          {player.position && (
            <span className={`absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full border ${posColor}`}>Pos {player.position}</span>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-display text-lg font-bold text-foreground leading-tight">{player.ign}</h3>
            {player.nationality && <span className="text-xs text-muted-foreground shrink-0 mt-0.5">{player.nationality}</span>}
          </div>
          {player.full_name && <p className="text-xs text-muted-foreground mb-2">{player.full_name}</p>}
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
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${posColor}`}>{POSITION_LABEL[player.position]}</span>
            )}
          </div>
          {player.signature_heroes && player.signature_heroes.length > 0 && (
            <p className="text-xs text-muted-foreground/60 mt-2 truncate">{player.signature_heroes.slice(0, 3).join(' · ')}</p>
          )}
        </div>
      </article>
    </Link>
  )
}

export default function PlayersClient({ players }: { players: Player[] }) {
  const searchParams = useSearchParams()
  const filterPos = searchParams.get('pos') ? Number(searchParams.get('pos')) : null
  const [search, setSearch] = useState('')

  const q = search.toLowerCase()
  const filtered = players
    .filter(p => !filterPos || p.position === filterPos)
    .filter(p => !q || p.ign.toLowerCase().includes(q) || (p.full_name ?? '').toLowerCase().includes(q) || (p.team?.name ?? '').toLowerCase().includes(q))

  const byTeam = new Map<string, { teamName: string; players: Player[] }>()
  const noTeam: Player[] = []
  for (const p of filtered) {
    if (p.team) {
      const k = p.team.id
      if (!byTeam.has(k)) byTeam.set(k, { teamName: p.team.name, players: [] })
      byTeam.get(k)!.players.push(p)
    } else {
      noTeam.push(p)
    }
  }
  for (const group of byTeam.values()) {
    group.players.sort((a, b) => (POS_ORDER.indexOf(a.position ?? 99)) - (POS_ORDER.indexOf(b.position ?? 99)))
  }
  const groups = Array.from(byTeam.values()).sort((a, b) => a.teamName.localeCompare(b.teamName))

  const counts = {
    '':  players.length,
    '1': players.filter(p => p.position === 1).length,
    '2': players.filter(p => p.position === 2).length,
    '3': players.filter(p => p.position === 3).length,
    '4': players.filter(p => p.position === 4).length,
    '5': players.filter(p => p.position === 5).length,
  }

  return (
    <>
      {/* Search */}
      <div className="relative mb-5">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search players or teams…"
          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-secondary/60 border border-border/60 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:bg-secondary/80 transition-colors"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      <PlayersFilter counts={counts} />

      <p className="text-sm text-muted-foreground mb-6">
        {filtered.length}{filtered.length !== players.length ? ` of ${players.length}` : ''} player profiles
        {search ? ` matching "${search}"` : ''}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-2xl p-12 text-center border border-border/60 bg-card/40">
          <p className="font-semibold mb-1">No players found</p>
          <p className="text-sm text-muted-foreground">Try a different search or filter.</p>
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
    </>
  )
}
