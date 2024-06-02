import { verifyKey } from "discord-interactions"
import { defineString } from "firebase-functions/params"
import { Middleware } from "koa"

const PUBLIC_KEY = defineString("DISCORD_PUBLIC_KEY")

export function verify(): Middleware {
  return async (ctx, next) => {
    const sig = ctx.get("X-Signature-Ed25519")
    const ts = ctx.get("X-Signature-Timestamp")

    const rawBody = ctx.request.rawBody ?? ctx.req.rawBody
    const isValid = verifyKey(rawBody, sig, ts, PUBLIC_KEY.value())

    if (!isValid) {
      ctx.status = 401
      ctx.body = "Invalid request signature"
      return
    }

    await next()
  }
}
