import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ELO_TABLE: Record<string, number> = {
  'Tundra Esports':    6610,
  'Aurora Gaming':     4730,
  'Xtreme Gaming':     4660,
  'PARIVISION':        4310,
  'Team Liquid':       4125,
  'Team Yandex':       3700,
  'Team Spirit':       3300,
  'Team Falcons':      3125,
  'OG':                2100,
  'MOUZ':              1560,
  'BetBoom Team':      1460,
  'Virtus.pro':        1000,
  'Natus Vincere':      800,
  'GamerLegion':        512,
  'Nigma Galaxy':       500,
  'Power Rangers':      400,
  'Pipsqueak+4':        400,
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

export async function POST() {
  const supabase = createAdminClient()
  const log: string[] = []
  let updated = 0
  let notFound = 0

  for (const [name, elo] of Object.entries(ELO_TABLE)) {
    const { data, error } = await supabase
      .from('teams')
      .update({ current_elo: elo })
      .ilike('name', name)
      .select('name')

    if (error) {
      log.push(`❌ ${name}: ${error.message}`)
    } else if (!data?.length) {
      log.push(`⚠️ ${name}: not found in DB`)
      notFound++
    } else {
      log.push(`✅ ${data[0].name}: ${elo}`)
      updated++
    }
  }

  // Null out ELO for any team not in the ratings table
  const knownNames = Object.keys(ELO_TABLE)
  const { data: allTeams } = await supabase.from('teams').select('id, name, current_elo')
  const toWipe = (allTeams ?? []).filter(t =>
    !knownNames.some(n => n.toLowerCase() === t.name.toLowerCase())
  )
  for (const t of toWipe) {
    await supabase.from('teams').update({ is_active: false }).eq('id', t.id)
    log.push(`🗑 ${t.name}: deactivated`)
  }

  return NextResponse.json({ ok: true, updated, notFound, removed: toWipe.length, log })
}
