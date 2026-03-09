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
import { captureException, logger, withContext } from "../logger"
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
            type: "link",
            url: review.link,
            children: [
              {
                type: "text",
                value: `Posted on ${format(review.publishedDate, "yyyy-MM-dd")}`,
              },
            ],
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
    const res = await discord.request<{ id: string }>(
      `/channels/${channelId}/messages`,
      {
        method: "POST",
        body: {
          content: buildContent(review, user),
        },
      },
    )

    await posts.save({
      userId: user.discordUserId,
      reviewId: review.id,
      guildId: guildId,
      channelId: channelId,
      messageId: res.id,
      createdAt: new Date(),
    })
  }

  async function postReviewsForGuild(guildId: string) {
    const config = await configs.get(guildId)
    if (!config) {
      throw new Error(`Config not found for guild ${guildId}`)
    }
    const users = await userService.listForGuild(guildId)
    logger.debug("Syncing guild", {
      guildId,
      userCount: users.length,
      startAt: config.startAt.toISOString(),
      channelId: config.channelId,
    })

    const reviews = await toArray(
      from(users).pipe(
        flatMap((user) => {
          logger.debug("Fetching feed", { letterboxdUsername: user.letterboxdUsername })
          return feeds.get(user.letterboxdUsername).then((result) => {
            if (!result) {
              logger.warn("Feed not found", { letterboxdUsername: user.letterboxdUsername })
              return null
            }
            return { feed: result.feed, user }
          })
        }),
        filter((item): item is NonNullable<typeof item> => item !== null),
        flatMap((item) =>
          parseReviews(item.feed).pipe(
            map((review) => ({ review, user: item.user })),
          ),
        ),
        filter((item) => {
          const passes = isAfter(item.review.publishedDate, config.startAt)
          if (!passes) {
            logger.debug("Review before startAt, skipping", {
              reviewId: item.review.id,
              letterboxdUsername: item.user.letterboxdUsername,
              publishedDate: item.review.publishedDate.toISOString(),
              startAt: config.startAt.toISOString(),
            })
          }
          return passes
        }),
      ),
    )

    logger.debug("Reviews collected after date filter", { guildId, reviewCount: reviews.length })

    const sorted = sort(
      ascend((item) => item.review.publishedDate),
      reviews,
    )

    for (const { review, user } of sorted) {
      const alreadyPosted = await posts.get(guildId, review.id)
      if (alreadyPosted) {
        logger.debug("Review already posted, skipping", {
          reviewId: review.id,
          letterboxdUsername: user.letterboxdUsername,
        })
        continue
      }
      try {
        logger.debug("Posting review", { reviewId: review.id, letterboxdUsername: user.letterboxdUsername })
        await postReview(guildId, config.channelId, user, review)
        logger.info("Posted review", { reviewId: review.id, letterboxdUsername: user.letterboxdUsername })
      } catch (err) {
        captureException(err)
      }
    }
  }

  async function runPeriodicSync() {
    const guilds = await configs.list()
    logger.info("Starting periodic sync", { guildCount: guilds.length })
    for (const guild of guilds) {
      await withContext({ guildId: guild.guildId }, async () => {
        try {
          await postReviewsForGuild(guild.guildId)
        } catch (err) {
          logger.error("Sync failed for guild")
          captureException(err)
        }
      })
    }
  }

  return {
    postReviewsForGuild,
    runPeriodicSync,
  }
}
