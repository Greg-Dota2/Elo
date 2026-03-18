import { redirect, notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'

// Catch-all for old WordPress URLs like /team-falcons/ or /bzm/
// Checks teams then players and 301 redirects to the correct new URL.

interface Props {
  params: Promise<{ slug: string }>
}

export default async function LegacySlugRedirect({ params }: Props) {
  const { slug } = await params
  const supabase = createAdminClient()

  // Try team first
  const { data: team } = await supabase
    .from('teams')
    .select('slug')
    .eq('slug', slug)
    .single()

  if (team?.slug) redirect(`/teams/${team.slug}`)

  // Try player
  const { data: player } = await supabase
    .from('players')
    .select('slug')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (player?.slug) redirect(`/players/${player.slug}`)

  // Try tournament
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('slug')
    .eq('slug', slug)
    .single()

  if (tournament?.slug) redirect(`/tournaments/${tournament.slug}`)

  notFound()
}
