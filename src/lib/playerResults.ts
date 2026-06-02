// Attributes a player's tournament results to the team they were ON at each
// tournament's time — reconstructed from the transfers table — rather than
// their current team. Fixes acquired/moved squads (e.g. Tundra → 1Win) losing
// the trophies they earned under the old team name.

export interface TournamentPrizeRow {
  name: string
  slug: string
  logo_url: string | null
  end_date: string | null
  prize_distribution:
    | { place: string; team: string; prize_usd?: number; ept_points?: number; club_reward?: number }[]
    | null
}

export interface PlayerTransferRow {
  from_team: string | null
  to_team: string | null
  transfer_date: string
}

export interface PlayerPlacement {
  tournament: { name: string; slug: string; logo_url: string | null }
  place: string
  prize_usd?: number
  ept_points?: number
  club_reward?: number
}

/**
 * Which team was the player on at `dateISO`?
 * `transfers` MUST be sorted ascending by transfer_date.
 * - before the first transfer  → that transfer's from_team
 * - otherwise                  → to_team of the latest transfer on/before the date
 * - no transfers / null date   → currentTeamName (backward-compatible)
 */
export function teamAtDate(
  transfers: PlayerTransferRow[],
  dateISO: string | null,
  currentTeamName: string,
): string {
  if (!transfers.length || !dateISO) return currentTeamName
  const D = new Date(dateISO).getTime()
  if (D < new Date(transfers[0].transfer_date).getTime()) {
    return transfers[0].from_team ?? currentTeamName
  }
  let team = currentTeamName
  for (const t of transfers) {
    if (new Date(t.transfer_date).getTime() <= D) team = t.to_team ?? team
    else break
  }
  return team
}

export function computePlayerPlacements(
  tournaments: TournamentPrizeRow[],
  transfers: PlayerTransferRow[],
  currentTeamName: string,
): PlayerPlacement[] {
  const out: PlayerPlacement[] = []
  for (const t of tournaments) {
    const teamName = teamAtDate(transfers, t.end_date, currentTeamName)
    const entry = t.prize_distribution?.find(p => p.team.toLowerCase() === teamName.toLowerCase())
    if (entry) {
      out.push({
        tournament: { name: t.name, slug: t.slug, logo_url: t.logo_url },
        place: entry.place,
        prize_usd: entry.prize_usd,
        ept_points: entry.ept_points,
        club_reward: entry.club_reward,
      })
    }
  }
  return out
}
