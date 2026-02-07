import { ensureTable } from "../db/init";
import { createStore } from "../db/store";

export type GuildConfig = {
  guildId: string;
  createdAt: Date;
  startAt: Date;
  channelId: string;
};

export type GuildConfigRepository = Awaited<ReturnType<typeof useGuildConfigRepository>>;

export async function useGuildConfigRepository({ db }: { db: D1Database }) {
  await ensureTable(db, "guild_configs", {
    columns: [
      { name: "guild_id", type: "TEXT", primaryKey: true },
      { name: "value", type: "TEXT", notNull: true },
    ],
  });

  const store = createStore<GuildConfig>(db, "guild_configs");

  async function save(config: GuildConfig) {
    await store.set({ guild_id: config.guildId }, config);
    return config;
  }

  async function get(guildId: string) {
    return await store.get({
      guild_id: guildId,
    });
  }

  async function list() {
    return await store.query();
  }

  async function update(guildId: string, data: Partial<GuildConfig>) {
    const current = await get(guildId);
    if (!current) {
      throw new Error(`Document does not exist: ${guildId}`);
    }

    const updated = { ...current, ...data };
    await save(updated);
    return updated;
  }

  return { save, get, list, update };
}
