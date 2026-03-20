// Pure ELO calculation functions — no I/O, fully testable

export const BASE_ELO = 1500
export const BASE_K = 32
export const MIN_ELO = 800
export const MAX_ELO = 3500

export type MatchStage = 'group' | 'playoffs' | 'grand_final' | string

// Win probability for team A against team B
export function expectedScore(eloA: number, eloB: number): number {
  return 1 / (1 + Math.pow(10, (eloB - eloA) / 400))
}

// K-factor multiplier by stage
function stageMult(stage: MatchStage): number {
  if (/grand.?final/i.test(stage)) return 1.5
  if (/playoff|semifinal|quarterfinal|upper|lower|bracket/i.test(stage)) return 1.2
  return 1.0
}

// Series weight — rewards convincing wins (2-0 > 2-1)
function seriesWeight(winnerScore: number, loserScore: number): number {
  return winnerScore / (winnerScore + loserScore)
}

export interface EloResult {
  newEloA: number
  newEloB: number
  changeA: number
  changeB: number
  expectedA: number
}

export function calculateElo(
  eloA: number,
  eloB: number,
  teamAWon: boolean,
  scoreWinner: number,
  scoreLoser: number,
  stage: MatchStage,
  K = BASE_K
): EloResult {
  const expA = expectedScore(eloA, eloB)
  const expB = 1 - expA

  const sA = teamAWon ? 1.0 : 0.0
  const sB = 1.0 - sA

  const weight = seriesWeight(scoreWinner, scoreLoser)
  const mult = stageMult(stage)
  const effK = K * mult * weight

  const changeA = Math.round(effK * (sA - expA))
  const changeB = Math.round(effK * (sB - expB))

  return {
    newEloA: Math.min(MAX_ELO, Math.max(MIN_ELO, eloA + changeA)),
    newEloB: Math.min(MAX_ELO, Math.max(MIN_ELO, eloB + changeB)),
    changeA,
    changeB,
    expectedA: expA,
  }
}

// Per-game win probability for display on the ELO bar
export function winProbability(eloA: number, eloB: number): { pctA: number; pctB: number } {
  const pA = Math.round(expectedScore(eloA, eloB) * 100)
  return { pctA: pA, pctB: 100 - pA }
}

// Series win probability given per-game probability p and best-of format
export function seriesWinProbability(p: number, bestOf: number): number {
  const q = 1 - p
  if (bestOf === 1) return p
  if (bestOf === 2) return p * p                          // must win both games
  if (bestOf === 3) return p * p * (3 - 2 * p)           // win 2-0 or 2-1
  if (bestOf === 5) return p * p * p * (10 - 15 * p + 6 * p * p) // win 3-0, 3-1, or 3-2
  // Generic fallback: simulate
  let prob = 0
  const target = Math.ceil(bestOf / 2)
  for (let w = target; w <= bestOf; w++) {
    for (let l = 0; l < target && w + l <= bestOf; l++) {
      if (w + l < bestOf) continue
      const ways = factorial(w + l - 1) / (factorial(w - 1) * factorial(l))
      prob += ways * Math.pow(p, w) * Math.pow(q, l)
    }
  }
  return prob
}

function factorial(n: number): number {
  return n <= 1 ? 1 : n * factorial(n - 1)
}

// Draw probability in BO2: exactly 1 win each
export function drawProbability(p: number): number {
  return 2 * p * (1 - p)
}
