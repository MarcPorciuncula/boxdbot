import {
  APIBaseInteraction,
  APIInteractionDataOptionBase,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  InteractionResponseType,
  InteractionType,
} from "discord-api-types/v10"
import { GuildConfigRepository } from "../../guild-config/repository"
import { parse, startOfDay } from "date-fns"

export type SetupCommandInteraction = APIBaseInteraction<
  InteractionType.ApplicationCommand,
  { options: SetupCommandOption[] }
>

type SetupCommandOption =
  | APIInteractionDataOptionBase<
      ApplicationCommandOptionType.Channel,
      "channel"
    >
  | APIInteractionDataOptionBase<
      ApplicationCommandOptionType.String,
      "startDate"
    >

export function useSetupCommand({
  guildConfigs,
}: {
  guildConfigs: GuildConfigRepository;
}) {
  const definition = {
    name: "setup-feed",
    description:
      "Setup the Letterboxd feed for this server. The chosen channel will be used to post new reviews.",
    type: ApplicationCommandType.ChatInput,
    options: [
      {
        name: "channel",
        description: "The channel to post reviews in",
        required: true,
        type: ApplicationCommandOptionType.Channel,
      },
      {
        name: "start-date",
        description:
          "The date to start fetching reviews from. Must be in the format YYYY-MM-DD",
        required: false,
        type: ApplicationCommandOptionType.String,
      },
    ],
  }

  async function handler(interaction: SetupCommandInteraction) {
    if (!interaction.member || !interaction.guild_id) {
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: "This command can only be used in a server",
        },
      }
    }

    const channelId = interaction.data!.options.find(
      (item) => item.name === "channel",
    )?.value

    if (!channelId) {
      throw new Error("Missing channel parameter")
    }

    const startDate = interaction.data!.options.find(
      (item) => item.name === "start-date",
    )?.value

    const startAt = startDate
      ? parse(startDate, "yyyy-MM-dd", startOfDay(new Date()))
      : new Date()

    await guildConfigs.save({
      guildId: interaction.guild_id,
      channelId,
      startAt,
      createdAt: new Date(),
    })

    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: `New reviews by registered members will be posted to <#${channelId}>`,
      },
    }
  }

  return { definition, handler }
}
