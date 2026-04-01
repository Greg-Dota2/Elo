import { draftMode } from 'next/headers'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  ;(await draftMode()).disable()
  const ref = req.headers.get('referer') ?? '/admin/blog'
  return Response.redirect(ref)
}
