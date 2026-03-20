import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import BlogForm from '../../BlogForm'

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()
  const { data: post } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', id)
    .single()

  if (!post) notFound()

  return (
    <BlogForm
      initial={{
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt ?? '',
        content: post.content ?? '',
        cover_image_url: post.cover_image_url ?? '',
        is_published: post.is_published,
      }}
    />
  )
}
