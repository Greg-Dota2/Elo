import { fetchItemByKey, itemIconUrl } from '@/lib/items'

const CATEGORY_LABELS: Record<string, string> = {
  consumable: 'Consumable',
  basic: 'Basic',
  upgrade: 'Upgrade',
  neutral: 'Neutral',
}

export default async function ItemCard({ itemKey }: { itemKey: string }) {
  const item = await fetchItemByKey(itemKey)
  if (!item) return null

  return (
    <a
      href={`/items/${itemKey}`}
      className="flex items-center gap-4 rounded-2xl px-5 py-4 my-6 transition-opacity hover:opacity-80 no-underline"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', textDecoration: 'none' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={itemIconUrl(itemKey)}
        alt={item.dname}
        className="w-14 h-14 rounded-xl object-cover shrink-0"
        style={{ background: 'var(--surface-3)' }}
      />
      <div className="flex-1 min-w-0">
        <p className="font-display font-bold text-lg leading-tight" style={{ color: 'var(--text)' }}>
          {item.dname}
        </p>
        <p className="text-xs mt-1 font-semibold" style={{ color: 'var(--text-muted)' }}>
          {[
            CATEGORY_LABELS[item.category] ?? item.category,
            item.cost > 0 ? `${item.cost}g` : null,
            item.cd ? `${item.cd}s cooldown` : null,
          ].filter(Boolean).join(' · ')}
        </p>
      </div>
      <span className="ml-auto text-xs font-semibold shrink-0" style={{ color: 'hsl(var(--primary))' }}>
        View item →
      </span>
    </a>
  )
}
