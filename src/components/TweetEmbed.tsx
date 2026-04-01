import Script from 'next/script'

export default async function TweetEmbed({ url }: { url: string }) {
  // Normalise x.com → twitter.com for oEmbed compatibility
  const oEmbedUrl = url.replace('https://x.com/', 'https://twitter.com/')

  let html: string | null = null
  try {
    const res = await fetch(
      `https://publish.twitter.com/oembed?url=${encodeURIComponent(oEmbedUrl)}&theme=dark&omit_script=true&dnt=true`,
      { next: { revalidate: 86400 } }
    )
    if (res.ok) {
      const data = await res.json()
      html = data.html ?? null
    }
  } catch {
    // oEmbed unavailable — fall back to plain blockquote below
  }

  return (
    <>
      {html ? (
        <div
          className="my-6 flex justify-center"
          // dangerouslySetInnerHTML keeps the blockquote outside React's reconciliation
          // so the Twitter widget can freely replace it with an iframe
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <div className="my-6 flex justify-center">
          <blockquote className="twitter-tweet" data-theme="dark" data-dnt="true">
            <a href={url}>{url}</a>
          </blockquote>
        </div>
      )}
      {/* next/script deduplicates this across multiple embeds on the same page */}
      <Script src="https://platform.twitter.com/widgets.js" strategy="afterInteractive" />
    </>
  )
}
