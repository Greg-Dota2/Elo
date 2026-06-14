import type { Metadata } from 'next'
import { heroSlug } from '@/lib/heroes'
import HeroMetaTable, { type HeroMetaEntry } from '@/app/heroes/meta/HeroMetaTable'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Мета героев Dota 2 — процент побед и популярность',
  description: 'Актуальные данные по проценту побед и популярности героев Dota 2 из публичных матчей всех уровней. Кто растёт, кто падает в текущей мете.',
  alternates: { canonical: '/ru/heroes/meta', languages: { 'x-default': '/heroes/meta', 'en': '/heroes/meta', 'ru': '/ru/heroes/meta' } },
  openGraph: { title: 'Мета героев Dota 2 — процент побед и популярность', description: 'Актуальные данные по проценту побед и популярности героев Dota 2 из публичных матчей всех уровней.', url: '/ru/heroes/meta', images: [{ url: 'https://www.dota2protips.com/1.png', width: 512, height: 512, alt: 'Dota2ProTips' }] },
  twitter: { card: 'summary', title: 'Мета героев Dota 2 — процент побед и популярность', description: 'Актуальные данные по проценту побед и популярности героев Dota 2 из публичных матчей всех уровней.' },
}

interface RawStat {
  id: number
  name: string
  localized_name: string
  primary_attr: string
  roles: string[]
  pub_pick: number
  pub_win: number
  pub_pick_trend: number[]
  pub_win_trend: number[]
  pro_pick: number
  pro_win: number
  pro_ban: number
}

export default async function RuHeroMetaPage() {
  let rawStats: RawStat[] = []
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const { data } = await createAdminClient()
      .from('opendota_cache').select('data').eq('key', 'hero_stats').single()
    if (data?.data) rawStats = data.data
  } catch { /* fall through */ }

  if (rawStats.length === 0) {
    try {
      const res = await fetch('https://api.opendota.com/api/heroStats', { next: { revalidate: 3600 } })
      if (res.ok) rawStats = await res.json()
    } catch { /* api unavailable */ }
  }

  const valid = rawStats.filter(s => s.pub_pick > 500)
  const totalPicks = valid.reduce((sum, s) => sum + s.pub_pick, 0)

  const heroes: HeroMetaEntry[] = valid.map(stat => {
    const winRate = stat.pub_pick > 0 ? (stat.pub_win / stat.pub_pick) * 100 : 50

    const pt = Array.isArray(stat.pub_pick_trend) ? stat.pub_pick_trend : []
    const wt = Array.isArray(stat.pub_win_trend) ? stat.pub_win_trend : []
    const winRateTrend: number[] = pt
      .map((picks, i) => picks > 0 ? (wt[i] / picks) * 100 : null)
      .filter((v): v is number => v !== null)

    let winRateDelta = 0
    if (winRateTrend.length >= 2) {
      winRateDelta = parseFloat((winRateTrend[winRateTrend.length - 1] - winRateTrend[0]).toFixed(2))
    }

    return {
      id: stat.id,
      slug: heroSlug(stat.name),
      localized_name: stat.localized_name,
      primary_attr: stat.primary_attr,
      winRate: parseFloat(winRate.toFixed(1)),
      pickRate: totalPicks > 0 ? parseFloat(((stat.pub_pick / totalPicks) * 100).toFixed(2)) : 0,
      winRateDelta,
      winRateTrend,
      proPick: stat.pro_pick,
      proBan: stat.pro_ban,
      roles: stat.roles ?? [],
    }
  })

  heroes.sort((a, b) => b.winRate - a.winRate)

  const updatedAt = new Date().toLocaleTimeString('ru-RU', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Athens',
  })

  return <HeroMetaTable heroes={heroes} updatedAt={updatedAt} heroPrefix="/ru/heroes" locale="ru" />
}
