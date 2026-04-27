'use client'

import { useState, useRef } from 'react'

interface Props {
  value: string
  onChange: (val: string) => void
  rows?: number
  placeholder?: string
  className?: string
}

const panelStyle: React.CSSProperties = {
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  borderBottom: 'none',
}

const inputStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
}

export default function RichTextarea({ value, onChange, rows = 4, placeholder, className = '' }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [showLink, setShowLink] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkText, setLinkText] = useState('')

  function openLink() {
    const ta = textareaRef.current
    const selected = ta ? value.slice(ta.selectionStart, ta.selectionEnd) : ''
    setLinkUrl('')
    setLinkText(selected)
    setShowLink(true)
  }

  function insertLink() {
    if (!linkUrl) return
    const ta = textareaRef.current
    const start = ta ? ta.selectionStart : value.length
    const end = ta ? ta.selectionEnd : value.length
    const snippet = `[${linkText || linkUrl}](${linkUrl})`
    onChange(value.slice(0, start) + snippet + value.slice(end))
    setShowLink(false)
    setLinkUrl('')
    setLinkText('')
    setTimeout(() => {
      if (ta) { ta.focus(); ta.setSelectionRange(start + snippet.length, start + snippet.length) }
    }, 0)
  }

  const activeBtn: React.CSSProperties = {
    background: 'hsl(var(--primary) / 0.15)',
    color: 'hsl(var(--primary))',
    border: '1px solid hsl(var(--primary) / 0.3)',
  }
  const idleBtn: React.CSSProperties = {
    background: 'transparent',
    color: 'var(--text-muted)',
    border: '1px solid transparent',
  }

  return (
    <div>
      {/* Toolbar */}
      <div
        className="flex items-center gap-1 px-2 py-1.5 rounded-t-xl"
        style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', borderBottom: 'none' }}
      >
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); showLink ? setShowLink(false) : openLink() }}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
          style={showLink ? activeBtn : idleBtn}
        >
          🔗 Link
        </button>
      </div>

      {/* Link panel */}
      {showLink && (
        <div className="flex flex-wrap items-end gap-3 px-4 py-3" style={panelStyle}>
          <div className="flex flex-col gap-1 flex-1 min-w-48">
            <label className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>URL</label>
            <input
              autoFocus
              className="rounded-lg px-3 py-2 text-sm font-medium outline-none"
              style={inputStyle}
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              placeholder="https://… or /internal/path"
              onKeyDown={e => { if (e.key === 'Enter') insertLink() }}
            />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-40">
            <label className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Display text</label>
            <input
              className="rounded-lg px-3 py-2 text-sm font-medium outline-none"
              style={inputStyle}
              value={linkText}
              onChange={e => setLinkText(e.target.value)}
              placeholder="optional"
              onKeyDown={e => { if (e.key === 'Enter') insertLink() }}
            />
          </div>
          <div className="flex gap-2 pb-0.5">
            <button
              type="button"
              onClick={insertLink}
              disabled={!linkUrl}
              className="px-4 py-2 rounded-lg text-xs font-bold transition-opacity disabled:opacity-40"
              style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--background))' }}
            >
              Insert
            </button>
            <button
              type="button"
              onClick={() => setShowLink(false)}
              className="px-3 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-70"
              style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        className={className}
        style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}
