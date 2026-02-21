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

client.once('ready', async () => {
  console.log(`🤖 Connecté avec succès : ${client.user.tag}`);
  console.log(`⏳ Recherche du salon avec l'ID : ${TARGET_CHANNEL_ID}...`);

  try {
    const channel = await client.channels.fetch(TARGET_CHANNEL_ID);
    if (!channel) {
      console.error("❌ Salon introuvable. Vérifie l'ID.");
      return;
    }
    console.log(`✅ Salon trouvé : ${channel.name}`);

    const { threads } = await channel.threads.fetchActive();
    console.log(`📂 ${threads.size} threads trouvés. Début de l'extraction...`);

    for (const [threadId, thread] of threads) {
      try {
        const firstMessage = await thread.fetchStarterMessage();
        
        if (!firstMessage) {
          console.log(`⚠️ Impossible de lire le 1er message du post : "${thread.name}"`);
          continue;
        }

        await axios.post(N8N_WEBHOOK, {
          type: 'RECUPERATION_HISTORIQUE',
          titre: thread.name,
          contenu: firstMessage.content,
          auteur: firstMessage.author.username,
          nom_salon: channel.name,
          date: thread.createdAt.toISOString(),
          thread_id: thread.id,
          url: thread.url
        });

        console.log(`📤 Envoyé à n8n : ${thread.name}`);
        
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (err) {
        console.error(`❌ Erreur sur le post "${thread.name}" :`, err.message);
      }
    }

    console.log("🎉 Terminé ! Tous les messages ont été récupérés et envoyés.");

  } catch (error) {
    console.error("❌ Erreur globale lors de l'exécution :", error.message);
  }
});

client.login(DISCORD_TOKEN);
