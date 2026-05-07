'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface Props {
  children: React.ReactNode
  enabled?: boolean
}

export function UnsavedChangesGuard({ children, enabled = true }: Props) {
  const [isDirty, setIsDirty] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Mark dirty on any input/change inside the form
  useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return
    const mark = () => setIsDirty(true)
    el.addEventListener('input', mark)
    el.addEventListener('change', mark)
    return () => {
      el.removeEventListener('input', mark)
      el.removeEventListener('change', mark)
    }
  }, [enabled])

  // Clear dirty after a successful form submit
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const clear = () => setIsDirty(false)
    el.addEventListener('submit', clear)
    return () => el.removeEventListener('submit', clear)
  }, [])

  // Block browser close / refresh / hard back
  useEffect(() => {
    if (!isDirty || !enabled) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty, enabled])

  // Intercept clicks on links/buttons that navigate away
  useEffect(() => {
    if (!isDirty || !enabled) return
    const handler = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a[href], button[data-navigate]')
      if (!target) return
      const href = target.getAttribute('href') ?? target.getAttribute('data-navigate')
      if (!href || href.startsWith('#')) return
      if (!window.confirm('You have unsaved changes. Leave anyway?')) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    document.addEventListener('click', handler, true)
    return () => document.removeEventListener('click', handler, true)
  }, [isDirty, enabled])

  return <div ref={ref}>{children}</div>
}

// Hook variant for programmatic navigation (router.back, router.push)
export function useGuardedNav(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const guard = useCallback((go: () => void) => {
    if (!isDirty || window.confirm('You have unsaved changes. Leave anyway?')) {
      go()
    }
  }, [isDirty])

  return guard
}
