import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const params = new URLSearchParams({ manual: '1' })
  if (body.type) params.set('type', body.type)
  if (body.slug) params.set('slug', body.slug)

  const origin = req.nextUrl.origin
  const res = await fetch(`${origin}/api/cron/auto-translate?${params}`, {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
