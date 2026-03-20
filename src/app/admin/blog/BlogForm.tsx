'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <a href="/admin/blog" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Blog Posts</a>
          <h1 className="font-display text-3xl font-black mt-1">{isEdit ? 'Edit Post' : 'New Post'}</h1>
        </div>
        <div className="flex items-center gap-3">
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
          <textarea
            className={inputClass}
            style={{ ...inputStyle, resize: 'vertical', minHeight: 400, lineHeight: '1.7', fontFamily: 'monospace' }}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Write your post here…&#10;&#10;Use blank lines to separate paragraphs."
          />
          <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>Blank lines = new paragraph. Supports plain text.</p>
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
