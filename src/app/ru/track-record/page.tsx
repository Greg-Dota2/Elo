import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Мои прогнозы на Dota 2 — статистика',
  description: 'Открытая статистика прогнозов по турнирам Tier 1. Каждый верный и каждый неверный прогноз — здесь, без правок и без удалений.',
  alternates: { canonical: '/ru/track-record', languages: { 'x-default': '/track-record', 'en': '/track-record', 'ru': '/ru/track-record' } },
  openGraph: { title: 'Мои прогнозы на Dota 2 — статистика', description: 'Открытая статистика прогнозов по турнирам Tier 1. Каждый верный и каждый неверный прогноз — здесь, без правок и без удалений.', url: '/ru/track-record', images: [{ url: 'https://www.dota2protips.com/1.png', width: 512, height: 512, alt: 'Dota2ProTips' }] },
  twitter: { card: 'summary', title: 'Мои прогнозы на Dota 2 — статистика', description: 'Открытая статистика прогнозов по турнирам Tier 1. Каждый верный и каждый неверный прогноз — здесь, без правок и без удалений.' },
}

export default async function RuTrackRecordPage() {
  const supabase = createAdminClient()

  const [{ data: stats }, { data: tournaments }] = await Promise.all([
    supabase.from('tournament_stats').select('*'),
    supabase.from('tournaments').select('id, name, slug, logo_url, start_date').eq('is_published', true),
  ])

  const tournamentMap = Object.fromEntries((tournaments ?? []).map(t => [t.id, t]))

  const rows = (stats ?? [])
    .filter(s => s.total_predictions > 0)
    .sort((a, b) => {
      const ta = tournamentMap[a.tournament_id]?.start_date ?? ''
      const tb = tournamentMap[b.tournament_id]?.start_date ?? ''
      return tb > ta ? 1 : -1
    })

  const totalPredictions = rows.reduce((s, r) => s + r.total_predictions, 0)
  const totalCorrect = rows.reduce((s, r) => s + r.correct, 0)
  const totalWrong = rows.reduce((s, r) => s + r.wrong, 0)
  const totalResolved = totalCorrect + totalWrong
  const overallPct = totalResolved > 0 ? Math.round((totalCorrect / totalResolved) * 100) : 0

  const accuracyColor = overallPct >= 65 ? 'text-emerald-400' : overallPct >= 55 ? 'text-amber-400' : 'text-red-400'
  const accuracyBg = overallPct >= 65 ? 'hsl(142 76% 36% / 0.15)' : overallPct >= 55 ? 'hsl(38 92% 50% / 0.15)' : 'hsl(0 84% 60% / 0.15)'
  const accuracyBorder = overallPct >= 65 ? 'hsl(142 76% 36% / 0.35)' : overallPct >= 55 ? 'hsl(38 92% 50% / 0.35)' : 'hsl(0 84% 60% / 0.35)'

  return (
    <div className="fade-in-up max-w-3xl mx-auto py-8">

      {/* ── Hero header ── */}
      <div className="relative rounded-2xl overflow-hidden mb-8 px-6 py-8 border border-border/40 bg-card/60">
        <div className="pointer-events-none absolute -top-10 -right-10 w-64 h-64 rounded-full blur-3xl opacity-15" style={{ background: 'hsl(var(--primary))' }} />
        <div className="pointer-events-none absolute -bottom-10 -left-10 w-48 h-48 rounded-full blur-3xl opacity-10" style={{ background: 'hsl(var(--accent))' }} />

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 relative">
          <div className="flex-1 min-w-0">
            <p className="section-label mb-3">Все турниры</p>
            <h1 className="font-display text-4xl font-black tracking-tight mb-4">Статистика прогнозов</h1>
            <p className="text-sm leading-7 text-muted-foreground max-w-lg">
              Каждый прогноз фиксируется до начала матча — до драфта, до того, как кто-либо видит состав дня.
              После результата ничего не меняется. Если я ошибся — это остаётся, и ты видишь где и когда.
              Только так это имеет смысл. Если можешь редактировать прогнозы после результата —
              это не прогноз, а переписывание истории.
            </p>
          </div>

          {/* Big accuracy number */}
          <div className="shrink-0 flex flex-col items-center justify-center rounded-2xl px-7 py-5 text-center self-start sm:self-auto" style={{ background: accuracyBg, border: `1px solid ${accuracyBorder}` }}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Общая точность</p>
            <p className={`font-display text-5xl font-black tabular-nums leading-none ${accuracyColor}`}>
              {overallPct}%
            </p>
            <p className="text-[10px] text-muted-foreground mt-2">{totalCorrect} / {totalResolved} завершено</p>
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          {
            label: 'Турниры',
            value: rows.length,
            color: 'text-foreground',
            accent: 'bg-primary/60',
            icon: (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
              </svg>
            ),
          },
          {
            label: 'Всего прогнозов',
            value: totalPredictions,
            color: 'text-foreground',
            accent: 'bg-sky-400/60',
            icon: (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
            ),
          },
          {
            label: 'Верно',
            value: totalCorrect,
            color: 'text-emerald-400',
            accent: 'bg-emerald-400/60',
            icon: (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ),
          },
          {
            label: 'Неверно',
            value: totalWrong,
            color: 'text-red-400',
            accent: 'bg-red-400/60',
            icon: (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            ),
          },
        ].map(s => (
          <div key={s.label} className="relative rounded-2xl px-5 py-4 overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className={`absolute top-0 left-0 right-0 h-[3px] ${s.accent}`} />
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              {s.icon}
              <span className="text-xs font-semibold">{s.label}</span>
            </div>
            <div className={`text-3xl font-black tabular-nums leading-none ${s.color}`} style={{ fontFamily: 'var(--font-oxanium), sans-serif' }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Per-tournament table ── */}
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Данных пока нет.</p>
      ) : (
        <div className="rounded-2xl overflow-x-auto border border-border/50">
          <div className="min-w-[520px]">
          {/* Header */}
          <div className="grid grid-cols-[1fr_60px_68px_60px_68px_96px] px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground" style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
            <span>Турнир</span>
            <span className="text-center">Всего</span>
            <span className="text-center">Верно</span>
            <span className="text-center">Неверно</span>
            <span className="text-center">Ожидает</span>
            <span className="text-center">Точность</span>
          </div>

          {rows.map((row, i) => {
            const t = tournamentMap[row.tournament_id] ?? null
            const resolved = row.correct + row.wrong
            const pct = row.accuracy_pct ?? 0
            const pending = resolved === 0
            const rowColor = pct >= 65 ? 'var(--correct)' : pct >= 55 ? '#f59e0b' : 'var(--wrong)'
            return (
              <div
                key={row.tournament_id}
                className="group grid grid-cols-[1fr_60px_68px_60px_68px_96px] px-5 py-4 items-center hover:bg-white/[0.025] transition-colors"
                style={{ borderBottom: i < rows.length - 1 ? '1px solid hsl(var(--border) / 0.5)' : 'none' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {t?.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img loading="lazy" src={t.logo_url} alt={t.name} className="w-8 h-8 object-contain shrink-0 rounded-lg" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg shrink-0" style={{ background: 'var(--surface-2)' }} />
                  )}
                  <div className="min-w-0">
                    <Link href={t?.slug ? `/ru/tournaments/${t.slug}` : '/ru/tournaments'} className="font-bold text-sm hover:text-primary transition-colors truncate block">
                      {t?.name ?? '—'}
                    </Link>
                    {t?.start_date && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(t.start_date).toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>

                <span className="text-center text-sm font-semibold tabular-nums">{row.total_predictions}</span>
                <span className="text-center text-sm font-semibold tabular-nums text-emerald-400">{row.correct}</span>
                <span className="text-center text-sm font-semibold tabular-nums text-red-400">{row.wrong}</span>
                <span className="text-center text-sm font-semibold tabular-nums text-muted-foreground">
                  {row.total_predictions - row.correct - row.wrong > 0
                    ? row.total_predictions - row.correct - row.wrong
                    : <span className="opacity-30">—</span>}
                </span>

                <div className="flex flex-col items-center gap-1.5">
                  {pending ? (
                    <span className="text-sm font-semibold text-muted-foreground">—</span>
                  ) : (
                    <>
                      <span className="text-base font-black tabular-nums" style={{ fontFamily: 'var(--font-oxanium), sans-serif', color: rowColor }}>
                        {pct}%
                      </span>
                      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: rowColor }} />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })}

          {/* Overall row */}
          <div
            className="grid grid-cols-[1fr_60px_68px_60px_68px_96px] px-5 py-4 items-center"
            style={{ background: 'var(--surface-2)', borderTop: '2px solid var(--border)' }}
          >
            <span className="font-black text-sm">Итого</span>
            <span className="text-center text-sm font-black tabular-nums">{totalPredictions}</span>
            <span className="text-center text-sm font-black tabular-nums text-emerald-400">{totalCorrect}</span>
            <span className="text-center text-sm font-black tabular-nums text-red-400">{totalWrong}</span>
            <span className="text-center text-sm font-black tabular-nums text-muted-foreground">
              {totalPredictions - totalResolved > 0 ? totalPredictions - totalResolved : <span className="opacity-30">—</span>}
            </span>
            <div className="flex flex-col items-center gap-1.5">
              <span className={`text-base font-black tabular-nums ${accuracyColor}`} style={{ fontFamily: 'var(--font-oxanium), sans-serif' }}>
                {overallPct}%
              </span>
              <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                <div className="h-full rounded-full" style={{ width: `${overallPct}%`, background: overallPct >= 65 ? 'var(--correct)' : '#f59e0b' }} />
              </div>
            </div>
          </div>
          </div>
        </div>
      )}

      <p className="mt-6 text-xs text-muted-foreground/50 text-center">
        Точность считается только по завершённым прогнозам (верно + неверно). Ожидающие прогнозы в процент не включаются.
      </p>
    </div>
  )
}
