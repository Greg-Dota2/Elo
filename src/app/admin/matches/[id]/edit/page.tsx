'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { MatchPrediction, Team, Stage } from '@/lib/types'

function athensToUTC(dateStr: string, athensTime: string): string {
  const probe = new Date(`${dateStr}T12:00:00Z`)
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Europe/Athens', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(probe)
  const athensHour = parseInt(parts.find(p => p.type === 'hour')!.value)
  const offset = athensHour - 12
  const [h, m] = athensTime.split(':').map(Number)
  const utcH = ((h - offset) % 24 + 24) % 24
  return `${String(utcH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function utcToAthens(dateStr: string, utcTime: string): string {
  const probe = new Date(`${dateStr}T${utcTime}:00Z`)
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Europe/Athens', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(probe)
  const h = parts.find(p => p.type === 'hour')?.value ?? '00'
  const min = parts.find(p => p.type === 'minute')?.value ?? '00'
  return `${h}:${min}`
}

interface Props {
  params: Promise<{ id: string }>
}

export default function EditMatchPage({ params }: Props) {
  const router = useRouter()
  const [matchId, setMatchId] = useState('')
  const [match, setMatch] = useState<MatchPrediction & { team_1?: Team; team_2?: Team } | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [stages, setStages] = useState<Stage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    params.then(async ({ id }) => {
      setMatchId(id)
      const matchRes = await fetch(`/api/admin/data?resource=match&id=${id}`)
      const matchData = await matchRes.json()

      // Load teams + stages before setting match so defaultValues render correctly
      const [teamsRes, stagesRes] = await Promise.all([
        fetch('/api/admin/data?resource=teams'),
        fetch(`/api/admin/data?resource=stages&tournament_id=${matchData.tournament_id}`),
      ])
      setTeams(await teamsRes.json())
      setStages(await stagesRes.json())
      setMatch(matchData)
    })
  }, [params])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = new FormData(e.currentTarget)
    const matchDate = (form.get('match_date') as string) || null
    const athensTime = (form.get('match_time') as string) || null
    const matchTime = matchDate && athensTime ? athensToUTC(matchDate, athensTime) : null

    const res = await fetch('/api/admin/matches', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: matchId,
        team_1_id: form.get('team_1_id'),
        team_2_id: form.get('team_2_id'),
        best_of: Number(form.get('best_of')),
        match_date: matchDate,
        match_time: matchTime,
        match_order: Number(form.get('match_order')) || null,
        stage_id: (form.get('stage_id') as string) || null,
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

  const athensTime = match.match_date && match.match_time
    ? utcToAthens(match.match_date, match.match_time)
    : ''

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">Edit Match</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        Change teams, date, time, BO or stage assignment.
      </p>

      <form onSubmit={handleSubmit} className="grid gap-4">
        {/* Teams */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Team 1 *">
            <select name="team_1_id" required className={inputClass} defaultValue={match.team_1_id ?? ''}>
              <option value="">Select team</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Team 2 *">
            <select name="team_2_id" required className={inputClass} defaultValue={match.team_2_id ?? ''}>
              <option value="">Select team</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </Field>
        </div>

        {/* Date / Time / BO / Order */}
        <div className="grid grid-cols-4 gap-3">
          <Field label="Match Date">
            <input name="match_date" type="date" className={inputClass} defaultValue={match.match_date ?? ''} />
          </Field>
          <Field label="Match Time (Athens)">
            <input name="match_time" type="time" className={inputClass} defaultValue={athensTime} />
          </Field>
          <Field label="Best Of">
            <select name="best_of" className={inputClass} defaultValue={String(match.best_of ?? 3)}>
              <option value="1">BO1</option>
              <option value="2">BO2</option>
              <option value="3">BO3</option>
              <option value="5">BO5</option>
            </select>
          </Field>
          <Field label="Order">
            <input name="match_order" type="number" className={inputClass} defaultValue={match.match_order ?? ''} placeholder="1" />
          </Field>
        </div>

        {/* Stage */}
        <Field label="Stage / Group">
          <select name="stage_id" className={inputClass} defaultValue={match.stage_id ?? ''}>
            <option value="">— No stage —</option>
            {stages.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
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
            {loading ? 'Saving...' : 'Save Changes'}
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
