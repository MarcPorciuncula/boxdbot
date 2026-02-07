import { ensureTable } from "../db/init";
import { getDocument, setDocument, query } from "../db/repository";

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

  async function save(config: GuildConfig) {
    await setDocument(db, "guild_configs", { guild_id: config.guildId }, config);
    return config;
  }

  async function get(guildId: string) {
    return await getDocument<GuildConfig>(db, "guild_configs", {
      guild_id: guildId,
    });
  }

  async function list() {
    return await query<GuildConfig>(db, "guild_configs");
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
