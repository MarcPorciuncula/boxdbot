# Boxdbot 🎬

Boxdbot is a Discord bot that automatically posts Letterboxd reviews from server members to a designated Discord channel. It runs as a Cloudflare Worker using D1 for persistence.

## Features

- **Automatic Sync**: Periodically checks registered users' Letterboxd feeds for new reviews.
- **Rich Embeds**: Posts reviews with movie details, ratings, and links.
- **Easy Setup**: Simple slash commands to link accounts and configure the feed.

---

## Usage Instructions (For Discord Users)

To start using Boxdbot in your server, follow these steps:

### 1. Setup the Feed (Admin only)
An administrator must first designate a channel where the bot will post reviews.

```
/setup-feed channel:#reviews [start-date:YYYY-MM-DD]
```
- `channel`: The Discord channel where reviews should be posted.
- `start-date` (Optional): The bot will only post reviews published after this date. Defaults to the current date.

### 2. Register Your Account
Each member who wants their reviews shared must link their Letterboxd account.

```
/register username:your_letterboxd_username
```
- `username`: Your exact Letterboxd username.

Once registered, the bot will automatically detect new reviews in your feed and post them to the configured channel.

---

## Development Instructions

### Prerequisites

- [Node.js](https://nodejs.org/) (v22 or higher)
- [pnpm](https://pnpm.io/)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-setup/) (Cloudflare Workers CLI)
- A Discord Application (created via the [Discord Developer Portal](https://discord.com/developers/applications))

### Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/marcporciuncula/boxdbot.git
   cd boxdbot
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure Environment Variables:**
   Create a `.dev.vars` file in the root directory and add the following:
   ```env
   DISCORD_APP_ID=your_discord_app_id
   DISCORD_PUBLIC_KEY=your_discord_public_key
   DISCORD_BOT_TOKEN=your_discord_bot_token
   ```

4. **Run the development server:**
   Start the local development server using Wrangler. The application will automatically handle database table creation on startup.
   ```bash
   pnpm dev
   ```

### Development Commands

- `pnpm dev`: Starts the local development server using Wrangler.
- `pnpm typecheck`: Runs TypeScript type checking.
- `pnpm deploy`: Deploys the worker to Cloudflare.

### Registering Slash Commands

To register or update slash commands on Discord, you can trigger the install endpoint locally or on your deployed worker:

```bash
curl -X POST http://localhost:8787/discord/install
```

### Architecture

This project follows a functional Dependency Injection pattern as described in `AGENTS.md`.

- **`src/worker.ts`**: Entry point for the Cloudflare Worker, handles HTTP requests and scheduled tasks (CRON).
- **`src/discord/`**: Discord interaction handling, webhook verification, and command definitions.
- **`src/letterboxd/`**: Logic for fetching and parsing Letterboxd RSS feeds.
- **`src/review-poster/`**: Orchestrates the process of checking for new reviews and posting them to Discord.
- **`src/db/`**: Base repository logic and D1 database interactions.

### Deployment

The project is configured with GitHub Actions for automatic deployment to Cloudflare Workers on pushes to the `main` branch. Ensure you have the following secrets configured in your GitHub repository:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `DISCORD_APP_ID`
- `DISCORD_PUBLIC_KEY`
- `DISCORD_BOT_TOKEN`
