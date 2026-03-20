'use client'

import { useState } from 'react'
import { abilityIconUrl } from '@/lib/heroes'

export default function AbilityIcon({ name, displayName }: { name: string; displayName: string }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-secondary/60">
        <span className="font-display text-xs font-bold text-muted-foreground/40 text-center leading-tight px-1">
          {displayName.slice(0, 2).toUpperCase()}
        </span>
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={abilityIconUrl(name)}
      alt={displayName}
      className="w-full h-full object-cover"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}
