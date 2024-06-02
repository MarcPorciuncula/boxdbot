import {
  APIBaseInteraction,
  APIInteractionDataOptionBase,
  APIInteractionResponse,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  InteractionResponseType,
  InteractionType,
} from "discord-api-types/v10"
import { useLetterboxdFeeds } from "../../letterboxd/feeds"
import { useUserService } from "../../users"

export type RegisterCommandInteraction = APIBaseInteraction<
  InteractionType.ApplicationCommand,
  { options: RegisterCommandOption[] }
>

type RegisterCommandOption = APIInteractionDataOptionBase<
  ApplicationCommandOptionType.String,
  "string"
>

export function useRegisterCommand({
  users = useUserService(),
  feeds = useLetterboxdFeeds(),
} = {}) {
  const definition = {
    name: "register",
    description: "Link your Letterboxd account to your discord account",
    type: ApplicationCommandType.ChatInput,
    options: [
      {
        name: "username",
        description: "Your Letterboxd username",
        required: true,
        type: ApplicationCommandOptionType.String,
      },
      {
        name: "filter-tag",
        description: "Filter reviews to post based on a tag",
        required: false,
        type: ApplicationCommandOptionType.String,
      },
    ],
  }

  async function handler(interaction: RegisterCommandInteraction) {
    if (!interaction.member || !interaction.guild_id) {
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: "This command can only be used in a server",
        },
      } satisfies APIInteractionResponse
    }

    const username = interaction.data!.options.find(
      (item) => item.name === "username",
    )?.value

    if (!username) {
      throw new Error("Missing username parameter")
    }

    const res = await feeds.get(username)

    if (!res) {
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: "Sorry, I couldn't find that user on Letterboxd",
        },
      } satisfies APIInteractionResponse
    }

    const filterTag = interaction.data!.options.find(
      (item) => item.name === "filter-tag",
    )?.value

    try {
      await users.register({
        letterboxdUsername: username,
        discordUserId: interaction.member.user.id,
        discordGuildId: interaction.guild_id,
        filterTag: filterTag || null,
      })
    } catch (err: any) {
      if (err.message.match(/username already registered/i)) {
        return {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: "Looks like someone has already registered that username",
          },
        } satisfies APIInteractionResponse
      }

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: "Oops! An error occurred while registering your account",
        },
      } satisfies APIInteractionResponse
    }

    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: `<@${interaction.member.user.id}> linked their Letterboxd account: ${sanitize(username)}`,
      },
    } satisfies APIInteractionResponse
  }

  return {
    definition,
    handler,
  }
}

function sanitize(input: string) {
  return input
    .replace("@", "\\@")
    .replace("~~", "\\~\\~")
    .replace("*", "\\*")
    .replace("`", "\\`")
    .replace("_", "\\_")
}
