const { 
    Client, 
    GatewayIntentBits, 
    REST, 
    Routes, 
    SlashCommandBuilder, 
    ChannelType,
    ActivityType 
} = require('discord.js');
const { 
    joinVoiceChannel, 
    getVoiceConnection, 
    VoiceConnectionStatus, 
    entersState,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    NoSubscriberBehavior
} = require('@discordjs/voice');
const http = require('http');
const { Readable } = require('stream');
require('dotenv').config();

const TOKEN = process.env.DISCORD_TOKEN;
const TARGET_GUILD_ID = process.env.GUILD_ID;
const TARGET_CHANNEL_ID = process.env.VOICE_CHANNEL_ID;
const PORT = process.env.PORT || 8080;

if (!TOKEN) {
    console.error('[Error] DISCORD_TOKEN is missing! Please set it in your environment or .env file.');
    process.exit(1);
}

// Minimal HTTP server so free hosting health checks (Koyeb, Render, Railway, etc.) stay green
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'alive', uptime: process.uptime() }));
});
server.listen(PORT, () => {
    console.log(`[Health Server] Listening on port ${PORT}`);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// Create a silent audio stream to keep Discord gateway from kicking the bot for total inactivity
class SilenceStream extends Readable {
    _read() {
        // 20ms of stereo 16-bit 48kHz PCM silence
        this.push(Buffer.alloc(1920));
    }
}

let player = null;

function setupAudioPlayer() {
    player = createAudioPlayer({
        behaviors: {
            noSubscriberBehavior: NoSubscriberBehavior.Play
        }
    });

    const silenceResource = createAudioResource(new SilenceStream());
    player.play(silenceResource);

    player.on(AudioPlayerStatus.Idle, () => {
        // Restart silence stream if it stops
        player.play(createAudioResource(new SilenceStream()));
    });

    player.on('error', error => {
        console.error('[AudioPlayer Error]', error.message);
    });
}

function connectToVoice(channel) {
    console.log(`[Voice] Attempting connection to ${channel.name} (${channel.id})...`);

    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: true,
        selfMute: false
    });

    if (!player) setupAudioPlayer();
    connection.subscribe(player);

    connection.on(VoiceConnectionStatus.Ready, () => {
        console.log(`[Voice] Successfully joined and active in ${channel.name}!`);
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
            // Check if connection can recover quickly
            await Promise.race([
                entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
            ]);
            console.log('[Voice] Reconnecting...');
        } catch (error) {
            console.log('[Voice] Disconnected. Re-initiating connection in 5 seconds...');
            try {
                connection.destroy();
            } catch (e) {}
            setTimeout(() => connectToVoice(channel), 5000);
        }
    });

    connection.on(VoiceConnectionStatus.Destroyed, () => {
        console.log('[Voice] Connection destroyed. Scheduling rejoin...');
        setTimeout(() => connectToVoice(channel), 5000);
    });

    return connection;
}

// Slash commands registration
const commands = [
    new SlashCommandBuilder()
        .setName('stay')
        .setDescription('Make the bot join and stay 24/7 in a voice channel')
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('Voice channel to stay in (optional, defaults to current/target channel)')
                .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
                .setRequired(false)
        ),
    new SlashCommandBuilder()
        .setName('status')
        .setDescription('Check 24/7 voice channel connection status'),
    new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Disconnect the bot from the voice channel')
].map(cmd => cmd.toJSON());

async function registerCommands(clientId) {
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        console.log('[Commands] Registering global slash commands...');
        await rest.put(Routes.applicationCommands(clientId), { body: commands });
        console.log('[Commands] Slash commands successfully registered!');
    } catch (err) {
        console.error('[Commands Error]', err);
    }
}

client.once('ready', async () => {
    console.log(`[Bot] Logged in as ${client.user.tag}!`);
    client.user.setActivity('24/7 VC Radio', { type: ActivityType.Listening });

    await registerCommands(client.user.id);

    // Auto-join configured voice channel if specified in environment
    if (TARGET_CHANNEL_ID) {
        try {
            const channel = await client.channels.fetch(TARGET_CHANNEL_ID);
            if (channel && (channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice)) {
                console.log(`[Auto-Join] Connecting to preset voice channel: ${channel.name}`);
                connectToVoice(channel);
            } else {
                console.warn('[Auto-Join] VOICE_CHANNEL_ID does not point to a valid voice channel.');
            }
        } catch (err) {
            console.error('[Auto-Join Error] Could not fetch channel:', err.message);
        }
    } else {
        console.log('[Info] No VOICE_CHANNEL_ID specified in .env. Use /stay command in Discord to select a channel.');
    }
});

// Periodic sanity check every 60s to guarantee the bot hasn't dropped out silently
setInterval(async () => {
    if (!TARGET_CHANNEL_ID) return;
    try {
        const channel = await client.channels.fetch(TARGET_CHANNEL_ID);
        if (!channel) return;
        const connection = getVoiceConnection(channel.guild.id);
        if (!connection || connection.state.status === VoiceConnectionStatus.Destroyed || connection.state.status === VoiceConnectionStatus.Disconnected) {
            console.log('[Health Check] Bot was not connected. Re-joining target channel...');
            connectToVoice(channel);
        }
    } catch (err) {
        // Suppress or log periodic check error
    }
}, 60_000);

// Interaction Handling
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'stay') {
        const channel = interaction.options.getChannel('channel') || interaction.member.voice?.channel;

        if (!channel) {
            return interaction.reply({
                content: '⚠️ Please join a voice channel first, or select one using the `channel` parameter!',
                ephemeral: true
            });
        }

        connectToVoice(channel);
        return interaction.reply({
            content: `✅ Joined **${channel.name}**! I will remain connected 24/7 and auto-reconnect if dropped.`,
            ephemeral: false
        });
    }

    if (commandName === 'status') {
        const connection = getVoiceConnection(interaction.guildId);
        if (!connection) {
            return interaction.reply({ content: '❌ Not currently connected to any voice channel in this server.', ephemeral: true });
        }
        return interaction.reply({ 
            content: `🟢 Currently connected! Status: \`${connection.state.status}\``, 
            ephemeral: true 
        });
    }

    if (commandName === 'leave') {
        const connection = getVoiceConnection(interaction.guildId);
        if (connection) {
            connection.destroy();
            return interaction.reply({ content: '👋 Disconnected from voice channel.', ephemeral: true });
        } else {
            return interaction.reply({ content: 'I am not in any voice channel.', ephemeral: true });
        }
    }
});

client.login(TOKEN);
