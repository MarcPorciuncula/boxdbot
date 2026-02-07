import { Hono } from "hono";
import { verify } from "./discord/webhook/verify";
import { useHandleInteraction } from "./discord/webhook/handle-interaction";
import { useInstallCommands } from "./discord/install-commands";
import { usePostReviews } from "./review-poster";
import { useUserRepository } from "./users/repository";
import { useGuildConfigRepository } from "./guild-config/repository";
import { usePostsRepository } from "./review-poster/posts";
import { useUserService } from "./users";
import { DiscordClient } from "./discord/client";

const app = new Hono<{ Bindings: Env }>();

async function resolveContext(env: Env) {
  const userRepo = await useUserRepository({ db: env.DB });
  const guildConfigRepo = await useGuildConfigRepository({ db: env.DB });
  const postsRepo = await usePostsRepository({ db: env.DB });
  
  const userService = useUserService({ repository: userRepo });
  const discordClient = new DiscordClient(env.DISCORD_BOT_TOKEN);
  
  return {
    userRepo,
    guildConfigRepo,
    postsRepo,
    userService,
    discordClient,
  };
}

app.get("/", (c) => c.text("Hello World"));

app.post("/discord/install", async (c) => {
  const ctx = await resolveContext(c.env);
  const installCommands = useInstallCommands({
    discordClient: ctx.discordClient,
    userService: ctx.userService,
    guildConfigs: ctx.guildConfigRepo,
    appId: c.env.DISCORD_APP_ID,
  });
  await installCommands();
  return c.text("Done");
});

app.post("/discord/webhook/interactions", async (c) => {
  const signature = c.req.header("X-Signature-Ed25519");
  const timestamp = c.req.header("X-Signature-Timestamp");
  const body = await c.req.text();

  const isValid = await verify(
    body,
    signature ?? null,
    timestamp ?? null,
    c.env.DISCORD_PUBLIC_KEY
  );

  if (!isValid) {
    return c.text("Invalid request signature", 401);
  }

  const interaction = JSON.parse(body);
  const ctx = await resolveContext(c.env);
  const handleInteraction = useHandleInteraction({
    userService: ctx.userService,
    guildConfigs: ctx.guildConfigRepo,
  });
  const result = await handleInteraction(interaction);

  return c.json(result);
});

export default {
  fetch: app.fetch,
  async scheduled(event: any, env: Env, ctx: any) {
    const resolved = await resolveContext(env);
    const postReviews = usePostReviews({
      userService: resolved.userService,
      posts: resolved.postsRepo,
      discord: resolved.discordClient,
      configs: resolved.guildConfigRepo,
    });
    await postReviews.runPeriodicSync();
  },
};
