import type { Metadata } from 'next'
import { Suspense } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import TeamsClient from '@/components/TeamsClient'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Команды Dota 2 — Профили и результаты',
  description: 'Профили, составы, рейтинги ELO и результаты турниров всех отслеживаемых команд Dota 2 Tier 1.',
  alternates: { canonical: '/ru/teams', languages: { 'x-default': '/teams', 'en': '/teams', 'ru': '/ru/teams' } },
  openGraph: { title: 'Команды Dota 2 — Профили и результаты', description: 'Профили, составы, рейтинги ELO и результаты турниров всех отслеживаемых команд Dota 2 Tier 1.', url: '/ru/teams', images: [{ url: 'https://www.dota2protips.com/1.png', width: 512, height: 512, alt: 'Dota2ProTips' }] },
  twitter: { card: 'summary', title: 'Команды Dota 2 — Профили и результаты', description: 'Профили, составы, рейтинги ELO и результаты турниров всех отслеживаемых команд Dota 2 Tier 1.' },
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
        <p className="section-label mb-2">Сцена Tier 1</p>
        <h1 className="text-3xl font-black tracking-tight mb-3">Команды Dota 2</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Все команды Tier 1, ранжированные по ELO — обновляется после каждой серии. Нажмите на команду чтобы увидеть полный профиль: состав, историю турниров и статистику.
        </p>
      </div>

      {!teams?.length ? (
        <div className="rounded-2xl p-10 text-center border border-border/60 bg-card/60">
          <p className="font-semibold mb-1">Команды не добавлены</p>
          <p className="text-sm text-muted-foreground">Добавьте команды через панель администратора.</p>
        </div>
      ) : (
        <Suspense>
          <TeamsClient active={active} inactive={inactive} statsMap={statsMapObj} locale="ru" />
        </Suspense>
      )}
    </div>
  )
}
