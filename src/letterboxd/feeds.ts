import { from } from "ix/Ix.asynciterable"
import { parse } from "../xml/parse"

export function useLetterboxdFeeds() {
  async function get(username: string) {
    const res = await fetch(
      `https://letterboxd.com/${encodeURIComponent(username)}/rss/`,
    )

    if (res.status === 404) {
      return null
    }

    if (!res.ok) {
      throw new Error(`Letterboxd feed error for ${username}: HTTP ${res.status}`)
    }

    if (!res.body) {
      throw new Error("Missing response body")
    }

    return { username, feed: parse(from(res.body)) }
  }

  return { get }
}
