// Populates opendota_id for known players via Supabase REST API
// Run AFTER adding the column: ALTER TABLE players ADD COLUMN opendota_id bigint;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars');
  process.exit(1);
}

// IGN (as stored in DB) => OpenDota account_id
const mappings = [
  { ign: 'Yatoro',       opendota_id: 138264143 },
  { ign: 'Collapse',     opendota_id: 302214028 },
  { ign: 'Miposhka',     opendota_id: 113331514 },
  { ign: 'gpk',          opendota_id: 480412663 },
  { ign: 'TORONTOTOKYO', opendota_id: 431770905 },
  { ign: 'Pure',         opendota_id: 331855530 },
  { ign: 'Nisha',        opendota_id: 201358612 },
  { ign: 'ATF',          opendota_id: 1922332243 },
  { ign: 'skiter',       opendota_id: 100058342 },
  { ign: 'Cr1t-',        opendota_id: 25907144 },
  { ign: 'Boxi',         opendota_id: 77490514 },
  { ign: 'Micke',        opendota_id: 152962063 },
  { ign: 'Insania',      opendota_id: 54580962 },
  { ign: 'Saksa',        opendota_id: 103735745 },
  { ign: 'Malr1ne',      opendota_id: 898455820 },
  { ign: 'bzm',          opendota_id: 93618577 },
  { ign: 'Nightfall',    opendota_id: 124801257 },
  { ign: 'Watson',       opendota_id: 171262902 },
  { ign: 'Noticed',      opendota_id: 195108598 },
  { ign: 'Save-',        opendota_id: 317880638 },
  { ign: 'Kiyotaka',     opendota_id: 858106446 },
  { ign: 'Chira_Junior', opendota_id: 312436974 },
  { ign: 'Malady',       opendota_id: 93817671 },
  { ign: 'Sneyking',     opendota_id: 10366616 },
  { ign: 'Dukalis',      opendota_id: 73401082 },
  { ign: 'DM',           opendota_id: 56351509 },
  { ign: 'Rue',          opendota_id: 847565596 },
  { ign: 'Larl',         opendota_id: 106305042 },
  { ign: 'Panto',        opendota_id: 108958769 },
  { ign: 'Saberlight',   opendota_id: 126212866 },
  { ign: '9class',       opendota_id: 164199202 },
  { ign: 'ACE',          opendota_id: 97590558 },
  { ign: 'Tofu',         opendota_id: 16497807 },
];

for (const { ign, opendota_id } of mappings) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/players?ign=eq.${encodeURIComponent(ign)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ opendota_id }),
    }
  );
  console.log(`${ign}: ${res.ok ? 'OK' : res.status + ' ' + await res.text()}`);
}
