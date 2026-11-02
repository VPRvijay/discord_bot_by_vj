# 24/7 Discord Voice Channel Bot

A lightweight Discord bot configured to stay in voice channels 24/7 with automatic reconnection and a built-in HTTP health check endpoint for free cloud hosts.

## Features
- **Auto-reconnect**: Automatically reconnects if kicked, disconnected, or if Discord voice servers cycle.
- **Heartbeat Silence Stream**: Sends a subtle 20ms silence stream to prevent Discord's inactivity timeout from disconnecting the bot.
- **Slash Commands**:
  - `/stay [channel]`: Joins and locks into a specified voice channel or your current one.
  - `/status`: Checks voice connection health.
  - `/leave`: Disconnects the bot.
- **Auto-Join on Boot**: Set `VOICE_CHANNEL_ID` in environment variables so the bot rejoins immediately after restarts or deployments.
- **Built-in HTTP Health Server**: Listens on port `8080` (or `PORT`), satisfying uptime monitors and cloud platform health probes (Koyeb, Railway, etc.).

---

## Free Hosting Guide (Koyeb or Railway)

### Step 1: Get Bot Token & Enable Intents
1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Select your Bot (or create a new application).
3. Under **Bot**:
   - Click **Reset Token** and copy your token.
   - Scroll down to **Privileged Gateway Intents** and enable:
     - `Server Members Intent`
4. Under **OAuth2 -> URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Connect`, `Speak`, `Send Messages`, `Use Slash Commands`
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

### Step 3: Deploy for Free on Koyeb (Recommended 100% Free Tier)
[Koyeb](https://www.koyeb.com/) offers a permanent free "Eco" tier that does not sleep on background workers with web ports:
1. Sign up on [Koyeb.com](https://www.koyeb.com).
2. Click **Create Service** -> **GitHub**.
3. Select your repository.
4. Builder: Choose **Dockerfile**.
5. Under **Environment Variables**, add:
   - `DISCORD_TOKEN` = `(Your Discord Bot Token)`
   - `VOICE_CHANNEL_ID` = `(Your Voice Channel ID)`
6. Under **Ports / Health check**:
   - Port: `8080` (HTTP)
   - Path: `/`
7. Click **Deploy**. Koyeb will build the Docker container and your bot will be live in your voice channel 24/7!

---

### Alternative: Deploy on Railway
1. Go to [railway.com](https://railway.com) and sign in.
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Go to the service **Variables** tab and set:
   - `DISCORD_TOKEN`
   - `VOICE_CHANNEL_ID`
4. Railway will automatically build the `Dockerfile` and start the bot.
