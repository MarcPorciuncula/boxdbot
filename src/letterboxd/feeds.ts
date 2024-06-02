import { parse } from "../xml/parse"

export function useLetterboxdFeeds() {
  async function get(username: string) {
    const res = await fetch(
      `https://letterboxd.com/${encodeURIComponent(username)}/rss/`,
    )

    if (res.status === 404) {
      return null
    }

    if (!res.body) {
      throw new Error("Missing response body")
    }

    return { username, feed: parse(res.body) }
  }

  return { get }
}
