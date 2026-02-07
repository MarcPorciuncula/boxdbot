import {
  FirestoreDataConverter,
  Timestamp,
  getFirestore,
} from "firebase-admin/firestore"

export type UserRegistration = {
  letterboxdUsername: string
  discordUserId: string
  discordGuildId: string
  createdAt: Date
}

export function useUserRepository({ firestore = getFirestore() } = {}) {
  async function save(init: Omit<UserRegistration, "createdAt">) {
    const ref = firestore
      .collection("guilds")
      .doc(init.discordGuildId)
      .collection("user-registrations")
      .withConverter(converter)
      .doc(init.discordUserId)

    const doc = {
      ...init,
      createdAt: new Date(),
    }

    await ref.set(doc)

    return doc
  }

  async function get(guildId: string, userId: string) {
    const ref = firestore
      .collection("guilds")
      .doc(guildId)
      .collection("user-registrations")
      .doc(userId)
      .withConverter(converter)

    const snapshot = await ref.get()

    return snapshot.data() ?? null
  }

  async function listForLetterboxdUsername(guildId: string, username: string) {
    const ref = firestore
      .collection("guilds")
      .doc(guildId)
      .collection("user-registrations")
      .where("letterboxdUsername", "==", username)
      .withConverter(converter)

    const snapshot = await ref.get()

    return snapshot.docs.map((doc) => doc.data())
  }

  async function listForGuild(guildId: string) {
    const ref = firestore
      .collection("guilds")
      .doc(guildId)
      .collection("user-registrations")
      .withConverter(converter)

    const snapshot = await ref.get()

    return snapshot.docs.map((doc) => doc.data())
  }

  return { save, get, listForGuild, listForLetterboxdUsername }
}

const converter: FirestoreDataConverter<UserRegistration> = {
  toFirestore(registration: UserRegistration) {
    return {
      ...registration,
      createdAt: Timestamp.fromDate(registration.createdAt),
    }
  },
  fromFirestore(snapshot) {
    const data = snapshot.data()
    return {
      letterboxdUsername: data.letterboxdUsername,
      discordUserId: data.discordUserId,
      discordGuildId: data.discordGuildId,
      createdAt: data.createdAt.toDate(),
    } as UserRegistration
  },
}
