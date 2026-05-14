import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'
import { cookies } from 'next/headers'
import { fetchItemByKey, fetchAllItems } from '@/lib/items'

export const maxDuration = 300

const SYSTEM_PROMPT = `You are translating Dota 2 hero and item guide content from English to Russian for CIS players.
Rules:
- Keep hero names, item names, and in-game jargon as-is (carry, mid, offlane, support, gank, BKB, etc.)
- Write naturally for Russian Dota 2 players — clear, direct, informative
- Match the original tone exactly
- Return ONLY the translated text, no explanations or notes`

const COMMENTARY_PROMPT = `You are a professional translator specializing in Dota 2 esports content. Translate English text to Russian.

Rules:
1. KEEP AS-IS: team names, player IGNs, tournament names, hero names, item names, esports terms (carry, mid, offlane, support, stand-in, ELO, BO1, BO3, BO5).
2. MARKDOWN LINKS: [visible text](url) → [translated text](url). Keep brackets, parentheses, and URL exactly. Only translate the visible text inside [].
3. VOICE: casual, opinionated, passionate — match the original tone exactly. Russian esports style.
4. FORMATTING: preserve all markdown, line breaks, bold, italics exactly.
5. OUTPUT: return ONLY the translated text. No explanations, no notes.`

async function translate(client: Anthropic, text: string): Promise<string> {
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: text }],
  })
  return (msg.content[0] as { type: 'text'; text: string }).text.trim()
}

async function translateCommentary(client: Anthropic, text: string): Promise<string> {
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: COMMENTARY_PROMPT,
    messages: [{ role: 'user', content: text }],
  })
  return (msg.content[0] as { type: 'text'; text: string }).text.trim()
}

async function translateHeroGuide(client: Anthropic, supabase: ReturnType<typeof createAdminClient>, guide: Record<string, unknown>) {
  const [when_to_pick_ru, tips_ru, summary_ru] = await Promise.all([
    guide.when_to_pick ? translate(client, guide.when_to_pick as string) : Promise.resolve(null),
    (guide.tips as string[])?.length ? Promise.all((guide.tips as string[]).map(t => translate(client, t))) : Promise.resolve(null),
    guide.summary ? translate(client, guide.summary as string) : Promise.resolve(null),
  ])
  await supabase.from('hero_guides').update({ when_to_pick_ru, tips_ru, summary_ru, ru_synced_at: new Date().toISOString() }).eq('hero_id', guide.hero_id)
}

type ItemLoreAbilities = { lore: string | null; abilities: { type: string; title: string; description: string }[] }

async function translateItemGuide(
  client: Anthropic,
  supabase: ReturnType<typeof createAdminClient>,
  guide: Record<string, unknown>,
  item?: ItemLoreAbilities,
) {
  const [why_buy_ru, when_to_buy_ru, tips_ru, summary_ru, lore_ru, abilities_ru] = await Promise.all([
    guide.why_buy ? translate(client, guide.why_buy as string) : Promise.resolve(null),
    guide.when_to_buy ? translate(client, guide.when_to_buy as string) : Promise.resolve(null),
    (guide.tips as string[])?.length ? Promise.all((guide.tips as string[]).map(t => translate(client, t))) : Promise.resolve(null),
    guide.summary ? translate(client, guide.summary as string) : Promise.resolve(null),
    item?.lore ? translate(client, item.lore) : Promise.resolve(null),
    item?.abilities?.length
      ? Promise.all(item.abilities.map(async ab => ({
          description: ab.description ? await translate(client, ab.description) : ab.description,
        })))
      : Promise.resolve(null),
  ])
  await supabase.from('item_guides').update({
    why_buy_ru, when_to_buy_ru, tips_ru, summary_ru,
    ...(item !== undefined ? { lore_ru, abilities_ru } : {}),
    ru_synced_at: new Date().toISOString(),
  }).eq('item_key', guide.item_key)
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const adminPwd = process.env.ADMIN_PASSWORD
  if (!adminPwd || cookieStore.get('admin_token')?.value !== adminPwd) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 })

  const body = await req.json()
  const client = new Anthropic({ apiKey })
  const supabase = createAdminClient()

  // ── Single hero guide ──────────────────────────────────────────────────────
  if (body.type === 'hero') {
    const { data: guide } = await supabase.from('hero_guides').select('*').eq('hero_id', body.hero_id).single()
    if (!guide) return NextResponse.json({ error: 'Guide not found' }, { status: 404 })
    await translateHeroGuide(client, supabase, guide)
    return NextResponse.json({ ok: true })
  }

  // ── Single item guide ──────────────────────────────────────────────────────
  if (body.type === 'item') {
    const [{ data: guide }, item] = await Promise.all([
      supabase.from('item_guides').select('*').eq('item_key', body.item_key).single(),
      fetchItemByKey(body.item_key).catch(() => null),
    ])
    if (!guide) return NextResponse.json({ error: 'Guide not found' }, { status: 404 })
    await translateItemGuide(client, supabase, guide, item ?? undefined)
    return NextResponse.json({ ok: true })
  }

  // ── Bulk: all stale hero guides ────────────────────────────────────────────
  if (body.type === 'all-heroes') {
    const { data: all } = await supabase.from('hero_guides').select('*')
    const guides = (all ?? []).filter(g =>
      !g.ru_synced_at || new Date(g.ru_synced_at) < new Date(g.updated_at)
    )
    if (!guides.length) return NextResponse.json({ ok: true, translated: 0 })

    let translated = 0
    for (const guide of guides) {
      try {
        await translateHeroGuide(client, supabase, guide)
        translated++
      } catch { /* skip failed, continue */ }
    }
    return NextResponse.json({ ok: true, translated, total: guides.length })
  }

  // ── Bulk: all stale item guides ────────────────────────────────────────────
  if (body.type === 'all-items') {
    const [{ data: all }, allItems] = await Promise.all([
      supabase.from('item_guides').select('*'),
      fetchAllItems({ revalidate: 3600 }).catch(() => [] as Awaited<ReturnType<typeof fetchAllItems>>),
    ])
    const itemsByKey = new Map(allItems.map(i => [i.key, i]))
    const guides = (all ?? []).filter(g =>
      !g.ru_synced_at || new Date(g.ru_synced_at) < new Date(g.updated_at)
    )
    if (!guides.length) return NextResponse.json({ ok: true, translated: 0 })

    let translated = 0
    for (const guide of guides) {
      try {
        const item = itemsByKey.get(guide.item_key as string)
        await translateItemGuide(client, supabase, guide, item)
        translated++
      } catch { /* skip failed, continue */ }
    }
    return NextResponse.json({ ok: true, translated, total: guides.length })
  }

  // ── Single player ─────────────────────────────────────────────────────────
  if (body.type === 'player') {
    const { data: p } = await supabase.from('players').select('*').eq('id', body.player_id).single()
    if (!p) return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    const [bio_ru, achievements_ru] = await Promise.all([
      p.bio ? translate(client, p.bio) : Promise.resolve(null),
      p.achievements ? translate(client, p.achievements) : Promise.resolve(null),
    ])
    await supabase.from('players').update({ bio_ru, achievements_ru, ru_synced_at: new Date().toISOString() }).eq('id', p.id)
    return NextResponse.json({ ok: true })
  }

  // ── Single team ───────────────────────────────────────────────────────────
  if (body.type === 'team') {
    const { data: t } = await supabase.from('teams').select('*').eq('id', body.team_id).single()
    if (!t) return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    const [bio_ru, achievements_ru] = await Promise.all([
      t.bio ? translate(client, t.bio) : Promise.resolve(null),
      t.achievements ? translate(client, t.achievements) : Promise.resolve(null),
    ])
    await supabase.from('teams').update({ bio_ru, achievements_ru, ru_synced_at: new Date().toISOString() }).eq('id', t.id)
    return NextResponse.json({ ok: true })
  }

  // ── Bulk: all stale players ────────────────────────────────────────────────
  if (body.type === 'all-players') {
    const { data: all } = await supabase.from('players').select('*').eq('is_published', true)
    const rows = (all ?? []).filter(p =>
      (p.bio || p.achievements) && (!p.ru_synced_at || (p.updated_at && new Date(p.ru_synced_at) < new Date(p.updated_at)))
    )
    if (!rows.length) return NextResponse.json({ ok: true, translated: 0 })
    let translated = 0
    for (const p of rows) {
      try {
        const [bio_ru, achievements_ru] = await Promise.all([
          p.bio ? translate(client, p.bio) : Promise.resolve(null),
          p.achievements ? translate(client, p.achievements) : Promise.resolve(null),
        ])
        await supabase.from('players').update({ bio_ru, achievements_ru, ru_synced_at: new Date().toISOString() }).eq('id', p.id)
        translated++
      } catch { /* skip failed */ }
    }
    return NextResponse.json({ ok: true, translated, total: rows.length })
  }

  // ── Bulk: all stale teams ──────────────────────────────────────────────────
  if (body.type === 'all-teams') {
    const { data: all } = await supabase.from('teams').select('*')
    const rows = (all ?? []).filter(t =>
      (t.bio || t.achievements) && (!t.ru_synced_at || (t.updated_at && new Date(t.ru_synced_at) < new Date(t.updated_at)))
    )
    if (!rows.length) return NextResponse.json({ ok: true, translated: 0 })
    let translated = 0
    for (const t of rows) {
      try {
        const [bio_ru, achievements_ru] = await Promise.all([
          t.bio ? translate(client, t.bio) : Promise.resolve(null),
          t.achievements ? translate(client, t.achievements) : Promise.resolve(null),
        ])
        await supabase.from('teams').update({ bio_ru, achievements_ru, ru_synced_at: new Date().toISOString() }).eq('id', t.id)
        translated++
      } catch { /* skip failed */ }
    }
    return NextResponse.json({ ok: true, translated, total: rows.length })
  }

  // ── Bulk: all transfers missing Russian notes ─────────────────────────────
  if (body.type === 'all-transfers') {
    const { data: all } = await supabase.from('transfers').select('id, notes, notes_ru').not('notes', 'is', null)
    const rows = (all ?? []).filter((t: { notes: string | null; notes_ru: string | null }) => t.notes && !t.notes_ru)
    if (!rows.length) return NextResponse.json({ ok: true, translated: 0, total: 0 })
    let translated = 0
    for (const t of rows) {
      try {
        const notes_ru = await translate(client, t.notes!)
        await supabase.from('transfers').update({ notes_ru }).eq('id', t.id)
        translated++
      } catch { /* skip failed, continue */ }
    }
    return NextResponse.json({ ok: true, translated, total: rows.length })
  }

  // ── Bulk: lore + abilities for ALL items (upserts even without a guide) ────
  if (body.type === 'all-items-lore') {
    const [allItems, { data: existing }] = await Promise.all([
      fetchAllItems({ revalidate: 3600 }).catch(() => [] as Awaited<ReturnType<typeof fetchAllItems>>),
      supabase.from('item_guides').select('item_key, lore_ru'),
    ])

    const translatedKeys = new Set(
      (existing ?? []).filter(g => g.lore_ru).map(g => g.item_key)
    )

    const toTranslate = allItems.filter(item =>
      !translatedKeys.has(item.key) && (item.lore || item.abilities.length > 0)
    )

    if (!toTranslate.length) return NextResponse.json({ ok: true, translated: 0, total: 0 })

    let translated = 0
    for (const item of toTranslate) {
      try {
        const [lore_ru, abilities_ru] = await Promise.all([
          item.lore ? translate(client, item.lore) : Promise.resolve(null),
          item.abilities.length
            ? Promise.all(item.abilities.map(async ab => ({
                description: ab.description ? await translate(client, ab.description) : ab.description,
              })))
            : Promise.resolve(null),
        ])
        await supabase.from('item_guides').upsert(
          { item_key: item.key, lore_ru, abilities_ru, ru_synced_at: new Date().toISOString() },
          { onConflict: 'item_key' }
        )
        translated++
      } catch { /* skip failed, continue */ }
    }

    return NextResponse.json({ ok: true, translated, total: toTranslate.length })
  }

  // ── Single blog post ──────────────────────────────────────────────────────
  if (body.type === 'blog') {
    const { data: post } = await supabase.from('blog_posts').select('title, excerpt, content').eq('id', body.post_id).single()
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    const [title_ru, excerpt_ru, content_ru] = await Promise.all([
      post.title ? translate(client, post.title) : Promise.resolve(null),
      post.excerpt ? translate(client, post.excerpt) : Promise.resolve(null),
      post.content ? translate(client, post.content) : Promise.resolve(null),
    ])
    await supabase.from('blog_posts').update({ title_ru, excerpt_ru, content_ru }).eq('id', body.post_id)
    return NextResponse.json({ ok: true, title_ru, excerpt_ru, content_ru })
  }

  // ── Single transfer note ──────────────────────────────────────────────────
  if (body.type === 'transfer-notes') {
    if (!body.notes) return NextResponse.json({ error: 'No notes text provided' }, { status: 400 })
    const notes_ru = await translate(client, body.notes)
    return NextResponse.json({ notes_ru })
  }

  // ── Match post-commentary ─────────────────────────────────────────────────
  if (body.type === 'match') {
    if (!body.commentary) return NextResponse.json({ ok: true, post_commentary_ru: null })
    const post_commentary_ru = await translateCommentary(client, body.commentary)
    await supabase.from('match_predictions').update({ post_commentary_ru }).eq('id', body.match_id)
    return NextResponse.json({ ok: true, post_commentary_ru })
  }

  // ── Match pre-analysis ────────────────────────────────────────────────────
  if (body.type === 'pre_analysis') {
    if (!body.analysis) return NextResponse.json({ ok: true, pre_analysis_ru: null })
    const pre_analysis_ru = await translateCommentary(client, body.analysis)
    await supabase.from('match_predictions').update({ pre_analysis_ru }).eq('id', body.match_id)
    return NextResponse.json({ ok: true, pre_analysis_ru })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}
