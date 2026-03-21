import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchUpcomingTier1Matches } from '@/lib/pandascore'
import { TIER1_TOURNAMENTS } from '@/lib/tier1tournaments'

// Called by cron every 6 hours.
// Syncs upcoming matches and updates Twitch stream URLs.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // ── 1. Fetch everything in parallel upfront ──────────────────────────────
  let matches
  try {
    matches = await fetchUpcomingTier1Matches(100)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 })
  }

  const [{ data: dbTeams }, { data: dbTournaments }, { data: dbPredictions }] = await Promise.all([
    supabase.from('teams').select('id, pandascore_team_id, name'),
    supabase.from('tournaments').select('id, slug'),
    supabase.from('match_predictions').select('id, pandascore_match_id, twitch_url, match_time'),
  ])

  // Build lookup maps
  const teamByPsId = new Map((dbTeams ?? []).filter(t => t.pandascore_team_id).map(t => [t.pandascore_team_id, t.id]))
  const teamByName = new Map((dbTeams ?? []).map(t => [t.name.toLowerCase(), t.id]))
  const tournamentBySlug = new Map((dbTournaments ?? []).map(t => [t.slug, t.id]))
  const predictionByPsId = new Map((dbPredictions ?? []).map(p => [String(p.pandascore_match_id), p]))

  // ── 2. Process matches — resolve teams/tournaments, upsert only what's needed ──
  const toInsert: Record<string, unknown>[] = []
  const toUpdate: { id: string; updates: Record<string, string> }[] = []
  const log: string[] = []
  let skipped = 0

  // New teams/tournaments may need to be created — collect and insert before processing predictions
  const newTeams: Record<string, unknown>[] = []
  const newTournaments: Record<string, unknown>[] = []

  for (const match of matches) {
    if (match.opponents.length !== 2) { skipped++; continue }
    const [opp1, opp2] = match.opponents.map((o) => o.opponent)
    if (!opp1?.id || !opp2?.id) { skipped++; continue }

    // Resolve team 1
    if (!teamByPsId.has(opp1.id)) {
      const byName = teamByName.get(opp1.name.toLowerCase())
      if (byName) {
        teamByPsId.set(opp1.id, byName)
      } else {
        newTeams.push({ name: opp1.name, short_name: opp1.acronym || null, logo_url: opp1.image_url || null, pandascore_team_id: opp1.id, is_active: true })
      }
    }

    // Resolve team 2
    if (!teamByPsId.has(opp2.id)) {
      const byName = teamByName.get(opp2.name.toLowerCase())
      if (byName) {
        teamByPsId.set(opp2.id, byName)
      } else {
        newTeams.push({ name: opp2.name, short_name: opp2.acronym || null, logo_url: opp2.image_url || null, pandascore_team_id: opp2.id, is_active: true })
      }
    }

    // Resolve tournament
    const tournamentName = `${match.league.name} ${match.serie.full_name}`
    const slug = `${match.league.name}-${match.serie.full_name}`
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    if (!tournamentBySlug.has(slug)) {
      const known = TIER1_TOURNAMENTS.find(t => t.league_id === match.league.id)
      newTournaments.push({
        name: tournamentName,
        slug,
        tier: 1,
        logo_url: null,
        is_published: false,
        ...(known ? { start_date: known.start_date, end_date: known.end_date } : {}),
      })
    }
  }

  // ── 3. Batch-insert new teams and tournaments ────────────────────────────
  const dedupedNewTeams = newTeams.filter((t, i, arr) =>
    arr.findIndex(x => x.pandascore_team_id === t.pandascore_team_id) === i
  )
  if (dedupedNewTeams.length) {
    const { data: inserted } = await supabase.from('teams').insert(dedupedNewTeams).select('id, pandascore_team_id, name')
    for (const t of inserted ?? []) {
      if (t.pandascore_team_id) teamByPsId.set(t.pandascore_team_id, t.id)
      teamByName.set(t.name.toLowerCase(), t.id)
    }
  }

  const dedupedNewTournaments = newTournaments.filter((t, i, arr) =>
    arr.findIndex(x => x.slug === t.slug) === i
  )
  if (dedupedNewTournaments.length) {
    const { data: inserted } = await supabase.from('tournaments').insert(dedupedNewTournaments).select('id, slug')
    for (const t of inserted ?? []) tournamentBySlug.set(t.slug, t.id)
  }

  // Also patch existing teams that were matched by name but missing pandascore_team_id
  const namePatchPromises: PromiseLike<unknown>[] = []
  for (const match of matches) {
    for (const o of match.opponents.map(op => op.opponent)) {
      if (!o?.id) continue
      const byName = teamByName.get(o.name.toLowerCase())
      if (byName && !teamByPsId.has(o.id)) {
        teamByPsId.set(o.id, byName)
        namePatchPromises.push(supabase.from('teams').update({ pandascore_team_id: o.id }).eq('id', byName).then())
      }
    }
  }
  await Promise.all(namePatchPromises)

  // ── 4. Build inserts / updates for predictions ───────────────────────────
  for (const match of matches) {
    if (match.opponents.length !== 2) continue
    const [opp1, opp2] = match.opponents.map((o) => o.opponent)
    if (!opp1?.id || !opp2?.id) continue

    const team1DbId = teamByPsId.get(opp1.id)
    const team2DbId = teamByPsId.get(opp2.id)
    if (!team1DbId || !team2DbId) { skipped++; continue }

    const slug = `${match.league.name}-${match.serie.full_name}`
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const tournamentDbId = tournamentBySlug.get(slug)
    if (!tournamentDbId) { skipped++; continue }

    const stream =
      match.streams_list.find((s) => s.main && s.official && s.language === 'en')?.raw_url ??
      match.streams_list.find((s) => s.main)?.raw_url ??
      match.streams_list[0]?.raw_url ??
      null

    const matchDate = match.begin_at ?? match.scheduled_at
    const matchDateStr = matchDate ? matchDate.split('T')[0] : null
    const matchTimeStr = matchDate ? matchDate.split('T')[1]?.slice(0, 5) : null

    const existing = predictionByPsId.get(String(match.id))
    if (existing) {
      const updates: Record<string, string> = {}
      if (stream && !existing.twitch_url) updates.twitch_url = stream
      if (matchTimeStr && !existing.match_time) updates.match_time = matchTimeStr
      if (Object.keys(updates).length) {
        toUpdate.push({ id: existing.id, updates })
        log.push(`🔗 Updated ${Object.keys(updates).join(', ')} for match ${match.id}`)
      }
    } else {
      toInsert.push({
        tournament_id: tournamentDbId,
        team_1_id: team1DbId,
        team_2_id: team2DbId,
        best_of: match.number_of_games,
        match_date: matchDateStr,
        match_time: matchTimeStr,
        pandascore_match_id: match.id,
        twitch_url: stream,
        is_published: false,
      })
      log.push(`✅ "${match.name}" on ${matchDateStr}`)
    }
  }

  // ── 5. Batch write predictions ───────────────────────────────────────────
  let created = 0
  if (toInsert.length) {
    const { error } = await supabase.from('match_predictions').insert(toInsert)
    if (error) log.push(`❌ Batch insert error: ${error.message}`)
    else created = toInsert.length
  }

  await Promise.all(
    toUpdate.map(({ id, updates }) =>
      supabase.from('match_predictions').update(updates).eq('id', id)
    )
  )

  return NextResponse.json({
    ok: true,
    created,
    updated: toUpdate.length,
    skipped,
    total: matches.length,
    log,
  })
}
