const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

const TARGET_CHANNEL_ID = "1379835906160201728"; 
const N8N_WEBHOOK = process.env.N8N_WEBHOOK_URL;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds
  ]
});

client.on('threadCreate', async (thread) => {

  if (!thread.parent || thread.parent.id !== TARGET_CHANNEL_ID) return;

  try {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const firstMessage = await thread.fetchStarterMessage();
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

    console.log(`✅ Nouveau bug capturé : ${thread.name}`);

  } catch (error) {
    console.error(`❌ Erreur : ${error.message}`);
  }
});

client.once('ready', () => {
  console.log(`🤖 Connecté : ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);


