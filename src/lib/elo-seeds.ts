// Seed ELOs — used as starting points for recalculation.
// Teams not listed here start from BASE_ELO.
export const ELO_SEEDS: Record<string, number> = {
  'Tundra Esports':    6610,
  'Team Yandex':       5500,
  'Team Liquid':       5000,
  'Aurora Gaming':     4730,
  'Xtreme Gaming':     4660,
  'Team Spirit':       3300,
  'Team Falcons':      3125,
  'PARIVISION':        3000,
  'OG':                2100,
  'MOUZ':              1560,
  'BetBoom Team':      1460,
  'Virtus.pro':        1000,
  'Natus Vincere':      800,
  'GamerLegion':        512,
  'Nigma Galaxy':       500,
  'Power Rangers':      400,
  'VP.Prodigy':         400,
  'Pipsqueak+4':        400,
  'Zero Tenacity':      400,
  'Yellow Submarine':   400,
  'L1GA TEAM':          400,
  'HEROIC':             300,
  'Yakult Brothers':    288,
  'Vici Gaming':        280,
  'paiN Gaming':        212,
  'Pasika UA':          200,
  'Amaru Gaming':       147,
  '1w Team':            140,
  'REKONIX':            100,
  'Execration':          48,
  'Team Nemesis':         0,
  'Passion UA':           0,
  'Runa Team':            0,
  'Team Tidebound':       0,
}

// These teams are always forced to the top in this order, regardless of match results.
// Their ELO is set to: (highest recalculated ELO + gap * position)
export const PINNED_TOP = ['Tundra Esports', 'Team Yandex', 'Team Liquid']
export const PINNED_GAP = 500
