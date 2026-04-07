import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ELO_SEEDS, PINNED_TOP, PINNED_GAP } from '@/lib/elo-seeds'

// Workflow: POST /api/elo/recalculate first, then POST here.
// - Recalculate gives all teams with match history a fair ELO from results.
// - This override then forces PINNED_TOP teams above everyone else (in order),
//   pins no-match teams to their seed values, and deactivates unknown teams.
export async function POST() {
  const supabase = createAdminClient()
  const log: string[] = []
  let updated = 0
  let notFound = 0

  // Fetch current ELOs for all teams
  const { data: allTeams } = await supabase.from('teams').select('id, name, current_elo')
  const teamMap = new Map((allTeams ?? []).map(t => [t.name.toLowerCase(), t]))

  // Find the highest ELO among non-pinned teams
  const pinnedLower = PINNED_TOP.map(n => n.toLowerCase())
  const nonPinnedMax = Math.max(
    ...(allTeams ?? [])
      .filter(t => !pinnedLower.includes(t.name.toLowerCase()))
      .map(t => t.current_elo ?? 0)
  )

  // Set pinned teams above everyone else, in order
  for (let i = 0; i < PINNED_TOP.length; i++) {
    const name = PINNED_TOP[i]
    const elo = nonPinnedMax + PINNED_GAP * (PINNED_TOP.length - i)
    const { data, error } = await supabase
      .from('teams')
      .update({ current_elo: elo, is_active: true })
      .ilike('name', name)
      .select('name')

    if (error) log.push(`❌ ${name}: ${error.message}`)
    else if (!data?.length) { log.push(`⚠️ ${name}: not found in DB`); notFound++ }
    else { log.push(`📌 ${data[0].name}: pinned to ${elo} (#${i + 1})`); updated++ }
  }

  // Ensure all seeded teams are active; pin no-match teams (still at seed) to their seed value
  const knownNames = Object.keys(ELO_SEEDS)
  for (const name of knownNames) {
    if (PINNED_TOP.some(p => p.toLowerCase() === name.toLowerCase())) continue

    const team = teamMap.get(name.toLowerCase())
    if (!team) { log.push(`⚠️ ${name}: not found in DB`); notFound++; continue }

    // Just ensure is_active — don't touch ELO (recalculate already set it correctly)
    await supabase.from('teams').update({ is_active: true }).eq('id', team.id)
  }

  // Deactivate teams not in seeds
  const toWipe = (allTeams ?? []).filter(t =>
    !knownNames.some(n => n.toLowerCase() === t.name.toLowerCase())
  )
  for (const t of toWipe) {
    await supabase.from('teams').update({ is_active: false }).eq('id', t.id)
    log.push(`🗑 ${t.name}: deactivated`)
  }

  return NextResponse.json({ ok: true, updated, notFound, removed: toWipe.length, top3Baseline: nonPinnedMax, log })
}
