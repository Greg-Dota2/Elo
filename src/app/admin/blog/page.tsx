import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function AdminBlogPage() {
  const supabase = createAdminClient()
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('id, title, slug, is_published, published_at, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/admin" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Admin</Link>
          <h1 className="font-display text-3xl font-black mt-1">Blog Posts</h1>
        </div>
        <Link
          href="/admin/blog/new"
          className="px-5 py-2.5 rounded-xl font-bold text-sm transition-opacity hover:opacity-80"
          style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--background))' }}
        >
          + New Post
        </Link>
      </div>

      {!posts?.length ? (
        <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-muted-foreground">No posts yet. Write your first one!</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {posts.map((post, i) => (
            <div
              key={post.id}
              className="flex items-center justify-between gap-4 px-5 py-4"
              style={{
                background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)',
                borderBottom: i < posts.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div className="min-w-0">
                <p className="font-semibold truncate">{post.title}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {post.is_published ? (
                    <span style={{ color: 'var(--correct)' }}>● Published</span>
                  ) : (
                    <span style={{ color: 'var(--text-subtle)' }}>○ Draft</span>
                  )}
                  {' · '}
                  {new Date(post.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/blog/${post.slug}`}
                  target="_blank"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-70"
                  style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}
                >
                  View
                </Link>
                <Link
                  href={`/admin/blog/${post.id}/edit`}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                  style={{ background: 'hsl(var(--primary) / 0.15)', color: 'hsl(var(--primary))' }}
                >
                  Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
