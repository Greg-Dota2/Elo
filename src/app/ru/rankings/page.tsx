import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { createAdminClient } from '@/lib/supabase/admin'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'ELO Ð ÐµÐ¹Ñ‚Ð¸Ð½Ð³ ÐºÐ¾Ð¼Ð°Ð½Ð´ Dota 2 2026',
  description: 'ELO Ñ€ÐµÐ¹Ñ‚Ð¸Ð½Ð³ ÐºÐ¾Ð¼Ð°Ð½Ð´ Dota 2, Ð¾Ð±Ð½Ð¾Ð²Ð»ÑÐµÐ¼Ñ‹Ð¹ Ð¿Ð¾ÑÐ»Ðµ ÐºÐ°Ð¶Ð´Ð¾Ð¹ ÑÐµÑ€Ð¸Ð¸ Tier 1. Ð’Ð·Ð²ÐµÑˆÐµÐ½ Ð¿Ð¾ ÑÐ¸Ð»Ðµ ÑÐ¾Ð¿ÐµÑ€Ð½Ð¸ÐºÐ° â€” Ð°ÐºÑ‚ÑƒÐ°Ð»ÑŒÐ½Ñ‹Ð¹ ÑÐ½Ð°Ð¿ÑˆÐ¾Ñ‚ Ñ‚Ð¾Ð³Ð¾, ÐºÑ‚Ð¾ Ñ€ÐµÐ°Ð»ÑŒÐ½Ð¾ Ð¿Ð¾ÐºÐ°Ð·Ñ‹Ð²Ð°ÐµÑ‚ Ñ€ÐµÐ·ÑƒÐ»ÑŒÑ‚Ð°Ñ‚ Ð¿Ñ€ÑÐ¼Ð¾ ÑÐµÐ¹Ñ‡Ð°Ñ.',
  alternates: { canonical: '/ru/rankings', languages: { 'x-default': '/rankings', 'en': '/rankings', 'ru': '/ru/rankings' } },
  openGraph: { title: 'ELO Ð ÐµÐ¹Ñ‚Ð¸Ð½Ð³ ÐºÐ¾Ð¼Ð°Ð½Ð´ Dota 2 2026', description: 'ELO Ñ€ÐµÐ¹Ñ‚Ð¸Ð½Ð³ ÐºÐ¾Ð¼Ð°Ð½Ð´ Dota 2, Ð¾Ð±Ð½Ð¾Ð²Ð»ÑÐµÐ¼Ñ‹Ð¹ Ð¿Ð¾ÑÐ»Ðµ ÐºÐ°Ð¶Ð´Ð¾Ð¹ ÑÐµÑ€Ð¸Ð¸ Tier 1. Ð’Ð·Ð²ÐµÑˆÐµÐ½ Ð¿Ð¾ ÑÐ¸Ð»Ðµ ÑÐ¾Ð¿ÐµÑ€Ð½Ð¸ÐºÐ°.', url: '/ru/rankings' },
  twitter: { card: 'summary', title: 'ELO Ð ÐµÐ¹Ñ‚Ð¸Ð½Ð³ ÐºÐ¾Ð¼Ð°Ð½Ð´ Dota 2 2026', description: 'ELO Ñ€ÐµÐ¹Ñ‚Ð¸Ð½Ð³ ÐºÐ¾Ð¼Ð°Ð½Ð´ Dota 2, Ð¾Ð±Ð½Ð¾Ð²Ð»ÑÐµÐ¼Ñ‹Ð¹ Ð¿Ð¾ÑÐ»Ðµ ÐºÐ°Ð¶Ð´Ð¾Ð¹ ÑÐµÑ€Ð¸Ð¸ Tier 1. Ð’Ð·Ð²ÐµÑˆÐµÐ½ Ð¿Ð¾ ÑÐ¸Ð»Ðµ ÑÐ¾Ð¿ÐµÑ€Ð½Ð¸ÐºÐ°.' },
}

const REGION_RU: Record<string, string> = {
  'Western Europe': 'Ð—Ð°Ð¿Ð°Ð´Ð½Ð°Ñ Ð•Ð²Ñ€Ð¾Ð¿Ð°',
  'Eastern Europe': 'Ð’Ð¾ÑÑ‚Ð¾Ñ‡Ð½Ð°Ñ Ð•Ð²Ñ€Ð¾Ð¿Ð°',
  'China': 'ÐšÐ¸Ñ‚Ð°Ð¹',
  'Southeast Asia': 'Ð®Ð³Ð¾-Ð’Ð¾ÑÑ‚Ð¾Ñ‡Ð½Ð°Ñ ÐÐ·Ð¸Ñ',
  'North America': 'Ð¡ÐµÐ²ÐµÑ€Ð½Ð°Ñ ÐÐ¼ÐµÑ€Ð¸ÐºÐ°',
  'South America': 'Ð®Ð¶Ð½Ð°Ñ ÐÐ¼ÐµÑ€Ð¸ÐºÐ°',
  'CIS': 'Ð¡ÐÐ“',
}

const MEDAL = ['ðŸ¥‡', 'ðŸ¥ˆ', 'ðŸ¥‰']
const MEDAL_COLOR = ['var(--gold)', 'var(--silver)', 'var(--bronze)']
const MEDAL_BG = ['var(--gold-dim)', 'var(--silver-dim)', 'var(--bronze-dim)']
const MEDAL_BORDER = ['var(--gold-border)', 'var(--silver-border)', 'var(--bronze-border)']

export default async function RuRankingsPage() {
  const supabase = createAdminClient()

  const [{ data: teams }, { data: inactiveTeams }] = await Promise.all([
    supabase
      .from('teams')
      .select('id, name, region, logo_url, current_elo, slug')
      .eq('is_active', true)
      .not('current_elo', 'is', null)
      .order('current_elo', { ascending: false }),
    supabase
      .from('teams')
      .select('id, name, region, logo_url, slug')
      .eq('is_active', false)
      .not('slug', 'is', null)
      .order('name'),
  ])

  const topElo = teams?.[0]?.current_elo ?? 1500
  const bottomElo = teams?.[teams.length - 1]?.current_elo ?? 1500

  const SITE_URL = 'https://www.dota2protips.com'

  return (
    <div className="fade-in-up">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'Dataset',
              name: 'ELO Ð ÐµÐ¹Ñ‚Ð¸Ð½Ð³ ÐºÐ¾Ð¼Ð°Ð½Ð´ Dota 2',
              description: 'ELO Ñ€ÐµÐ¹Ñ‚Ð¸Ð½Ð³ ÐºÐ¾Ð¼Ð°Ð½Ð´ Dota 2, Ð¾Ð±Ð½Ð¾Ð²Ð»ÑÐµÐ¼Ñ‹Ð¹ Ð¿Ð¾ÑÐ»Ðµ ÐºÐ°Ð¶Ð´Ð¾Ð¹ ÑÐµÑ€Ð¸Ð¸ Tier 1, Ð²Ð·Ð²ÐµÑˆÐµÐ½Ð½Ñ‹Ð¹ Ð¿Ð¾ ÑÐ¸Ð»Ðµ ÑÐ¾Ð¿ÐµÑ€Ð½Ð¸ÐºÐ°.',
              url: `${SITE_URL}/ru/rankings`,
              creator: {
                '@type': 'Organization',
                name: 'Dota2ProTips',
                url: SITE_URL,
              },
            },
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Ð ÐµÐ¹Ñ‚Ð¸Ð½Ð³', item: `${SITE_URL}/ru/rankings` },
              ],
            },
          ]),
        }}
      />
      {/* Page header */}
      <div className="mb-8">
        <p className="section-label mb-2">Dota 2 Tier 1</p>
        <h1 className="text-3xl font-black tracking-tight mb-1">ELO Ð ÐµÐ¹Ñ‚Ð¸Ð½Ð³</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          ÐžÐ±Ð½Ð¾Ð²Ð»ÑÐµÑ‚ÑÑ Ð¿Ð¾ÑÐ»Ðµ ÐºÐ°Ð¶Ð´Ð¾Ð³Ð¾ Ñ€ÐµÐ·ÑƒÐ»ÑŒÑ‚Ð°Ñ‚Ð° ÑÐµÑ€Ð¸Ð¸
        </p>
      </div>

      {/* How the rankings work */}
      <div
        className="rounded-2xl p-7 mb-8 text-sm leading-7 space-y-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
      >
        <h2 className="font-display text-base font-black tracking-tight" style={{ color: 'var(--text)' }}>
          ÐšÐ°Ðº Ñ€Ð°Ð±Ð¾Ñ‚Ð°ÐµÑ‚ Ñ€ÐµÐ¹Ñ‚Ð¸Ð½Ð³
        </h2>
        <p>
          ÐšÐ°Ð¶Ð´Ð°Ñ ÐºÐ¾Ð¼Ð°Ð½Ð´Ð° Ð½Ð°Ñ‡Ð¸Ð½Ð°ÐµÑ‚ Ñ 1500. Ð’ÑÑ‘. ÐÐ¸ÐºÐ°ÐºÐ¸Ñ… Ð±Ð¾Ð½ÑƒÑÐ¾Ð² Ð·Ð° Ñ€ÐµÐ¿ÑƒÑ‚Ð°Ñ†Ð¸ÑŽ, Ð½Ð¸ÐºÐ°ÐºÐ¸Ñ… Ð¸ÑÑ‚Ð¾Ñ€Ð¸Ñ‡ÐµÑÐºÐ¸Ñ… Ð¾Ñ‡ÐºÐ¾Ð².
          Ð ÐµÐ¹Ñ‚Ð¸Ð½Ð³ Ð·Ð°Ñ€Ð°Ð±Ð°Ñ‚Ñ‹Ð²Ð°ÐµÑ‚ÑÑ Ð¿Ð¾Ð±ÐµÐ´Ð°Ð¼Ð¸ â€” Ð¸ Ñ‚ÐµÑ€ÑÐµÑ‚ÑÑ Ð¿Ð¾Ñ€Ð°Ð¶ÐµÐ½Ð¸ÑÐ¼Ð¸.
        </p>
        <p>
          Ð•Ð´Ð¸Ð½ÑÑ‚Ð²ÐµÐ½Ð½Ð¾Ðµ, Ñ‡Ñ‚Ð¾ Ð¸Ð¼ÐµÐµÑ‚ Ð·Ð½Ð°Ñ‡ÐµÐ½Ð¸Ðµ â€” <span className="font-semibold" style={{ color: 'var(--text)' }}>ÐºÐ¾Ð³Ð¾ Ñ‚Ñ‹ Ð¾Ð±Ñ‹Ð³Ñ€Ð°Ð»</span>.
          ÐŸÐ¾Ð±ÐµÐ´Ð¸Ð» Ñ‚Ð¾Ð¿-ÐºÐ¾Ð¼Ð°Ð½Ð´Ñƒ â€” Ð¿Ð¾Ð»ÑƒÑ‡Ð¸Ð» Ð¼Ð½Ð¾Ð³Ð¾. ÐŸÐ¾Ð±ÐµÐ´Ð¸Ð» Ð°ÑƒÑ‚ÑÐ°Ð¹Ð´ÐµÑ€Ð° â€” Ð¿Ð¾Ñ‡Ñ‚Ð¸ Ð½Ð¸Ñ‡ÐµÐ³Ð¾.
          ÐŸÑ€Ð¾Ð¸Ð³Ñ€Ð°Ð» â€” Ð¾Ð±Ñ€Ð°Ñ‚Ð½Ð°Ñ Ð¸ÑÑ‚Ð¾Ñ€Ð¸Ñ. Bo3 Ð¸ Bo5 ÑÑ‡Ð¸Ñ‚Ð°ÑŽÑ‚ÑÑ Ð¾Ð´Ð¸Ð½Ð°ÐºÐ¾Ð²Ð¾ â€” ÑÐµÑ€Ð¸Ñ ÐµÑÑ‚ÑŒ ÑÐµÑ€Ð¸Ñ.
          Ð’ Ð·Ð°Ñ‡Ñ‘Ñ‚ Ð¸Ð´ÑƒÑ‚ Ñ‚Ð¾Ð»ÑŒÐºÐ¾ Ñ€ÐµÐ·ÑƒÐ»ÑŒÑ‚Ð°Ñ‚Ñ‹ Tier 1. ÐšÐ²Ð°Ð»Ð¸Ñ„Ð¸ÐºÐ°Ñ†Ð¸Ð¸, Ð¼ÐµÐ½ÐµÐµ Ð·Ð½Ð°Ñ‡Ð¸Ð¼Ñ‹Ðµ Ð¸Ð²ÐµÐ½Ñ‚Ñ‹, ÑˆÐ¾ÑƒÐ¼Ð°Ñ‚Ñ‡Ð¸ â€” Ð½Ð¸Ñ‡ÐµÐ³Ð¾ ÑÑ‚Ð¾Ð³Ð¾ Ð·Ð´ÐµÑÑŒ Ð½ÐµÑ‚.
          ÐÐµ Ð²Ð°Ð¶Ð½Ð¾, ÐºÐ°Ðº Ñ‚Ñ‹ Ð´Ð¾Ð¼Ð¸Ð½Ð¸Ñ€Ð¾Ð²Ð°Ð» Ð² Ð·Ð°ÐºÑ€Ñ‹Ñ‚Ð¾Ð¼ ÐºÐ²Ð°Ð»Ðµ.{' '}
          <span className="font-semibold" style={{ color: 'var(--text)' }}>ÐŸÐ¾ÐºÐ°Ð¶Ð¸ Ñ€ÐµÐ·ÑƒÐ»ÑŒÑ‚Ð°Ñ‚ Ð² Tier 1.</span>
        </p>
        <p>
          ÐÐ° Ð¿Ñ€Ð°ÐºÑ‚Ð¸ÐºÐµ ÑÑ‚Ð¾ Ð¾Ð·Ð½Ð°Ñ‡Ð°ÐµÑ‚: ÐµÑÐ»Ð¸ Ñ‚Ñ‹ Ð±Ñ‹Ð» Ð»ÑƒÑ‡ÑˆÐµÐ¹ ÐºÐ¾Ð¼Ð°Ð½Ð´Ð¾Ð¹ Ð¿Ð¾Ð»Ð³Ð¾Ð´Ð° Ð½Ð°Ð·Ð°Ð´, Ð½Ð¾ Ð¿Ð¾ÑÐ»ÐµÐ´Ð½ÐµÐµ Ð²Ñ€ÐµÐ¼Ñ Ð¿Ñ€Ð¾Ð¸Ð³Ñ€Ñ‹Ð²Ð°ÐµÑˆÑŒ â€”
          Ñ‚Ñ‹ ÑƒÐ¿Ð°Ð´Ñ‘ÑˆÑŒ. Ð•ÑÐ»Ð¸ Ð¾Ñ‚ Ñ‚ÐµÐ±Ñ Ð½Ð¸Ñ‡ÐµÐ³Ð¾ Ð½Ðµ Ð¾Ð¶Ð¸Ð´Ð°Ð»Ð¸, Ð½Ð¾ Ñ‚Ñ‹ Ð¿Ð¾Ð±ÐµÐ¶Ð´Ð°ÐµÑˆÑŒ â€” Ð¿Ð¾Ð´Ð½Ð¸Ð¼ÐµÑˆÑŒÑÑ.
          Ð ÐµÐ¹Ñ‚Ð¸Ð½Ð³ Ð½Ðµ Ð¿Ð¾Ð¼Ð½Ð¸Ñ‚ Ð¿Ñ€Ð¾ÑˆÐ»Ð¾Ð³Ð¾. ÐžÐ½ Ð¿Ð¾Ð¼Ð½Ð¸Ñ‚ Ñ‚Ð¾Ð»ÑŒÐºÐ¾ Ñ‚Ð¾, Ñ‡Ñ‚Ð¾ Ñ‚Ñ‹ ÑÐ´ÐµÐ»Ð°Ð» Ð½ÐµÐ´Ð°Ð²Ð½Ð¾.
        </p>
        <p>
          Ð§Ð¸ÑÐ»Ð¾ <span className="font-semibold" style={{ color: 'var(--text)' }}>+/âˆ’</span> Ñ€ÑÐ´Ð¾Ð¼ Ñ Ñ€ÐµÐ¹Ñ‚Ð¸Ð½Ð³Ð¾Ð¼ â€”
          ÑÑ‚Ð¾ Ð´Ð²Ð¸Ð¶ÐµÐ½Ð¸Ðµ Ð¾Ñ‚ Ð±Ð°Ð·Ð¾Ð²Ð¾Ð³Ð¾ Ð·Ð½Ð°Ñ‡ÐµÐ½Ð¸Ñ 1500. +225 Ð¾Ð·Ð½Ð°Ñ‡Ð°ÐµÑ‚, Ñ‡Ñ‚Ð¾ ÐºÐ¾Ð¼Ð°Ð½Ð´Ð° Ð·Ð°Ñ€Ð°Ð±Ð¾Ñ‚Ð°Ð»Ð° 225 Ð¾Ñ‡ÐºÐ¾Ð² Ð²Ñ‹ÑˆÐµ Ð±Ð°Ð·Ñ‹.
          âˆ’57 Ð¾Ð·Ð½Ð°Ñ‡Ð°ÐµÑ‚, Ñ‡Ñ‚Ð¾ ÐºÐ¾Ð¼Ð°Ð½Ð´Ð° Ð¿Ð¾Ñ‚ÐµÑ€ÑÐ»Ð° 57 Ð¾Ñ‚ ÑÑ‚Ð°Ñ€Ñ‚Ð¾Ð²Ð¾Ð¹ Ñ‚Ð¾Ñ‡ÐºÐ¸. Ð’ÑÑ‘ Ð¿Ñ€Ð¾ÑÑ‚Ð¾.
        </p>
      </div>

      {!teams?.length ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="text-4xl mb-3">ðŸ“Š</p>
          <p className="font-semibold mb-1">ELO Ð´Ð°Ð½Ð½Ñ‹Ñ… Ð¿Ð¾ÐºÐ° Ð½ÐµÑ‚</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Ð˜Ð¼Ð¿Ð¾Ñ€Ñ‚Ð¸Ñ€ÑƒÐ¹Ñ‚Ðµ Ñ‚ÑƒÑ€Ð½Ð¸Ñ€ Ð¸ Ð¿ÐµÑ€ÐµÑÑ‡Ð¸Ñ‚Ð°Ð¹Ñ‚Ðµ Ñ€ÐµÐ¹Ñ‚Ð¸Ð½Ð³.
          </p>
        </div>
      ) : (
        <>
          {/* â”€â”€ Top 3 podium â”€â”€ */}
          {teams.length >= 1 && (
            <div className="grid gap-3 md:grid-cols-3 mb-6">
              {teams.slice(0, Math.min(3, teams.length)).map((team, i) => {
                const elo = team.current_elo ?? 1500
                const diff = elo - 1500
                return (
                  <Link
                    key={team.id}
                    href={team.slug ? `/ru/teams/${team.slug}` : '/ru/teams'}
                    className="rounded-2xl p-5 relative overflow-hidden fade-in-up block hover:brightness-110 transition-all"
                    style={{
                      background: MEDAL_BG[i],
                      border: `1px solid ${MEDAL_BORDER[i]}`,
                      boxShadow: `var(--shadow-md), 0 0 0 1px ${MEDAL_BG[i]}`,
                      animationDelay: `${i * 0.06}s`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl">{MEDAL[i]}</span>
                      <span
                        className="text-xs font-black px-2.5 py-1 rounded-full"
                        style={{
                          background: MEDAL_BG[i],
                          color: MEDAL_COLOR[i],
                          border: `1px solid ${MEDAL_BORDER[i]}`,
                        }}
                      >
                        #{i + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mb-4">
                      {team.logo_url ? (
                        <Image
                          src={team.logo_url}
                          alt={team.name}
                          width={40}
                          height={40}
                          className="w-10 h-10 object-contain rounded-lg shrink-0"
                          style={{ background: 'rgba(255,255,255,0.04)' }}
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-black shrink-0"
                          style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}
                        >
                          {team.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-sm truncate">{team.name}</div>
                        {team.region && (
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {REGION_RU[team.region] ?? team.region}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-end justify-between">
                      <div>
                        <div
                          className="text-3xl font-black tabular-nums leading-none"
                          style={{ fontFamily: 'var(--font-oxanium), sans-serif', color: MEDAL_COLOR[i] }}
                        >
                          {elo}
                        </div>
                        <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                          ELO Ñ€ÐµÐ¹Ñ‚Ð¸Ð½Ð³
                        </div>
                      </div>
                      <span
                        className="text-sm font-bold tabular-nums"
                        style={{ color: diff >= 0 ? 'var(--correct)' : 'var(--wrong)' }}
                      >
                        {diff >= 0 ? '+' : ''}{diff}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* â”€â”€ Rest of rankings â”€â”€ */}
          {teams.length > 3 && (
            <div
              className="rounded-2xl overflow-hidden"
              style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
            >
              {teams.slice(3).map((team, idx) => {
                const i = idx + 3
                const elo = team.current_elo ?? 1500
                const barPct = ((elo - bottomElo) / Math.max(topElo - bottomElo, 1)) * 100
                const diff = elo - 1500

                return (
                  <Link
                    key={team.id}
                    href={team.slug ? `/ru/teams/${team.slug}` : '/ru/teams'}
                    className="flex items-center gap-4 px-4 py-3 relative overflow-hidden transition-colors duration-150 hover:bg-primary/5"
                    style={{
                      background: idx % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex',
                    }}
                  >
                    <div
                      className="absolute left-0 top-0 h-full opacity-[0.06] transition-all"
                      style={{ width: `${Math.max(barPct, 4)}%`, background: 'var(--accent)' }}
                    />

                    <span
                      className="text-xs font-bold w-7 text-center shrink-0 tabular-nums relative"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      #{i + 1}
                    </span>

                    {team.logo_url ? (
                      <Image
                        src={team.logo_url}
                        alt={team.name}
                        width={28}
                        height={28}
                        className="w-7 h-7 object-contain rounded shrink-0 relative"
                      />
                    ) : (
                      <div
                        className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold shrink-0 relative"
                        style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}
                      >
                        {team.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div className="flex-1 min-w-0 relative">
                      <div className="font-semibold text-sm">{team.name}</div>
                      {team.region && (
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {team.region}
                        </div>
                      )}
                    </div>

                    <div className="text-right relative shrink-0">
                      <div className="text-base font-bold tabular-nums" style={{ fontFamily: 'var(--font-oxanium), sans-serif' }}>{elo}</div>
                      <div
                        className="text-xs font-medium tabular-nums"
                        style={{ color: diff >= 0 ? 'var(--correct)' : 'var(--wrong)' }}
                      >
                        {diff >= 0 ? '+' : ''}{diff}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </>
      )}

      {inactiveTeams && inactiveTeams.length > 0 && (
        <div className="mt-10">
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
            Ð Ð°ÑÑ„Ð¾Ñ€Ð¼Ð¸Ñ€Ð¾Ð²Ð°Ð½Ñ‹ / ÐÐµÐ°ÐºÑ‚Ð¸Ð²Ð½Ñ‹
          </p>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', opacity: 0.5 }}>
            {inactiveTeams.map((team, idx) => (
              <Link
                key={team.id}
                href={team.slug ? `/teams/${team.slug}` : '/teams'}
                className="flex items-center gap-4 px-4 py-3 hover:opacity-80 transition-opacity"
                style={{
                  background: idx % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)',
                  borderBottom: idx < inactiveTeams.length - 1 ? '1px solid var(--border)' : undefined,
                }}
              >
                {team.logo_url ? (
                  <Image src={team.logo_url} alt={team.name} width={28} height={28} className="w-7 h-7 object-contain rounded shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold shrink-0" style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}>
                    {team.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{team.name}</div>
                  {team.region && (
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {REGION_RU[team.region] ?? team.region}
                    </div>
                  )}
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}>
                  Ð Ð°ÑÑ„Ð¾Ñ€Ð¼Ð¸Ñ€Ð¾Ð²Ð°Ð½Ð°
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
