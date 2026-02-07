import { UserRegistration, UserRepository } from "./repository"

export type UserService = ReturnType<typeof useUserService>;

export function useUserService({ repository }: { repository: UserRepository }) {
  async function register(registration: Omit<UserRegistration, "createdAt">) {
    const existing = await repository.listForLetterboxdUsername(
      registration.discordGuildId,
      registration.letterboxdUsername,
    )

    if (
      existing.filter(
        (item) => item.discordUserId !== registration.discordUserId,
      ).length
    ) {
      throw new Error("Username already registered")
    }

    return await repository.save(registration)
  }

  return { register, listForGuild: repository.listForGuild }
}
