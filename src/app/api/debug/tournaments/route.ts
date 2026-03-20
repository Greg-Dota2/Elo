import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('tournaments')
    .select('id, name, slug, is_published, start_date, end_date')
    .order('start_date', { ascending: false })

  return NextResponse.json(data)
}
