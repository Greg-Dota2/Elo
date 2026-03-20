'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Tournament, MatchPrediction, Team, Stage } from '@/lib/types'
import Link from 'next/link'

interface Props {
  params: Promise<{ id: string }>
}

export default function EditTournamentPage({ params }: Props) {
  const router = useRouter()
  const [tournamentId, setTournamentId] = useState('')
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [matches, setMatches] = useState<(MatchPrediction & { team_1: Team; team_2: Team })[]>([])
  const [stages, setStages] = useState<Stage[]>([])
  const [leagueId, setLeagueId] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<string>('')
  const [deleting, setDeleting] = useState(false)
  // New stage form
  const [newStageName, setNewStageName] = useState('')
  const [newStageOrder, setNewStageOrder] = useState('')
  const [addingStage, setAddingStage] = useState(false)

  async function loadMatches(id: string) {
    const res = await fetch(`/api/admin/data?resource=matches&tournament_id=${id}`)
    const data = await res.json()
    setMatches(data as (MatchPrediction & { team_1: Team; team_2: Team })[])
  }

  async function loadStages(id: string) {
    const res = await fetch(`/api/admin/data?resource=stages&tournament_id=${id}`)
    const data = await res.json()
    setStages(data as Stage[])
  }

  useEffect(() => {
    params.then(async ({ id }) => {
      setTournamentId(id)
      const tRes = await fetch(`/api/admin/data?resource=tournament&id=${id}`)
      const t = await tRes.json()
      if (t) {
        setTournament(t as Tournament)
        setLeagueId(String(t.opendota_league_id ?? ''))
      }
      await Promise.all([loadMatches(id), loadStages(id)])
    })
  }, [params])

  async function handleImport() {
    if (!leagueId || !tournamentId) return
    setImporting(true)
    setImportResult('')
    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tournament_id: tournamentId, league_id: Number(leagueId) }),
    })
    const data = await res.json()
    if (res.ok) {
      setImportResult(`✓ Done — ${data.created} series imported, ${data.skipped} skipped, ${data.teams_found} teams found.`)
      await loadMatches(tournamentId)
    } else {
      setImportResult(`✗ Error: ${data.error}`)
    }
    setImporting(false)
  }

  async function togglePublish(matchId: string, current: boolean) {
    await fetch('/api/admin/matches', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: matchId, is_published: !current }),
    })
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, is_published: !current } : m))
  }

  async function clearResult(matchId: string) {
    if (!confirm('Clear the result for this match? This resets score, winner and correct/wrong status.')) return
    await fetch('/api/admin/matches', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: matchId, score_team_1: null, score_team_2: null, actual_winner_id: null, is_correct: null }),
    })
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, score_team_1: null, score_team_2: null, actual_winner_id: null, is_correct: null } : m))
  }

  async function assignStage(matchId: string, stageId: string | null) {
    await fetch('/api/admin/matches', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: matchId, stage_id: stageId || null }),
    })
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, stage_id: stageId || null } : m))
  }

  async function handleAddStage() {
    if (!newStageName.trim()) return
    setAddingStage(true)
    const res = await fetch('/api/admin/stages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tournament_id: tournamentId,
        name: newStageName.trim(),
        stage_order: Number(newStageOrder) || stages.length + 1,
      }),
    })
    if (res.ok) {
      setNewStageName('')
      setNewStageOrder('')
      await loadStages(tournamentId)
    }
    setAddingStage(false)
  }

  async function deleteStage(stageId: string) {
    if (!confirm('Delete this stage? Matches assigned to it will become unassigned.')) return
    await fetch('/api/admin/stages', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: stageId }),
    })
    setStages(prev => prev.filter(s => s.id !== stageId))
  }

  async function deleteMatch(matchId: string) {
    if (!confirm('Delete this match permanently?')) return
    await fetch('/api/admin/matches', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: matchId }),
    })
    setMatches(prev => prev.filter(m => m.id !== matchId))
  }

  async function handleDeleteTournament() {
    if (!confirm(`Delete "${tournament?.name}" and ALL its matches? This cannot be undone.`)) return
    setDeleting(true)
    const res = await fetch('/api/admin/tournaments', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tournamentId }),
    })
    if (res.ok) {
      router.push('/admin')
    } else {
      const data = await res.json()
      alert(`Error: ${data.error}`)
      setDeleting(false)
    }
  }

  async function handleSaveSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setSaveResult('')
    const form = new FormData(e.currentTarget)
    const res = await fetch('/api/admin/tournaments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: tournamentId,
        name: form.get('name') || tournament?.name,
        is_published: form.get('is_published') === 'on',
        start_date: form.get('start_date') || null,
        end_date: form.get('end_date') || null,
        logo_url: form.get('logo_url') || null,
        banner_url: form.get('banner_url') || null,
        telegram_url: form.get('telegram_url') || null,
        liquipedia_url: form.get('liquipedia_url') || null,
        overview: form.get('overview') || null,
        format: form.get('format') || null,
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      setSaveResult(`✗ Error: ${data.error}`)
    } else {
      setTournament(data)
      setSaveResult('✓ Saved')
    }
  }

  if (!tournament) return <p style={{ color: 'var(--text-muted)' }}>Loading...</p>

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/admin" className="text-sm" style={{ color: 'var(--text-muted)' }}>← Admin</Link>
        <span style={{ color: 'var(--text-muted)' }}>/</span>
        <span className="text-sm">{tournament.name}</span>
      </div>

      <h1 className="text-2xl font-bold mb-6">{tournament.name}</h1>

      {/* ── OpenDota Import ── */}
      <div className="rounded-lg p-5 mb-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h2 className="font-semibold mb-1">Import from OpenDota</h2>
        <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
          Pastes match results and teams automatically. You still write the prediction text manually.
        </p>
        <div className="flex gap-2">
          <input
            value={leagueId}
            onChange={e => setLeagueId(e.target.value)}
            placeholder="OpenDota league ID (e.g. 19435)"
            className="flex-1 rounded px-3 py-2 text-sm"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
          <button
            onClick={handleImport}
            disabled={importing || !leagueId}
            className="px-4 py-2 rounded font-semibold text-sm disabled:opacity-50"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            {importing ? 'Importing...' : 'Import'}
          </button>
        </div>
        {importResult && (
          <p className="mt-2 text-sm" style={{ color: importResult.startsWith('✓') ? 'var(--correct)' : 'var(--wrong)' }}>
            {importResult}
          </p>
        )}
        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
          PGL Wallachia S7 = 19435 · DreamLeague S28 = 19269 · TI 2025 = 18324
        </p>
      </div>

      {/* ── Bracket Stages ── */}
      <div className="rounded-lg p-5 mb-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h2 className="font-semibold mb-1">Bracket Stages</h2>
        <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
          Create stages, then assign each match to one. Use names like <strong>UB Quarterfinals</strong>, <strong>Lower Bracket Semifinals</strong>, <strong>Grand Final</strong>.
        </p>

        {/* Existing stages */}
        {stages.length > 0 && (
          <div className="grid gap-1.5 mb-3">
            {stages.map(s => (
              <div key={s.id} className="flex items-center gap-3 rounded px-3 py-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <span className="text-xs font-mono text-muted-foreground w-6 shrink-0">{s.stage_order}</span>
                <span className="text-sm flex-1">{s.name}</span>
                <button onClick={() => deleteStage(s.id)} className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add stage form */}
        <div className="flex gap-2">
          <input
            value={newStageName}
            onChange={e => setNewStageName(e.target.value)}
            placeholder="Stage name (e.g. UB Quarterfinals)"
            className="flex-1 rounded px-3 py-2 text-sm"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
            onKeyDown={e => e.key === 'Enter' && handleAddStage()}
          />
          <input
            value={newStageOrder}
            onChange={e => setNewStageOrder(e.target.value)}
            placeholder="Order"
            type="number"
            className="w-20 rounded px-3 py-2 text-sm"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
          <button
            onClick={handleAddStage}
            disabled={addingStage || !newStageName.trim()}
            className="px-4 py-2 rounded font-semibold text-sm disabled:opacity-50"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            {addingStage ? '...' : '+ Add'}
          </button>
        </div>
      </div>

      {/* ── Matches list ── */}
      {matches.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Matches ({matches.length})</h2>
            <Link
              href={`/admin/matches/new?tournament=${tournamentId}`}
              className="text-sm px-3 py-1 rounded"
              style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              + Add manually
            </Link>
          </div>
          <div className="grid gap-2">
            {matches.map((m) => {
              const hasAnalysis = !!m.pre_analysis
              const hasResult = m.score_team_1 !== null
              return (
                <div key={m.id} className="rounded px-4 py-2.5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {m.team_1?.name} vs {m.team_2?.name}
                      </div>
                      <div className="text-xs flex items-center gap-2 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        <span>{m.match_date}</span>
                        <span>BO{m.best_of}</span>
                        {hasResult && <span style={{ color: 'var(--correct)' }}>{m.score_team_1}–{m.score_team_2}</span>}
                      </div>
                    </div>

                    {/* Stage selector */}
                    <select
                      value={m.stage_id ?? ''}
                      onChange={e => assignStage(m.id, e.target.value)}
                      className="text-xs rounded px-2 py-1 shrink-0"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', maxWidth: 160 }}
                    >
                      <option value="">— No stage —</option>
                      {stages.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>

                    {/* Status indicators */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: hasAnalysis ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)', color: hasAnalysis ? 'var(--correct)' : 'var(--text-muted)' }}>
                        {hasAnalysis ? '✓ analysis' : '— analysis'}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: hasResult ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)', color: hasResult ? 'var(--correct)' : 'var(--text-muted)' }}>
                        {hasResult ? '✓ result' : '— result'}
                      </span>
                    </div>

                    <div className="flex gap-1 shrink-0">
                      <Link href={`/admin/matches/${m.id}/analysis`} className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(232,77,28,0.15)', color: 'var(--accent)' }}>
                        {hasAnalysis ? 'Edit' : 'Write'}
                      </Link>
                      <Link href={`/admin/matches/${m.id}/result`} className="text-xs px-2 py-1 rounded" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                        Result
                      </Link>
                      {hasResult && (
                        <button
                          onClick={() => clearResult(m.id)}
                          className="text-xs px-2 py-1 rounded"
                          style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
                        >
                          Clear result
                        </button>
                      )}
                      <button
                        onClick={() => togglePublish(m.id, m.is_published)}
                        className="text-xs px-2 py-1 rounded"
                        style={{ background: m.is_published ? 'rgba(34,197,94,0.1)' : 'var(--surface-2)', color: m.is_published ? 'var(--correct)' : 'var(--text-muted)' }}
                      >
                        {m.is_published ? 'Published' : 'Publish'}
                      </button>
                      <button
                        onClick={() => deleteMatch(m.id)}
                        className="text-xs px-2 py-1 rounded"
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                      >
                        Del
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Tournament Settings ── */}
      <div className="rounded-lg p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h2 className="font-semibold mb-4">Tournament Settings</h2>
        <form key={tournament.name} onSubmit={handleSaveSettings} className="grid gap-4">
          <Field label="Tournament name">
            <input name="name" type="text" defaultValue={tournament.name} className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date">
              <input name="start_date" type="date" defaultValue={tournament.start_date ?? ''} className={inputClass} />
            </Field>
            <Field label="End date">
              <input name="end_date" type="date" defaultValue={tournament.end_date ?? ''} className={inputClass} />
            </Field>
          </div>
          <Field label="Overview text">
            <textarea name="overview" rows={3} defaultValue={tournament.overview ?? ''} className={inputClass} />
          </Field>
          <Field label="Format text">
            <textarea name="format" rows={3} defaultValue={tournament.format ?? ''} className={inputClass} />
          </Field>
          <Field label="Logo URL">
            <input name="logo_url" type="url" defaultValue={tournament.logo_url ?? ''} className={inputClass} placeholder="https://cdn.pandascore.co/images/tournament/image/..." />
          </Field>
          <Field label="Banner URL">
            <input name="banner_url" type="url" defaultValue={tournament.banner_url ?? ''} className={inputClass} placeholder="https://... wide banner image" />
          </Field>
          <Field label="Telegram URL">
            <input name="telegram_url" type="url" defaultValue={tournament.telegram_url ?? ''} className={inputClass} />
          </Field>
          <Field label="Liquipedia URL">
            <input name="liquipedia_url" type="url" defaultValue={tournament.liquipedia_url ?? ''} className={inputClass} />
          </Field>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input name="is_published" type="checkbox" defaultChecked={tournament.is_published} className="w-4 h-4" />
            <span>Published</span>
          </label>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="px-4 py-2 rounded font-semibold text-sm w-fit disabled:opacity-50" style={{ background: 'var(--accent)', color: '#fff' }}>
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            {saveResult && (
              <span className="text-sm font-medium" style={{ color: saveResult.startsWith('✓') ? 'var(--correct)' : 'var(--wrong)' }}>
                {saveResult}
              </span>
            )}
          </div>
        </form>
      </div>

      {/* ── Danger Zone ── */}
      <div className="rounded-lg p-5 mt-6" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.25)' }}>
        <h2 className="font-semibold mb-4 text-red-400">Danger Zone</h2>
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Clear all results</p>
            <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
              Resets scores, winners and correct/wrong for every match in this tournament. The cron job will re-fill them from PandaScore once matches are played.
            </p>
            <button
              onClick={async () => {
                if (!confirm(`Clear all results for "${tournament.name}"?`)) return
                const res = await fetch('/api/admin/results/clear', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ tournament_id: tournamentId }),
                })
                if (res.ok) {
                  setMatches(prev => prev.map(m => ({ ...m, score_team_1: null, score_team_2: null, actual_winner_id: null, is_correct: null })))
                  alert('Results cleared.')
                }
              }}
              className="px-4 py-2 rounded font-semibold text-sm"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              Clear results for &quot;{tournament.name}&quot;
            </button>
          </div>
          <hr style={{ borderColor: 'rgba(239,68,68,0.2)' }} />
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Delete tournament</p>
            <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
              Permanently deletes this tournament and all its matches. Cannot be undone.
            </p>
            <button
              onClick={handleDeleteTournament}
              disabled={deleting}
              className="px-4 py-2 rounded font-semibold text-sm disabled:opacity-50"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              {deleting ? 'Deleting...' : `Delete "${tournament.name}"`}
            </button>
          </div>
        </div>
      </div>
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
  + ' bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)]'
  + ' placeholder:text-[var(--text-muted)]'
