import { createAdminClient } from '@/lib/supabase/admin'

const POSITION_LABELS: Record<number, string> = {
  1: 'Carry',
  2: 'Mid',
  3: 'Offlane',
  4: 'Soft Support',
  5: 'Hard Support',
}

export default async function PlayerCard({ slug }: { slug: string }) {
  const admin = createAdminClient()
  const { data: player } = await admin
    .from('players')
    .select('ign, full_name, slug, photo_url, position, team:teams(name, slug)')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (!player) return null

  const team = Array.isArray(player.team) ? player.team[0] as { name: string; slug: string } | undefined : player.team as { name: string; slug: string } | null
  const posLabel = player.position ? POSITION_LABELS[player.position] : null

  return (
    <a
      href={`/players/${slug}`}
      className="flex items-center gap-4 rounded-2xl px-5 py-4 my-6 transition-opacity hover:opacity-80 no-underline"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', textDecoration: 'none' }}
    >
      {player.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={player.photo_url}
          alt={player.ign}
          className="w-14 h-14 rounded-xl object-cover shrink-0"
        />
      ) : (
        <div className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center text-2xl font-black" style={{ background: 'var(--surface-3)' }}>
          {player.ign[0]}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-display font-bold text-lg leading-tight" style={{ color: 'var(--text)' }}>
          {player.ign}
        </p>
        {player.full_name && (
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{player.full_name}</p>
        )}
        <p className="text-xs mt-1 font-semibold" style={{ color: 'var(--text-muted)' }}>
          {[posLabel, team?.name].filter(Boolean).join(' · ')}
        </p>
      </div>
      <span className="ml-auto text-xs font-semibold shrink-0" style={{ color: 'hsl(var(--primary))' }}>
        View player →
      </span>
    </a>
  )
}
