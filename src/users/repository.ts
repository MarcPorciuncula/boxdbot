import { ensureTable } from "../db/init";
import { createStore } from "../db/store";

export type UserRegistration = {
  letterboxdUsername: string;
  discordUserId: string;
  discordGuildId: string;
  createdAt: Date;
};

export type UserRepository = Awaited<ReturnType<typeof useUserRepository>>;

export async function useUserRepository({ db }: { db: D1Database }) {
  await ensureTable(db, "user_registrations", {
    columns: [
      { name: "guild_id", type: "TEXT" },
      { name: "user_id", type: "TEXT" },
      { name: "letterboxd_username", type: "TEXT" },
      { name: "value", type: "TEXT", notNull: true },
    ],
    primaryKey: ["guild_id", "user_id"],
    indexes: [
      "CREATE INDEX IF NOT EXISTS idx_user_registrations_guild_username ON user_registrations (guild_id, letterboxd_username)",
    ],
  });

  const store = createStore<UserRegistration>(db, "user_registrations");

  async function save(init: Omit<UserRegistration, "createdAt">) {
    const doc: UserRegistration = {
      ...init,
      createdAt: new Date(),
    };

    await store.set(
      { guild_id: doc.discordGuildId, user_id: doc.discordUserId },
      doc,
      { letterboxd_username: doc.letterboxdUsername }
    );

    return doc;
  }

  async function get(guildId: string, userId: string) {
    return await store.get({
      guild_id: guildId,
      user_id: userId,
    });
  }

  async function listForLetterboxdUsername(guildId: string, username: string) {
    return await store.query({
      guild_id: guildId,
      letterboxd_username: username,
    });
  }

  async function listForGuild(guildId: string) {
    return await store.query({
      guild_id: guildId,
    });
  }

  async function remove(guildId: string, userId: string) {
    await store.delete({
      guild_id: guildId,
      user_id: userId,
    });
  }

  return { save, get, listForGuild, listForLetterboxdUsername, remove };
}
