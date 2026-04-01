import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('players')
    .select('ign, slug, photo_url, position, team:teams(name)')
    .eq('is_published', true)
    .order('ign')
  return NextResponse.json(data ?? [])
}
