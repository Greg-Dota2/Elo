'use client'

import { useState } from 'react'
import MatchCard from '@/components/MatchCard'
import StatsTable from '@/components/StatsTable'
import BracketView from '@/components/BracketView'
import type { MatchPrediction, Tournament, TournamentStats, TeamAccuracy } from '@/lib/types'

interface Stage {
  stageName: string
  stageDate: string | null
  stageOrder: number
  matches: MatchPrediction[]
}

interface Props {
  tournament: Tournament
  stages: Stage[]
  stats: TournamentStats | null
  teamAccuracy: TeamAccuracy[]
}

export default function TournamentContent({ tournament, stages, stats, teamAccuracy }: Props) {
  const [tab, setTab] = useState<'picks' | 'bracket'>('picks')

  const tabBtn = (id: 'picks' | 'bracket', label: string) => (
    <button
      onClick={() => setTab(id)}
      className="px-5 py-2 rounded-full text-sm font-semibold transition-colors"
      style={
        tab === id
          ? { background: 'hsl(var(--primary))', color: 'hsl(var(--background))' }
          : { background: 'hsl(var(--secondary) / 0.6)', color: 'hsl(var(--muted-foreground))' }
      }
    >
      {label}
    </button>
  )

  return (
    <>
      {/* Stats */}
      {stats && stats.total_predictions > 0 && (
        <div className="mb-6">
          <p className="section-label mb-4">Statistics</p>
          <StatsTable stats={stats} teamAccuracy={teamAccuracy} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6">
        {tabBtn('picks', '📋 Picks')}
        {tabBtn('bracket', '🏆 Bracket')}
      </div>

      {/* Picks tab */}
      {tab === 'picks' && (
        stages.length === 0 ? (
          <div
            className="rounded-2xl p-10 text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <p className="text-4xl mb-3">⚔️</p>
            <p className="font-semibold mb-1">No predictions yet</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Predictions will appear here as they&apos;re added.
            </p>
          </div>
        ) : (
          stages.map((group) => (
            <div key={group.stageName} className="mb-10">
              <div
                className="flex items-center justify-between mb-4 pb-3"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-1 h-5 rounded-full shrink-0" style={{ background: 'var(--accent)' }} />
                  <h2 className="font-bold text-base">{group.stageName}</h2>
                  {group.stageDate && (
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {new Date(group.stageDate).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </span>
                  )}
                </div>
                {tournament.liquipedia_url && (
                  <a
                    href={tournament.liquipedia_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs transition-colors hover:text-white"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Liquipedia ↗
                  </a>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.matches.map((match) => (
                  <MatchCard key={match.id} match={match} tournament={tournament} />
                ))}
              </div>
            </div>
          ))
        )
      )}

      {/* Bracket tab */}
      {tab === 'bracket' && (
        <BracketView rounds={stages} />
      )}
    </>
  )
}
