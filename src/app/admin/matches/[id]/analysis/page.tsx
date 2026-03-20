'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { MatchPrediction, Team } from '@/lib/types'

interface Props {
  params: Promise<{ id: string }>
}

export default function WriteAnalysisPage({ params }: Props) {
  const router = useRouter()
  const [match, setMatch] = useState<MatchPrediction & { team_1?: Team; team_2?: Team } | null>(null)
  const [matchId, setMatchId] = useState('')
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    params.then(async ({ id }) => {
      setMatchId(id)
      const [matchRes, teamsRes] = await Promise.all([
        fetch(`/api/admin/data?resource=match&id=${id}`),
        fetch('/api/admin/data?resource=teams'),
      ])
      setMatch(await matchRes.json())
      setTeams(await teamsRes.json())
    })
  }, [params])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = new FormData(e.currentTarget)
    const pickValue = form.get('predicted_winner_id') as string

    // "draw" is a special value — no predicted winner, mark as predicted_draw
    const predictedWinnerId = pickValue === 'draw' ? null : (pickValue || null)
    const predictedDraw = pickValue === 'draw'

    const res = await fetch('/api/admin/matches', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: matchId,
        pre_analysis: form.get('pre_analysis') || null,
        twitch_url: form.get('twitch_url') || null,
        predicted_winner_id: predictedWinnerId,
        predicted_draw: predictedDraw,
        is_published: form.get('is_published') === 'on',
      }),
    })

    if (!res.ok) {
      const d = await res.json()
      setError(d.error)
      setLoading(false)
      return
    }

    router.back()
  }

  if (!match) return <p style={{ color: 'var(--text-muted)' }}>Loading...</p>

  const team1 = match.team_1
  const team2 = match.team_2
  const picksAvailable = [team1, team2].filter(Boolean) as Team[]

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">Write Prediction</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        {team1?.name} vs {team2?.name} · BO{match.best_of} · {match.match_date}
        {match.score_team_1 !== null && (
          <span style={{ color: 'var(--correct)' }}>
            {' '}(result: {match.score_team_1}–{match.score_team_2})
          </span>
        )}
      </p>

      <form onSubmit={handleSubmit} className="grid gap-4">
        <Field label="My Pick">
          <select
            name="predicted_winner_id"
            className={inputClass}
            defaultValue={match.predicted_winner_id ?? ''}
          >
            <option value="">— No pick —</option>
            {picksAvailable.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
            {match.best_of === 2 && (
              <option value="draw">Draw (1-1)</option>
            )}
          </select>
        </Field>

        <Field label="Twitch VOD / Stream URL">
          <input name="twitch_url" type="url" className={inputClass} defaultValue={match.twitch_url ?? ''} placeholder="https://www.twitch.tv/videos/2345678901?t=1h30m0s" />
          <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>
            For VODs: pause at match start → Share → &quot;Copy URL at current time&quot;. For live: paste channel URL.
          </p>
        </Field>

        <Field label="Pre-match Analysis *">
          <textarea
            name="pre_analysis"
            rows={8}
            required
            className={inputClass}
            defaultValue={match.pre_analysis ?? ''}
            placeholder={`After everything we saw, ${team1?.name ?? 'Team 1'} looks like the stronger side here...`}
          />
        </Field>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            name="is_published"
            type="checkbox"
            defaultChecked={match.is_published}
            className="w-4 h-4"
          />
          <span>Published (visible on site)</span>
        </label>

        {error && (
          <p className="text-sm" style={{ color: 'var(--wrong)' }}>{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded font-semibold text-sm disabled:opacity-50"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            {loading ? 'Saving...' : 'Save Prediction'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2 rounded text-sm"
            style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{label}</label>
      {children}
    </div>
  )
}

const inputClass =
  'w-full rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-orange-500'
  + ' bg-[var(--surface)] border border-[var(--border)] text-[var(--text)]'
  + ' placeholder:text-[var(--text-muted)]'
