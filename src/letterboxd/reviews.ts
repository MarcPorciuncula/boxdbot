import { parse as parseDate } from "date-fns"
import { Element, Text } from "hast"
import { fromHtml } from "hast-util-from-html"
import { AsyncIterable } from "ix"
import { from } from "ix/asynciterable/index"
import { filter, flatMap, map } from "ix/asynciterable/operators/index"
import { visit } from "unist-util-visit"
import { XmlNode } from "xml-reader"

export function parseReviews(feed: AsyncIterable<XmlNode>) {
  return from(feed).pipe(
    filter((node) => node.name === "channel"),
    flatMap((node) => node.children),
    filter((node) => node.name === "item"),
    filter((node) =>
      node.children.some(
        (item) =>
          item.name === "guid" && text(item).includes("letterboxd-review"),
      ),
    ),
    map(async (node): Promise<Review> => {
      const find = (name: string) => {
        const target = node.children.find((item) => item.name === name)
        if (!target) throw new Error("Missing child node: " + name)
        return target
      }

      const findMaybe = (name: string) => {
        return node.children.find((item) => item.name === name) ?? null
      }

      const link = text(find("link"))

      return {
        id: text(find("guid")),
        link,
        title: text(find("title")),
        rating: findMaybe("letterboxd:memberRating")
          ? parseRating(text(find("letterboxd:memberRating")))
          : null,
        watchedDate: parseDate(
          text(find("letterboxd:watchedDate")),
          "yyyy-MM-dd",
          new Date(),
        ),
        publishedDate: parseDate(
          text(find("pubDate")),
          "EEE, d MMM yyyy HH:mm:ss X",
          new Date(),
        ),
        rewatch: text(find("letterboxd:rewatch")) === "Yes",
        filmTitle: text(find("letterboxd:filmTitle")),
        filmYear: text(find("letterboxd:filmYear")),
        tmdbMovieId: findMaybe("tmdb:movieId")
          ? text(find("tmdb:movieId"))
          : null,
        content: text(find("description")),
        spoilers: text(find("title")).includes("(contains spoilers)"),
        tags: await fetchTags(link),
      }
    }),
  )
}

function text(node: XmlNode) {
  return node.children
    .filter((item) => item.type === "text")
    .map((item) => item.value)
    .join("")
    .trim()
}

function parseRating(rating: string) {
  return parseFloat(rating) * 2
}

async function fetchTags(link: string) {
  const res = await fetch(link, { method: "GET" })

  const body = await res.text()

  if (!res.ok) {
    throw new Error(
      `Failed to fetch tags for review: ${res.statusText}\n` + body,
    )
  }

  const hast = fromHtml(body)

  const tags: string[] = []

  visit(hast, "element", (node, index, parent) => {
    if (node.tagName !== "ul") return
    if (!(node.properties.className as string[])?.includes("tags")) return

    for (const li of node.children.filter(
      (child): child is Element =>
        child.type === "element" && child.tagName === "li",
    )) {
      for (const a of li.children.filter(
        (child): child is Element =>
          child.type === "element" && child.tagName === "a",
      )) {
        const text = a.children.find(
          (node): node is Text => node.type === "text",
        )?.value

        if (text) {
          tags.push(text)
        }
      }
    }
  })

  return tags
}

export type Review = {
  link: string
  id: string
  title: string
  publishedDate: Date
  watchedDate: Date
  rewatch: boolean
  filmTitle: string
  filmYear: string
  rating: number | null // out of 10 (5 stars with halves)
  tmdbMovieId: string | null
  content: string
  spoilers: boolean
  tags: string[]
}
