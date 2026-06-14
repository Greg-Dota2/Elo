import type { Metadata } from 'next'
import ContactForm from '@/components/ContactForm'

export const metadata: Metadata = {
  title: 'Связаться с Грегом — Dota2ProTips',
  description: 'Есть инсайт по Dota, нашёл ошибку или просто хочешь поздороваться? Напиши — я читаю каждое сообщение.',
  alternates: {
    canonical: '/contact',
    languages: { 'x-default': '/contact', en: '/contact', ru: '/ru/contact' },
  },
  openGraph: {
    title: 'Связаться с Грегом — Dota2ProTips',
    description: 'Есть инсайт по Dota, нашёл ошибку или просто хочешь поздороваться? Напиши — я читаю каждое сообщение.',
    url: '/ru/contact',
    images: [{ url: 'https://www.dota2protips.com/1.png', width: 512, height: 512, alt: 'Dota2ProTips' }],
  },
}

export default function RuContactPage() {
  return (
    <div className="fade-in-up max-w-2xl mx-auto py-8">
      <div className="mb-8">
        <p className="section-label mb-2">Связаться</p>
        <h1 className="text-3xl font-black tracking-tight mb-1">Написать мне</h1>
      </div>

      <div
        className="rounded-2xl p-7 mb-8 text-sm leading-7 space-y-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
      >
        <p>
          Этот сайт я веду один — каждый прогноз, каждый рейтинг, каждый текст. Это значит,
          что я сам читаю каждое сообщение, которое приходит сюда. Так что если есть что сказать —
          я это увижу.
        </p>
        <p>
          Может, ты нашёл ошибку в одном из моих прогнозов. Может, следишь за командой, которую
          я недооцениваю, и хочешь меня поправить. Может, знаешь про смену состава раньше, чем
          это попало в новости.{' '}
          <span className="font-semibold" style={{ color: 'var(--text)' }}>Такие вещи для меня на вес золота.</span>{' '}
          Пиши.
        </p>
        <p>
          Или просто хочешь поспорить из-за дрфата, который я разобрал неправильно.
          Это тоже нормально. Я выдержу.
        </p>
      </div>

      <div
        className="rounded-2xl p-7"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <ContactForm locale="ru" />
      </div>
    </div>
  )
}
