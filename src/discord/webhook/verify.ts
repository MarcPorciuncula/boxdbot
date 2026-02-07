import { verifyKey } from "discord-interactions"

export async function verify(
  body: string,
  signature: string | null,
  timestamp: string | null,
  publicKey: string
): Promise<boolean> {
  if (!signature || !timestamp) return false
  return await verifyKey(body, signature, timestamp, publicKey)
}
