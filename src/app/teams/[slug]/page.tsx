import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getTeamBySlug } from '@/lib/queries'
import { createAdminClient } from '@/lib/supabase/admin'
import BioRenderer from '@/components/BioRenderer'
import type { Team } from '@/lib/types'

export const revalidate = 300

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  try {
    const team = await getTeamBySlug(slug) as Team
    const title = `${team.name} — Dota 2 Team Profile`
    const description = team.bio
      ? team.bio.replace(/^#+ /gm, '').slice(0, 155)
      : `${team.name} Dota 2 team stats, ELO rating, roster, and match history on Dota2ProTips.`
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `/teams/${slug}`,
        ...(team.logo_url ? { images: [{ url: team.logo_url, alt: team.name }] } : {}),
      },
      twitter: { card: 'summary', title, description },
      alternates: { canonical: `/teams/${slug}` },
    }
  } catch {
    return { title: 'Team Not Found' }
  }
}

const REGION_FLAG: Record<string, string> = {
  'Western Europe': '🇪🇺',
  'Eastern Europe': '🌍',
  'China': '🇨🇳',
  'Southeast Asia': '🌏',
  'North America': '🇺🇸',
  'South America': '🌎',
  'CIS': '🌍',
}

export default async function TeamDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  let team: Team
  try {
    team = await getTeamBySlug(slug) as Team
  } catch {
    notFound()
  }

  // Get players on this team
  const supabase = createAdminClient()
  const { data: players } = await supabase
    .from('players')
    .select('id, slug, ign, full_name, photo_url, position')
    .eq('team_id', team.id)
    .eq('is_published', true)
    .order('position', { ascending: true, nullsFirst: false })

  // W/L record from match_predictions
  const { data: matchRows } = await supabase
    .from('match_predictions')
    .select('team_1_id, team_2_id, actual_winner_id')
    .eq('is_published', true)
    .not('actual_winner_id', 'is', null)
    .or(`team_1_id.eq.${team.id},team_2_id.eq.${team.id}`)

  let wins = 0, losses = 0
  for (const row of matchRows ?? []) {
    if (row.actual_winner_id === team.id) wins++
    else losses++
  }
  const total = wins + losses
  const winRate = total > 0 ? Math.round((wins / total) * 100) : null

  const posLabel: Record<number, string> = {
    1: 'Carry', 2: 'Mid', 3: 'Offlane', 4: 'Soft Support', 5: 'Hard Support',
  }

  return (
    <div className="fade-in-up">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Teams', item: 'https://dota2protips.com/teams' },
              { '@type': 'ListItem', position: 2, name: team.name, item: `https://dota2protips.com/teams/${slug}` },
            ],
          }),
        }}
      />
      {/* Back */}
      <Link href="/teams" className="inline-flex items-center gap-1 text-sm mb-6 hover:text-primary transition-colors" style={{ color: 'var(--text-muted)' }}>
        ← All Teams
      </Link>

      {/* Banner */}
      {team.banner_url && (
        <div className="rounded-2xl overflow-hidden mb-6 border border-border/60" style={{ maxHeight: 260 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img loading="lazy" src={team.banner_url} alt={`${team.name} banner`} className="w-full h-full object-cover" style={{ maxHeight: 260 }} />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-5 mb-8">
        <div className="w-20 h-20 rounded-2xl border border-border/60 bg-secondary/80 flex items-center justify-center shrink-0 overflow-hidden p-2">
          {team.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img loading="lazy" src={team.logo_url} alt={team.name} className="w-full h-full object-contain" />
          ) : (
            <span className="font-display text-2xl font-bold text-muted-foreground">
              {team.name.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="font-display text-3xl font-bold text-foreground leading-tight">{team.name}</h1>
          {team.short_name && team.short_name !== team.name && (
            <p className="text-muted-foreground text-sm mt-0.5">{team.short_name}</p>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3">
            {team.region && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <span>{REGION_FLAG[team.region] ?? '🌐'}</span>
                <span>{team.region}</span>
              </span>
            )}
            {team.founded_year && (
              <span className="text-sm text-muted-foreground">Est. {team.founded_year}</span>
            )}
            {total > 0 && (
              <span className="text-sm text-muted-foreground">
                <span className="text-success font-semibold">{wins}W</span>
                {' · '}
                <span className="text-destructive font-semibold">{losses}L</span>
                {winRate !== null && ` · ${winRate}%`}
              </span>
            )}
            <span className="font-display font-bold text-sm">
              ELO {team.current_elo}
            </span>
          </div>
        </div>

        {/* External links */}
        <div className="flex flex-col gap-2 shrink-0">
          {team.liquipedia_url && (
            <a href={team.liquipedia_url} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 rounded-lg border border-border/60 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors">
              Liquipedia ↗
            </a>
          )}
          {team.website_url && (
            <a href={team.website_url} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 rounded-lg border border-border/60 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors">
              Website ↗
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        {/* Left column */}
        <div className="grid gap-6">
          {/* Bio */}
          {team.bio && (
            <div className="rounded-2xl border border-border/60 p-5" style={{ background: 'hsl(var(--card) / 0.6)' }}>
              <p className="section-label mb-3">About</p>
              <BioRenderer text={team.bio} />
            </div>
          )}

          {/* Achievements */}
          {team.achievements && (
            <div className="rounded-2xl border border-border/60 p-5" style={{ background: 'hsl(var(--card) / 0.6)' }}>
              <p className="section-label mb-3">Achievements</p>
              <BioRenderer text={team.achievements} />
            </div>
          )}
        </div>

        {/* Right column — roster */}
        {players && players.length > 0 && (
          <div className="rounded-2xl border border-border/60 p-5 h-fit" style={{ background: 'hsl(var(--card) / 0.6)' }}>
            <p className="section-label mb-3">Roster</p>
            <div className="grid gap-2">
              {players.map(p => (
                <Link
                  key={p.id}
                  href={`/players/${p.slug}`}
                  className="flex items-center gap-3 rounded-xl p-2 -mx-2 transition-colors hover:bg-primary/5"
                >
                  <div className="w-9 h-9 rounded-xl border border-border/60 bg-secondary/80 flex items-center justify-center shrink-0 overflow-hidden">
                    {p.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img loading="lazy" src={p.photo_url} alt={p.ign} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-display text-xs font-bold text-muted-foreground">
                        {p.ign.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-semibold text-sm text-foreground truncate">{p.ign}</div>
                    {p.full_name && <div className="text-xs text-muted-foreground truncate">{p.full_name}</div>}
                  </div>
                  {p.position && (
                    <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ background: 'hsl(var(--secondary))', color: 'hsl(var(--primary))' }}>
                      {p.position} · {posLabel[p.position]}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
