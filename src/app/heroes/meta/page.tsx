import type { Metadata } from 'next'
import { heroSlug } from '@/lib/heroes'
import HeroMetaTable, { type HeroMetaEntry } from './HeroMetaTable'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Hero Meta — Dota 2 Win & Pick Rates',
  description: 'Live Dota 2 hero win rates, pick rates and trend data across all public match brackets. See which heroes are rising and falling in the current meta.',
  alternates: { canonical: '/heroes/meta', languages: { 'x-default': '/heroes/meta', 'en': '/heroes/meta', 'ru': '/ru/heroes/meta' } },
  openGraph: { title: 'Hero Meta — Dota 2 Win & Pick Rates', description: 'Live Dota 2 hero win rates, pick rates and trend data across all public match brackets.', url: '/heroes/meta' },
  twitter: { card: 'summary', title: 'Hero Meta — Dota 2 Win & Pick Rates', description: 'Live Dota 2 hero win rates, pick rates and trend data across all public match brackets.' },
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

export default async function HeroMetaPage() {
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

    // Compute win rate per trend period for sparkline
    const pt = Array.isArray(stat.pub_pick_trend) ? stat.pub_pick_trend : []
    const wt = Array.isArray(stat.pub_win_trend) ? stat.pub_win_trend : []
    const winRateTrend: number[] = pt
      .map((picks, i) => picks > 0 ? (wt[i] / picks) * 100 : null)
      .filter((v): v is number => v !== null)

    // Win rate change first → last trend period
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

  // Default sort: win rate descending
  heroes.sort((a, b) => b.winRate - a.winRate)

  const updatedAt = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Athens',
  })

  const SITE_URL = 'https://www.dota2protips.com'

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Dataset',
            name: 'Dota 2 Hero Win & Pick Rates',
            description: 'Dota 2 hero win rates, pick rates, and trend data across public match brackets.',
            url: `${SITE_URL}/heroes/meta`,
            license: 'https://creativecommons.org/licenses/by-nc/4.0/',
            creator: { '@type': 'Organization', name: 'Dota2ProTips', url: SITE_URL },
          }),
        }}
      />
      <HeroMetaTable heroes={heroes} updatedAt={updatedAt} />
    </>
  )
}
