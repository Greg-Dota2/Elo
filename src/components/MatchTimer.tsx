'use client'

import { useState, useEffect } from 'react'

interface Props {
  matchDate: string | null
  matchTime: string | null
  hasResult: boolean
}

function formatCountdown(ms: number) {
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m ${sec}s`
}

function staticTime(matchDate: string, matchTime: string) {
  const d = new Date(`${matchDate}T${matchTime}:00Z`)
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Athens' })
  const tz = d.toLocaleDateString('en-US', { timeZoneName: 'short', timeZone: 'Europe/Athens' }).split(', ').pop() ?? 'EET'
  return <span>{time} {tz}</span>
}

export default function MatchTimer({ matchDate, matchTime, hasResult }: Props) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 10_000)
    return () => clearInterval(t)
  }, [])

  if (hasResult) return <span className="font-bold text-success">✓ Final</span>

  const matchStart = matchDate && matchTime ? new Date(`${matchDate}T${matchTime}:00Z`) : null

  // Pre-hydration: show static time
  if (!now || !matchStart) {
    if (matchDate && matchTime) return staticTime(matchDate, matchTime)
    return null
  }

  const isLive = now >= matchStart
  const isFuture = now < matchStart
  const msLeft = isFuture ? matchStart.getTime() - now.getTime() : 0

  if (isLive) {
    return (
      <span className="inline-flex items-center gap-1 font-bold text-red-400">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
        Live
      </span>
    )
  }
  if (isFuture) return <span className="font-mono font-bold">in {formatCountdown(msLeft)}</span>
  if (matchDate && matchTime) return staticTime(matchDate, matchTime)
  return null
}
