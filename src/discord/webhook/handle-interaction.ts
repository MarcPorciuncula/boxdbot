import {
  APIBaseInteraction,
  InteractionResponseType,
  InteractionType,
} from "discord-api-types/v10"
import { useCommands } from "../commands"
import { logger } from "../../logger"
import { UserService } from "../../users"
import { GuildConfigRepository } from "../../guild-config/repository"

export function useHandleInteraction({
  userService,
  guildConfigs,
}: {
  userService: UserService;
  guildConfigs: GuildConfigRepository;
}) {
  const commands = useCommands({ userService, guildConfigs })
  return async (interaction: APIBaseInteraction<InteractionType, any>) => {
    logger.debug("Handling interaction", { type: interaction.type })

    switch (interaction.type) {
      case InteractionType.ApplicationCommand:
        const command = commands.find(
          (command) => command.definition.name === interaction.data.name,
        )
        if (command) {
          const res = await command.handler(interaction as any)
          logger.debug("Responding to interaction", { type: res.type })
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
