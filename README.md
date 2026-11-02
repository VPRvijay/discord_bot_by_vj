# 24/7 Discord Voice Channel Bot

A lightweight, self-muted Discord bot configured to stay in one voice channel with automatic reconnection and an optional HTTP health check endpoint.

## Features
- **Auto-reconnect**: Automatically reconnects if kicked, disconnected, or if Discord voice servers cycle.
- **Slash Commands**:
  - `/stay [channel]`: Joins and locks into a specified voice channel or your current one.
  - `/status`: Checks voice connection health.
  - `/leave`: Disconnects the bot.
- **Auto-Join on Boot**: Set `VOICE_CHANNEL_ID` in environment variables so the bot rejoins immediately after restarts or deployments.
- **Built-in HTTP Health Server**: Listens on port `8080` (or `PORT`) for an optional platform health check. Railway can run this as a worker without exposing a public domain.

---

## Railway Deployment

### Step 1: Get Bot Token & Enable Intents
1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Select your Bot (or create a new application).
3. Under **Bot**:
   - Click **Reset Token** and copy your token.
   - Scroll down to **Privileged Gateway Intents** and enable:
   - No privileged intents are required; the bot uses guild and voice state events only.
4. Under **OAuth2 -> URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Connect`, `Send Messages`, `Use Slash Commands`
   - Copy the generated URL and invite the bot to your server.
5. In Discord, enable Developer Mode (Settings -> Advanced -> Developer Mode), right-click the voice channel you want it in, and click **Copy Channel ID**.

---

### Step 2: Push to GitHub
1. Open a terminal in this folder:
   ```bash
   git init
   git add .
   git commit -m "initial commit"
   ```
2. Create a new repository on [GitHub](https://github.com/new).
3. Push your repository:
   ```bash
   git remote add origin https://github.com/<YOUR_USER>/<YOUR_REPO>.git
   git branch -M main
   git push -u origin main
   ```

---

### Step 3: Deploy on Railway
1. Push this repository to a GitHub repository you control.
2. In [Railway](https://railway.com), create a project and choose **Deploy from GitHub repo**.
3. Select the repository. Railway detects the `Dockerfile` and builds the service.
4. In the service **Variables** tab, add `DISCORD_TOKEN`, `GUILD_ID`, and `VOICE_CHANNEL_ID`.
5. Deploy. Keep the service as a worker; a public domain is not required. The health endpoint listens on Railway's `PORT` if assigned.

The bot runs continuously while the Railway service is active. Check Railway's current plan and usage limits for pricing; do not assume a free always-on tier.
