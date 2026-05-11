import type { Metadata } from 'next'
import { Suspense } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import TeamsClient from '@/components/TeamsClient'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Dota 2 Pro Teams — Profiles & Results',
  description: 'Profiles, rosters, ELO ratings, and tournament results for every tracked Dota 2 pro team. Find out who\'s hot, who\'s struggling, and who I\'m picking in the next series.',
  keywords: ['Dota 2 teams', 'pro Dota 2 teams', 'Dota 2 team ELO', 'Dota 2 rosters', 'Team Spirit', 'Team Liquid', 'Gaimin Gladiators', 'Tundra Esports'],
  alternates: { canonical: '/teams', languages: { 'x-default': '/teams', 'en': '/teams', 'ru': '/ru/teams' } },
  openGraph: { title: 'Dota 2 Pro Teams — Profiles & Results', description: 'Profiles, rosters, ELO ratings, and tournament results for every tracked Dota 2 pro team.', url: '/teams' },
  twitter: { card: 'summary', title: 'Dota 2 Pro Teams — Profiles & Results', description: 'Profiles, rosters, ELO ratings, and tournament results for every tracked Dota 2 pro team.' },
}

export default async function TeamsPage() {
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Dota 2 Teams — Profiles & ELO Ratings',
            description: 'Profiles for pro Dota 2 teams — ELO ratings, rosters, region, and prediction accuracy.',
            url: 'https://www.dota2protips.com/teams',
            mainEntity: {
              '@type': 'ItemList',
              numberOfItems: active.length,
              itemListElement: active.filter(t => t.slug).map((t, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                name: t.name,
                url: `https://www.dota2protips.com/teams/${t.slug}`,
              })),
            },
          }),
        }}
      />

      <div className="mb-6">
        <p className="section-label mb-2">Tier 1 Scene</p>
        <h1 className="text-3xl font-black tracking-tight mb-3">Dota 2 Teams</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Every Tier 1 team ranked by ELO — updated after each tracked series. Click any team for their full
          profile: roster, tournament history, head-to-head record, and my prediction track record against them.
        </p>
      </div>

      {!teams?.length ? (
        <div className="rounded-2xl p-10 text-center border border-border/60 bg-card/60">
          <p className="font-semibold mb-1">No teams yet</p>
          <p className="text-sm text-muted-foreground">Add teams via the admin panel.</p>
        </div>
      ) : (
        <Suspense>
          <TeamsClient active={active} inactive={inactive} statsMap={statsMapObj} />
        </Suspense>
      )}
    </div>
  )
}
