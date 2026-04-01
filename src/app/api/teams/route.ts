import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('teams')
    .select('name, slug, logo_url, region')
    .not('slug', 'is', null)
    .eq('is_active', true)
    .order('name')
  return NextResponse.json(data ?? [])
}
