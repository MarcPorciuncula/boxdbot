import type { Request } from "firebase-functions"
import type { Context, Next } from "koa"
import koaBodyparser from "@koa/bodyparser"

declare module "koa" {
  interface Request {
    rawBody: string
  }
}

export function bodyParser(opts?: Parameters<typeof koaBodyparser>[0]) {
  const bp = koaBodyparser(opts)
  return async function (ctx: Context, next: Next) {
    ctx.request.body = ctx.request.body || (ctx.req as Request).body
    return bp(ctx, next)
  }
}
