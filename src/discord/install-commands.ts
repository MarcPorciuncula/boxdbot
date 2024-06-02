import { logger } from "firebase-functions"
import { defineString } from "firebase-functions/params"
import { useDiscordClient } from "./client"
import { useCommands } from "./commands"

const DISCORD_APP_ID = defineString("DISCORD_APP_ID")

export function useInstallCommands({
  client = useDiscordClient(),
  appId = DISCORD_APP_ID.value(),
  commands = useCommands(),
} = {}) {
  return async function installCommands() {
    const definitions = commands.map((command) => command.definition)

    await client.request(`/applications/${appId}/commands`, {
      method: "PUT",
      body: definitions,
    })
  }
}
