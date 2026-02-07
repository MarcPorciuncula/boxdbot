import { DiscordClient } from "./client"
import { useCommands } from "./commands"
import { UserService } from "../users";
import { GuildConfigRepository } from "../guild-config/repository";

export function useInstallCommands({
  discordClient,
  userService,
  guildConfigs,
  appId,
}: {
  discordClient: DiscordClient;
  userService: UserService;
  guildConfigs: GuildConfigRepository;
  appId: string;
}) {
  return async function installCommands() {
    const commands = useCommands({ userService, guildConfigs })
    const definitions = commands.map((command) => command.definition)

    await discordClient.request(`/applications/${appId}/commands`, {
      method: "PUT",
      body: definitions,
    })
  }
}
