// Auto-links known team/player names inside bio prose.
//  - capped at `max` links total, first occurrence per entity only
//  - case-sensitive whole-word match, skips text already inside a [..](..) link
//  - skips heading lines (## / #)
export function autoLinkBio(
  text: string,
  entities: Array<{ name: string; url: string }>,
  max = 5,
): string {
  if (!text) return text
  const candidates = entities
    .filter(e => e.name)
    .sort((a, b) => b.name.length - a.name.length)

  let count = 0
  const used = new Set<string>()

  return text.split('\n').map(line => {
    if (line.startsWith('#')) return line
    for (const { name, url } of candidates) {
      if (count >= max) break
      const key = name.toLowerCase()
      if (used.has(key)) continue
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`(?<!\\[)\\b${escaped}\\b(?![^[]*?\\]\\()`)
      if (regex.test(line)) {
        line = line.replace(regex, `[${name}](${url})`)
        used.add(key)
        count++
      }
    }
    return line
  }).join('\n')
}
