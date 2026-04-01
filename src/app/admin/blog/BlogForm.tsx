'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface EntityOption {
  label: string    // display name
  value: string    // slug or key used in shortcode
  image_url: string
  meta?: string    // secondary info line
}

interface BlogPost {
  id?: string
  title: string
  slug: string
  excerpt: string
  content: string
  cover_image_url: string
  is_published: boolean
}

interface Props {
  initial?: Partial<BlogPost>
}

function toSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

type InsertMode = null | 'link' | 'image' | 'tweet' | 'hero' | 'team' | 'player' | 'item'
const ENTITY_MODES: InsertMode[] = ['hero', 'team', 'player', 'item']

const ENTITY_CONFIG: Record<string, { label: string; icon: string; placeholder: string; apiPath: string }> = {
  hero:   { label: 'Hero',   icon: '⚔',  placeholder: 'Search hero name…',   apiPath: '/api/heroes'  },
  team:   { label: 'Team',   icon: '🛡',  placeholder: 'Search team name…',   apiPath: '/api/teams'   },
  player: { label: 'Player', icon: '👤', placeholder: 'Search player name…', apiPath: '/api/players' },
  item:   { label: 'Item',   icon: '⚗',  placeholder: 'Search item name…',   apiPath: '/api/items'   },
}

function normalizeEntities(mode: string, data: any[]): EntityOption[] {
  if (mode === 'hero') {
    return data.map(h => ({ label: h.localized_name, value: h.slug, image_url: h.portrait_url, meta: h.primary_attr }))
  }
  if (mode === 'team') {
    return data.map(t => ({ label: t.name, value: t.slug, image_url: t.logo_url ?? '', meta: t.region ?? '' }))
  }
  if (mode === 'player') {
    const teamName = (p: any) => (p.team as { name: string } | null)?.name ?? ''
    const posMap: Record<number, string> = { 1: 'Carry', 2: 'Mid', 3: 'Offlane', 4: 'Soft Support', 5: 'Hard Support' }
    return data.map(p => ({
      label: p.ign,
      value: p.slug,
      image_url: p.photo_url ?? '',
      meta: [p.position ? posMap[p.position] : null, teamName(p)].filter(Boolean).join(' · '),
    }))
  }
  if (mode === 'item') {
    return data.map(i => ({ label: i.dname, value: i.key, image_url: i.icon_url, meta: `${i.cost}g` }))
  }
  return []
}

export default function BlogForm({ initial }: Props) {
  const router = useRouter()
  const isEdit = !!initial?.id

  const [title, setTitle] = useState(initial?.title ?? '')
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? '')
  const [content, setContent] = useState(initial?.content ?? '')
  const [coverImageUrl, setCoverImageUrl] = useState(initial?.cover_image_url ?? '')
  const [isPublished, setIsPublished] = useState(initial?.is_published ?? false)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [deleting, setDeleting] = useState(false)

  // Toolbar insert state
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [insertMode, setInsertMode] = useState<InsertMode>(null)
  const [insertUrl, setInsertUrl] = useState('')
  const [insertText, setInsertText] = useState('')

  // Generic entity picker state
  const entityCacheRef = useRef<Record<string, EntityOption[]>>({})
  const [entityOptions, setEntityOptions] = useState<EntityOption[]>([])
  const [entityQuery, setEntityQuery] = useState('')
  const [entityLoading, setEntityLoading] = useState(false)

  useEffect(() => {
    if (!insertMode || !ENTITY_MODES.includes(insertMode)) return
    const mode = insertMode as string

    if (entityCacheRef.current[mode]) {
      setEntityOptions(entityCacheRef.current[mode])
      return
    }

    setEntityOptions([])
    setEntityLoading(true)
    fetch(ENTITY_CONFIG[mode].apiPath)
      .then(r => r.json())
      .then((data: any[]) => {
        const options = normalizeEntities(mode, data)
        entityCacheRef.current[mode] = options
        setEntityOptions(options)
        setEntityLoading(false)
      })
  }, [insertMode])

  const filteredEntities = entityQuery.trim().length > 0
    ? entityOptions.filter(e => e.label.toLowerCase().includes(entityQuery.toLowerCase()))
    : entityOptions.slice(0, 24)

  function insertEntity(option: EntityOption) {
    const ta = textareaRef.current
    const start = ta ? ta.selectionStart : content.length
    const end   = ta ? ta.selectionEnd   : content.length
    const snippet = `\n\n[${insertMode}:${option.value}]\n\n`
    setContent(content.slice(0, start) + snippet + content.slice(end))
    setInsertMode(null)
    setEntityQuery('')
    setTimeout(() => {
      if (ta) { ta.focus(); ta.setSelectionRange(start + snippet.length, start + snippet.length) }
    }, 0)
  }

  function openInsert(mode: InsertMode) {
    const ta = textareaRef.current
    const selected = ta ? content.slice(ta.selectionStart, ta.selectionEnd) : ''
    setInsertUrl('')
    setInsertText(selected)
    setEntityQuery('')
    setInsertMode(mode)
  }

  function doInsert() {
    const ta = textareaRef.current
    const start = ta ? ta.selectionStart : content.length
    const end   = ta ? ta.selectionEnd   : content.length

    let snippet = ''
    if (insertMode === 'link')  snippet = `[${insertText || insertUrl}](${insertUrl})`
    if (insertMode === 'image') snippet = `![${insertText || 'image'}](${insertUrl})`
    if (insertMode === 'tweet') snippet = `\n\n[tweet:${insertUrl}]\n\n`

    const newContent = content.slice(0, start) + snippet + content.slice(end)
    setContent(newContent)
    setInsertMode(null)
    setInsertUrl('')
    setInsertText('')

    setTimeout(() => {
      if (ta) { ta.focus(); ta.setSelectionRange(start + snippet.length, start + snippet.length) }
    }, 0)
  }

  function handleTitleChange(val: string) {
    setTitle(val)
    if (!isEdit || slug === toSlug(initial?.title ?? '')) {
      setSlug(toSlug(val))
    }
  }

  async function handleSave() {
    setStatus('saving')
    const body = isEdit
      ? { id: initial!.id, title, slug, excerpt, content, cover_image_url: coverImageUrl, is_published: isPublished }
      : { title, slug, excerpt, content, cover_image_url: coverImageUrl, is_published: isPublished }

    const res = await fetch('/api/admin/blog', {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      setStatus('saved')
      if (!isEdit) {
        const data = await res.json()
        router.push(`/admin/blog/${data.id}/edit`)
      }
      setTimeout(() => setStatus('idle'), 2000)
    } else {
      setStatus('error')
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this post permanently?')) return
    setDeleting(true)
    await fetch('/api/admin/blog', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: initial!.id }),
    })
    router.push('/admin/blog')
  }

  const inputClass = "w-full rounded-xl px-4 py-3 text-sm font-medium outline-none transition-colors"
  const inputStyle = { background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }
  const isEntityMode = insertMode && ENTITY_MODES.includes(insertMode)

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <a href="/admin/blog" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Blog Posts</a>
          <h1 className="font-display text-3xl font-black mt-1">{isEdit ? 'Edit Post' : 'New Post'}</h1>
        </div>
        <div className="flex items-center gap-3">
          {isEdit && slug && (
            <a
              href={`/api/admin/blog/preview?slug=${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-70"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            >
              Preview
            </a>
          )}
          {isEdit && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-70"
              style={{ background: 'hsl(var(--destructive) / 0.12)', color: 'hsl(var(--destructive))' }}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={status === 'saving' || !title}
            className="px-5 py-2.5 rounded-xl font-bold text-sm transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--background))' }}
          >
            {status === 'saving' ? 'Saving…' : status === 'saved' ? '✓ Saved' : status === 'error' ? '✗ Error' : 'Save'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-5">

        {/* Title */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Title</label>
          <input
            className={inputClass}
            style={inputStyle}
            value={title}
            onChange={e => handleTitleChange(e.target.value)}
            placeholder="My Post Title"
          />
        </div>

        {/* Slug */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Slug</label>
          <input
            className={inputClass}
            style={inputStyle}
            value={slug}
            onChange={e => setSlug(e.target.value)}
            placeholder="my-post-title"
          />
          <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>dota2protips.com/blog/{slug || '…'}</p>
        </div>

        {/* Cover image */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Cover Image URL</label>
          <input
            className={inputClass}
            style={inputStyle}
            value={coverImageUrl}
            onChange={e => setCoverImageUrl(e.target.value)}
            placeholder="https://…"
          />
          {coverImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img loading="lazy" src={coverImageUrl} alt="cover preview" className="mt-2 rounded-xl object-cover w-full" style={{ maxHeight: 200 }} />
          )}
        </div>

        {/* Excerpt */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Excerpt <span className="normal-case font-normal">(shown in post list)</span></label>
          <textarea
            className={inputClass}
            style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
            value={excerpt}
            onChange={e => setExcerpt(e.target.value)}
            placeholder="Short description of this post…"
          />
        </div>

        {/* Content */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Content</label>

          {/* Toolbar */}
          <div
            className="flex items-center gap-1 px-2 py-1.5 rounded-t-xl flex-wrap"
            style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', borderBottom: 'none' }}
          >
            {/* Formatting buttons */}
            {(
              [
                { mode: 'link'  as const, label: 'Link',  icon: '🔗' },
                { mode: 'image' as const, label: 'Image', icon: '🖼' },
                { mode: 'tweet' as const, label: 'Tweet', icon: '𝕏'  },
              ] as const
            ).map(({ mode, label, icon }) => (
              <button
                key={mode}
                type="button"
                onMouseDown={e => { e.preventDefault(); openInsert(mode) }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
                style={{
                  background: insertMode === mode ? 'hsl(var(--primary) / 0.15)' : 'transparent',
                  color: insertMode === mode ? 'hsl(var(--primary))' : 'var(--text-muted)',
                  border: insertMode === mode ? '1px solid hsl(var(--primary) / 0.3)' : '1px solid transparent',
                }}
              >
                <span>{icon}</span> {label}
              </button>
            ))}

            {/* Separator */}
            <span className="w-px h-4 mx-1 shrink-0" style={{ background: 'var(--border)' }} />

            {/* Entity buttons */}
            {Object.entries(ENTITY_CONFIG).map(([mode, cfg]) => (
              <button
                key={mode}
                type="button"
                onMouseDown={e => { e.preventDefault(); openInsert(mode as InsertMode) }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
                style={{
                  background: insertMode === mode ? 'hsl(var(--primary) / 0.15)' : 'transparent',
                  color: insertMode === mode ? 'hsl(var(--primary))' : 'var(--text-muted)',
                  border: insertMode === mode ? '1px solid hsl(var(--primary) / 0.3)' : '1px solid transparent',
                }}
              >
                <span>{cfg.icon}</span> {cfg.label}
              </button>
            ))}
          </div>

          {/* Insert panel — link / image / tweet */}
          {insertMode && !isEntityMode && (
            <div
              className="flex flex-wrap items-end gap-3 px-4 py-3"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderBottom: 'none' }}
            >
              <div className="flex flex-col gap-1 flex-1 min-w-48">
                <label className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  {insertMode === 'tweet' ? 'Tweet URL' : 'URL'}
                </label>
                <input
                  autoFocus
                  className="rounded-lg px-3 py-2 text-sm font-medium outline-none"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  value={insertUrl}
                  onChange={e => setInsertUrl(e.target.value)}
                  placeholder={
                    insertMode === 'tweet'
                      ? 'https://x.com/user/status/…'
                      : insertMode === 'image'
                      ? 'https://…/image.jpg'
                      : 'https://… or /internal/path'
                  }
                  onKeyDown={e => { if (e.key === 'Enter') doInsert() }}
                />
              </div>
              {insertMode !== 'tweet' && (
                <div className="flex flex-col gap-1 flex-1 min-w-40">
                  <label className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    {insertMode === 'image' ? 'Alt text' : 'Display text'}
                  </label>
                  <input
                    className="rounded-lg px-3 py-2 text-sm font-medium outline-none"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    value={insertText}
                    onChange={e => setInsertText(e.target.value)}
                    placeholder={insertMode === 'image' ? 'optional description' : 'optional display text'}
                    onKeyDown={e => { if (e.key === 'Enter') doInsert() }}
                  />
                </div>
              )}
              <div className="flex gap-2 pb-0.5">
                <button
                  type="button"
                  onClick={doInsert}
                  disabled={!insertUrl}
                  className="px-4 py-2 rounded-lg text-xs font-bold transition-opacity disabled:opacity-40"
                  style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--background))' }}
                >
                  Insert
                </button>
                <button
                  type="button"
                  onClick={() => setInsertMode(null)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-70"
                  style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Entity picker panel — hero / team / player / item */}
          {isEntityMode && (
            <div
              className="flex flex-col gap-2 px-4 py-3"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderBottom: 'none' }}
            >
              <div className="flex items-center gap-3">
                <input
                  autoFocus
                  className="flex-1 rounded-lg px-3 py-2 text-sm font-medium outline-none"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  value={entityQuery}
                  onChange={e => setEntityQuery(e.target.value)}
                  placeholder={insertMode ? ENTITY_CONFIG[insertMode]?.placeholder : ''}
                />
                <button
                  type="button"
                  onClick={() => { setInsertMode(null); setEntityQuery('') }}
                  className="px-3 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-70 shrink-0"
                  style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}
                >
                  Cancel
                </button>
              </div>

              {entityLoading && (
                <p className="text-xs py-2" style={{ color: 'var(--text-muted)' }}>Loading…</p>
              )}

              {!entityLoading && entityOptions.length > 0 && (
                <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-1">
                  {filteredEntities.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => insertEntity(opt)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors hover:opacity-80"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                    >
                      {opt.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={opt.image_url}
                          alt={opt.label}
                          className="w-10 h-10 rounded-lg object-cover shrink-0"
                          style={{ background: 'var(--surface-3)' }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center font-black text-base" style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}>
                          {opt.label[0]}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold leading-tight truncate" style={{ color: 'var(--text)' }}>{opt.label}</p>
                        {opt.meta && <p className="text-xs leading-tight truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{opt.meta}</p>}
                      </div>
                    </button>
                  ))}
                  {filteredEntities.length === 0 && (
                    <p className="col-span-2 text-xs py-2 px-1" style={{ color: 'var(--text-muted)' }}>
                      No results for &quot;{entityQuery}&quot;
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <textarea
            ref={textareaRef}
            className={inputClass}
            style={{
              ...inputStyle,
              resize: 'vertical',
              minHeight: 400,
              lineHeight: '1.7',
              fontFamily: 'monospace',
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0,
            }}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Write your post here…&#10;&#10;Use blank lines to separate paragraphs."
          />
          <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>
            Supports Markdown. Use the toolbar to insert links, images, tweets, and entity cards.
          </p>
        </div>

        {/* Publish toggle */}
        <div
          className="flex items-center justify-between rounded-xl px-5 py-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div>
            <p className="font-semibold text-sm">Published</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {isPublished ? 'Visible to everyone' : 'Draft — only you can see it'}
            </p>
          </div>
          <button
            onClick={() => setIsPublished(p => !p)}
            className="relative w-12 h-6 rounded-full transition-colors duration-200"
            style={{ background: isPublished ? 'hsl(var(--primary))' : 'var(--surface-3)' }}
          >
            <span
              className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
              style={{ transform: isPublished ? 'translateX(24px)' : 'translateX(0)' }}
            />
          </button>
        </div>

      </div>
    </div>
  )
}
