'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { MatchPrediction } from '@/lib/types'

interface Props {
  params: Promise<{ id: string }>
}

export default function RecordResultPage({ params }: Props) {
  const router = useRouter()
  const [match, setMatch] = useState<MatchPrediction | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [matchId, setMatchId] = useState('')

  useEffect(() => {
    params.then(async ({ id }) => {
      setMatchId(id)
      const res = await fetch(`/api/admin/data?resource=match&id=${id}`)
      setMatch(await res.json())
    })
  }, [params])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = new FormData(e.currentTarget)
    const score1 = Number(form.get('score_team_1'))
    const score2 = Number(form.get('score_team_2'))

    // Draw (e.g. 1-1 in BO2) → no winner
    const isDraw = score1 === score2
    const actualWinnerId = isDraw
      ? null
      : score1 > score2 ? match?.team_1_id : match?.team_2_id

    const res = await fetch('/api/admin/matches', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: matchId,
        score_team_1: score1,
        score_team_2: score2,
        actual_winner_id: actualWinnerId ?? null,
        predicted_winner_id: match?.predicted_winner_id,
        predicted_draw: match?.predicted_draw ?? false,
        post_commentary: form.get('post_commentary') || null,
      }),
    })

    if (!res.ok) {
      const d = await res.json()
      setError(d.error)
      setLoading(false)
      return
    }

    router.push('/admin')
    router.refresh()
  }

  if (!match) {
    return <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-2">Record Result</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        {match.team_1?.name} vs {match.team_2?.name}
      </p>

      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label={`${match.team_1?.name} score`}>
            <input
              name="score_team_1"
              type="number"
              min="0"
              max={match.best_of}
              required
              className={inputClass}
              defaultValue={match.score_team_1 ?? ''}
              placeholder="0"
            />
          </Field>
          <Field label={`${match.team_2?.name} score`}>
            <input
              name="score_team_2"
              type="number"
              min="0"
              max={match.best_of}
              required
              className={inputClass}
              defaultValue={match.score_team_2 ?? ''}
              placeholder="0"
            />
          </Field>
        </div>

        <Field label="Post-match Commentary">
          <textarea
            name="post_commentary"
            rows={5}
            className={inputClass}
            defaultValue={match.post_commentary ?? ''}
            placeholder="Oh my God, this best-of-three is probably THE LONGEST in a while..."
          />
        </Field>

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
            {loading ? 'Saving...' : 'Save Result'}
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
      <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputClass =
  'w-full rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-orange-500'
  + ' bg-[var(--surface)] border border-[var(--border)] text-[var(--text)]'
  + ' placeholder:text-[var(--text-muted)]'
