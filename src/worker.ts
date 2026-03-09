import { Hono } from "hono"
import * as Sentry from "@sentry/cloudflare"
import { once } from "ramda"
import { env } from "cloudflare:workers"
import { verify } from "./discord/webhook/verify"
import { useHandleInteraction } from "./discord/webhook/handle-interaction"
import { useInstallCommands } from "./discord/install-commands"
import { usePostReviews } from "./review-poster"
import { useUserRepository } from "./users/repository"
import { useGuildConfigRepository } from "./guild-config/repository"
import { usePostsRepository } from "./review-poster/posts"
import { useUserService } from "./users"
import { DiscordClient } from "./discord/client"

const buildDeps = once(async () => {
  const userRepo = await useUserRepository({ db: env.DB })
  const guildConfigRepo = await useGuildConfigRepository({ db: env.DB })
  const postsRepo = await usePostsRepository({ db: env.DB })

  const userService = useUserService({ repository: userRepo })
  const discordClient = new DiscordClient(env.DISCORD_BOT_TOKEN)

  return {
    userRepo,
    guildConfigRepo,
    postsRepo,
    userService,
    discordClient,
  }
})

type Deps = Awaited<ReturnType<typeof buildDeps>>
type Variables = { deps: Deps }

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

app.use(async (c, next) => {
  c.set("deps", await buildDeps())
  await next()
})

app.get("/", (c) => c.text("Hello World"))

app.post("/discord/install", async (c) => {
  const deps = c.get("deps")
  const installCommands = useInstallCommands({
    discordClient: deps.discordClient,
    userService: deps.userService,
    guildConfigs: deps.guildConfigRepo,
    appId: c.env.DISCORD_APP_ID,
  })
  await installCommands()
  return c.text("Done")
})

app.get("/debug/db", async (c) => {
  const deps = c.get("deps")
  const [guildConfigs, userRegistrations, recentPosts] = await Promise.all([
    deps.guildConfigRepo.list(),
    deps.userRepo.listAll(),
    deps.postsRepo.list(),
  ])
  return c.json({ guildConfigs, userRegistrations, recentPosts })
})

app.post("/debug/sync", async (c) => {
  const deps = c.get("deps")
  const postReviews = usePostReviews({
    userService: deps.userService,
    posts: deps.postsRepo,
    discord: deps.discordClient,
    configs: deps.guildConfigRepo,
  })
  await postReviews.runPeriodicSync()
  return c.json({ ok: true })
})

app.post("/discord/webhook/interactions", async (c) => {
  const signature = c.req.header("X-Signature-Ed25519")
  const timestamp = c.req.header("X-Signature-Timestamp")
  const body = await c.req.text()

  const isValid = await verify(
    body,
    signature ?? null,
    timestamp ?? null,
    c.env.DISCORD_PUBLIC_KEY,
  )

  if (!isValid) {
    return c.text("Invalid request signature", 401)
  }

  const interaction = JSON.parse(body)
  const deps = c.get("deps")
  const handleInteraction = useHandleInteraction({
    userService: deps.userService,
    guildConfigs: deps.guildConfigRepo,
  })
  const result = await handleInteraction(interaction)

  return c.json(result)
})

export default Sentry.withSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 1.0,
    sendDefaultPii: true,
    enableLogs: true,
  }),
  {
    fetch: app.fetch,
    async scheduled(event: any, env: Env, ctx: any) {
      const deps = await buildDeps()
      const postReviews = usePostReviews({
        userService: deps.userService,
        posts: deps.postsRepo,
        discord: deps.discordClient,
        configs: deps.guildConfigRepo,
      })
      ctx.waitUntil(postReviews.runPeriodicSync())
    },
  },
)
