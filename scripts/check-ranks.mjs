const ids = [138264143, 302214028, 480412663, 331855530, 201358612, 25907144, 54580962, 103735745, 317880638, 898455820];

for (const id of ids) {
  const res = await fetch(`https://api.opendota.com/api/players/${id}`);
  const p = await res.json();
  console.log(JSON.stringify({
    id,
    name: p.profile?.personaname,
    rank_tier: p.rank_tier,
    mmr_estimate: p.mmr_estimate?.estimate,
  }));
  await new Promise(r => setTimeout(r, 500));
}
