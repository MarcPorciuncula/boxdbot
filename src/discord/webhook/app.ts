import Router from "@koa/router"
import Koa from "koa"
import { z } from "zod"
import { InteractionSchema, useHandleInteraction } from "./handle-interaction"
import { verify } from "./verify"
import { APIBaseInteraction } from "discord-api-types/v10"

const app = new Koa()
app.use(verify())

const router = new Router()

const handleInteraction = useHandleInteraction()
router.post("/interactions", async (ctx) => {
  let body: z.infer<typeof InteractionSchema>
  try {
    body = InteractionSchema.passthrough().parse(ctx.request.body)
  } catch (err: any) {
    ctx.status = 400
    ctx.body = err.message
    return
  }

  ctx.body = await handleInteraction(body as APIBaseInteraction<any, any>)
  ctx.status = 200
})

app.use(router.routes()).use(router.allowedMethods())

export { app }
