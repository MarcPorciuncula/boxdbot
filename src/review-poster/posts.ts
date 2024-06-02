import {
  FirestoreDataConverter,
  Timestamp,
  getFirestore,
} from "firebase-admin/firestore"

export type Post = {
  guildId: string
  userId: string
  createdAt: Date
  reviewId: string
}

export function usePostsRepository({ firestore = getFirestore() } = {}) {
  async function save(post: Post) {
    const collection = firestore
      .collection("guilds")
      .doc(post.guildId)
      .collection("posts")
      .withConverter(converter)

    await collection.doc(post.reviewId).set(post)

    return post
  }

  async function get(guildId: string, reviewId: string) {
    const collection = firestore
      .collection("guilds")
      .doc(guildId)
      .collection("posts")
      .withConverter(converter)

    const snapshot = await collection.doc(reviewId).get()

    return snapshot.data() ?? null
  }

  return { save, get }
}

const converter: FirestoreDataConverter<Post> = {
  toFirestore(post: Post) {
    return {
      ...post,
      createdAt: Timestamp.fromDate(post.createdAt),
    }
  },
  fromFirestore(snapshot) {
    const data = snapshot.data()
    return {
      ...data,
      createdAt: data.createdAt.toDate(),
    } as Post
  },
}
