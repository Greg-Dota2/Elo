import type { Metadata } from 'next'
import { Suspense } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import TeamsClient from '@/components/TeamsClient'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'ÐšÐ¾Ð¼Ð°Ð½Ð´Ñ‹ Dota 2 â€” ÐŸÑ€Ð¾Ñ„Ð¸Ð»Ð¸ Ð¸ Ñ€ÐµÐ·ÑƒÐ»ÑŒÑ‚Ð°Ñ‚Ñ‹',
  description: 'ÐŸÑ€Ð¾Ñ„Ð¸Ð»Ð¸, ÑÐ¾ÑÑ‚Ð°Ð²Ñ‹, Ñ€ÐµÐ¹Ñ‚Ð¸Ð½Ð³Ð¸ ELO Ð¸ Ñ€ÐµÐ·ÑƒÐ»ÑŒÑ‚Ð°Ñ‚Ñ‹ Ñ‚ÑƒÑ€Ð½Ð¸Ñ€Ð¾Ð² Ð²ÑÐµÑ… Ð¾Ñ‚ÑÐ»ÐµÐ¶Ð¸Ð²Ð°ÐµÐ¼Ñ‹Ñ… ÐºÐ¾Ð¼Ð°Ð½Ð´ Dota 2 Tier 1.',
  alternates: { canonical: '/ru/teams', languages: { 'x-default': '/teams', 'en': '/teams', 'ru': '/ru/teams' } },
  openGraph: { title: 'ÐšÐ¾Ð¼Ð°Ð½Ð´Ñ‹ Dota 2 â€” ÐŸÑ€Ð¾Ñ„Ð¸Ð»Ð¸ Ð¸ Ñ€ÐµÐ·ÑƒÐ»ÑŒÑ‚Ð°Ñ‚Ñ‹', description: 'ÐŸÑ€Ð¾Ñ„Ð¸Ð»Ð¸, ÑÐ¾ÑÑ‚Ð°Ð²Ñ‹, Ñ€ÐµÐ¹Ñ‚Ð¸Ð½Ð³Ð¸ ELO Ð¸ Ñ€ÐµÐ·ÑƒÐ»ÑŒÑ‚Ð°Ñ‚Ñ‹ Ñ‚ÑƒÑ€Ð½Ð¸Ñ€Ð¾Ð² Ð²ÑÐµÑ… Ð¾Ñ‚ÑÐ»ÐµÐ¶Ð¸Ð²Ð°ÐµÐ¼Ñ‹Ñ… ÐºÐ¾Ð¼Ð°Ð½Ð´ Dota 2 Tier 1.', url: '/ru/teams' },
  twitter: { card: 'summary', title: 'ÐšÐ¾Ð¼Ð°Ð½Ð´Ñ‹ Dota 2 â€” ÐŸÑ€Ð¾Ñ„Ð¸Ð»Ð¸ Ð¸ Ñ€ÐµÐ·ÑƒÐ»ÑŒÑ‚Ð°Ñ‚Ñ‹', description: 'ÐŸÑ€Ð¾Ñ„Ð¸Ð»Ð¸, ÑÐ¾ÑÑ‚Ð°Ð²Ñ‹, Ñ€ÐµÐ¹Ñ‚Ð¸Ð½Ð³Ð¸ ELO Ð¸ Ñ€ÐµÐ·ÑƒÐ»ÑŒÑ‚Ð°Ñ‚Ñ‹ Ñ‚ÑƒÑ€Ð½Ð¸Ñ€Ð¾Ð² Ð²ÑÐµÑ… Ð¾Ñ‚ÑÐ»ÐµÐ¶Ð¸Ð²Ð°ÐµÐ¼Ñ‹Ñ… ÐºÐ¾Ð¼Ð°Ð½Ð´ Dota 2 Tier 1.' },
}

export default async function RuTeamsPage() {
  const supabase = createAdminClient()

  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, short_name, region, logo_url, banner_url, current_elo, is_active, slug')
    .order('current_elo', { ascending: false })

  const { data: matchRows } = await supabase
    .from('match_predictions')
    .select('team_1_id, team_2_id, score_team_1, score_team_2')
    .eq('is_published', true)
    .not('score_team_1', 'is', null)
    .not('score_team_2', 'is', null)

  type MatchRow = { team_1_id: string; team_2_id: string; score_team_1: number; score_team_2: number }
  const statsMap = new Map<string, { wins: number; draws: number; losses: number }>()
  for (const row of (matchRows as MatchRow[]) ?? []) {
    const s1 = row.score_team_1
    const s2 = row.score_team_2
    for (const [tid, score, oppScore] of [
      [row.team_1_id, s1, s2],
      [row.team_2_id, s2, s1],
    ] as [string, number, number][]) {
      if (!statsMap.has(tid)) statsMap.set(tid, { wins: 0, draws: 0, losses: 0 })
      const s = statsMap.get(tid)!
      if (score > oppScore) s.wins++
      else if (score < oppScore) s.losses++
      else s.draws++
    }
  }

  const active = teams?.filter(t => t.is_active) ?? []
  const inactive = teams?.filter(t => !t.is_active) ?? []

  const statsMapObj: Record<string, { wins: number; draws: number; losses: number }> = {}
  for (const [k, v] of statsMap) statsMapObj[k] = v

  return (
    <div className="fade-in-up">
      <div className="mb-6">
        <p className="section-label mb-2">Ð¡Ñ†ÐµÐ½Ð° Tier 1</p>
        <h1 className="text-3xl font-black tracking-tight mb-3">ÐšÐ¾Ð¼Ð°Ð½Ð´Ñ‹ Dota 2</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Ð’ÑÐµ ÐºÐ¾Ð¼Ð°Ð½Ð´Ñ‹ Tier 1, Ñ€Ð°Ð½Ð¶Ð¸Ñ€Ð¾Ð²Ð°Ð½Ð½Ñ‹Ðµ Ð¿Ð¾ ELO â€” Ð¾Ð±Ð½Ð¾Ð²Ð»ÑÐµÑ‚ÑÑ Ð¿Ð¾ÑÐ»Ðµ ÐºÐ°Ð¶Ð´Ð¾Ð¹ ÑÐµÑ€Ð¸Ð¸. ÐÐ°Ð¶Ð¼Ð¸Ñ‚Ðµ Ð½Ð° ÐºÐ¾Ð¼Ð°Ð½Ð´Ñƒ Ñ‡Ñ‚Ð¾Ð±Ñ‹ ÑƒÐ²Ð¸Ð´ÐµÑ‚ÑŒ Ð¿Ð¾Ð»Ð½Ñ‹Ð¹ Ð¿Ñ€Ð¾Ñ„Ð¸Ð»ÑŒ: ÑÐ¾ÑÑ‚Ð°Ð², Ð¸ÑÑ‚Ð¾Ñ€Ð¸ÑŽ Ñ‚ÑƒÑ€Ð½Ð¸Ñ€Ð¾Ð² Ð¸ ÑÑ‚Ð°Ñ‚Ð¸ÑÑ‚Ð¸ÐºÑƒ.
        </p>
      </div>

      {!teams?.length ? (
        <div className="rounded-2xl p-10 text-center border border-border/60 bg-card/60">
          <p className="font-semibold mb-1">ÐšÐ¾Ð¼Ð°Ð½Ð´Ñ‹ Ð½Ðµ Ð´Ð¾Ð±Ð°Ð²Ð»ÐµÐ½Ñ‹</p>
          <p className="text-sm text-muted-foreground">Ð”Ð¾Ð±Ð°Ð²ÑŒÑ‚Ðµ ÐºÐ¾Ð¼Ð°Ð½Ð´Ñ‹ Ñ‡ÐµÑ€ÐµÐ· Ð¿Ð°Ð½ÐµÐ»ÑŒ Ð°Ð´Ð¼Ð¸Ð½Ð¸ÑÑ‚Ñ€Ð°Ñ‚Ð¾Ñ€Ð°.</p>
        </div>
      ) : (
        <Suspense>
          <TeamsClient active={active} inactive={inactive} statsMap={statsMapObj} locale="ru" />
        </Suspense>
      )}
    </div>
  )
}
