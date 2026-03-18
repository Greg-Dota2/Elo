interface Props {
  text: string
  className?: string
}

export default function BioRenderer({ text, className = '' }: Props) {
  const lines = text.split('\n')

  return (
    <div className={`grid gap-1 ${className}`}>
      {lines.map((line, i) => {
        if (line.startsWith('##')) {
          const content = line.replace(/^##\s*/, '')
          return (
            <h3 key={i} className="font-display font-bold text-base mt-4 first:mt-0" style={{ color: 'hsl(var(--primary))' }}>
              {content}
            </h3>
          )
        }
        if (line.startsWith('#')) {
          const content = line.replace(/^#\s*/, '')
          return (
            <h2 key={i} className="font-display font-bold text-lg text-foreground mt-5 first:mt-0">
              {content}
            </h2>
          )
        }
        if (line.trim() === '') {
          return <div key={i} className="h-2" />
        }
        return (
          <p key={i} className="text-sm leading-relaxed" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
            {line}
          </p>
        )
      })}
    </div>
  )
}
