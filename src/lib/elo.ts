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

// Win probability as percentage string for display
export function winProbability(eloA: number, eloB: number): { pctA: number; pctB: number } {
  const pA = Math.round(expectedScore(eloA, eloB) * 100)
  return { pctA: pA, pctB: 100 - pA }
}
