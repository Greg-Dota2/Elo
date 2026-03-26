const HOST = 'dota2protips.com'
const KEY = '3db8229ec2234970a39a72f096413fb2'
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`

export async function submitToIndexNow(urls: string[]): Promise<void> {
  if (!urls.length) return

  try {
    await fetch('https://api.indexnow.org/IndexNow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: HOST,
        key: KEY,
        keyLocation: KEY_LOCATION,
        urlList: urls,
      }),
    })
  } catch {
    // Non-critical — never block the main response
  }
}
