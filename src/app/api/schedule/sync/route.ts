import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchUpcomingTier1Matches } from '@/lib/pandascore'
import { TIER1_TOURNAMENTS } from '@/lib/tier1tournaments'

export async function POST() {
  const supabase = createAdminClient()

  let matches
  try {
    matches = await fetchUpcomingTier1Matches(100, true)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 })
  }

  if (!matches.length) {
    return NextResponse.json({ ok: true, created: 0, skipped: 0, message: 'No upcoming Tier 1 matches found' })
  }

  // Backfill slugs for any teams that were created without one (older syncs)
  const { data: sluglessTeams } = await supabase
    .from('teams')
    .select('id, name')
    .is('slug', null)
    .not('pandascore_team_id', 'is', null)
  for (const t of sluglessTeams ?? []) {
    const slug = t.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    await supabase.from('teams').update({ slug }).eq('id', t.id)
  }

  let created = 0
  let skipped = 0
  const log: string[] = []

  for (const match of matches) {
    // Need exactly 2 opponents with known teams
    if (match.opponents.length !== 2) { skipped++; continue }

    const [opp1, opp2] = match.opponents.map((o) => o.opponent)
    if (!opp1?.id || !opp2?.id) { skipped++; continue }

    // Resolve or create each team in our DB
    const team1DbId = await resolveTeam(supabase, opp1)
    const team2DbId = await resolveTeam(supabase, opp2)

    if (!team1DbId || !team2DbId) {
      log.push(`⚠️ Skipped "${match.name}": could not resolve teams`)
      skipped++
      continue
    }

    // Find or create the tournament record
    const tournamentDbId = await resolveTournament(supabase, match)
    if (!tournamentDbId) {
      log.push(`⚠️ Skipped "${match.name}": could not resolve tournament`)
      skipped++
      continue
    }

    // Deduplicate by pandascore_match_id — also fix tournament if match landed in wrong one
    const { data: existing } = await supabase
      .from('match_predictions')
      .select('id, twitch_url, match_time, tournament_id')
      .eq('pandascore_match_id', match.id)
      .maybeSingle()

    // Pick the best stream URL (prefer English official, fallback to first)
    const stream =
      match.streams_list.find((s) => s.main && s.official && s.language === 'en')?.raw_url ??
      match.streams_list.find((s) => s.main)?.raw_url ??
      match.streams_list[0]?.raw_url ??
      null

    const matchDate = match.begin_at ?? match.scheduled_at
    const matchDateStr = matchDate ? matchDate.split('T')[0] : null
    const matchTimeStr = matchDate ? matchDate.split('T')[1]?.slice(0, 5) : null

    if (existing) {
      const updates: Record<string, unknown> = {}
      if (stream && !existing.twitch_url) updates.twitch_url = stream
      if (matchTimeStr && !existing.match_time) updates.match_time = matchTimeStr
      // If the match ended up under the wrong tournament (e.g. a sync-created duplicate),
      // move it to the correct one now that we have the right tournament ID.
      if (existing.tournament_id !== tournamentDbId) {
        updates.tournament_id = tournamentDbId
        log.push(`🔀 Moved "${match.name}" to correct tournament`)
      }
      if (Object.keys(updates).length) {
        await supabase.from('match_predictions').update(updates).eq('id', existing.id)
      }
      if (!updates.tournament_id) skipped++
      else created++ // count reassigned matches as "created" so the user sees progress
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

  return NextResponse.json({ ok: true, created, skipped, total: matches.length, log })
}

// ─── Helpers ────────────────────────────────────────────────────────────────

type SupabaseClient = ReturnType<typeof createAdminClient>

async function resolveTeam(
  supabase: SupabaseClient,
  team: { id: number; name: string; acronym: string | null; image_url: string | null }
): Promise<string | null> {
  // 1. Match by pandascore_team_id
  const { data: byPsId } = await supabase
    .from('teams')
    .select('id')
    .eq('pandascore_team_id', team.id)
    .maybeSingle()
  if (byPsId) return byPsId.id

  // 2. Check prefix match first — if "Aurora Gaming" exists, prefer it over an exact "Aurora" duplicate.
  // Only trust a unique prefix match to avoid "Team" matching Team Spirit, Team Liquid, etc.
  const { data: byPrefix } = await supabase
    .from('teams')
    .select('id, name')
    .ilike('name', team.name + ' %')  // note trailing space: "Aurora " won't match "Aurora" itself
  if (byPrefix && byPrefix.length === 1) {
    await supabase.from('teams').update({ pandascore_team_id: team.id }).eq('id', byPrefix[0].id)
    return byPrefix[0].id
  }

  // 3. Exact name match (fallback when no extended name exists)
  const { data: byName } = await supabase
    .from('teams')
    .select('id')
    .ilike('name', team.name)
    .maybeSingle()
  if (byName) {
    await supabase.from('teams').update({ pandascore_team_id: team.id }).eq('id', byName.id)
    return byName.id
  }

  // 4. Match where DB name starts with PandaScore name (reverse: "Aurora Gaming" contains "Aurora")
  // Already covered by prefix above — also try DB name contained in PS name (e.g. "Na'Vi" → "Natus Vincere")
  const { data: bySubstring } = await supabase
    .from('teams')
    .select('id, name')
    .ilike('name', '%' + team.name + '%')
  if (bySubstring && bySubstring.length === 1) {
    await supabase.from('teams').update({ pandascore_team_id: team.id }).eq('id', bySubstring[0].id)
    return bySubstring[0].id
  }

  // 5. Create new team with auto-generated slug
  const slug = team.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const { data: newTeam } = await supabase
    .from('teams')
    .insert({
      name: team.name,
      slug,
      short_name: team.acronym || null,
      logo_url: team.image_url || null,
      pandascore_team_id: team.id,
      is_active: true,
    })
    .select('id')
    .single()

  return newTeam?.id ?? null
}

async function resolveTournament(
  supabase: SupabaseClient,
  match: Awaited<ReturnType<typeof fetchUpcomingTier1Matches>>[number]
): Promise<string | null> {
  const tournamentName = `${match.league.name} ${match.serie.full_name}`
  const derivedSlug = `${match.league.name}-${match.serie.full_name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  // Find the known TIER1 entry by league_id + scheduled date falling in the known window.
  // This handles leagues like PGL (4108) where multiple seasons share the same league_id.
  const scheduledAt = match.scheduled_at ? new Date(match.scheduled_at) : null
  const knownByDate = scheduledAt
    ? TIER1_TOURNAMENTS.find(t =>
        t.league_id === match.league.id &&
        new Date(t.start_date) <= scheduledAt &&
        scheduledAt <= new Date(t.end_date + 'T23:59:59Z')
      )
    : TIER1_TOURNAMENTS.find(t => t.league_id === match.league.id)

  // Fetch league image from PandaScore (match objects don't include image_url)
  let logo_url: string | null = null
  try {
    const TOKEN = process.env.PANDASCORE_API_KEY!
    const lgRes = await fetch(
      `https://api.pandascore.co/leagues/${match.league.id}?token=${TOKEN}`,
      { next: { revalidate: 86400 } }
    )
    if (lgRes.ok) {
      const lg = await lgRes.json()
      logo_url = lg.image_url ?? null
    }
  } catch { /* non-critical */ }

  // Try the known canonical slug first (avoids creating duplicate tournaments)
  if (knownByDate) {
    const { data: byKnownSlug } = await supabase
      .from('tournaments')
      .select('id, logo_url')
      .eq('slug', knownByDate.slug)
      .maybeSingle()
    if (byKnownSlug) {
      if (logo_url && !byKnownSlug.logo_url) {
        await supabase.from('tournaments').update({ logo_url }).eq('id', byKnownSlug.id)
      }
      return byKnownSlug.id
    }
  }

  // Fallback: try the PandaScore-derived slug
  const { data: bySlug } = await supabase
    .from('tournaments')
    .select('id, logo_url')
    .eq('slug', derivedSlug)
    .maybeSingle()
  if (bySlug) {
    if (logo_url && !bySlug.logo_url) {
      await supabase.from('tournaments').update({ logo_url }).eq('id', bySlug.id)
    }
    return bySlug.id
  }

  // Neither slug exists — create a new tournament using the known slug when available
  const slug = knownByDate?.slug ?? derivedSlug
  const { data: created } = await supabase
    .from('tournaments')
    .insert({
      name: tournamentName,
      slug,
      tier: 1,
      logo_url,
      is_published: false,
      ...(knownByDate ? { start_date: knownByDate.start_date, end_date: knownByDate.end_date } : {}),
    })
    .select('id')
    .single()

  return created?.id ?? null
}
