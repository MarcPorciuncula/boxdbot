import Router from "@koa/router"
import "dotenv/config"
import Koa from "koa"
import mount from "koa-mount"
import { bodyParser } from "./body-parser"
import { app as discord } from "./discord/app"

const app = new Koa()

app.use(bodyParser())
app.use(mount("/discord", discord))

const router = new Router()
router.get("/", (ctx) => {
  ctx.body = "Hello World"
  ctx.status = 200
})

app.use(router.routes()).use(router.allowedMethods())

const handler = app.callback()

export { app, handler }
