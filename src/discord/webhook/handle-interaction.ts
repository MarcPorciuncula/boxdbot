import {
  APIBaseInteraction,
  InteractionResponseType,
  InteractionType,
} from "discord-api-types/v10"
import { logger } from "firebase-functions"
import { z } from "zod"
import { useCommands } from "../commands"

export function useHandleInteraction({ commands = useCommands() } = {}) {
  return async (interaction: APIBaseInteraction<InteractionType, any>) => {
    logger.write({
      severity: "DEBUG",
      message: "Handling interaction",
      interaction,
    })

    switch (interaction.type) {
      case InteractionType.ApplicationCommand:
        const command = commands.find(
          (command) => command.definition.name === interaction.data.name,
        )
        if (command) {
          const res = await command.handler(interaction as any)
          logger.write({
            severity: "DEBUG",
            message: "Responding to interaction",
            res,
          })
          return res
        }
        break
      case InteractionType.Ping:
        return {
          type: InteractionResponseType.Pong,
          data: {},
        }
    }

    return null
  }
}

export const InteractionSchema = z.object({
  type: z.nativeEnum(InteractionType),
})
