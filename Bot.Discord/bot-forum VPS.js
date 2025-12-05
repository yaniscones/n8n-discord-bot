const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const N8N_WEBHOOK = https://n8n.ycautomation.online/webhook/forum';

client.on('threadCreate', async (thread) => {
  try {
    const firstMessage = await thread.fetchStarterMessage();
    await axios.post(N8N_WEBHOOK, {
      titre: thread.name,
      contenu: firstMessage.content,
      source: `Discord Forum - #${thread.parent.name}`,
      de: thread.ownerId,
      date: thread.createdAt.toISOString()
    });
    console.log(`✅ Post capturé : ${thread.name}`);
  } catch (error) {
    console.error('❌ Erreur threadCreate:', error.message);
  }
});

client.on('messageCreate', async (message) => {
  if (message.channel.isThread() && !message.author.bot) {
    try {
      await axios.post(N8N_WEBHOOK, {
        titre: `Réponse dans ${message.channel.name}`,
        contenu: message.content,
        source: `Discord Forum - #${message.channel.parent.name}`,
        de: message.author.username,
        date: message.createdAt.toISOString()
      });
      console.log(`✅ Message capturé dans ${message.channel.name}`);
    } catch (error) {
      console.error('❌ Erreur messageCreate:', error.message);
    }
  }
});

client.once('ready', () => {
  console.log(`🤖 Bot connecté : ${client.user.tag}`);
});

const token = process.env.DISCORD_TOKEN;
client.login(token);