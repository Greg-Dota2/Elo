import type { Metadata } from 'next'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'О Греге — Человек за прогнозами',
  description: 'Полупрофессиональный игрок, аналитик турниров, преданный зритель про-Dota. Грег пишет каждый прогноз, каждый рейтинг, каждое слово на этом сайте.',
  openGraph: {
    title: 'О Греге — Человек за прогнозами',
    description: 'Полупрофессиональный игрок, аналитик турниров, преданный зритель про-Dota. Грег пишет каждый прогноз, каждый рейтинг, каждое слово на этом сайте.',
    url: '/ru/about',
    images: [{ url: 'https://www.dota2protips.com/1.png', width: 512, height: 512, alt: 'Dota2ProTips' }],
  },
  twitter: {
    card: 'summary',
    title: 'О Греге — Человек за прогнозами',
    description: 'Полупрофессиональный игрок, аналитик турниров, преданный зритель про-Dota.',
  },
  alternates: { canonical: '/about', languages: { 'x-default': '/about', 'en': '/about', 'ru': '/ru/about' } },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Greg Spencer',
  url: 'https://www.dota2protips.com/ru/about',
  image: 'https://www.dota2protips.com/Greg.jpg',
  jobTitle: 'Аналитик Dota 2',
  description: 'Грег Спенсер — фанат Dota 2, бывший полупрофессионал и единственный аналитик за каждым прогнозом и разбором на Dota2ProTips.',
  knowsAbout: ['Dota 2', 'Киберспорт', 'Про-Dota 2', 'Прогнозы матчей'],
  sameAs: [
    'https://www.facebook.com/Dota2ProTips',
    'https://x.com/Dota2ProTips',
    'https://t.me/dota2protips',
  ],
  worksFor: {
    '@type': 'WebSite',
    name: 'Dota2ProTips',
    url: 'https://www.dota2protips.com',
  },
}

export default function RuAboutPage() {
  return (
    <div className="fade-in-up max-w-2xl mx-auto py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Profile header */}
      <div className="flex items-center gap-5 mb-8">
        <Image
          src="/Greg.jpg"
          alt="Greg Spencer"
          width={88}
          height={88}
          className="rounded-full object-cover shrink-0"
          style={{ width: 88, height: 88 }}
        />
        <div>
          <p className="section-label mb-1">Человек за прогнозами</p>
          <h1 className="font-display text-4xl font-black tracking-tight">Обо мне</h1>
        </div>
      </div>

      <div
        className="rounded-2xl p-7 mb-6 text-base leading-8 space-y-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
      >
        <p>
          Меня зовут Грег, и я фанат Dota 2 — такой же, как ты. Я люблю эту игру, но больше всего{' '}
          <span className="font-semibold" style={{ color: 'var(--text)' }}>я ОБОЖАЮ смотреть про-матчи.</span>{' '}
          Не спрашивай почему. Просто всегда так было.
        </p>
        <p>
          Я играл в Dota на полупрофессиональном уровне. Относился к этому серьёзно — высокий MMR,
          ежедневный гринд, изучение игры так же основательно, как другие готовятся к экзаменам.
          Я знал героев, сборку предметов, тайминги, драфты. Я жил этим. И этот фундамент никуда не делся.
        </p>
        <p>
          Теперь я старше, у меня семья, и гриндить как раньше уже не получается. Но смотреть?
          Ребята, я смотрю{' '}
          <span className="font-semibold" style={{ color: 'var(--text)' }}>всё.</span>{' '}
          Каждый турнир, каждую серию, каждый патч-ноут. Я слежу за каждой командой Tier 1,
          знаю каждого игрока — их стиль, привычки, с кем они сыгрываются, с кем конфликтуют.
          Для меня про-Dota — одна из самых захватывающих киберспортивных игр в мире,
          и я никогда не перестану её смотреть.
        </p>
        <p>
          Отсюда и вырос этот сайт. Мне нужно было место, где можно нормально всё отслеживать —
          рейтинги ELO команд, реально отражающие текущую форму, турнирное покрытие глубже
          обычного счёта, профили игроков, которые рассказывают, кем эти люди являются как
          соперники. И блог, где я разбираю то, что вижу, отмечаю впечатлившие меня драфты
          и указываю на то, что упускают другие.
        </p>
        <p>
          Всё на этом сайте — это я. Каждый прогноз, каждый рейтинг, каждый разбор. У меня нет
          команды авторов и алгоритма, генерирующего контент. Только я: смотрю игры, думаю
          о том, что видел, и пишу об этом.
        </p>
        <p>
          Надеюсь, тебе это пригодится. И если ты любишь про-Dota хотя бы вполовину так же, как я —{' '}
          <span className="font-semibold" style={{ color: 'var(--text)' }}>добро пожаловать. Ты попал куда надо.</span>
        </p>
      </div>

      <div
        className="rounded-2xl px-7 py-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <p className="font-semibold text-sm mb-4" style={{ color: 'var(--text)' }}>Присоединяйтесь к обсуждению</p>
        <div className="flex flex-col gap-3">
          {/* Facebook */}
          <a
            href="https://www.facebook.com/Dota2ProTips"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 transition-opacity hover:opacity-70"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#1877F2" className="shrink-0">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span className="text-sm font-medium" style={{ color: '#1877F2' }}>facebook.com/Dota2ProTips</span>
          </a>
          {/* X / Twitter */}
          <a
            href="https://x.com/Dota2ProTips"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 transition-opacity hover:opacity-70"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="shrink-0" style={{ color: 'var(--text)' }}>
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>x.com/Dota2ProTips</span>
          </a>
          {/* Telegram */}
          <a
            href="https://t.me/dota2protips"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 transition-opacity hover:opacity-70"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#229ED9" className="shrink-0">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.19 13.167l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.958.392z"/>
            </svg>
            <span className="text-sm font-medium" style={{ color: '#229ED9' }}>t.me/dota2protips</span>
          </a>
        </div>
      </div>
    </div>
  )
}
