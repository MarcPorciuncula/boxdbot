import { ensureTable } from "../db/init";
import { getDocument, setDocument } from "../db/repository";

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

  async function save(post: Post) {
    await setDocument(
      db,
      "posts",
      { guild_id: post.guildId, review_id: post.reviewId },
      post
    );
    return post;
  }

  async function get(guildId: string, reviewId: string) {
    return await getDocument<Post>(db, "posts", {
      guild_id: guildId,
      review_id: reviewId,
    });
  }

  return { save, get };
}
