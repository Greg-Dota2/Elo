import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'

const SYSTEM_PROMPT = `You are a professional translator specializing in Dota 2 esports content. Translate English text to Russian.

Rules:
1. KEEP AS-IS (do not translate): team names, player IGNs, tournament names, hero names, item names, esports terms already used in Russian (carry, mid, offlane, support, stand-in, upset, tilt, ELO, BO1, BO3, BO5).
2. MARKDOWN LINKS — CRITICAL: When you see [visible text](url), you MUST output [translated text](url). Keep the square brackets, keep the parentheses, keep the URL exactly. Only translate the visible text inside []. NEVER drop the link syntax. Example: [BLAST Studios](https://liquipedia.net/dota2/BLAST) → [BLAST Studios](https://liquipedia.net/dota2/BLAST) (name stays, url stays).
3. SHORTCODES: [group-stage:slug], [playoff-bracket:slug], [team:slug], [player:slug], [hero:slug], [item:key], [tweet:url] — copy them EXACTLY as-is, do not translate or modify them in any way.
4. VOICE: casual, opinionated, passionate — match the original tone exactly. Russian esports style.
5. FORMATTING: preserve all markdown, line breaks, bold, italics exactly.
6. OUTPUT: return ONLY the translated text. No explanations, no notes, no wrapping.`

async function translateText(client: Anthropic, text: string, maxTokens = 2048): Promise<string> {
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: text }],
  })
  return (msg.content[0] as { type: 'text'; text: string }).text.trim()
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const isManual = req.nextUrl.searchParams.get('manual') === '1'

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 })
  }

  const client = new Anthropic({ apiKey: anthropicKey })
  const supabase = createAdminClient()
  const results: string[] = []

  // Optional: target a specific type+slug for manual testing
  const targetType = req.nextUrl.searchParams.get('type')   // 'tournament' | 'blog' | 'match'
  const targetSlug = req.nextUrl.searchParams.get('slug')

  // ── 1. match_predictions: pre_analysis ───────────────────────────────────
  {
    let query = supabase
      .from('match_predictions')
      .select('id, pre_analysis, tournament:tournaments!match_predictions_tournament_id_fkey(slug)')
      .not('pre_analysis', 'is', null)
      .is('pre_analysis_ru', null)
      .eq('is_published', true)
      .limit(isManual ? 200 : 10)

    if (targetType === 'tournament' && targetSlug) {
      const { data: t } = await supabase.from('tournaments').select('id').eq('slug', targetSlug).single()
      if (t) query = query.eq('tournament_id', t.id)
    }

    const { data: rows } = await query
    for (const row of rows ?? []) {
      try {
        const translated = await translateText(client, row.pre_analysis!)
        await supabase.from('match_predictions').update({ pre_analysis_ru: translated }).eq('id', row.id)
        results.push(`match ${row.id}: pre_analysis translated`)
      } catch (e) {
        results.push(`match ${row.id}: pre_analysis FAILED — ${e}`)
      }
    }
  }

  // ── 2. match_predictions: post_commentary ────────────────────────────────
  {
    let query = supabase
      .from('match_predictions')
      .select('id, post_commentary')
      .not('post_commentary', 'is', null)
      .is('post_commentary_ru', null)
      .eq('is_published', true)
      .limit(isManual ? 200 : 10)

    if (targetType === 'tournament' && targetSlug) {
      const { data: t } = await supabase.from('tournaments').select('id').eq('slug', targetSlug).single()
      if (t) query = query.eq('tournament_id', t.id)
    }

    const { data: rows } = await query
    for (const row of rows ?? []) {
      try {
        const translated = await translateText(client, row.post_commentary!)
        await supabase.from('match_predictions').update({ post_commentary_ru: translated }).eq('id', row.id)
        results.push(`match ${row.id}: post_commentary translated`)
      } catch (e) {
        results.push(`match ${row.id}: post_commentary FAILED — ${e}`)
      }
    }
  }

  // ── 3. tournaments: overview ─────────────────────────────────────────────
  {
    let query = supabase
      .from('tournaments')
      .select('id, slug, overview')
      .not('overview', 'is', null)
      .is('overview_ru', null)
      .eq('is_published', true)
      .limit(isManual ? 20 : 5)

    if (targetType === 'tournament' && targetSlug) {
      query = query.eq('slug', targetSlug)
    }

    const { data: rows } = await query
    for (const row of rows ?? []) {
      try {
        const translated = await translateText(client, row.overview!)
        await supabase.from('tournaments').update({ overview_ru: translated }).eq('id', row.id)
        results.push(`tournament ${row.slug}: overview translated`)
      } catch (e) {
        results.push(`tournament ${row.slug}: overview FAILED — ${e}`)
      }
    }
  }

  // ── 3b. tournaments: format ──────────────────────────────────────────────
  {
    let query = supabase
      .from('tournaments')
      .select('id, slug, format')
      .not('format', 'is', null)
      .is('format_ru', null)
      .eq('is_published', true)
      .limit(isManual ? 20 : 5)

    if (targetType === 'tournament' && targetSlug) {
      query = query.eq('slug', targetSlug)
    }

    const { data: rows } = await query
    for (const row of rows ?? []) {
      try {
        const translated = await translateText(client, row.format!)
        await supabase.from('tournaments').update({ format_ru: translated }).eq('id', row.id)
        results.push(`tournament ${row.slug}: format translated`)
      } catch (e) {
        results.push(`tournament ${row.slug}: format FAILED — ${e}`)
      }
    }
  }

  // ── 4. blog_posts: title + excerpt + content ─────────────────────────────
  {
    let query = supabase
      .from('blog_posts')
      .select('id, slug, title, excerpt, content')
      .is('content_ru', null)
      .eq('is_published', true)
      .limit(isManual ? 5 : 1)

    if (targetType === 'blog' && targetSlug) {
      query = query.eq('slug', targetSlug)
    }

    const { data: rows } = await query
    for (const row of rows ?? []) {
      try {
        const [titleRu, excerptRu, contentRu] = await Promise.all([
          row.title ? translateText(client, row.title, 256) : Promise.resolve(null),
          row.excerpt ? translateText(client, row.excerpt, 512) : Promise.resolve(null),
          row.content ? translateText(client, row.content, 8192) : Promise.resolve(null),
        ])
        await supabase.from('blog_posts').update({
          title_ru: titleRu,
          excerpt_ru: excerptRu,
          content_ru: contentRu,
        }).eq('id', row.id)
        results.push(`blog ${row.slug}: translated`)
      } catch (e) {
        results.push(`blog ${row.slug}: FAILED — ${e}`)
      }
    }
  }

  return NextResponse.json({ ok: true, translated: results.length, results })
}
