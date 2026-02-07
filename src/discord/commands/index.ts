import { useSetupCommand } from "./setup"
import { useRegisterCommand } from "./register"
import { UserService } from "../../users"
import { GuildConfigRepository } from "../../guild-config/repository"

export function useCommands({
  userService,
  guildConfigs,
}: {
  userService: UserService;
  guildConfigs: GuildConfigRepository;
}) {
  const register = useRegisterCommand({ users: userService })
  const setup = useSetupCommand({ guildConfigs })
  return [register, setup]
}
