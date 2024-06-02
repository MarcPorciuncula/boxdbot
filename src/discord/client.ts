import { defineString } from "firebase-functions/params"
import { once } from "ramda"

export class DiscordClient {
  basepath = "https://discord.com/api/v10"
  token: string

  constructor(token: string) {
    this.token = token

    this.request = withRetry(this.request.bind(this))
  }

  async request<T>(
    endpoint: string,
    { method, body: reqBody }: { method: RequestInit["method"]; body?: any },
  ): Promise<T> {
    const headers = new Headers({
      Authorization: `Bot ${this.token}`,
    })

    if (reqBody) {
      headers.set("Content-Type", "application/json; charset=utf-8")
    }

    const res = await fetch(this.basepath + endpoint, {
      method,
      headers,
      body: reqBody ? JSON.stringify(reqBody) : undefined,
    })

    const body = res.headers.get("Content-Type")?.includes("application/json")
      ? await res.json()
      : await res.text()

    if (!res.ok) {
      throw new APIRequestError(res, body)
    }

    return body as T
  }
}

function withRetry<T extends (...args: any[]) => Promise<any>>(fn: T): T {
  return (async (...args: Parameters<T>) => {
    let attempt = 0

    while (true) {
      try {
        return await fn(...args)
      } catch (err) {
        attempt++

        if (attempt >= 3) {
          throw err
        }

        if (err instanceof APIRequestError && err.response.status === 429) {
          const resetAfter = err.response.headers.get("X-RateLimit-Reset-After")
          if (resetAfter) {
            const delay = Number(resetAfter) * 1000
            await sleep(delay)
            continue
          }
        }
        throw err
      }
    }
  }) as T
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

class APIRequestError extends Error {
  constructor(
    public response: Response,
    public body: any,
  ) {
    super(
      `Request failed: ${response.status} ${response.statusText}\n${typeof body === "string" ? body : JSON.stringify(body)}`,
    )
  }
}

const DISCORD_BOT_TOKEN = defineString("DISCORD_BOT_TOKEN")

export const useDiscordClient = once(
  () => new DiscordClient(DISCORD_BOT_TOKEN.value()),
)
