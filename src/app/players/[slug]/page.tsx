import { getPlayerBySlug } from '@/lib/queries'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import BioRenderer from '@/components/BioRenderer'
import { heroDisplayNameToSlug } from '@/lib/heroes'

export const revalidate = 300

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  try {
    const player = await getPlayerBySlug(slug)
    const posLabel: Record<number, string> = { 1: 'Carry', 2: 'Mid', 3: 'Offlane', 4: 'Soft Support', 5: 'Hard Support' }
    const role = player.position ? posLabel[player.position] : null
    const team = player.team?.name
    const baseTitle = `${player.ign} — Dota 2 Player`
    const withFull = player.full_name ? `${player.ign} (${player.full_name}) — Dota 2 Player` : baseTitle
    const title = (withFull.length + 16) <= 70 ? withFull : baseTitle
    const description = player.bio
      ? player.bio.replace(/^#+\s*/gm, '').slice(0, 155)
      : `${player.ign} is a professional Dota 2 player${role ? `, ${role}` : ''}${team ? ` for ${team}` : ''}. Profile, stats and career on Dota2ProTips.`
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `/players/${slug}`,
        ...(player.photo_url ? { images: [{ url: player.photo_url, alt: player.ign }] } : {}),
      },
      twitter: { card: 'summary', title, description },
      alternates: { canonical: `/players/${slug}` },
    }
  } catch {
    return { title: 'Player Not Found' }
  }
}

interface Props { params: Promise<{ slug: string }> }

const POSITION_LABEL: Record<number, string> = { 1: 'Carry (Pos 1)', 2: 'Mid (Pos 2)', 3: 'Offlane (Pos 3)', 4: 'Soft Support (Pos 4)', 5: 'Hard Support (Pos 5)' }
const POSITION_COLOR: Record<number, string> = {
  1: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  2: 'text-primary bg-primary/10 border-primary/20',
  3: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  4: 'text-success bg-success/10 border-success/20',
  5: 'text-success bg-success/10 border-success/20',
}

function age(dob: string) {
  const diff = Date.now() - new Date(dob).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

export default async function PlayerPage({ params }: Props) {
  const { slug } = await params
  let player
  try { player = await getPlayerBySlug(slug) } catch { notFound() }

  const posColor = player.position ? POSITION_COLOR[player.position] : ''

  return (
    <div className="fade-in-up">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Players', item: 'https://dota2protips.com/players' },
              { '@type': 'ListItem', position: 2, name: player.ign, item: `https://dota2protips.com/players/${slug}` },
            ],
          }),
        }}
      />
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-xs text-muted-foreground">
        <Link href="/players" className="hover:text-foreground transition-colors">Players</Link>
        <span className="text-muted-foreground/40">/</span>
        <span>{player.ign}</span>
      </div>

      {/* Hero card */}
      <div className="rounded-2xl border border-border/60 bg-card/60 overflow-hidden mb-6">
        <div className="flex flex-col sm:flex-row">
          {/* Photo */}
          <div className="sm:w-52 shrink-0 bg-secondary/60">
            {player.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={player.photo_url}
                alt={player.ign}
                className="w-full h-64 sm:h-full object-cover object-top"
              />
            ) : (
              <div className="w-full h-52 sm:h-full flex items-center justify-center">
                <span className="font-display text-6xl font-black text-muted-foreground/20">
                  {player.ign.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="flex-1 p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h1 className="font-display text-3xl font-black tracking-tight">{player.ign}</h1>
                {player.full_name && (
                  <p className="text-muted-foreground text-sm mt-0.5">{player.full_name}</p>
                )}
              </div>
              {player.liquipedia_url && (
                <a
                  href={player.liquipedia_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors shrink-0"
                >
                  Liquipedia ↗
                </a>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {player.team && (
                <div>
                  <p className="section-label mb-1">Team</p>
                  <div className="flex items-center gap-2">
                    {player.team.logo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img loading="lazy" src={player.team.logo_url} alt={player.team.name} className="w-5 h-5 object-contain rounded" />
                    )}
                    {player.team.slug ? (
                      <Link href={`/teams/${player.team.slug}`} className="font-semibold text-foreground hover:text-primary transition-colors">
                        {player.team.name}
                      </Link>
                    ) : (
                      <span className="font-semibold text-foreground">{player.team.name}</span>
                    )}
                  </div>
                </div>
              )}
              {player.position && (
                <div>
                  <p className="section-label mb-1">Role</p>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${posColor}`}>
                    {POSITION_LABEL[player.position]}
                  </span>
                </div>
              )}
              {player.nationality && (
                <div>
                  <p className="section-label mb-1">Nationality</p>
                  <span className="text-foreground font-semibold">{player.nationality}</span>
                </div>
              )}
              {player.date_of_birth && (
                <div>
                  <p className="section-label mb-1">Age</p>
                  <span className="text-foreground font-semibold">
                    {age(player.date_of_birth)} years
                    <span className="text-muted-foreground font-normal ml-1.5 text-xs">
                      ({new Date(player.date_of_birth).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})
                    </span>
                  </span>
                </div>
              )}
              <div>
                <p className="section-label mb-1">Rank</p>
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://www.opendota.com/assets/images/dota2/rank_icons/rank_icon_8.png"
                    alt="Immortal"
                    className="w-8 h-8 object-contain"
                  />
                  <span className="text-foreground font-semibold">Immortal</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Signature heroes */}
        {player.signature_heroes && player.signature_heroes.length > 0 && (
          <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
            <p className="section-label mb-3">Signature Heroes</p>
            <div className="flex flex-wrap gap-2">
              {player.signature_heroes.map(hero => (
                <Link
                  key={hero}
                  href={`/heroes/${heroDisplayNameToSlug(hero)}`}
                  className="text-sm font-semibold px-3 py-1.5 rounded-xl border border-border/60 bg-secondary/60 text-foreground hover:border-primary/40 hover:text-primary transition-colors duration-200"
                >
                  {hero}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Previous teams */}
        {player.previous_teams && (
          <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
            <p className="section-label mb-3">Previous Teams</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{player.previous_teams}</p>
          </div>
        )}

        {/* Achievements */}
        {player.achievements && (
          <div className="rounded-2xl border border-border/60 bg-card/40 p-5 md:col-span-2">
            <p className="section-label mb-3">Notable Achievements</p>
            <BioRenderer text={player.achievements} />
          </div>
        )}

        {/* Bio */}
        {player.bio && (
          <div className="rounded-2xl border border-border/60 bg-card/40 p-5 md:col-span-2">
            <p className="section-label mb-3">Biography</p>
            <BioRenderer text={player.bio} />
          </div>
        )}
      </div>
    </div>
  )
}
