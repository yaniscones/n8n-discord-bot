const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

const TARGET_CHANNEL_ID = "1379835906160201728"; 
const N8N_WEBHOOK = process.env.N8N_WEBHOOK_URL;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent]
});

client.on('threadCreate', async (thread) => {
  // On ne surveille que les threads créés dans le salon cible
  if (!thread.parent || thread.parent.id !== TARGET_CHANNEL_ID) return;
  
  console.log(`✅ Nouveau Thread Discord détecté : ${thread.name}`);
  
  try {
    let firstMessage = null;
    // Petit système de retry pour laisser le temps au premier message d'apparaître
    for (let i = 0; i < 3; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      firstMessage = await thread.fetchStarterMessage().catch(() => null);
      if (firstMessage) break;
    }

    if (!firstMessage) {
        console.log(`⚠️ Impossible de récupérer le message d'origine du thread : ${thread.name}`);
        return;
    }

    // Envoi des données à n8n
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
    
    console.log(`🚀 Données du thread "${thread.name}" envoyées à n8n avec succès.`);

  } catch (error) {
    console.error(`❌ Erreur lors du traitement du thread Discord : ${error.message}`);
  }
});

client.once('ready', () => {
  console.log(`🤖 Bot Discord opérationnel ! Connecté en tant que : ${client.user.tag}`);
});

client.login(DISCORD_TOKEN);
