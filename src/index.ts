import { initializeApp } from "firebase-admin/app"
import { onRequest } from "firebase-functions/v2/https"
import { onSchedule } from "firebase-functions/v2/scheduler"

initializeApp()

export const server = onRequest(
  {
    region: "australia-southeast1",
    maxInstances: 1,
    invoker: "public",
  },
  async (req, res) => {
    const { handler } = await import("./app")
    await handler(req as any, res)
  },
)

export const sync = onSchedule(
  {
    region: "australia-southeast1",
    maxInstances: 1,
    schedule: "every 15 minutes",
  },
  async (ctx) => {
    const { usePostReviews } = await import("./review-poster")
    const { runPeriodicSync } = usePostReviews()
    await runPeriodicSync()
  },
)
