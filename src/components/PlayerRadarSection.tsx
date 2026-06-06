import { fetchPlayerRadarStats } from '@/lib/opendota'
import PlayerRadar from './PlayerRadar'

// OpenDota-backed player performance radar — rendered inside a Suspense boundary
// so it never blocks the player page shell.
export default async function PlayerRadarSection({ opendotaId }: { opendotaId: number }) {
  const stats = await fetchPlayerRadarStats(opendotaId).catch(() => null)
  if (!stats) return null
  return <PlayerRadar stats={stats} />
}
