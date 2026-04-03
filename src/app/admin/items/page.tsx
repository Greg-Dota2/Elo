import Link from 'next/link'
import { fetchAllItems, itemIconUrl } from '@/lib/items'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function AdminItemsPage() {
  let items: Awaited<ReturnType<typeof fetchAllItems>> = []
  try { items = await fetchAllItems() } catch { /* API may be unavailable */ }

  const supabase = createAdminClient()
  const { data: guides } = await supabase.from('item_guides').select('item_key')
  const hasGuide = new Set((guides ?? []).map(g => g.item_key))

  const upgradeItems = items.filter(i => i.category === 'upgrade')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Item Guides</h1>
        <Link href="/admin" className="text-sm" style={{ color: 'var(--text-muted)' }}>← Admin</Link>
      </div>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        Add &ldquo;Why buy&rdquo; and &ldquo;When to buy&rdquo; editorial content for items. Focus on high-value upgrade items first.
      </p>
      <div className="grid gap-2">
        {upgradeItems.map(item => (
          <div
            key={item.key}
            className="flex items-center justify-between rounded-lg px-4 py-3"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={itemIconUrl(item.key)} alt={item.dname} className="w-10 h-[29px] rounded object-cover" />
              <div>
                <span className="font-medium text-sm">{item.dname}</span>
                {item.cost > 0 && (
                  <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>{item.cost.toLocaleString()}g</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {hasGuide.has(item.key) && (
                <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--correct)' }}>
                  Has guide
                </span>
              )}
              <Link
                href={`/admin/items/${item.key}/guide`}
                className="text-xs px-3 py-1.5 rounded"
                style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
              >
                Edit guide
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
