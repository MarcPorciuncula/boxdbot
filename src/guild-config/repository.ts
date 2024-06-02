import {
  FirestoreDataConverter,
  Timestamp,
  getFirestore,
} from "firebase-admin/firestore"

export type GuildConfig = {
  guildId: string
  createdAt: Date
  startAt: Date
  channelId: string
}

export function useGuildConfigRepository({ firestore = getFirestore() } = {}) {
  async function save(config: GuildConfig) {
    await firestore
      .collection("guilds")
      .doc(config.guildId)
      .withConverter(converter)
      .set(config)

    return config
  }

  async function get(guildId: string) {
    const doc = await firestore
      .collection("guilds")
      .doc(guildId)
      .withConverter(converter)
      .get()

    return doc.data()
  }

  async function list() {
    const snapshot = await firestore
      .collection("guilds")
      .withConverter(converter)
      .get()
    return snapshot.docs.map((doc) => doc.data())
  }

  async function update(guildId: string, data: Partial<GuildConfig>) {
    return await firestore.runTransaction(async (t) => {
      const doc = firestore.collection("guilds").doc(guildId)
      const snapshot = await t.get(doc)
      if (!snapshot.exists) {
        throw new Error(`Document does not exist: ${guildId}`)
      }

      const updated = { ...snapshot.data(), ...data }
      t.update(doc, updated)
      return updated
    })
  }

  return { save, get, list, update }
}

const converter: FirestoreDataConverter<GuildConfig> = {
  toFirestore(config: GuildConfig) {
    return {
      ...config,
      createdAt: Timestamp.fromDate(config.createdAt),
      startAt: Timestamp.fromDate(config.startAt),
    }
  },
  fromFirestore(snapshot) {
    const data = snapshot.data()
    return {
      ...data,
      createdAt: data.createdAt.toDate(),
      startAt: data.startAt.toDate(),
    } as GuildConfig
  },
}
