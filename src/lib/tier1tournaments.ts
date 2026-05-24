// PandaScore league IDs (NOT OpenDota/Valve IDs):
//   PGL  → 4108  (all Wallachia seasons share this league ID)
//   ESL  → 4114  (ESL One series)
// DreamLeague IDs are unconfirmed — update when syncing fails.
// ps_group_stage_id / ps_playoff_id: PandaScore sub-tournament IDs for Swiss + bracket display.

export const TIER1_TOURNAMENTS = [
  { league_id: 16935, name: 'The International 2024',       slug: 'ti-2024',       start_date: '2024-09-05', end_date: '2024-09-15' },
  { league_id: 4108,  name: 'PGL Wallachia 2024 Season 2',  slug: 'pgl-walla-2024-s2', start_date: '2024-10-17', end_date: '2024-10-27' },
  { league_id: 17272, name: 'DreamLeague Season 24',        slug: 'dl-s24',        start_date: '2024-11-18', end_date: '2024-12-01' },
  { league_id: 17765, name: 'DreamLeague Season 25',        slug: 'dl-s25',        start_date: '2025-01-13', end_date: '2025-01-26' },
  { league_id: 4108,  name: 'PGL Wallachia 2025 Season 3',  slug: 'pgl-walla-2025-s3', start_date: '2025-02-06', end_date: '2025-02-16' },
  { league_id: 4108,  name: 'PGL Wallachia 2025 Season 4',  slug: 'pgl-walla-2025-s4', start_date: '2025-03-06', end_date: '2025-03-16' },
  { league_id: 18111, name: 'DreamLeague Season 26',        slug: 'dl-s26',        start_date: '2025-04-07', end_date: '2025-04-20' },
  { league_id: 18324, name: 'The International 2025',       slug: 'ti-2025',       start_date: '2025-07-10', end_date: '2025-07-20' },
  { league_id: 4108,  name: 'PGL Wallachia 2025 Season 5',  slug: 'pgl-walla-2025-s5', start_date: '2025-08-21', end_date: '2025-08-31' },
  { league_id: 4108,  name: 'PGL Wallachia 2025 Season 6',  slug: 'pgl-walla-2025-s6', start_date: '2025-10-02', end_date: '2025-10-12' },
  { league_id: 18988, name: 'DreamLeague Season 27',        slug: 'dl-s27',        start_date: '2025-11-10', end_date: '2025-11-23' },
  { league_id: 19269, name: 'DreamLeague Season 28',        slug: 'dl-s28',        start_date: '2026-01-20', end_date: '2026-02-02' },
  { league_id: 4108,  name: 'PGL Wallachia 2026 Season 7',  slug: 'pgl-walla-2026-s7', start_date: '2026-03-07', end_date: '2026-03-15' },
  { league_id: 4114,  name: 'ESL One Birmingham 2026',      slug: 'esl-one-birmingham-2026', start_date: '2026-03-22', end_date: '2026-03-29' },
  { league_id: 4108,  name: 'PGL Wallachia 2026 Season 8',  slug: 'pgl-wallachia-2026-season-8', start_date: '2026-04-16', end_date: '2026-04-26', ps_serie_id: 10457, ps_group_stage_id: 20655, ps_playoff_id: 20802 },
  { league_id: 4125,  name: 'DreamLeague Season 29',        slug: 'dreamleague-season-29', start_date: '2026-05-13', end_date: '2026-05-25', ps_serie_id: 10590, ps_group_stage_id: 20946 },
  { league_id: 5319,  name: 'BLAST Slam Season 7',          slug: 'blast-slam-7',          start_date: '2026-05-26', end_date: '2026-06-01', ps_serie_id: 10551, ps_group_stage_id: 20836 },
]
