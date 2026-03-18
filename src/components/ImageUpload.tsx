'use client'

import { useRef, useState } from 'react'

interface Props {
  value: string
  onChange: (url: string) => void
  folder?: string
  label?: string
}

export default function ImageUpload({ value, onChange, folder = 'misc', label = 'Image' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)

  async function upload(file: File) {
    setUploading(true)
    setError('')

    const fd = new FormData()
    fd.append('file', file)
    fd.append('folder', folder)

    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Upload failed')
    } else {
      onChange(data.url)
    }
    setUploading(false)
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) upload(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) upload(file)
  }

  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{label}</label>

      {/* Drop zone */}
      <div
        className="relative rounded-xl border-2 border-dashed transition-colors duration-200 cursor-pointer"
        style={{
          borderColor: dragging ? 'var(--accent)' : 'var(--border)',
          background: dragging ? 'var(--accent-dim)' : 'var(--surface)',
          minHeight: value ? 'auto' : '120px',
        }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        {value ? (
          <div className="relative group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Preview"
              className="w-full max-h-64 object-cover rounded-xl"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: 'var(--accent)' }}
              >
                Replace
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onChange('') }}
                className="px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
            {uploading ? (
              <>
                <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Uploading...</p>
              </>
            ) : (
              <>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-subtle)' }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                  Drop image here or <span style={{ color: 'var(--accent)' }}>click to upload</span>
                </p>
                <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>JPG, PNG, WebP · max 5 MB</p>
              </>
            )}
          </div>
        )}

        {uploading && value && (
          <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)' }} />
          </div>
        )}
      </div>

      {/* URL fallback input */}
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Or paste a URL directly"
        className="w-full rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-orange-500 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-muted)]"
      />

      {error && <p className="text-xs" style={{ color: 'var(--wrong)' }}>{error}</p>}

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
    </div>
  )
}
