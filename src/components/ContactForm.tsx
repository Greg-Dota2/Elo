'use client'

import { useState } from 'react'

const SUBJECTS = {
  en: [
    'Got a Dota insight to share',
    'Found a bug or mistake',
    'Media / Partnership',
    'Just saying hi',
    'Other',
  ],
  ru: [
    'Есть интересный инсайт',
    'Нашёл ошибку',
    'Медиа / Партнёрство',
    'Просто привет',
    'Другое',
  ],
}

const L = {
  en: {
    name: 'Your name', email: 'Your email', subject: 'What is this about?',
    message: 'Your message…', send: 'Send message', sending: 'Sending…',
    success: "Message sent. I'll get back to you.",
    error: 'Something went wrong. Try again.',
    nameLabel: 'Name', emailLabel: 'Email', subjectLabel: 'Subject', messageLabel: 'Message',
  },
  ru: {
    name: 'Ваше имя', email: 'Ваш email', subject: 'Тема',
    message: 'Ваше сообщение…', send: 'Отправить', sending: 'Отправка…',
    success: 'Сообщение отправлено. Отвечу как смогу.',
    error: 'Что-то пошло не так. Попробуйте ещё раз.',
    nameLabel: 'Имя', emailLabel: 'Email', subjectLabel: 'Тема', messageLabel: 'Сообщение',
  },
}

interface Props { locale?: 'ru' | 'en' }

export default function ContactForm({ locale = 'en' }: Props) {
  const t = L[locale]
  const subjects = SUBJECTS[locale]

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
      setName(''); setEmail(''); setSubject(''); setMessage('')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div
        className="rounded-2xl p-8 text-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <p className="text-3xl mb-3">✓</p>
        <p className="font-semibold text-base" style={{ color: 'var(--text)' }}>{t.success}</p>
      </div>
    )
  }

  const inputClass = "w-full px-4 py-2.5 rounded-xl text-sm bg-secondary/60 border border-border/60 placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:bg-secondary/80 transition-colors"

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{t.nameLabel}</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t.name}
            required
            maxLength={120}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{t.emailLabel}</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={t.email}
            required
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{t.subjectLabel}</label>
        <select
          value={subject}
          onChange={e => setSubject(e.target.value)}
          className={`${inputClass} cursor-pointer`}
        >
          <option value="">{t.subject}</option>
          {subjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{t.messageLabel}</label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder={t.message}
          required
          maxLength={3000}
          rows={6}
          className={`${inputClass} resize-none`}
        />
      </div>

      {status === 'error' && (
        <p className="text-sm text-destructive">{t.error}</p>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full py-3 rounded-xl text-sm font-bold transition-all duration-200 disabled:opacity-50"
        style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
      >
        {status === 'loading' ? t.sending : t.send}
      </button>
    </form>
  )
}
