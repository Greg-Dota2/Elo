'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { MatchPrediction } from '@/lib/types'
import MentionTextarea from '@/components/MentionTextarea'

interface Props {
  params: Promise<{ id: string }>
}

export default function RecordResultPage({ params }: Props) {
  const router = useRouter()
  const [match, setMatch] = useState<MatchPrediction | null>(null)
  const [status, setStatus] = useState<'idle' | 'saving' | 'translating'>('idle')
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
    setStatus('saving')
    setError('')

    const form = new FormData(e.currentTarget)
    const score1 = Number(form.get('score_team_1'))
    const score2 = Number(form.get('score_team_2'))
    const commentary = (form.get('post_commentary') as string | null) || null

    // Draw (e.g. 1-1 in BO2) → no winner
    const isDraw = score1 === score2
    const actualWinnerId = isDraw
      ? null
      : score1 > score2 ? match?.team_1_id : match?.team_2_id

    // Collect Dotabuff game IDs — accept full URL or bare ID
    const gameIds: number[] = []
    for (let i = 1; i <= (match?.best_of ?? 1); i++) {
      const raw = (form.get(`dotabuff_${i}`) as string ?? '').trim()
      if (!raw) continue
      const match_ = raw.match(/(\d{10,})/)
      if (match_) gameIds.push(Number(match_[1]))
    }

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
        post_commentary: commentary,
        dotabuff_game_ids: gameIds.length > 0 ? gameIds : null,
      }),
    })

    if (!res.ok) {
      const d = await res.json()
      setError(d.error)
      setStatus('idle')
      return
    }

    if (commentary) {
      setStatus('translating')
      await fetch('/api/admin/guides/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'match', match_id: matchId, commentary }),
      })
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

        {/* Dotabuff game IDs */}
        <div className="grid gap-2">
          <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
            Dotabuff Game IDs
            <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-subtle)' }}>
              paste URL or bare ID — leave blank to skip
            </span>
          </label>
          {Array.from({ length: match.best_of }, (_, i) => (
            <div key={i} className="flex items-center gap-2">
              <span
                className="shrink-0 w-16 text-center text-[10px] font-black rounded px-2 py-1"
                style={{ background: '#c23c2a', color: '#fff' }}
              >
                Game {i + 1}
              </span>
              <input
                name={`dotabuff_${i + 1}`}
                type="text"
                className={inputClass}
                defaultValue={match.dotabuff_game_ids?.[i] ?? ''}
                placeholder={`https://www.dotabuff.com/matches/…`}
              />
            </div>
          ))}
        </div>

        <Field label="Post-match Commentary">
          <MentionTextarea
            name="post_commentary"
            rows={5}
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
            disabled={status !== 'idle'}
            className="px-5 py-2 rounded font-semibold text-sm disabled:opacity-50"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            {status === 'saving' ? 'Saving...' : status === 'translating' ? 'Translating to RU...' : 'Save Result'}
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
