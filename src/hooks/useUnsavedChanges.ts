'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function useUnsavedChanges(isDirty: boolean) {
  const router = useRouter()

  // Browser close / refresh / back button
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // Next.js in-app navigation — wrap router.push
  const push = (href: string) => {
    if (!isDirty || window.confirm('You have unsaved changes. Leave anyway?')) {
      router.push(href)
    }
  }

  return { push }
}
