import "dotenv/config"
import { initializeApp } from "firebase-admin/app"
import { usePostReviews } from "./review-poster"
initializeApp()

async function run() {
  const { postReviewsForGuild } = usePostReviews()

  await postReviewsForGuild("1168522804266799187")
  // const { app } = await import("./app")

  // app.listen(3000, () => {
  //   console.log("Server started")
  // })
}

run().catch((err) => {
  console.error(err)
})
