import { format, isAfter } from "date-fns"
import { fromHtml } from "hast-util-from-html"
import { toMdast } from "hast-util-to-mdast"
import { toArray } from "ix/Ix.asynciterable"
import { from } from "ix/asynciterable/index"
import { filter, flatMap, map } from "ix/asynciterable/operators/index"
import { toMarkdown } from "mdast-util-to-markdown"
import { ascend, sort } from "ramda"
import { SKIP, visit } from "unist-util-visit"
import { DiscordClient } from "../discord/client"
import { GuildConfigRepository } from "../guild-config/repository"
import { useLetterboxdFeeds } from "../letterboxd/feeds"
import { Review, parseReviews } from "../letterboxd/reviews"
import { UserService } from "../users"
import { UserRegistration } from "../users/repository"
import { PostsRepository } from "./posts"

export type PostReviewsService = ReturnType<typeof usePostReviews>;

export function usePostReviews({
  userService,
  posts,
  discord,
  configs,
}: {
  userService: UserService;
  posts: PostsRepository;
  discord: DiscordClient;
  configs: GuildConfigRepository;
}) {
  const feeds = useLetterboxdFeeds()

  function buildContent(review: Review, user: UserRegistration) {
    const hast = fromHtml(review.content)
    const mdast = toMdast(hast)

    // Remove images
    visit(mdast, "image", (node, index, parent) => {
      if (index !== undefined && parent) {
        parent.children.splice(index, 1)
      }
      return SKIP
    })

    // Remove spolier warning
    if (review.spoilers) {
      visit(mdast, "emphasis", (node, index, parent) => {
        if (
          node.children.length === 1 &&
          node.children[0].type === "text" &&
          node.children[0].value === "This review may contain spoilers."
        ) {
          if (index !== undefined && parent) {
            parent?.children.splice(index, 1)
            return SKIP
          }
        }
      })
    }

    // Remove empty paragraphs
    visit(mdast, "paragraph", (node, index, parent) => {
      if (index !== undefined && parent && node.children.length === 0) {
        parent.children.splice(index, 1)
        return index
      }
    })

    // Add spoiler tags
    if (review.spoilers) {
      visit(mdast, "paragraph", (node) => {
        node.children.unshift({
          type: "text",
          value: "||",
        })
        return SKIP
      })

      visit(
        mdast,
        "paragraph",
        (node) => {
          node.children.push({
            type: "text",
            value: "||",
          })
          return SKIP
        },
        true,
      )
    }

    // Insert header
    visit(mdast, "root", (node) => {
      node.children.splice(0, 0, {
        type: "paragraph",
        children: [
          {
            type: "strong",
            children: [
              {
                type: "text",
                value: review.title,
              },
            ],
          },
          {
            type: "text",
            value: "\n",
          },
          {
            type: "text",
            value:
              "Review by " +
              user.letterboxdUsername +
              ` (<@${user.discordUserId}>)`,
          },
        ],
      })

      return SKIP
    })

    // Add footer
    visit(mdast, "root", (node) => {
      node.children.push({
        type: "paragraph",
        children: [
          {
            type: "text",
            value: "---\n",
          },
          {
            type: "text",
            value: "<",
          },
          {
            type: "link",
            url: review.link,
            children: [
              {
                type: "text",
                value: `Posted on ${format(review.publishedDate, "yyyy-MM-dd")}`,
              },
            ],
          },
          {
            type: "text",
            value: ">",
          },
        ],
      })
    })

    const markdown = toMarkdown(mdast)

    return markdown
  }

  async function postReview(
    guildId: string,
    channelId: string,
    user: UserRegistration,
    review: Review,
  ) {
    await discord.request(`/channels/${channelId}/messages`, {
      method: "POST",
      body: {
        content: buildContent(review, user),
      },
    })

    await posts.save({
      userId: user.discordUserId,
      reviewId: review.id,
      guildId: guildId,
      createdAt: new Date(),
    })
  }

  async function postReviewsForGuild(guildId: string) {
    const config = await configs.get(guildId)
    if (!config) {
      throw new Error(`Config not found for guild ${guildId}`)
    }
    const users = await userService.listForGuild(guildId)

    const reviews = await toArray(
      from(users).pipe(
        flatMap((user) =>
          feeds
            .get(user.letterboxdUsername)
            .then((result) => (result ? { feed: result.feed, user } : null)),
        ),
        filter((item): item is NonNullable<typeof item> => item !== null),
        flatMap((item) =>
          parseReviews(item.feed).pipe(
            map((review) => ({ review, user: item.user })),
          ),
        ),
        filter((item) => isAfter(item.review.publishedDate, config.startAt)),
      ),
    )

    const sorted = sort(
      ascend((item) => item.review.publishedDate),
      reviews,
    )

    for (const { review, user } of sorted) {
      if (await posts.get(guildId, review.id)) continue
      try {
        await postReview(guildId, config.channelId, user, review)
      } catch (err) {
        console.error(err)
      }
    }

    await configs.update(config.guildId, {
      startAt: new Date(),
    })
  }

  async function runPeriodicSync() {
    const guilds = await configs.list()
    for (const guild of guilds) {
      await postReviewsForGuild(guild.guildId)
    }
  }

  return {
    postReviewsForGuild,
    runPeriodicSync,
  }
}
