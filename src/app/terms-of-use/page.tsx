import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'How predictions are made, how ELO ratings are calculated, and what this site is all about.',
  openGraph: {
    title: 'Terms of Use | Dota2ProTips',
    description: 'How predictions are made, how ELO ratings are calculated, and what this site is all about.',
    url: '/terms-of-use',
  },
  twitter: {
    card: 'summary',
    title: 'Terms of Use | Dota2ProTips',
    description: 'How predictions are made, how ELO ratings are calculated, and what this site is all about.',
  },
  alternates: { canonical: '/terms-of-use' },
}

export default function HowItWorksPage() {
  return (
    <div className="fade-in-up max-w-2xl mx-auto py-8">
      <p className="section-label mb-3">Behind the picks</p>
      <h1 className="font-display text-4xl font-black tracking-tight mb-4">Terms of Use</h1>
      <p className="text-base leading-8 mb-12" style={{ color: 'var(--text-muted)' }}>
        Everything you need to know about how predictions are made, how the ELO engine works, and why this site exists.
      </p>

      {/* Disclaimer banner */}
      <div
        className="rounded-2xl px-6 py-5 mb-12 flex gap-4 items-start"
        style={{ background: 'hsl(38 95% 50% / 0.08)', border: '1px solid hsl(38 95% 50% / 0.25)' }}
      >
        <span className="text-2xl shrink-0 mt-0.5">⚠️</span>
        <div>
          <p className="font-bold text-sm mb-1" style={{ color: 'hsl(38 95% 60%)' }}>Entertainment purposes only</p>
          <p className="text-sm leading-7" style={{ color: 'var(--text-muted)' }}>
            Everything on this site — predictions, ELO ratings, analysis — is made purely for fun and entertainment.
            This is not betting advice, financial advice, or any form of professional forecasting.
            Dota 2 is unpredictable by nature and no model or person can predict it with certainty.
            Never use this content to make real-money decisions.
          </p>
        </div>
      </div>

      {/* Section 1 */}
      <Section
        number="01"
        title="What this site is"
      >
        <p>
          Dota2ProTips is a personal prediction log. I — Greg Spencer — watch every single Tier 1 Dota 2 match.
          Before each series starts, I write down who I think is going to win and why. That&apos;s it.
        </p>
        <p>
          There are no algorithms picking for me. No machine learning. No paid tipsters. Just one guy
          who has followed pro Dota for years, formed an opinion, and committed to it in writing
          before the draft even begins.
        </p>
        <p>
          Every prediction is public, every result is tracked, and my accuracy is visible to anyone who visits.
          I can&apos;t quietly delete a bad call. That&apos;s the point.
        </p>
      </Section>

      {/* Section 2 */}
      <Section
        number="02"
        title="How predictions are made"
      >
        <p>
          Each prediction is written <strong style={{ color: 'var(--text)' }}>before hero selection</strong>.
          By the time the draft starts, the pick is already locked in. This matters because the draft
          in Dota 2 reveals a huge amount of information — predicting after it is significantly easier
          and far less honest.
        </p>
        <p>
          My process for each match:
        </p>
        <ul className="list-none space-y-3 my-2">
          {[
            ['Recent form', 'How has each team performed in the last 2–4 weeks? Momentum matters more than historical prestige.'],
            ['Head-to-head', 'How have these two teams matched up before, especially at this level of competition?'],
            ['Roster changes', 'Any recent stand-ins, bootcamps, or roster shifts that could affect performance?'],
            ['Tournament stage', 'Groups play differently than playoffs. Teams sometimes sandbag in groups to hide strategies.'],
            ['ELO rating', 'My custom rating system gives a structured view of where each team stands relative to each other.'],
          ].map(([title, text]) => (
            <li key={title} className="flex gap-3">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'hsl(var(--primary))' }} />
              <span className="text-sm leading-7" style={{ color: 'var(--text-muted)' }}>
                <strong style={{ color: 'var(--text)' }}>{title} — </strong>{text}
              </span>
            </li>
          ))}
        </ul>
        <p>
          After the match, I come back and write an <strong style={{ color: 'var(--text)' }}>aftermath</strong> — a short
          note on what actually happened, what I got right, and where I was wrong. Predictions without follow-up
          accountability are worthless.
        </p>
      </Section>

      {/* Section 3 */}
      <Section
        number="03"
        title="The ELO rating system"
      >
        <p>
          ELO is a rating system originally developed for chess. The core idea: every team starts at a baseline rating,
          and after each match, points flow from the loser to the winner. Beat a stronger team → gain more points.
          Lose to a weaker team → lose more points.
        </p>
        <p>
          My implementation is adapted for Dota 2 Tier 1 specifically:
        </p>
        <div className="grid gap-3 my-4">
          {[
            ['Starting ratings', 'Teams begin with custom seed ratings based on their historical performance at Tier 1. A team like Tundra Esports starts much higher than a newly promoted roster.'],
            ['K-factor', 'Controls how much a single result moves the needle. Higher K means ratings shift faster. I use a moderate K to avoid wild swings from a single upset.'],
            ['Series-based', 'Ratings update after a completed series (BO2, BO3, BO5), not individual games. Winning 2–1 counts as one result.'],
            ['Win probability', 'Before each match, the system calculates an expected win probability based on the rating gap between the two teams. This is shown as a bar on every prediction card.'],
          ].map(([title, text]) => (
            <div
              key={title}
              className="rounded-xl px-5 py-4"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <p className="font-bold text-sm mb-1" style={{ color: 'var(--text)' }}>{title}</p>
              <p className="text-sm leading-7" style={{ color: 'var(--text-muted)' }}>{text}</p>
            </div>
          ))}
        </div>
        <p>
          The ELO ratings are updated manually after each tournament. They are not a live automated system — I review
          results and apply updates myself, which also lets me apply context (e.g. a roster standing-in doesn&apos;t
          reflect the team&apos;s true strength).
        </p>
      </Section>

      {/* Section 4 */}
      <Section
        number="04"
        title="Win probability bar"
      >
        <p>
          On every prediction card you&apos;ll see a small bar showing the expected win probability for each team.
          This comes directly from the ELO ratings using the standard formula:
        </p>
        <div
          className="rounded-xl px-5 py-4 my-4 font-mono text-sm"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
        >
          P(A wins) = 1 / (1 + 10 ^ ((ELO_B − ELO_A) / 400))
        </div>
        <p>
          A green bar means the predicted winner has more than 50% expected probability. Amber means they are
          the underdog. This gives you an instant read on how confident or upset-prone a prediction is.
        </p>
        <p>
          A pick where the favourite wins is less impressive than a pick where the underdog wins. The probability
          bar keeps that context visible at all times.
        </p>
      </Section>

      {/* Section 5 */}
      <Section
        number="05"
        title="Accuracy tracking"
      >
        <p>
          Every finished match is marked as correct or incorrect. The tournament page shows a running accuracy
          percentage. The rankings page tracks ELO across all teams over time.
        </p>
        <p>
          I aim to beat 60% accuracy across any given tournament. That sounds modest, but in a field where
          upsets are constant and the best teams in the world can lose on any given day, consistent accuracy
          above coin-flip is genuinely hard.
        </p>
        <p>
          All data is stored openly. Nothing is hidden, edited, or removed after the fact.
        </p>
      </Section>

      {/* Section 6 */}
      <Section
        number="06"
        title="Why Tier 1 only"
      >
        <p>
          Tier 1 is where the game is played at its highest level. ESL One, PGL, The International — these
          are the tournaments that matter. The teams are the best in the world, the preparation is serious,
          and the results are meaningful.
        </p>
        <p>
          Covering lower tiers would mean tracking hundreds of teams, many of which are inconsistent by nature.
          Predictions there would be noise. Tier 1 is focused, watchable, and worth analysing carefully.
        </p>
      </Section>

      {/* Final disclaimer */}
      <div
        className="rounded-2xl px-6 py-6 mt-12"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <p className="font-bold text-sm mb-2" style={{ color: 'var(--text)' }}>One last thing</p>
        <p className="text-sm leading-7" style={{ color: 'var(--text-muted)' }}>
          This site exists because I love Dota 2 and I love watching the pros play it. That&apos;s the whole story.
          No subscriptions, no locked content, no upsells. If the predictions help you follow the scene more
          closely or give you something to debate with your friends — that&apos;s the goal.
          Enjoy the games.
        </p>
        <p className="text-sm font-semibold mt-3" style={{ color: 'var(--text-muted)' }}>— Greg</p>
      </div>
    </div>
  )
}

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <div className="flex items-center gap-3 mb-4">
        <span
          className="text-xs font-black tabular-nums px-2 py-1 rounded-lg"
          style={{ background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))' }}
        >
          {number}
        </span>
        <h2 className="font-display text-xl font-black tracking-tight">{title}</h2>
      </div>
      <div className="space-y-4 text-base leading-8" style={{ color: 'var(--text-muted)' }}>
        {children}
      </div>
    </section>
  )
}
