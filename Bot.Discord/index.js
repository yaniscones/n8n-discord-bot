const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

const TARGET_CHANNEL_ID = "1379835906160201728"; 
const N8N_WEBHOOK = process.env.N8N_WEBHOOK_URL;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent
  ]
});

client.on('threadCreate', async (thread) => {
  if (!thread.parent || thread.parent.id !== TARGET_CHANNEL_ID) return;

  console.log(`✅ Nouveau Thread dans ${thread.parent.name} : ${thread.name}`);

  try {
    let firstMessage = null;
    for (let i = 0; i < 3; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      firstMessage = await thread.fetchStarterMessage().catch(() => null);
      if (firstMessage) break;
    }

    if (!firstMessage) return;

    await axios.post(N8N_WEBHOOK, {
      type: 'NOUVEAU_BUG',
      titre: thread.name,
      contenu: firstMessage.content,
      auteur: firstMessage.author.username,
      nom_salon: thread.parent.name,
      date: thread.createdAt.toISOString(),
      thread_id: thread.id,
      url: thread.url
    });

  } catch (error) {
    console.error(`Erreur : ${error.message}`);
  }
});

client.once('ready', () => {
  console.log(`🤖 Connecté : ${client.user.tag}`);
});

client.login(DISCORD_TOKEN);
