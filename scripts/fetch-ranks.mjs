const RANK_NAMES = ['', 'Herald', 'Guardian', 'Crusader', 'Archon', 'Legend', 'Ancient', 'Divine', 'Immortal'];

function decodeRank(tier) {
  if (!tier) return null;
  const medal = Math.floor(tier / 10);
  const stars = tier % 10;
  if (medal === 8) return 'Immortal';
  return stars ? `${RANK_NAMES[medal]} ${stars}` : RANK_NAMES[medal];
}

const players = [
  { ign: 'Yatoro',        id: 138264143 },
  { ign: 'Collapse',      id: 302214028 },
  { ign: 'Miposhka',      id: 113331514 },
  { ign: 'gpk',           id: 480412663 },
  { ign: 'TORONTOTOKYO',  id: 431770905 },
  { ign: 'Pure',          id: 331855530 },
  { ign: 'Nisha',         id: 201358612 },
  { ign: 'ATF',           id: 1922332243 },
  { ign: 'skiter',        id: 100058342 },
  { ign: 'Cr1t-',         id: 25907144 },
  { ign: 'Boxi',          id: 77490514 },
  { ign: 'Micke',         id: 152962063 },
  { ign: 'Insania',       id: 54580962 },
  { ign: 'Saksa',         id: 103735745 },
  { ign: 'Malr1ne',       id: 898455820 },
  { ign: 'bzm',           id: 93618577 },
  { ign: 'Nightfall',     id: 124801257 },
  { ign: 'Watson',        id: 171262902 },
  { ign: 'Noticed',       id: 195108598 },
  { ign: 'Save-',         id: 317880638 },
  { ign: 'Kiyotaka',      id: 858106446 },
  { ign: 'Chira_Junior',  id: 312436974 },
  { ign: 'Malady',        id: 93817671 },
  { ign: 'Sneyking',      id: 10366616 },
  { ign: 'Dukalis',       id: 73401082 },
  { ign: 'DM',            id: 56351509 },
  { ign: 'Rue',           id: 847565596 },
  { ign: 'Larl',          id: 106305042 },
  { ign: 'Panto',         id: 108958769 },
  { ign: 'Saberlight',    id: 126212866 },
  { ign: '9class',        id: 164199202 },
  { ign: 'ACE',           id: 97590558 },
  { ign: 'Tofu',          id: 16497807 },
];

for (const p of players) {
  const res = await fetch(`https://api.opendota.com/api/players/${p.id}`);
  const data = await res.json();
  const rank = decodeRank(data.rank_tier);
  console.log(`${p.ign.padEnd(16)} ${(rank ?? 'private').padEnd(12)} rank_tier=${data.rank_tier ?? 'null'}`);
  await new Promise(r => setTimeout(r, 300));
}
