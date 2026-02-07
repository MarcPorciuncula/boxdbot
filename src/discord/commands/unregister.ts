import {
  APIBaseInteraction,
  APIInteractionResponse,
  ApplicationCommandType,
  InteractionResponseType,
  InteractionType,
} from "discord-api-types/v10"
import { UserService } from "../../users"

export type UnregisterCommandInteraction = APIBaseInteraction<
  InteractionType.ApplicationCommand,
  Record<string, never>
>

export function useUnregisterCommand({ users }: { users: UserService }) {
  const definition = {
    name: "unregister",
    description: "Unlink your Letterboxd account from your discord account",
    type: ApplicationCommandType.ChatInput,
  }

  async function handler(interaction: UnregisterCommandInteraction) {
    if (!interaction.member || !interaction.guild_id) {
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: "This command can only be used in a server",
        },
      } satisfies APIInteractionResponse
    }

    try {
      await users.unregister(interaction.guild_id, interaction.member.user.id)
    } catch (err: any) {
      if (err.message === "User not registered") {
        return {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: "You don't have a Letterboxd account linked to your Discord account.",
          },
        } satisfies APIInteractionResponse
      }

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: "Oops! An error occurred while unlinking your account",
        },
      } satisfies APIInteractionResponse
    }

    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: `<@${interaction.member.user.id}> unlinked their Letterboxd account.`,
      },
    } satisfies APIInteractionResponse
  }

  return {
    definition,
    handler,
  }
}
