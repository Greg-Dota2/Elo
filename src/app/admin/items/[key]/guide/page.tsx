import { notFound } from 'next/navigation'
import { fetchItemByKey, itemIconUrl } from '@/lib/items'
import { fetchItemGuide } from '@/lib/guides'
import ItemGuideForm from './ItemGuideForm'

interface Props {
  params: Promise<{ key: string }>
}

export default async function ItemGuidePage({ params }: Props) {
  const { key } = await params
  const [item, guide] = await Promise.all([
    fetchItemByKey(key),
    fetchItemGuide(key).catch(() => null),
  ])
  if (!item) notFound()

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={itemIconUrl(key)} alt={item.dname} className="w-12 h-[35px] rounded object-cover" />
        <div>
          <h1 className="text-2xl font-bold">{item.dname}</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Item guide · <a href={`/items/${key}`} target="_blank" className="underline">View page</a></p>
        </div>
      </div>
      <ItemGuideForm itemKey={key} initial={guide} />
    </div>
  )
}
