import "dotenv/config"
import { initializeApp } from "firebase-admin/app"
import { usePostReviews } from "./review-poster"
import { useLetterboxdFeeds } from "./letterboxd/feeds"
import { parseReviews } from "./letterboxd/reviews"
initializeApp()

const feeds = useLetterboxdFeeds()

async function run() {
  const res = await feeds.get("kalpal")
  if (!res) return
  for await (const review of parseReviews(res.feed)) {
    console.log(review.title, review.tags)
    break
  }
}

run().catch((err) => {
  console.error(err)
})
