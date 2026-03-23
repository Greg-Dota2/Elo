'use client'

import { useState } from 'react'
import type { PlayerRadarStats } from '@/lib/opendota'

const AXES = [
  { key: 'form',        label: 'Form',        desc: 'Win rate in last 20 matches' },
  { key: 'performance', label: 'Performance',  desc: 'KDA ratio (kills + assists / deaths)' },
  { key: 'heroPool',    label: 'Hero Pool',    desc: 'Distinct heroes played in last 20 matches', isRaw: true },
  { key: 'laning',      label: 'Laning',       desc: 'Last hits per minute over full game' },
  { key: 'farmGold',    label: 'Farm',         desc: 'Average gold per minute' },
  { key: 'fighting',    label: 'Fighting',     desc: 'Average kills + assists per match' },
  { key: 'experience',  label: 'Experience',   desc: 'Average XP per minute' },
] as const

const SIZE = 360
const CX = SIZE / 2
const CY = SIZE / 2
const R = 118
const N = AXES.length

function angle(i: number) { return (i * 2 * Math.PI / N) - Math.PI / 2 }
function pt(i: number, r: number) {
  return { x: CX + r * Math.cos(angle(i)), y: CY + r * Math.sin(angle(i)) }
}
function gridPts(ratio: number) {
  return Array.from({ length: N }, (_, i) => { const p = pt(i, R * ratio); return `${p.x},${p.y}` }).join(' ')
}
function toChart(key: string, raw: number) {
  return key === 'heroPool' ? Math.min(100, Math.round((raw / 20) * 100)) : raw
}
function displayVal(key: string, isRaw: boolean | undefined, raw: number) {
  return isRaw ? String(raw) : `${raw}%`
}

export default function PlayerRadar({ stats }: { stats: PlayerRadarStats }) {
  const [hovered, setHovered] = useState<number | null>(null)

  const chartVals = AXES.map(a => toChart(a.key, stats[a.key as keyof PlayerRadarStats] as number))
  const dataPts = chartVals.map((v, i) => pt(i, (v / 100) * R))
  const polyPoints = dataPts.map(p => `${p.x},${p.y}`).join(' ')

  const activeAxis = hovered !== null ? AXES[hovered] : null
  const activeRaw = activeAxis ? stats[activeAxis.key as keyof PlayerRadarStats] as number : null

  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-5 md:col-span-2">
      <div className="flex items-center justify-between mb-5">
        <p className="section-label">Recent Match Stats</p>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{stats.matchCount} matches · OpenDota</span>
      </div>

      <div className="flex flex-col lg:flex-row items-center gap-6">

        {/* ── Radar ── */}
        <div className="shrink-0 relative">
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="w-[280px] sm:w-[340px]"
          >
            {/* Grid rings */}
            {[0.25, 0.5, 0.75, 1].map((r, ri) => (
              <polygon key={ri} points={gridPts(r)} fill="none"
                stroke="hsl(var(--border))"
                strokeOpacity={r === 1 ? 0.7 : 0.3}
                strokeWidth={r === 1 ? 1 : 0.6} />
            ))}
            {/* Axis spokes */}
            {AXES.map((_, i) => {
              const outer = pt(i, R)
              return (
                <line key={i} x1={CX} y1={CY} x2={outer.x} y2={outer.y}
                  stroke="hsl(var(--border))" strokeOpacity={0.3} strokeWidth={0.6} />
              )
            })}
            {/* Filled polygon */}
            <polygon points={polyPoints}
              fill="hsl(var(--primary) / 0.12)"
              stroke="hsl(var(--primary) / 0.8)"
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
            {/* Axis labels */}
            {AXES.map((axis, i) => {
              const p = pt(i, R + 22)
              const anchor = p.x < CX - 8 ? 'end' : p.x > CX + 8 ? 'start' : 'middle'
              const baseline = p.y < CY - 8 ? 'auto' : p.y > CY + 8 ? 'hanging' : 'middle'
              const active = hovered === i
              return (
                <text key={i} x={p.x} y={p.y}
                  textAnchor={anchor} dominantBaseline={baseline}
                  fontSize={9} fontWeight={active ? 700 : 600}
                  fill={active ? 'hsl(var(--primary))' : 'var(--text-muted)'}
                  fontFamily="var(--font-manrope)"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {axis.label}
                </text>
              )
            })}
            {/* Data dots */}
            {dataPts.map((p, i) => {
              const active = hovered === i
              return (
                <circle key={i}
                  cx={p.x} cy={p.y}
                  r={active ? 6 : 4}
                  fill={active ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.7)'}
                  stroke={active ? 'hsl(var(--background))' : 'none'}
                  strokeWidth={2}
                  style={{ cursor: 'pointer', transition: 'r 0.1s, fill 0.1s' }}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                />
              )
            })}
            {/* Center info — shown when hovering */}
            {hovered !== null && activeAxis && activeRaw !== null && (
              <g>
                <text x={CX} y={CY - 10}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={22} fontWeight={800}
                  fill="hsl(var(--primary))"
                  fontFamily="var(--font-manrope)"
                >
                  {displayVal(activeAxis.key, 'isRaw' in activeAxis ? activeAxis.isRaw : undefined, activeRaw)}
                </text>
                <text x={CX} y={CY + 10}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={8} fontWeight={600}
                  fill="var(--text-muted)"
                  fontFamily="var(--font-manrope)"
                >
                  {activeAxis.label}
                </text>
              </g>
            )}
          </svg>
        </div>

        {/* ── Stat cards ── */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-2">
          {AXES.map((axis, i) => {
            const raw = stats[axis.key as keyof PlayerRadarStats] as number
            const cv = chartVals[i]
            const active = hovered === i
            return (
              <div key={axis.key}
                className="rounded-xl p-3 transition-all duration-150 cursor-default"
                style={{
                  background: active ? 'hsl(var(--primary) / 0.08)' : 'hsl(var(--secondary) / 0.4)',
                  border: `1px solid ${active ? 'hsl(var(--primary) / 0.5)' : 'var(--border)'}`,
                }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                <p className="text-[10px] uppercase tracking-wider mb-1.5 leading-none"
                  style={{ color: active ? 'hsl(var(--primary))' : 'var(--text-muted)' }}>
                  {axis.label}
                </p>
                <p className="text-3xl font-black leading-none mb-2" style={{ color: 'var(--text)' }}>
                  {displayVal(axis.key, 'isRaw' in axis ? axis.isRaw : undefined, raw)}
                </p>
                {/* Progress bar */}
                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                  <div className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${cv}%`,
                      background: active ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.5)',
                    }} />
                </div>
                <p className="text-[10px] mt-2 leading-snug" style={{ color: 'var(--text-muted)' }}>
                  {axis.desc}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
