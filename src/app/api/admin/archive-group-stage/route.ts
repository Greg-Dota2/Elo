import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  fetchTournamentStandings,
  fetchMatchesForSubTournament,
  fetchSubTournamentsForSerie,
  fetchRecentTier1Matches,
  type PSTeam,
} from '@/lib/pandascore'
import type { GroupData } from '@/components/GroupStageView'
import { TIER1_TOURNAMENTS } from '@/lib/tier1tournaments'

async function buildGroupData(subId: number, subName: string): Promise<GroupData | null> {
  const [standings, allMatches] = await Promise.all([
    fetchTournamentStandings(subId).catch(() => []),
    fetchMatchesForSubTournament(subId).catch(() => []),
  ])

  if (allMatches.length === 0) return null

  // Compute standings from finished matches as fallback
  const record = new Map<number, { team: PSTeam; wins: number; draws: number; losses: number }>()
  const ensure = (team: PSTeam) => {
    if (!record.has(team.id)) record.set(team.id, { team, wins: 0, draws: 0, losses: 0 })
  }
  for (const m of allMatches) {
    if (m.status !== 'finished' || m.results.length < 2) continue
    const [r1, r2] = m.results
    const t1 = m.opponents.find(o => o.opponent.id === r1.team_id)?.opponent
    const t2 = m.opponents.find(o => o.opponent.id === r2.team_id)?.opponent
    if (!t1 || !t2) continue
    ensure(t1); ensure(t2)
    if (r1.score > r2.score) { record.get(t1.id)!.wins++; record.get(t2.id)!.losses++ }
    else if (r2.score > r1.score) { record.get(t2.id)!.wins++; record.get(t1.id)!.losses++ }
    else { record.get(t1.id)!.draws++; record.get(t2.id)!.draws++ }
  }
  const computedStandings = Array.from(record.values())
    .sort((a, b) => (b.wins * 3 + b.draws) - (a.wins * 3 + a.draws))
    .map((r, i) => ({ rank: i + 1, team: r.team, wins: r.wins, draws: r.draws, losses: r.losses, total: r.wins + r.draws + r.losses }))

  const apiHasData = standings.length > 1 && standings.some(s => s.wins > 0 || s.losses > 0)
  const derivedStandings = apiHasData ? standings
    : computedStandings.length > 1 ? computedStandings
    : (() => {
      const seen = new Map<number, PSTeam>()
      for (const m of allMatches) {
        for (const opp of m.opponents) {
          if (!seen.has(opp.opponent.id)) seen.set(opp.opponent.id, opp.opponent)
        }
      }
      return Array.from(seen.values()).map((team, i) => ({ rank: i + 1, team, wins: 0, draws: 0, losses: 0, total: 0 }))
    })()

  if (derivedStandings.length < 2) return null

  return { id: subId, name: subName, standings: derivedStandings, matches: allMatches }
}

export async function POST(req: NextRequest) {
  const { tournament_id } = await req.json()
  if (!tournament_id) return NextResponse.json({ error: 'tournament_id required' }, { status: 400 })

  const supabase = createAdminClient()

  const { data: tournament, error: tErr } = await supabase
    .from('tournaments')
    .select('id, slug, name')
    .eq('id', tournament_id)
    .single()
  if (tErr || !tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })

  const tier1Entry = TIER1_TOURNAMENTS.find(t => t.slug === tournament.slug) as
    | (typeof TIER1_TOURNAMENTS[0] & { ps_serie_id?: number; ps_group_stage_id?: number; ps_playoff_id?: number })
    | undefined

  let groups: GroupData[] = []

  if (tier1Entry && 'ps_serie_id' in tier1Entry && tier1Entry.ps_serie_id) {
    // Use series → sub-tournaments
    const subTournaments = await fetchSubTournamentsForSerie(tier1Entry.ps_serie_id)
    const results = await Promise.all(
      subTournaments.map(sub => buildGroupData(sub.id, sub.name))
    )
    groups = results.filter((g): g is GroupData => g !== null)
  } else {
    // Fallback: get recent matches, filter by slug, group by sub-tournament
    const recent = await fetchRecentTier1Matches(200).catch(() => [])
    const filtered = recent.filter(m => {
      if (tier1Entry && 'ps_serie_id' in tier1Entry && tier1Entry.ps_serie_id) {
        return m.serie.id === tier1Entry.ps_serie_id
      }
      const psSlug = `${m.league.name}-${m.serie.full_name}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      return psSlug === tournament.slug
    })

    const byGroup: Record<string, { id: number; name: string }> = {}
    for (const m of filtered) {
      const key = String(m.tournament.id)
      if (!byGroup[key]) byGroup[key] = { id: m.tournament.id, name: m.tournament.name }
    }

    const results = await Promise.all(
      Object.values(byGroup).map(sub => buildGroupData(sub.id, sub.name))
    )
    groups = results.filter((g): g is GroupData => g !== null)
  }

  if (groups.length === 0) {
    return NextResponse.json({ error: 'No group data found on PandaScore for this tournament' }, { status: 422 })
  }

  const { error: updateErr } = await supabase
    .from('tournaments')
    .update({ group_stage_data: groups })
    .eq('id', tournament_id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  revalidatePath(`/tournaments/${tournament.slug}`)

  return NextResponse.json({ ok: true, groups_count: groups.length, group_names: groups.map(g => g.name) })
}

export async function DELETE(req: NextRequest) {
  const { tournament_id } = await req.json()
  if (!tournament_id) return NextResponse.json({ error: 'tournament_id required' }, { status: 400 })

  const supabase = createAdminClient()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('slug')
    .eq('id', tournament_id)
    .single()

  const { error } = await supabase
    .from('tournaments')
    .update({ group_stage_data: null })
    .eq('id', tournament_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (tournament) revalidatePath(`/tournaments/${tournament.slug}`)

  return NextResponse.json({ ok: true })
}
