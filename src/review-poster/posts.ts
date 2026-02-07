import { ensureTable } from "../db/init";
import { createStore } from "../db/store";

export type Post = {
  guildId: string;
  userId: string;
  createdAt: Date;
  reviewId: string;
};

export type PostsRepository = Awaited<ReturnType<typeof usePostsRepository>>;

export async function usePostsRepository({ db }: { db: D1Database }) {
  await ensureTable(db, "posts", {
    columns: [
      { name: "guild_id", type: "TEXT" },
      { name: "review_id", type: "TEXT" },
      { name: "value", type: "TEXT", notNull: true },
    ],
    primaryKey: ["guild_id", "review_id"],
  });

  const store = createStore<Post>(db, "posts");

  async function save(post: Post) {
    await store.set({ guild_id: post.guildId, review_id: post.reviewId }, post);
    return post;
  }

  async function get(guildId: string, reviewId: string) {
    return await store.get({
      guild_id: guildId,
      review_id: reviewId,
    });
  }

  return { save, get };
}
