import { parse as parseDate } from "date-fns"
import { from } from "ix/asynciterable/index"
import { filter, flatMap, map } from "ix/asynciterable/operators/index"
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

      return {
        id: text(find("guid")),
        link: text(find("link")),
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
}
