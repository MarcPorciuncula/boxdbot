import { useSetupCommand } from "./setup"
import { useRegisterCommand } from "./register"

export function useCommands({
  register = useRegisterCommand(),
  setup = useSetupCommand(),
} = {}) {
  return [register, setup]
}
