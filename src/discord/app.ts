import Router from "@koa/router"
import Koa from "koa"
import mount from "koa-mount"
import { useInstallCommands } from "./install-commands"
import { app as webhook } from "./webhook/app"

const app = new Koa()

app.use(mount("/webhook", webhook))

const router = new Router()

const installCommands = useInstallCommands()
router.post("/install", async (ctx) => {
  await installCommands()

  ctx.status = 200
  ctx.body = "Done"
})

app.use(router.routes()).use(router.allowedMethods())

export { app }
