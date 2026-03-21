// Fetch all pro players from OpenDota, match against our known IGNs
const res = await fetch('https://api.opendota.com/api/proPlayers');
const pros = await res.json();

// Our DB players (IGNs)
const ourPlayers = [
  'Yatoro', 'Collapse', 'Miposhka', 'gpk', 'TORONTOTOKYO', 'Pure', 'Nisha',
  'ATF', 'skiter', 'Cr1t-', 'Boxi', 'Micke', 'Insania', 'Saksa', 'Noone',
  'Malr1ne', 'bzm', 'Nightfall', 'Watson', 'Noticed', 'Save-', 'Kiyotaka',
  'Chira_Junior', 'Malady', 'Sneyking', 'Miera', 'Dukalis', 'DM', 'Rue',
  'Larl', 'Panto', 'Saberlight', '9class', 'ACE', 'Tofu',
];

console.log('IGN => OpenDota account_id, team');
console.log('---');
for (const ign of ourPlayers) {
  const lower = ign.toLowerCase().replace(/[-_~]/g, '');
  const found = pros.find(p => {
    const name = (p.name ?? '').toLowerCase().replace(/[-_~]/g, '');
    const persona = (p.personaname ?? '').toLowerCase().replace(/[-_~]/g, '');
    return name === lower || persona === lower ||
           name.includes(lower) || persona.includes(lower);
  });
  if (found) {
    console.log(`${ign}: ${found.account_id} (OpenDota name: "${found.name}" | team: ${found.team_name})`);
  } else {
    console.log(`${ign}: NOT FOUND`);
  }
}
