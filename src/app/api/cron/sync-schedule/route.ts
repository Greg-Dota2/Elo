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
  const log: string[] = []
  let created = 0
  let updated = 0
  let skipped = 0

  let matches
  try {
    matches = await fetchUpcomingTier1Matches(100)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 })
  }

  for (const match of matches) {
    if (match.opponents.length !== 2) { skipped++; continue }
    const [opp1, opp2] = match.opponents.map((o) => o.opponent)
    if (!opp1?.id || !opp2?.id) { skipped++; continue }

    const team1DbId = await resolveTeam(supabase, opp1)
    const team2DbId = await resolveTeam(supabase, opp2)
    if (!team1DbId || !team2DbId) { skipped++; continue }

    const tournamentDbId = await resolveTournament(supabase, match)
    if (!tournamentDbId) { skipped++; continue }

    const stream =
      match.streams_list.find((s) => s.main && s.official && s.language === 'en')?.raw_url ??
      match.streams_list.find((s) => s.main)?.raw_url ??
      match.streams_list[0]?.raw_url ??
      null

    const matchDate = match.begin_at ?? match.scheduled_at
    const matchDateStr = matchDate ? matchDate.split('T')[0] : null
    const matchTimeStr = matchDate ? matchDate.split('T')[1]?.slice(0, 5) : null

    const { data: existing } = await supabase
      .from('match_predictions')
      .select('id, twitch_url, match_time')
      .eq('pandascore_match_id', match.id)
      .maybeSingle()

    if (existing) {
      const updates: Record<string, string> = {}
      if (stream && !existing.twitch_url) updates.twitch_url = stream
      if (matchTimeStr && !existing.match_time) updates.match_time = matchTimeStr
      if (Object.keys(updates).length) {
        await supabase.from('match_predictions').update(updates).eq('id', existing.id)
        log.push(`🔗 Updated ${Object.keys(updates).join(', ')} for match ${match.id}`)
        updated++
      } else {
        skipped++
      }
      continue
    }

    const { error } = await supabase.from('match_predictions').insert({
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

    if (error) {
      log.push(`❌ "${match.name}": ${error.message}`)
      skipped++
    } else {
      log.push(`✅ "${match.name}" on ${matchDateStr}`)
      created++
    }
  }

  return NextResponse.json({ ok: true, created, updated, skipped, total: matches.length, log })
}

type SupabaseClient = ReturnType<typeof createAdminClient>

async function resolveTeam(
  supabase: SupabaseClient,
  team: { id: number; name: string; acronym: string | null; image_url: string | null }
): Promise<string | null> {
  const { data: byPsId } = await supabase.from('teams').select('id').eq('pandascore_team_id', team.id).maybeSingle()
  if (byPsId) return byPsId.id

  const { data: byName } = await supabase.from('teams').select('id').ilike('name', team.name).maybeSingle()
  if (byName) {
    await supabase.from('teams').update({ pandascore_team_id: team.id }).eq('id', byName.id)
    return byName.id
  }

  const { data: newTeam } = await supabase.from('teams').insert({
    name: team.name,
    short_name: team.acronym || null,
    logo_url: team.image_url || null,
    pandascore_team_id: team.id,
    is_active: true,
  }).select('id').single()

  return newTeam?.id ?? null
}

async function resolveTournament(
  supabase: SupabaseClient,
  match: Awaited<ReturnType<typeof fetchUpcomingTier1Matches>>[number]
): Promise<string | null> {
  const tournamentName = `${match.league.name} ${match.serie.full_name}`
  const slug = `${match.league.name}-${match.serie.full_name}`
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const { data: bySlug } = await supabase.from('tournaments').select('id').eq('slug', slug).maybeSingle()
  if (bySlug) return bySlug.id

  const known = TIER1_TOURNAMENTS.find(t => t.league_id === match.league.id)
  const { data: created } = await supabase.from('tournaments').insert({
    name: tournamentName,
    slug,
    tier: 1,
    logo_url: null,
    is_published: false,
    ...(known ? { start_date: known.start_date, end_date: known.end_date } : {}),
  }).select('id').single()

  return created?.id ?? null
}
