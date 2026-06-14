import type { Metadata } from 'next'
import type React from 'react'
import { Suspense } from 'react'
import Link from 'next/link'
import HomeHeroRight from '@/components/home/HomeHeroRight'
import HomeMain from '@/components/home/HomeMain'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Прогнозы на матчи Dota 2 | Dota2ProTips',
  description: 'Экспертные прогнозы на матчи Dota 2 Tier 1 — написанные до драфта, публично отслеживаемые, с честным разбором после каждого матча. ~70% точность.',
  alternates: { canonical: '/ru', languages: { 'x-default': '/', 'en': '/', 'ru': '/ru' } },
  openGraph: {
    title: 'Прогнозы на матчи Dota 2 | Dota2ProTips',
    description: 'Экспертные прогнозы на матчи Dota 2 Tier 1 — написанные до драфта, публично отслеживаемые, с честным разбором после каждого матча. ~70% точность.',
    url: '/ru',
    images: [{ url: 'https://www.dota2protips.com/1.png', width: 512, height: 512, alt: 'Dota2ProTips' }],
  },
  twitter: { card: 'summary', title: 'Прогнозы на матчи Dota 2 | Dota2ProTips', description: 'Экспертные прогнозы на матчи Dota 2 Tier 1 — написанные до драфта, публично отслеживаемые, с честным разбором после каждого матча. ~70% точность.' },
}

export default function RuHomePage() {
  return (
    <div>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pb-16 pt-20 md:pb-20 md:pt-28 mb-12">
        {/* Background glows */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-[-8rem] top-20 h-72 w-72 rounded-full blur-[120px]" style={{ background: 'hsl(var(--primary) / 0.12)' }} />
          <div className="absolute right-[-6rem] top-48 h-72 w-72 rounded-full blur-[120px]" style={{ background: 'hsl(var(--accent) / 0.10)' }} />
        </div>

        <div className="grid items-center gap-12 lg:grid-cols-[1.08fr_0.92fr]">

          {/* Left — static, Russian */}
          <div>
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1.5 text-xs font-black uppercase tracking-widest backdrop-blur-sm text-muted-foreground">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/global/dota2_logo_symbol.png" alt="Dota 2" className="w-4 h-4 object-contain" />
              Здесь живёт настоящая Dota.
            </span>

            <h1 className="font-display text-5xl font-bold leading-[0.95] md:text-7xl lg:text-[5.2rem] mb-6">
              Мои прогнозы{' '}
              <span className="gradient-text">на Dota 2.</span>
            </h1>

            <p className="text-lg leading-8 text-muted-foreground md:text-xl max-w-2xl mb-8">
              Здесь я публикую прогнозы на предстоящие матчи. Я делаю их на основе личного опыта и формы команд — и комментирую каждый, добавляя разбор после матча.
            </p>

            {/* Credibility stats */}
            <div className="flex items-center gap-6 mb-8 py-4" style={{ borderTop: '1px solid hsl(var(--border) / 0.5)', borderBottom: '1px solid hsl(var(--border) / 0.5)' }}>
              {[
                { value: '~70%', label: 'точность прогнозов', color: 'hsl(var(--primary))' },
                { value: '600+', label: 'прогнозов записано',  color: 'var(--foreground)' },
                { value: 'Tier 1', label: 'только топ-матчи',  color: 'hsl(45 90% 60%)' },
              ].map((s, i) => (
                <div key={s.label} className="flex items-center gap-6">
                  {i > 0 && <div className="w-px self-stretch" style={{ background: 'hsl(var(--border) / 0.6)' }} />}
                  <div>
                    <p className="font-display text-2xl font-black tabular-nums leading-none mb-0.5" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-4 sm:flex-row mb-10">
              <Link
                href="/ru/tournaments"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold text-base transition-opacity hover:opacity-85"
                style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--background))' }}
              >
                Смотреть прогнозы →
              </Link>
              <Link
                href="/ru/track-record"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold text-base text-white transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.25), hsl(var(--accent) / 0.20))', border: '1px solid hsl(var(--primary) / 0.45)' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
                История прогнозов
              </Link>
            </div>

            {/* 3 principle cards */}
            <div className="grid gap-3 sm:grid-cols-3">
              {([
                {
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                    </svg>
                  ),
                  title: 'Всегда бесплатно',
  	              text: 'Без подписок, без регистрации. Просто открой сайт и читай.',
                  iconBg: 'hsl(142 70% 45% / 0.12)',
                  iconColor: 'hsl(142 70% 55%)',
                },
                {
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                  ),
                  title: 'До драфта',
                  text: 'Прогноз фиксируется до выбора героев. Никаких задних чисел.',
                  iconBg: 'hsl(38 90% 55% / 0.12)',
                  iconColor: 'hsl(38 90% 60%)',
                },
                {
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  ),
                  title: 'Открытая статистика',
                  text: 'Каждый верный и неверный прогноз на виду. Мне негде спрятаться.',
                  iconBg: 'hsl(var(--primary) / 0.12)',
                  iconColor: 'hsl(var(--primary))',
                },
              ] as { icon: React.ReactNode; title: string; text: string; iconBg: string; iconColor: string }[]).map(p => (
                <div key={p.title} className="panel-shell p-4 relative overflow-hidden">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${p.iconColor}, transparent)`, opacity: 0.4 }} />
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: p.iconBg, color: p.iconColor }}>
                    {p.icon}
                  </div>
                  <p className="font-display text-base font-semibold text-foreground">{p.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{p.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — async */}
          <Suspense fallback={<div className="hidden md:block" style={{ minHeight: 400 }} />}>
            <HomeHeroRight locale="ru" />
          </Suspense>
        </div>
      </section>

      {/* Main content — async */}
      <Suspense fallback={null}>
        <HomeMain locale="ru" />
      </Suspense>

    </div>
  )
}
